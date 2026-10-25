using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class RequestDocumentsController(RequestDocumentsService documents, ChecklistService checklist) : EndpointController
{
    [HttpPost("customer/requests/{requestId}/horses/{horseId}/documents")]
    [Authorize(Roles = UserRoles.Customer)]
    [Consumes("multipart/form-data"), RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<IActionResult> UploadAsync(string requestId, string horseId, [FromForm] MedicalFileForm form, CancellationToken ct) =>
        Reply(await documents.UploadAsync(Actor, requestId, horseId, form.DocumentType, form.ExpiryDate, await FileBinding.ReadAsync(form.File, ct), ct), 201);

    [HttpGet("customer/requests/{requestId}/document-checklist")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> ChecklistAsync(string requestId, CancellationToken ct) =>
        Reply(await checklist.GetAsync(Actor, requestId, ct));

    [HttpGet("customer/requests/{requestId}/documents/{recordId}")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> ReadAsync(string requestId, string recordId, CancellationToken ct) =>
        Binary(await documents.ReadAsync(Actor, requestId, recordId, false, ct));

    [HttpGet("manager/requests/{requestId}/documents/{recordId}")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerReadAsync(string requestId, string recordId, CancellationToken ct) =>
        Binary(await documents.ReadAsync(Actor, requestId, recordId, true, ct));

}
