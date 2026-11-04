namespace Application.Flow6.Interfaces;
public interface IRefundVerifier
{
    Task<bool> Verify(string reference,decimal amount,DateTime refundedAtUtc,CancellationToken ct);
}
