using Application.Flow1.Services;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace WebApi.Controllers.Flow1;
[Route("api/operations/flow1/trips"),Authorize(Roles=UserRoles.TransportSpecialist+","+UserRoles.FleetRouteCoordinator)]
public sealed class HandoffsController(HandoffService handoffs):EndpointController
{
    [HttpGet] public async Task<IActionResult> ListAsync(CancellationToken ct)=>Reply(await handoffs.ListAsync(Actor,ct));
    [HttpGet("{id}/pdf")] public async Task<IActionResult> PdfAsync(string id,string eventId,CancellationToken ct)=>Binary(await handoffs.PdfAsync(Actor,id,eventId,ct));
    [HttpGet("{id}/horses/{horse}/files/{kind}")] public async Task<IActionResult> HorseAsync(string id,string horse,string kind,string eventId,CancellationToken ct)=>Binary(await handoffs.HorseAsync(Actor,id,horse,kind,eventId,ct));
    [HttpGet("{id}/documents/{document}"),Authorize(Roles=UserRoles.TransportSpecialist)]
    public async Task<IActionResult> DocumentAsync(string id,string document,string eventId,CancellationToken ct)=>Binary(await handoffs.DocumentAsync(Actor,id,document,eventId,ct));
}
