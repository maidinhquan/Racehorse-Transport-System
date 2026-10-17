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
