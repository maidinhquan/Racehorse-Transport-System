using Domain.Flow1.Entities;

namespace Application.Flow1.Mapping;

public static class RefundMapper
{
    public static object? View(Contract? contract) =>
        contract?.RefundStatus is null ? null : new
        {
            contractId = contract.ContractID, requestId = contract.RequestID, refundStatus = contract.RefundStatus,
            amount = contract.RefundAmount, currency = contract.CurrencyCode, reference = contract.RefundReference,
            refundedAtUtc = Utc(contract.RefundedAtUtc), verifiedBy = contract.RefundVerifiedBy,
            verifiedAtUtc = Utc(contract.RefundVerifiedAtUtc),
        };

    private static DateTime? Utc(DateTime? time) => time is null ? null : DateTime.SpecifyKind(time.Value, DateTimeKind.Utc);
}
