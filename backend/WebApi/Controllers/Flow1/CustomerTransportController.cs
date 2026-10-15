using System.Security.Claims;
using System.Text.Json;
using Application.DTOs;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Application.Services.Flow1;
using Domain.Enums;
using Infrastructure.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace WebApi.Controllers.Flow1;

[ApiController, Route("api/customer"), Authorize(Roles = UserRoles.Customer), EnableRateLimiting("flow1-customer")]
public sealed class CustomerTransportController(CustomerTransportService service, TransportEstimateService estimates,
    IFlow1GeocodingProvider geocoding, TimeProvider clock) : ControllerBase
{
    private string Owner => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw Error("Authentication required.", "UNAUTHORIZED", 401);
    private string Key => Request.Headers["Idempotency-Key"].ToString();
    [HttpGet("requests/form-options")]
    public IActionResult Options() => Ok(ApiResponse<object>.Ok(new { routes = new[] { new { origin = "VN", destination = "VN", mode = "ROAD" },
        new { origin = "VN", destination = "JP", mode = "AIR" } }, todayVietnam = Today(clock), maxHorses = 100,
        maxFileBytes = LocalFlow1PrivateFileStore.MaxBytes, requiredDocuments = new[] { "PHOTO", "PASSPORT_SCAN" },
        preparationFloors = new { roadUpTo500Km = 2, roadOver500Km = 3, airVietnamJapan = 7 },
        earliestDepartureDates = new { roadUpTo500Km = Today(clock).AddDays(2), roadOver500Km = Today(clock).AddDays(3), airVietnamJapan = Today(clock).AddDays(7) },
        pricingPolicyVersion = Application.Common.Flow1.Flow1PricingPolicy.Version }));
    [HttpGet("locations/search")]
    public async Task<IActionResult> Search(string address, string country, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(await geocoding.SearchAsync(address, country, ct)));
    [HttpPost("estimates")]
    public async Task<IActionResult> Estimate(EstimateInput input, CancellationToken ct) =>
        Ok(ApiResponse<EstimateView>.Ok((await estimates.CalculateAsync(input, ct)).Customer));
    [HttpGet("horses/selectable")]
    public async Task<IActionResult> Horses(DateOnly? departure, DateOnly? deadline, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(await service.HorsesAsync(Owner, departure, deadline, ct)));
    [HttpPost("horses"), RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<IActionResult> CreateHorse([FromForm] string payload, [FromForm] IFormFile photo, [FromForm] IFormFile passportScan, CancellationToken ct)
    {
        HorseInput input;
        try { input = JsonSerializer.Deserialize<HorseInput>(payload, new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? throw new JsonException(); }
        catch (JsonException) { throw Error("Invalid horse payload.", "VALIDATION_ERROR"); }
        var h = await service.CreateHorseAsync(Owner, Key, input, await Upload(photo, ct), await Upload(passportScan, ct), ct);
        return StatusCode(201, ApiResponse<HorseView>.Ok(h));
    }
    [HttpGet("horses/{id}/documents")]
    public async Task<IActionResult> Documents(string id, CancellationToken ct)
    {
        var d = await service.DocumentsAsync(Owner, id, ct);
        return Ok(ApiResponse<object>.Ok(new { version = d.Version, photo = $"/api/customer/horses/{id}/documents/{d.Version}/photo",
            passportScan = $"/api/customer/horses/{id}/documents/{d.Version}/passport" }));
    }
    [HttpPost("horses/{id}/documents"), RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<IActionResult> UpdateDocuments(string id, [FromForm] int expectedVersion,
        [FromForm] IFormFile photo, [FromForm] IFormFile passportScan, CancellationToken ct, [FromForm] string? payload = null)
    {
        HorseInput? identity = null;
        if (payload is not null)
        {
            try { identity = JsonSerializer.Deserialize<HorseInput>(payload, new JsonSerializerOptions(JsonSerializerDefaults.Web)); }
            catch (JsonException) { throw Error("Invalid horse payload.", "VALIDATION_ERROR"); }
        }
        return Ok(ApiResponse<object>.Ok(new { version = await service.UpdateDocumentsAsync(Owner, id, expectedVersion, Key,
            await Upload(photo, ct), await Upload(passportScan, ct), ct, identity) }));
    }
    [HttpGet("horses/{id}/documents/{version:int}/{kind}")]
    public async Task<IActionResult> Download(string id, int version, string kind, CancellationToken ct)
    {
        var file = await service.DocumentFileAsync(Owner, id, version, kind, ct);
        Response.Headers.CacheControl = "no-store";
        Response.Headers.XContentTypeOptions = "nosniff";
        return File(file.Bytes, file.ContentType, $"{kind}-{version}" + (file.ContentType == "application/pdf" ? ".pdf" : file.ContentType == "image/png" ? ".png" : ".jpg"));
    }
    [HttpPost("requests")]
    public async Task<IActionResult> Submit(SubmitRequestInput input, CancellationToken ct)
    {
        var r = await service.SubmitAsync(Owner, Key, input, ct);
        return Created($"/api/customer/requests/{r.RequestId}", ApiResponse<RequestView>.Ok(r));
    }
    [HttpGet("requests")]
    public async Task<IActionResult> List(CancellationToken ct, int page = 1, int pageSize = 20) =>
        Ok(ApiResponse<object>.Ok(await service.ListAsync(Owner, page, pageSize, ct)));
    [HttpGet("requests/{id}")]
    public async Task<IActionResult> Detail(string id, CancellationToken ct) =>
        Ok(ApiResponse<RequestView>.Ok(await service.DetailAsync(Owner, id, ct)));
    private static async Task<UploadedFile> Upload(IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.Length is < 16 or > LocalFlow1PrivateFileStore.MaxBytes)
            throw Error("Photo and passport scan are required; maximum 5 MB each.", "INVALID_FILE_SIZE");
        using var memory = new MemoryStream();
        await file.CopyToAsync(memory, ct);
        return new(memory.ToArray(), file.FileName);
    }
}

[ApiController, Route("api/public/estimates"), EnableRateLimiting("flow1-customer")]
public sealed class PublicEstimatesController(TransportEstimateService estimates, IFlow1GeocodingProvider geocoding) : ControllerBase
{
    [HttpGet("locations/search")]
    public async Task<IActionResult> Search(string address, string country, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(await geocoding.SearchAsync(address, country, ct)));
    [HttpGet("transport-modes")]
    public IActionResult Modes(string originCountry = "VN", string destinationCountry = "VN")
    {
        if (originCountry != "VN" || destinationCountry is not ("VN" or "JP")) throw Error("Unsupported route.", "UNSUPPORTED_ROUTE");
        return Ok(ApiResponse<object>.Ok(new { modes = new[] { destinationCountry == "JP" ? "AIR" : "ROAD" } }));
    }
    [HttpPost]
    public async Task<IActionResult> Estimate(EstimateInput input, CancellationToken ct) =>
        Ok(ApiResponse<EstimateView>.Ok((await estimates.CalculateAsync(input, ct)).Customer));
}
