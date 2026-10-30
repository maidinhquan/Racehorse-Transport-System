using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class HorseFilesController(HorseFilesService files) : EndpointController
{
    [HttpPost("customer/horses/{horseId}/files/{fileType}")]
    [Authorize(Roles = UserRoles.Customer)]
    [Consumes("multipart/form-data"), RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<IActionResult> UploadAsync(string horseId, string fileType, [FromForm] HorseFileForm form, CancellationToken ct) =>
        Reply(await files.UploadAsync(Actor, horseId, fileType, await FileBinding.ReadAsync(form.File, ct), ct), 201);

    [HttpGet("customer/horses/{horseId}/files/{fileType}")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> ReadAsync(string horseId, string fileType, CancellationToken ct) =>
        Binary(await files.ReadAsync(Actor, horseId, fileType, ct));

    [HttpGet("manager/requests/{requestId}/horses/{horseId}/documents/{documentType}/file")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerReadAsync(string requestId, string horseId, string documentType, CancellationToken ct) =>
        Binary(await files.ManagerAsync(Actor, requestId, horseId, documentType, ct));

}
