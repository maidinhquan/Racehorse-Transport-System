namespace Application.Flow6.Interfaces;
public interface IDeliveryOtpSender
{
    Task Send(string email,string code,string revisionId,string documentHash,DateTime expiresAtUtc,CancellationToken ct);
}
