using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;

public sealed class ContractSigningService(IDataSession data, AccessService access, ContractService contracts,
    PolicyService policies, IOtpSecurity security, IOtpSender sender, NotificationService notifications, TimeProvider clock)
{
    private static string Purpose(string id, int version) => $"contract-sign:{id}:{version}";
    public async Task<object> SendAsync(string actor, string id, int number, CancellationToken ct)
    {
        var code = security.NewCode();
        var prepared = await data.WriteAsync(async token =>
        {
            var contract = await access.ContractAsync(id, actor, false, token);
            var version = await contracts.CurrentAsync(contract, number, token);
            var request = await access.RequestAsync(contract.RequestID, actor, false, token);
            await EligibleAsync(contract, version, request, token);
            var ttl = await policies.NumberAsync("SIGN_OTP_TTL_MINUTES", "MINUTE", request.DestinationCountry, request.TransportType, 1, 60, true, token);
            var resend = await policies.NumberAsync("SIGN_OTP_RESEND_SECONDS", "SECOND", request.DestinationCountry, request.TransportType, 1, 3600, true, token);
            var now = clock.GetUtcNow().UtcDateTime;
            Require(contract.SignOtpSentAtUtc is null || contract.SignOtpSentAtUtc.Value.AddSeconds((double)resend) <= now,
                "OTP_RESEND_TOO_SOON", "Wait before requesting another OTP.", 429);
            var account = await access.AccountAsync(actor, Domain.Enums.UserRoles.Customer, token);
            Require(!string.IsNullOrWhiteSpace(account.Email), "VALIDATION_ERROR", "A verified account email is required.", 400);
            contract.SignOtpHash = security.Digest(Purpose(id, number), code);
            contract.SignOtpSentAtUtc = now;
            contract.SignOtpExpiry = now.AddMinutes((double)ttl) < contract.CompletionDeadline!.Value ? now.AddMinutes((double)ttl) : contract.CompletionDeadline.Value;
            contract.SignOtpFailedAttempts = 0;
            return (Email: account.Email!, Expiry: contract.SignOtpExpiry.Value, Resend: (int)resend, Request: request.RequestID);
        }, ct);
        // Email delivery is outside the database transaction. Never log the code.
        await sender.SendAsync(prepared.Email, code, id, number, $"{id}/V{number}", new DateTimeOffset(DateTime.SpecifyKind(prepared.Expiry, DateTimeKind.Utc)), ct);
        return new { contractId = id, versionNo = number, sentTo = prepared.Email[0] + "***@" + prepared.Email.Split('@').Last(),
            expiresInSeconds = Math.Max(0,(int)(prepared.Expiry-clock.GetUtcNow().UtcDateTime).TotalSeconds), resendAfterSeconds = prepared.Resend };
    }
    public async Task<object> SignAsync(string actor, string id, SignInput input, CancellationToken ct)
    {
        var result = await data.WriteAsync(async token =>
        {
            var contract = await access.ContractAsync(id, actor, false, token);
            var version = await contracts.CurrentAsync(contract, input.VersionNo, token);
            var request = await access.RequestAsync(contract.RequestID, actor, false, token);
            if (version.VersionStatus == "SIGNED" && contract.SignedAt is not null && contract.TripID is not null)
                return (Error: (string?)null, Value: (object)Signature(contract, version, request, contract.TripID));
            await EligibleAsync(contract, version, request, token);
            var maximum = await policies.NumberAsync("SIGN_OTP_MAX_ATTEMPTS", "ATTEMPT", request.DestinationCountry, request.TransportType, 1, 100, true, token);
            if (contract.SignOtpFailedAttempts >= maximum) return (Error: (string?)"OTP_ATTEMPTS_EXCEEDED", Value: (object?)null);
            var valid = contract.SignOtpHash is not null && contract.SignOtpExpiry > clock.GetUtcNow().UtcDateTime
                && security.Matches(contract.SignOtpHash, security.Digest(Purpose(id, input.VersionNo), input.Otp));
            if (!valid)
            {
                contract.SignOtpFailedAttempts++;
                return (Error: (string?)"OTP_INVALID_OR_EXPIRED", Value: (object?)null);
            }
            var now = clock.GetUtcNow().UtcDateTime;
            var account = await access.AccountAsync(actor, Domain.Enums.UserRoles.Customer, token);
            version.SignedAtUtc = now; version.SignerEmail = account.Email; version.VersionStatus = "SIGNED";
            contract.SignedAt = now; contract.SignerEmail = account.Email; contract.ContractStatus = "EFFECTIVE";
            contract.SignOtpHash = null; contract.SignOtpExpiry = null; contract.SignOtpSentAtUtc = null;
            request.Status = "ACTIVATED";
            var trip = (await data.ListAsync<Trip>(x => x.RequestID == request.RequestID, token)).SingleOrDefault();
            Require(trip is null, "INVALID_STATE", "An unsigned request already has a trip.");
            trip = new Trip { RequestID = request.RequestID, Status = "PLANNING" };
            data.Add(trip); await data.SaveAsync(token);
            contract.TripID = trip.TripID;
            notifications.Add(actor, request.RequestID, "CONTRACT_SIGNED", "Contract signed", $"Contract {id} version {version.VersionNo} is effective.");
            return (Error: (string?)null, Value: (object?)Signature(contract, version, request, trip.TripID));
        }, ct);
        // Throw AFTER the transaction commits so an invalid OTP does not roll back its attempt counter.
        if (result.Error is not null) throw Failure(result.Error, "OTP is invalid, expired or has exceeded the attempt limit.", 400);
        return result.Value!;
    }
    private async Task EligibleAsync(Contract contract, ContractVersion version, TransportRequest request, CancellationToken ct)
    {
        Require(version.VersionStatus == "ISSUED" && version.TermsAcceptedAtUtc is not null, "TERMS_NOT_ACCEPTED", "Accept the current issued version.");
        Require(request.Status == "DEPOSIT_VERIFIED" && contract.CancellationStatus != "PENDING", "DEPOSIT_NOT_VERIFIED", "A verified deposit is required.");
        Require(contract.CompletionDeadline > clock.GetUtcNow().UtcDateTime && contract.SignedAt is null, "CONTRACT_EXPIRED", "Contract is not open for signing.");
        var invoice = (await data.ListAsync<Invoice>(i => i.ContractID == contract.ContractID && i.ContractVersionNo == version.VersionNo && i.InvoiceType == "DEPOSIT", ct)).SingleOrDefault();
        Require(invoice is not null && invoice.PaymentStatus == "PAID" && invoice.PaidAmount >= contract.DepositAmount && contract.DepositAmount > 0,
            "DEPOSIT_NOT_VERIFIED", "Deposit for the current version is not fully verified.");
    }
    private static object Signature(Contract contract, ContractVersion version, TransportRequest request, string trip) => new
    { requestId = request.RequestID, contractId = contract.ContractID, versionNo = version.VersionNo, requestStatus = request.Status,
        versionStatus = version.VersionStatus, tripId = trip, tripStatus = "PLANNING", signedAt = version.SignedAtUtc?.ToString("yyyy-MM-dd HH:mm") };
}
