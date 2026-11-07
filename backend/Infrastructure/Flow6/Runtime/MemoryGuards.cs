using System.Text.Json;
using System.Text.Json.Nodes;
using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
using Microsoft.Extensions.Caching.Memory;
using static Application.Flow6.Rules.BusinessRules;

namespace Infrastructure.Flow6.Runtime;

// A dedicated bounded cache: never changes the shared application's cache settings.
public sealed class MemoryGuards(TimeProvider clock) : IRuntimeGuards, IDisposable
{
    private readonly MemoryCache cache = new(new MemoryCacheOptions { SizeLimit = 10000 });
    private readonly SemaphoreSlim commands = new(1, 1);
    private readonly object otpLock = new();
    private sealed record Replay(string Fingerprint, string Json, DateTimeOffset ExpiresAt);
    private sealed record Otp(DateTime? LastSent, DateTime WindowStart, int Count);

    public async Task<IDisposable> LockCommands(CancellationToken ct)
    {
        await commands.WaitAsync(ct);
        return new Lease(commands);
    }

    public bool TryReplay(string key, string fingerprint, out object? response)
    {
        response = null;
        if (!cache.TryGetValue("command:" + key, out Replay? entry) || entry is null) return false;
        if (clock.GetUtcNow() >= entry.ExpiresAt) { cache.Remove("command:" + key); return false; }
        Require(entry.Fingerprint == fingerprint, "IDEMPOTENCY_CONFLICT", "Key already used with another payload.");
        response = JsonNode.Parse(entry.Json);
        return true;
    }

    // Called only after SQL commit; rollback must never populate the replay cache.
    public void Remember(string key, string fingerprint, object? response) => cache.Set(
        "command:" + key,
        new Replay(fingerprint, JsonSerializer.Serialize(response), clock.GetUtcNow().AddHours(24)),
        new MemoryCacheEntryOptions { Size = 1, AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24) });

    public void ChargeOtp(string scope, DateTime now, bool sending, int cooldownSeconds)
    {
        lock (otpLock)
        {
            cache.TryGetValue("otp:" + scope, out Otp? previous);
            var entry = previous ?? new Otp(null, now, 0);
            Require(!sending || entry.LastSent is null || entry.LastSent.Value.AddSeconds(cooldownSeconds) <= now,
                "OTP_RESEND_TOO_SOON", "Wait before requesting another OTP.", 429);
            var count = entry.WindowStart.AddHours(1) <= now ? 0 : entry.Count;
            Require(count < 20, "OTP_RATE_LIMIT", "Too many OTP operations.", 429);
            cache.Set("otp:" + scope, new Otp(sending ? now : entry.LastSent, count == 0 ? now : entry.WindowStart, count + 1),
                new MemoryCacheEntryOptions { Size = 1, AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(Math.Max(3600, cooldownSeconds)) });
        }
    }

    private sealed class Lease(SemaphoreSlim semaphore) : IDisposable
    {
        private bool released;
        public void Dispose() { if (!released) { released = true; semaphore.Release(); } }
    }
    public void Dispose() { cache.Dispose(); commands.Dispose(); }
}
