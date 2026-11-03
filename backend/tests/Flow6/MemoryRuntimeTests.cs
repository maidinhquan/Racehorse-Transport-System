using System.Text.Json.Nodes;
using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
using Flow6.Tests.Support;
using Infrastructure.Flow6.Data;
using Infrastructure.Flow6.Documents;
using Infrastructure.Flow6.Email;
using Infrastructure.Flow6.Payments;
using Infrastructure.Flow6.Runtime;
using Xunit;

namespace Flow6.Tests;

public sealed class MemoryRuntimeTests
{
    [Fact]
    public void Replay_is_a_copy_and_rejects_fingerprint_changes()
    {
        using var runtime = new MemoryGuards(new AdjustableClock());
        var value = new JsonObject { ["id"] = "CUSTOMER_CASE_010" };
        runtime.Remember("actor:operation:key", "hash", value);
        value["id"] = "changed";
        Assert.True(runtime.TryReplay("actor:operation:key", "hash", out var first));
        Assert.Equal("CUSTOMER_CASE_010", ((JsonObject)first!)["id"]!.GetValue<string>());
        ((JsonObject)first!)["id"] = "changed again";
        Assert.True(runtime.TryReplay("actor:operation:key", "hash", out var second));
        Assert.Equal("CUSTOMER_CASE_010", ((JsonObject)second!)["id"]!.GetValue<string>());
        Assert.Throws<AftercareException>(() => runtime.TryReplay("actor:operation:key", "other", out _));
    }

    [Fact]
    public void Replay_expires_and_a_new_process_does_not_retain_results()
    {
        var clock = new AdjustableClock();
        using var runtime = new MemoryGuards(clock);
        runtime.Remember("key", "hash", new JsonObject());
        using var restarted = new MemoryGuards(clock);
        Assert.False(restarted.TryReplay("key", "hash", out _));
        clock.Now = clock.Now.AddHours(24);
        Assert.False(runtime.TryReplay("key", "hash", out _));
    }

    [Fact]
    public void Otp_cooldown_survives_invalidation_in_same_process_and_is_scoped()
    {
        using var runtime = new MemoryGuards(new AdjustableClock());
        var now = DateTime.UtcNow;
        runtime.ChargeOtp("HANDOVER_010", now, true, 60);
        runtime.ChargeOtp("HANDOVER_010", now, false, 60);
        var error = Assert.Throws<AftercareException>(() => runtime.ChargeOtp("HANDOVER_010", now.AddSeconds(59), true, 60));
        Assert.Equal("OTP_RESEND_TOO_SOON", error.Code);
        runtime.ChargeOtp("HANDOVER_011", now, true, 60);
        runtime.ChargeOtp("HANDOVER_010", now.AddSeconds(60), true, 60);
    }

    [Fact]
    public void Actor_rate_limit_is_atomic_and_recovers_after_window()
    {
        using var runtime = new MemoryGuards(new AdjustableClock());
        var now = DateTime.UtcNow;
        var accepted = 0;
        Parallel.For(0, 30, _ =>
        {
            try { runtime.ChargeOtp("actor:USER_001", now, false, 60); Interlocked.Increment(ref accepted); }
            catch (AftercareException e) { Assert.Equal("OTP_RATE_LIMIT", e.Code); }
        });
        Assert.Equal(20, accepted);
        runtime.ChargeOtp("actor:USER_001", now.AddHours(1), false, 60);
    }

    [Fact]
    public async Task Command_lock_waits_cancels_and_releases_after_failure()
    {
        using var runtime = new MemoryGuards(new AdjustableClock());
        var lease = await runtime.LockCommands(CancellationToken.None);
        using var cancelled = new CancellationTokenSource();
        var waiting = runtime.LockCommands(cancelled.Token);
        Assert.False(waiting.IsCompleted);
        cancelled.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => waiting);
        lease.Dispose();
        using var next = await runtime.LockCommands(CancellationToken.None);
        Assert.False(runtime.TryReplay("never-committed", "hash", out _));
    }
}
