using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.ExternalServices.Vnpay;

public class VnpayPaymentRequest
{
    public string Id { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class VnpayGateway(IConfiguration config)
{
    public string TmnCode { get; } = config["Vnpay:TmnCode"] ?? "SANDBOX";
    private readonly string _secret = config["Vnpay:HashSecret"] ?? "SANDBOX_SECRET";

    public static string Canonical(IEnumerable<KeyValuePair<string, string>> parameters) =>
        string.Join("&", parameters.Where(p => p.Key.StartsWith("vnp_", StringComparison.Ordinal) &&
            p.Key != "vnp_SecureHash" && p.Key != "vnp_SecureHashType" && p.Value.Length > 0)
            .OrderBy(p => p.Key, StringComparer.Ordinal)
            .Select(p => $"{WebUtility.UrlEncode(p.Key)}={WebUtility.UrlEncode(p.Value)}"));

    public string Sign(IEnumerable<KeyValuePair<string, string>> parameters) =>
        Convert.ToHexString(HMACSHA512.HashData(Encoding.UTF8.GetBytes(_secret),
            Encoding.UTF8.GetBytes(Canonical(parameters)))).ToLowerInvariant();

    public bool Verify(Dictionary<string, string> parameters)
    {
        if (!parameters.TryGetValue("vnp_SecureHash", out var hash) || hash.Length != 128) return false;
        try
        {
            return CryptographicOperations.FixedTimeEquals(Convert.FromHexString(hash), Convert.FromHexString(Sign(parameters)));
        }
        catch (FormatException)
        {
            return false;
        }
    }

    public string CreateUrl(VnpayPaymentRequest payment, string ip)
    {
        var now = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(7));
        var timeoutMinutes = config.GetValue("Vnpay:TimeoutMinutes", 15);
        var paymentUrl = config["Vnpay:PaymentUrl"] ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        var returnUrl = config["Vnpay:ReturnUrl"] ?? "http://localhost:5129/api/payments/vnpay/return";

        var values = new Dictionary<string, string>
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = string.IsNullOrWhiteSpace(TmnCode) ? "SANDBOX" : TmnCode,
            ["vnp_Amount"] = (payment.Amount * 100).ToString("0", CultureInfo.InvariantCulture),
            ["vnp_CreateDate"] = now.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_ExpireDate"] = now.AddMinutes(timeoutMinutes).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = "VND",
            ["vnp_IpAddr"] = string.IsNullOrWhiteSpace(ip) ? "127.0.0.1" : ip,
            ["vnp_Locale"] = "vn",
            ["vnp_OrderInfo"] = $"Thanh toan dat coc {payment.Id}",
            ["vnp_OrderType"] = "other",
            ["vnp_ReturnUrl"] = returnUrl,
            ["vnp_TxnRef"] = payment.Id
        };

        return paymentUrl + "?" + Canonical(values) + "&vnp_SecureHash=" + Sign(values);
    }
}
