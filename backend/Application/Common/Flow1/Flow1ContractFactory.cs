using Domain.Entities;

namespace Application.Common.Flow1;

public static class Flow1ContractFactory
{
    public const decimal DepositPercent = 40m;
    public const string Currency = "VND";

    // Selling total is supplied by the future BE pricing/contract use case, never trusted FE input.
    public static Contract CreateDraft(string contractId, string requestId, string customerId,
        string contractCode, decimal totalAmount, decimal depositPercent = DepositPercent)
    {
        if (new[] { contractId, requestId, customerId, contractCode }.Any(s => string.IsNullOrWhiteSpace(s) || s.Length > 50))
            throw new ArgumentException("Contract identity fields are required.");
        if (totalAmount <= 0 || totalAmount > 9_999_999_999m || totalAmount != decimal.Truncate(totalAmount))
            throw new ArgumentOutOfRangeException(nameof(totalAmount), "VND total must be positive, integral and fit decimal(12,2).");
        if (!IsValidDepositPercent(depositPercent) || DepositAmount(totalAmount,depositPercent)<=0)
            throw new ArgumentOutOfRangeException(nameof(depositPercent), "Deposit percentage must be > 0 and <= 100 with at most two decimal places, and yield a positive VND deposit.");
        return new Contract
        {
            ContractId = contractId, RequestId = requestId, CustomerId = customerId,
            ContractCode = contractCode, CurrencyCode = Currency, DepositRateStandard = depositPercent,
            TotalQuotedPrice = totalAmount, ContractStatus = "DRAFT", TripId = null
        };
    }

    public static bool IsValidDepositPercent(decimal percent) =>
        percent > 0 && percent <= 100 && percent == decimal.Round(percent,2);

    public static decimal DepositAmount(decimal totalAmount, decimal depositPercent = DepositPercent) =>
        decimal.Round(totalAmount * depositPercent / 100m, 0, MidpointRounding.AwayFromZero);
}
