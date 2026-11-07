namespace Application.Flow6.Interfaces;

// Process-local protections only. Business state remains in the existing SQL tables.
public interface IRuntimeGuards
{
    Task<IDisposable> LockCommands(CancellationToken ct);
    bool TryReplay(string key, string fingerprint, out object? response);
    void Remember(string key, string fingerprint, object? response);
    void ChargeOtp(string scope, DateTime now, bool sending, int cooldownSeconds);
}
