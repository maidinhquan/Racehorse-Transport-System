using System.Text.Json;
using System.Globalization;

namespace backend.Payments;

public sealed record SandboxPayment(string Id, decimal Amount, DateTimeOffset CreatedAt,
    string Status = "Pending", string? TransactionNo = null, string? ResponseCode = null);

public sealed class SandboxPaymentStore
{
    private readonly string directory;
    private readonly SemaphoreSlim gate = new(1, 1);
    public SandboxPaymentStore(IWebHostEnvironment environment)
    {
        directory = Path.Combine(environment.ContentRootPath, "App_Data", "sandbox-payments");
        Directory.CreateDirectory(directory);
    }
    private string? PathFor(string id) => Guid.TryParseExact(id, "N", out _) ? Path.Combine(directory, id + ".json") : null;
    public async Task<SandboxPayment?> Find(string id)
    {
        var path = PathFor(id);
        if (path is null || !File.Exists(path)) return null;
        return JsonSerializer.Deserialize<SandboxPayment>(await File.ReadAllTextAsync(path));
    }
    private async Task Save(SandboxPayment payment)
    {
        var path = PathFor(payment.Id)!;
        var temporary = path + ".tmp";
        await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(payment));
        File.Move(temporary, path, true);
    }
    public async Task<SandboxPayment> Create(decimal amount)
    {
        var payment = new SandboxPayment(Guid.NewGuid().ToString("N"), amount, DateTimeOffset.UtcNow);
        await Save(payment);
        return payment;
    }
    public async Task<string> Confirm(Dictionary<string, string> values)
    {
        await gate.WaitAsync();
        try
        {
            var payment = await Find(values.GetValueOrDefault("vnp_TxnRef", ""));
            if (payment is null) return "01";
            if (!long.TryParse(values.GetValueOrDefault("vnp_Amount"), NumberStyles.None,
                CultureInfo.InvariantCulture, out var amount) || amount != payment.Amount * 100) return "04";
            if (payment.Status != "Pending") return "02";
            if (!values.ContainsKey("vnp_ResponseCode") || !values.ContainsKey("vnp_TransactionStatus") ||
                !values.ContainsKey("vnp_TransactionNo")) return "99";
            var success = values["vnp_ResponseCode"] == "00" && values["vnp_TransactionStatus"] == "00";
            await Save(payment with { Status = success ? "Paid" : "Failed",
                TransactionNo = values["vnp_TransactionNo"], ResponseCode = values["vnp_ResponseCode"] });
            return "00";
        }
        finally { gate.Release(); }
    }
}
