namespace Application.Interfaces;

public interface IRegistrationRequestLimiter
{
    void Consume(string normalizedEmail);
}
