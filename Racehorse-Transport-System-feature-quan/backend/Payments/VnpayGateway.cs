using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace backend.Payments;

public sealed class VnpayGateway(IConfiguration config)
{
    public string TmnCode { get; } = config["Vnpay:TmnCode"] ?? "";
    private readonly string secret = config["Vnpay:HashSecret"] ?? "";

    public void ValidateConfiguration()
    {
        if (TmnCode.Length != 8 || string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException("Configure Vnpay:TmnCode and Vnpay:HashSecret on the server.");
        if (config["Vnpay:PaymentUrl"] != "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html")
            throw new InvalidOperationException("This application supports VNPAY Sandbox only.");
        if (!Uri.TryCreate(config["Vnpay:ReturnUrl"], UriKind.Absolute, out var uri) ||
            (uri.Scheme != "https" && uri.Scheme != "http"))
            throw new InvalidOperationException("Configure an absolute Vnpay:ReturnUrl.");
    }

    public static string Canonical(IEnumerable<KeyValuePair<string, string>> parameters) =>
        string.Join("&", parameters.Where(p => p.Key.StartsWith("vnp_", StringComparison.Ordinal) &&
            p.Key != "vnp_SecureHash" && p.Key != "vnp_SecureHashType" && p.Value.Length > 0)
            .OrderBy(p => p.Key, StringComparer.Ordinal)
            .Select(p => $"{WebUtility.UrlEncode(p.Key)}={WebUtility.UrlEncode(p.Value)}"));

    public string Sign(IEnumerable<KeyValuePair<string, string>> parameters) =>
        Convert.ToHexString(HMACSHA512.HashData(Encoding.UTF8.GetBytes(secret),
            Encoding.UTF8.GetBytes(Canonical(parameters)))).ToLowerInvariant();

    public bool Verify(Dictionary<string, string> parameters)
    {
        if (!parameters.TryGetValue("vnp_SecureHash", out var hash) || hash.Length != 128) return false;
        try { return CryptographicOperations.FixedTimeEquals(Convert.FromHexString(hash), Convert.FromHexString(Sign(parameters))); }
        catch (FormatException) { return false; }
    }

    public string CreateUrl(SandboxPayment payment, string ip)
    {
        var now = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(7));
        var values = new Dictionary<string, string>
        {
            ["vnp_Version"] = "2.1.0", ["vnp_Command"] = "pay", ["vnp_TmnCode"] = TmnCode,
            ["vnp_Amount"] = (payment.Amount * 100).ToString("0", CultureInfo.InvariantCulture),
            ["vnp_CreateDate"] = now.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_ExpireDate"] = now.AddMinutes(config.GetValue("Vnpay:TimeoutMinutes", 15)).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = "VND", ["vnp_IpAddr"] = ip, ["vnp_Locale"] = "vn",
            ["vnp_OrderInfo"] = $"Thanh toan thu nghiem {payment.Id}", ["vnp_OrderType"] = "other",
            ["vnp_ReturnUrl"] = config["Vnpay:ReturnUrl"]!, ["vnp_TxnRef"] = payment.Id
        };
        return config["Vnpay:PaymentUrl"] + "?" + Canonical(values) + "&vnp_SecureHash=" + Sign(values);
    }
}
