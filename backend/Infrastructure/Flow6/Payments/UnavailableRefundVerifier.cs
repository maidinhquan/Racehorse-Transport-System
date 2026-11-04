using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
namespace Infrastructure.Flow6.Payments;
public sealed class UnavailableRefundVerifier : IRefundVerifier
{
    public Task<bool> Verify(string reference,decimal amount,DateTime refundedAtUtc,CancellationToken ct)
        => throw new AftercareException("FEATURE_NOT_SUPPORTED","A verified refund provider or approved reconciliation adapter is required; recording a reference alone cannot verify money.",501);
}
