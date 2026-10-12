using Application.Common.Exceptions;
using Application.Common.Registration;
using Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace Infrastructure.Registration;

public sealed class MemoryRegistrationRequestLimiter(RegistrationOptions options, TimeProvider clock) : IRegistrationRequestLimiter, IDisposable
{
    private readonly MemoryCache cache = new(new MemoryCacheOptions { SizeLimit = 5000 });
    private readonly object gate = new();
    private sealed class Counter(DateTimeOffset expiresAt)
    {
        public DateTimeOffset ExpiresAt { get; } = expiresAt;
        public int Count { get; set; }
    }

    public void Consume(string normalizedEmail)
    {
        lock (gate)
        {
            var now = clock.GetUtcNow();
            if (!cache.TryGetValue<Counter>(normalizedEmail, out var counter) || counter is null || now >= counter.ExpiresAt)
            {
                counter = new Counter(now.AddSeconds(options.EmailWindowSeconds));
                cache.Set(normalizedEmail, counter, new MemoryCacheEntryOptions { AbsoluteExpiration = counter.ExpiresAt, Size = 1 });
                if (!cache.TryGetValue(normalizedEmail, out _))
                    throw new BusinessRuleException("Hệ thống đang bận. Vui lòng thử lại sau.", 503);
            }
            if (counter.Count >= options.MaxEmailsPerWindow)
                throw new BusinessRuleException("Đã vượt giới hạn gửi OTP cho email này. Vui lòng thử lại sau.", 429);
            counter.Count++;
        }
    }

    public void Dispose() => cache.Dispose();
}
