using Application.Common.Registration;

namespace Application.Interfaces;

public interface IRegistrationStore
{
    void Create(PendingRegistration registration);
    void Remove(string registrationToken);
    Task<T> ExecuteAsync<T>(string registrationToken, Func<PendingRegistration, Task<T>> action, CancellationToken cancellationToken = default);
}
