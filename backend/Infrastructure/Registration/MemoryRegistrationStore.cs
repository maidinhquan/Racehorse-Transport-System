using Application.Common.Exceptions;
using Application.Common.Registration;
using Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace Infrastructure.Registration;

public sealed class MemoryRegistrationStore : IRegistrationStore, IDisposable
{
    private readonly MemoryCache cache = new(new MemoryCacheOptions { SizeLimit = 2000 });
    private sealed record Entry(PendingRegistration Pending, SemaphoreSlim Gate);

    public void Create(PendingRegistration registration)
    {
        cache.Set(registration.RegistrationToken, new Entry(registration, new SemaphoreSlim(1, 1)),
            new MemoryCacheEntryOptions { AbsoluteExpiration = registration.SessionExpiresAt, Size = 1 });
        if (!cache.TryGetValue(registration.RegistrationToken, out _))
            throw new BusinessRuleException("Hệ thống đang bận. Vui lòng thử lại sau.", 503);
    }

    public void Remove(string registrationToken) => cache.Remove(registrationToken);

    public async Task<T> ExecuteAsync<T>(string registrationToken, Func<PendingRegistration, Task<T>> action, CancellationToken cancellationToken = default)
    {
        if (!cache.TryGetValue<Entry>(registrationToken, out var entry) || entry is null)
            throw new BusinessRuleException("Phiên đăng ký không tồn tại hoặc đã hết hạn.");
        await entry.Gate.WaitAsync(cancellationToken);
        try { return await action(entry.Pending); }
        finally { entry.Gate.Release(); }
    }

    public void Dispose() => cache.Dispose();
}
