namespace Application.Interfaces.Flow1;

public interface IContractOtpSecurity
{
    string NewCode();
    string Digest(string purpose, string value);
    bool Matches(string expected, string actual);
}
public interface IContractOtpSender
{
    Task SendAsync(string email, string code, string contractId, int version, string documentHash, DateTimeOffset expiresAt, CancellationToken ct);
}
