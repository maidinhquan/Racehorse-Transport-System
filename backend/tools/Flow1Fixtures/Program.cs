using System.Text.Json;
using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Application.Flow1.Services;
using Domain.Flow1.Entities;
using Infrastructure.Flow1.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WebApi.Extensions.Flow1;

namespace Flow1Fixtures;

internal static class Program
{
    private const string DatabaseName = "HorseTransportDB_Flow1Fixtures";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static JsonElement Wire(object value) => JsonSerializer.SerializeToElement(value, Json);

    public static async Task Main()
    {
        var connection = Environment.GetEnvironmentVariable("FLOW1_FIXTURE_CONNECTION")
            ?? throw new InvalidOperationException("FLOW1_FIXTURE_CONNECTION is required.");
        var targetDatabase = new SqlConnectionStringBuilder(connection).InitialCatalog;
        var mainMode = Environment.GetEnvironmentVariable("FLOW1_FIXTURE_ALLOW_MAIN") == "true";
        if (targetDatabase != DatabaseName && !(mainMode && targetDatabase == "HorseTransportDB"))
            throw new InvalidOperationException("Unexpected database. Main database requires explicit FLOW1_FIXTURE_ALLOW_MAIN=true.");
        var configuration = new ConfigurationBuilder().SetBasePath("/app")
            .AddJsonFile("appsettings.json").AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables().Build();
        configuration["ConnectionStrings:Flow1"] = connection;
        configuration["ConnectionStrings:DefaultConnection"] = connection;
        var clock = new FixtureClock();
        var services = new ServiceCollection();
        services.AddLogging(builder => builder.AddConsole().SetMinimumLevel(LogLevel.Warning));
        services.AddSingleton<IConfiguration>(configuration);
        services.AddSingleton<IHostEnvironment>(new FixtureEnvironment());
        services.AddRequestModule(configuration, new FixtureEnvironment());
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(clock);
        await using var provider = services.BuildServiceProvider();
        using var lookup = provider.CreateScope();
        var database = lookup.ServiceProvider.GetRequiredService<RequestContext>();
        if (!mainMode && await database.Set<TransportRequest>().AnyAsync(r => r.Purpose != null && r.Purpose.StartsWith("FLOW1_FIXTURE:")))
            throw new InvalidOperationException("Fixtures already exist. Use Prepare-Flow1Fixtures.ps1 -Reset.");
        var source = await database.Set<TransportRequest>().AsNoTracking().SingleAsync(r => r.RequestID == "REQUEST_007");
        var horse = await database.Set<Horse>().AsNoTracking().SingleAsync(h => h.HorseID == "HORSE_008");
        var customer = Environment.GetEnvironmentVariable("FLOW1_FIXTURE_CUSTOMER") ?? source.CustomerID;
        if (!await database.Set<Account>().AnyAsync(a => a.UserID == customer && a.IsActive
            && (a.Role == "CUSTOMER" || a.Role == "CUST")))
            throw new InvalidOperationException("The fixture owner must be an active customer.");
        if (horse.OwnerID != source.CustomerID || string.IsNullOrEmpty(horse.PassportScanUrl)
            || string.IsNullOrEmpty(horse.PhotoUrl) || string.IsNullOrEmpty(horse.OwnershipCertificateFileUrl))
            throw new InvalidOperationException("Source request/horse must have a matching owner and identity files.");
        var manager = await database.Set<Account>().AsNoTracking()
            .Where(a => a.IsActive && (a.Role == "LOGISTICS_MANAGER" || a.Role == "MANAGER"))
            .OrderBy(a => a.UserID).FirstAsync();
        services.AddSingleton<ILocationVerifier>(new SeedLocations(source));
        // Rebuild once so the source-city verifier applies only to fixture creation.
        await using var seedProvider = services.BuildServiceProvider();
        var now = DateTimeOffset.UtcNow;
        var result = new List<object>();
        foreach (var code in new[] { "B", "C", "D", "E", "F", "G1", "G2", "G3" })
        {
            clock.Now = code is "E" or "F" ? now.AddDays(-2) : code.StartsWith("G") ? now.AddDays(-20) : now;
            using var scope = seedProvider.CreateScope();
            var sp = scope.ServiceProvider;
            var db = sp.GetRequiredService<RequestContext>();
            var copy = JsonSerializer.Deserialize<Horse>(JsonSerializer.Serialize(horse))!;
            copy.HorseID = null!;
            copy.OwnerID = customer;
            copy.Name = "Fixture " + code;
            if (mainMode) copy.Name += " " + now.ToOffset(TimeSpan.FromHours(7)).ToString("ddMM-HHmmss");
            copy.Microchip_ISO = "99" + ((int)code[0]).ToString("D3") + DateTime.UtcNow.Ticks.ToString()[^10..];
            copy.FEI_Passport_No = "FIX-" + code + "-" + copy.Microchip_ISO;
            copy.PassportExpiryDate = now.AddYears(2).UtcDateTime.Date;
            db.Add(copy);
            await db.SaveChangesAsync();
            var pickup = now.AddHours(7).Date.AddDays(code.StartsWith("G") ? 2 : 30);
            var delivery = pickup.AddDays(2);
            ContactInput Contact(bool start) => new("Fixture " + code,
                start ? source.Departure : source.Destination, "", start ? source.PickupContactName! : source.DesignatedReceiverName!,
                start ? source.PickupContactPhone! : source.DesignatedReceiverPhone!, "",
                start ? source.PickupLatitude : source.DeliveryLatitude,
                start ? source.PickupLongitude : source.DeliveryLongitude,
                start ? source.PickupCityId : source.DeliveryCityId);
            var input = new RequestUpdateInput(source.PickupCityName!, source.DeliveryCityName!,
                source.OriginCountry!, source.DestinationCountry!, source.TransportType!,
                pickup.ToString("yyyy-MM-dd"), delivery.ToString("yyyy-MM-dd"), "",
                Contact(true), Contact(false), [copy.HorseID], new Dictionary<string, string>(), "FLOW1_FIXTURE:" + code);
            var created = Wire(await sp.GetRequiredService<RequestService>().CreateAsync(customer, Guid.NewGuid().ToString(), input, default));
            var id = created.GetProperty("id").GetString()!;
            var reviews = sp.GetRequiredService<RequestAssessmentService>();
            var assigned = Wire(await reviews.AssignAsync(manager.UserID, id, new("USER_006", "USER_005", 1), default));
            var reviewId = assigned.GetProperty("reviewId").GetString()!;
            string? contractId = null;
            string? invoiceId = null;
            string? optionId = null;
            if (code != "B")
            {
                var assessed = Wire(await reviews.AssessCoordinatorAsync("USER_006", reviewId,
                    new(1, new("FEASIBLE", "Lịch đủ điều kiện trong bộ fixture."), null), default));
                optionId = assessed.GetProperty("options")[0].GetProperty("scheduleOptionId").GetString()!;
                var checklist = sp.GetRequiredService<RequestAssessmentChecklist>();
                var sources = await checklist.LoadAsync(id, delivery, default);
                var items = sources.Select(s => new ChecklistItemAssessmentInput(s.Id,
                    s.Usable ? "VERIFIED" : s.Stage == "BEFORE_DEPARTURE" ? "NEEDS_FOLLOW_UP" : "MISSING",
                    s.Usable ? null : "Khách bổ sung theo hạn của fixture.",
                    !s.Usable && s.Stage == "BEFORE_DEPARTURE" ? DateOnly.FromDateTime(pickup.AddDays(-1)) : null, null)).ToArray();
                await reviews.AssessSpecialistAsync("USER_005", reviewId, optionId,
                    new(1, RequestAssessmentChecklist.Version(sources), "FEASIBLE", "Đã thẩm định fixture.", items), default);
                if (code == "E")
                    await reviews.ChangesAsync(manager.UserID, id, new("Vui lòng bổ sung hồ sơ của fixture E.",
                        reviewId, 1, "SUPPLEMENT_DOCUMENTS", null), default);
                else if (code != "G1")
                {
                    await reviews.AcceptAsync(manager.UserID, id, new(reviewId, 1, optionId), default);
                    var contracts = sp.GetRequiredService<ContractService>();
                    var draft = Wire(await contracts.SaveAsync(manager.UserID, id, new(
                        delivery.ToString("yyyy-MM-dd") + " 18:00", new(0, 0, 0, 0, 0),
                        pickup.ToString("yyyy-MM-dd") + " 08:00", 40, "",
                        [new(1000000, "Vận chuyển theo fixture", true)], source.TransportType!,
                        "FLOW1_FIXTURE:" + code, [new("Thanh toán", "Xác minh cọc trước khi ký hợp đồng bằng OTP.")]), default));
                    contractId = draft.GetProperty("contractId").GetString()!;
                    if (code != "G2")
                    {
                        var publication = Wire(await contracts.PublishAsync(manager.UserID, id, 1, default));
                        invoiceId = publication.GetProperty("invoiceId").GetString()!;
                        await contracts.AcceptAsync(customer, contractId, 1, default);
                        if (code is "D" or "F" or "G3")
                        {
                            db.ChangeTracker.Clear();
                            var invoice = await db.Set<Invoice>().SingleAsync(i => i.InvoiceID == invoiceId);
                            var request = await db.Set<TransportRequest>().SingleAsync(r => r.RequestID == id);
                            invoice.PaidAmount = invoice.TotalPayableAmount;
                            invoice.PaymentStatus = "PAID";
                            request.Status = "DEPOSIT_VERIFIED";
                            db.Add(new Payment
                            {
                                InvoiceID = invoiceId, CurrencyCode = "VND", Amount = invoice.TotalPayableAmount,
                                Method = "VNPAY", Status = "SUCCESS", PaymentDate = clock.Now.UtcDateTime,
                                VnpayCreatedAtUtc = clock.Now.UtcDateTime, VnpayExpiresAtUtc = clock.Now.AddMinutes(15).UtcDateTime,
                                VnpayReceivedAmount = invoice.TotalPayableAmount, VnpayTmnCode = "FIXTURE1",
                                TransactionCode = DateTime.UtcNow.Ticks.ToString(), VnpayResponseCode = "00",
                                VnpayTransactionStatus = "00", FinancialReviewReason = "Khoản cọc mô phỏng của fixture " + code,
                            });
                            await db.SaveChangesAsync();
                        }
                    }
                }
            }
            db.ChangeTracker.Clear();
            var current = await db.Set<TransportRequest>().AsNoTracking().SingleAsync(r => r.RequestID == id);
            result.Add(new { fixture = code, requestId = id, horseId = copy.HorseID, contractId, invoiceId,
                reviewId, scheduleOptionId = optionId, state = current.Status, pickupDate = pickup.ToString("yyyy-MM-dd") });
            Console.WriteLine($"Prepared {code}: {id} ({current.Status})");
        }
        clock.Now = now;
        var manifest = new { database = targetDatabase, generatedAtUtc = now, customerId = customer,
            managerId = manager.UserID, coordinatorId = "USER_006", specialistId = "USER_005", fixtures = result };
        var output = Environment.GetEnvironmentVariable("FIXTURE_MANIFEST_PATH") ?? "/fixture-output/manifest.json";
        Directory.CreateDirectory(Path.GetDirectoryName(output)!);
        await File.WriteAllTextAsync(output, JsonSerializer.Serialize(manifest, new JsonSerializerOptions(Json) { WriteIndented = true }));
    }

    private sealed class FixtureClock : TimeProvider
    {
        public DateTimeOffset Now = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() => Now;
    }
    private sealed class FixtureEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Testing";
        public string ApplicationName { get; set; } = "Flow1Fixtures";
        public string ContentRootPath { get; set; } = "/app";
        public IFileProvider ContentRootFileProvider { get; set; } = new PhysicalFileProvider("/app");
    }
    private sealed class SeedLocations(TransportRequest source) : ILocationVerifier, ICityLocations
    {
        public Task VerifyAsync(MapPoint point, CancellationToken ct) => Task.CompletedTask;
        public Task<CitySelection> VerifyCityAsync(MapPoint point, string cityId, CancellationToken ct)
        {
            if (cityId == source.PickupCityId && point.CountryCode == source.OriginCountry)
                return Task.FromResult(new CitySelection(cityId, source.PickupCityName!, point.CountryCode));
            if (cityId == source.DeliveryCityId && point.CountryCode == source.DestinationCountry)
                return Task.FromResult(new CitySelection(cityId, source.DeliveryCityName!, point.CountryCode));
            throw new InvalidOperationException("Seed coordinates must use the source request cities.");
        }
        public Task<IReadOnlyList<CitySelection>> CitiesAsync(string query, string country, CancellationToken ct) => throw new NotSupportedException();
        public Task<IReadOnlyList<GeocodeCandidate>> SearchInCityAsync(string query, string country, string cityId, CancellationToken ct) => throw new NotSupportedException();
    }
}
