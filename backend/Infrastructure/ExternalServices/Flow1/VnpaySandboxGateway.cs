using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Interfaces.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.ExternalServices.Flow1;

public sealed class Flow1VnpayOptions
{
    public bool Enabled { get; set; }
    public string TmnCode { get; set; } = "";
    public string HashSecret { get; set; } = "";
    public string PaymentUrl { get; set; } = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    public string ReturnUrl { get; set; } = "";
}

/// <summary>Sandbox-only PAY 2.1.0. Canonical/HMAC logic follows the existing Payments/VnpayGateway module.
/// No SandboxPaymentStore dependency; only the SQL ledger accepts verified IPN receipts.</summary>
public sealed class VnpaySandboxGateway(Flow1VnpayOptions options, TimeProvider clock) : IFlow1PaymentGateway
{
    public bool IsConfigured { get { try { Configure(); return true; } catch (Application.Common.Exceptions.BusinessRuleException) { return false; } } }
    private void Configure()
    {
        if (!options.Enabled || !Regex.IsMatch(options.TmnCode, "\\A[A-Za-z0-9]{8}\\z") || string.IsNullOrWhiteSpace(options.HashSecret) ||
            options.PaymentUrl != "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html" ||
            !Uri.TryCreate(options.ReturnUrl, UriKind.Absolute, out var uri) || uri.UserInfo.Length != 0 || uri.Fragment.Length != 0 ||
            uri.Query.Length != 0 || !(uri.Scheme == "https" || uri.Scheme == "http" && uri.IsLoopback))
            throw Error("Configure the server's Flow1:Vnpay Sandbox merchant, secret and return URL.", "VNPAY_NOT_CONFIGURED", 503);
    }
    public static string Canonical(IEnumerable<KeyValuePair<string, string>> values) => string.Join("&", values
        .Where(p => p.Key.StartsWith("vnp_", StringComparison.Ordinal) && p.Key is not ("vnp_SecureHash" or "vnp_SecureHashType") && p.Value.Length > 0)
        .OrderBy(p => p.Key, StringComparer.Ordinal).Select(p => $"{WebUtility.UrlEncode(p.Key)}={WebUtility.UrlEncode(p.Value)}"));
    public string Sign(IEnumerable<KeyValuePair<string, string>> values) => Convert.ToHexString(HMACSHA512.HashData(
        Encoding.UTF8.GetBytes(options.HashSecret), Encoding.UTF8.GetBytes(Canonical(values)))).ToLowerInvariant();
    public Task<GatewaySessionResult> CreateSessionAsync(GatewaySessionRequest request, CancellationToken ct = default)
    {
        Configure();
        if (request.Currency != "VND" || request.Amount < 1 || request.Amount > 9_999_999_999m || request.Amount != decimal.Truncate(request.Amount) ||
            request.ExpiresAtUtc <= clock.GetUtcNow() || !IPAddress.TryParse(request.ClientIp, out _) || !Regex.IsMatch(request.PaymentId, "\\A[A-Za-z0-9]{1,50}\\z"))
            throw Error("Invalid gateway session parameters.", "INVALID_GATEWAY_SESSION");
        var values = new Dictionary<string, string> {
            ["vnp_Version"] = "2.1.0", ["vnp_Command"] = "pay", ["vnp_TmnCode"] = options.TmnCode,
            ["vnp_Amount"] = (request.Amount * 100).ToString("0", CultureInfo.InvariantCulture), ["vnp_CurrCode"] = "VND",
            ["vnp_CreateDate"] = clock.GetUtcNow().ToOffset(TimeSpan.FromHours(7)).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_ExpireDate"] = request.ExpiresAtUtc.ToOffset(TimeSpan.FromHours(7)).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_IpAddr"] = request.ClientIp, ["vnp_Locale"] = "vn", ["vnp_OrderType"] = "other",
            ["vnp_OrderInfo"] = "Flow1 deposit " + request.PaymentId, ["vnp_ReturnUrl"] = options.ReturnUrl, ["vnp_TxnRef"] = request.PaymentId };
        return Task.FromResult(new GatewaySessionResult(request.PaymentId, new Uri(options.PaymentUrl + "?" + Canonical(values) + "&vnp_SecureHash=" + Sign(values)), request.ExpiresAtUtc, options.TmnCode));
    }
    public Task<VerifiedGatewayResult> VerifyAsync(IReadOnlyDictionary<string, string> payload, CancellationToken ct = default)
    {
        Configure();
        string Get(string key) => payload.GetValueOrDefault(key) ?? "";
        VerifiedGatewayResult Invalid() => new(false, "", null, 0, "VND", "INVALID", null, JsonSerializer.SerializeToElement(new { }));
        if (payload.Count > 30 || payload.Any(p => p.Key.Length > 100 || p.Value.Length > 1000)) return Task.FromResult(Invalid());
        var hash = Get("vnp_SecureHash");
        try
        {
            if (hash.Length != 128 || !CryptographicOperations.FixedTimeEquals(Convert.FromHexString(hash), Convert.FromHexString(Sign(payload))) ||
                Get("vnp_TmnCode") != options.TmnCode) return Task.FromResult(Invalid());
        }
        catch (FormatException) { return Task.FromResult(Invalid()); }
        var reference = Get("vnp_TxnRef"); var transaction = Get("vnp_TransactionNo");
        if (!Regex.IsMatch(reference, "\\A[A-Za-z0-9]{1,50}\\z") || !Regex.IsMatch(Get("vnp_Amount"), "\\A[0-9]{1,12}\\z") ||
            !decimal.TryParse(Get("vnp_Amount"), NumberStyles.None, CultureInfo.InvariantCulture, out var units) || units <= 0 || units % 100 != 0 ||
            Get("vnp_CurrCode") is not ("" or "VND") || !Regex.IsMatch(Get("vnp_ResponseCode"), "\\A[0-9]{2}\\z") ||
            !Regex.IsMatch(Get("vnp_TransactionStatus"), "\\A[0-9]{2}\\z")) return Task.FromResult(Invalid());
        var success = Get("vnp_ResponseCode") == "00" && Get("vnp_TransactionStatus") == "00";
        DateTimeOffset? paidAt = null;
        if (success)
        {
            if (!Regex.IsMatch(transaction, "\\A[0-9]{1,30}\\z") || transaction.All(c => c == '0') ||
                !DateTime.TryParseExact(Get("vnp_PayDate"), "yyyyMMddHHmmss", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)) return Task.FromResult(Invalid());
            paidAt = new DateTimeOffset(DateTime.SpecifyKind(parsed, DateTimeKind.Unspecified), TimeSpan.FromHours(7)).ToUniversalTime();
            if (paidAt > clock.GetUtcNow().AddMinutes(5) || paidAt <= DateTimeOffset.UnixEpoch) return Task.FromResult(Invalid());
        }
        // Never retain raw callback URLs/signatures/card data. These bounded fields are sufficient for receipt reconciliation.
        var evidence = JsonSerializer.SerializeToElement(new { merchant = options.TmnCode, reference, transaction, responseCode = Get("vnp_ResponseCode"),
            transactionStatus = Get("vnp_TransactionStatus"), amount = units / 100, paidAt });
        return Task.FromResult(new VerifiedGatewayResult(true, reference, success ? transaction : null, units / 100, "VND", success ? "SUCCESS" : "FAILED", paidAt, evidence, options.TmnCode));
    }
}
