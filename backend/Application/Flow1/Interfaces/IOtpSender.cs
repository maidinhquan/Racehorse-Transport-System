
namespace Application.Flow1.Interfaces;

public interface IOtpSender
{
    Task SendAsync(string email, string code, string contractId, int version, string documentHash, DateTimeOffset expiresAt, CancellationToken ct);
}
