using backend.Payments;

var builder = WebApplication.CreateBuilder(args);
// Local credentials are ignored by Git and never served to the browser.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true).AddEnvironmentVariables();
builder.Services.AddSingleton<VnpayGateway>();
builder.Services.AddSingleton<SandboxPaymentStore>();
var app = builder.Build();
app.Services.GetRequiredService<VnpayGateway>().ValidateConfiguration();

Dictionary<string, string>? ReadQuery(HttpRequest request) =>
    request.Query.Any(p => p.Value.Count != 1) ? null :
    request.Query.ToDictionary(p => p.Key, p => p.Value.ToString(), StringComparer.Ordinal);

app.MapPost("/api/payments/vnpay", async (CreatePayment request, HttpContext context,
    SandboxPaymentStore store, VnpayGateway gateway) =>
{
    if (request.Amount < 5000 || request.Amount > 999999999 || decimal.Truncate(request.Amount) != request.Amount)
        return Results.BadRequest(new { message = "Nhập số tiền nguyên từ 5.000 đến 999.999.999 VND." });
    var payment = await store.Create(request.Amount);
    var address = context.Connection.RemoteIpAddress;
    var ip = address is null || System.Net.IPAddress.IsLoopback(address) ? "127.0.0.1" :
        (address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address).ToString();
    return Results.Ok(new { payment.Id, payment.Amount, payment.Status, paymentUrl = gateway.CreateUrl(payment, ip) });
});

app.MapGet("/api/payments/vnpay/ipn", async (HttpRequest request, SandboxPaymentStore store,
    VnpayGateway gateway, ILogger<Program> logger) =>
{
    string code;
    try
    {
        var values = ReadQuery(request);
        code = values is null || !gateway.Verify(values) || values.GetValueOrDefault("vnp_TmnCode") != gateway.TmnCode
            ? "97" : await store.Confirm(values);
    }
    catch (Exception exception) { logger.LogError(exception, "Sandbox IPN persistence failed"); code = "99"; }
    var message = code switch { "00" => "Confirm Success", "01" => "Order not found",
        "02" => "Order already confirmed", "04" => "Invalid amount", "97" => "Invalid signature", _ => "Invalid request or server error" };
    // Keep VNPAY's exact case even though the default JSON policy uses camelCase.
    return Results.Json(new Dictionary<string, string> { ["RspCode"] = code, ["Message"] = message });
});

app.MapGet("/api/payments/vnpay/return", async (HttpRequest request, SandboxPaymentStore store, VnpayGateway gateway) =>
{
    var values = ReadQuery(request);
    if (values is null || !gateway.Verify(values) || values.GetValueOrDefault("vnp_TmnCode") != gateway.TmnCode)
        return Results.BadRequest(new { message = "Chữ ký kết quả thanh toán không hợp lệ." });
    var payment = await store.Find(values.GetValueOrDefault("vnp_TxnRef", ""));
    if (payment is null) return Results.NotFound();
    if (values.GetValueOrDefault("vnp_Amount") != (payment.Amount * 100).ToString("0", System.Globalization.CultureInfo.InvariantCulture))
        return Results.BadRequest(new { message = "Số tiền không khớp giao dịch." });
    return Results.Ok(new { payment.Id, payment.Amount, payment.Status, responseCode = values.GetValueOrDefault("vnp_ResponseCode") });
});
app.MapGet("/api/payments/{id}", async (string id, SandboxPaymentStore store) =>
    await store.Find(id) is { } payment ? Results.Ok(payment) : Results.NotFound());
app.Run();
public sealed record CreatePayment(decimal Amount);
