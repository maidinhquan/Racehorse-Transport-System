using Application.DTOs.Flow1;
using Application.Services.Flow1.Relational;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace WebApi.Controllers.Flow1.Relational;
[ApiController,Route("api/planning"),Authorize(Roles=UserRoles.FleetRouteCoordinator+","+UserRoles.TransportSpecialist+","+UserRoles.LogisticsManager)]
public sealed class FlowPlanningApi(RelationalFlow1Service service):FlowApi
{
    [HttpGet("trips")]public async Task<IActionResult> Queue(CancellationToken ct)=>Result(await service.PlanningQueueAsync(Actor,ct));
    [HttpGet("catalog")]public async Task<IActionResult> Catalog(CancellationToken ct)=>Result(await service.PlanningCatalogAsync(Actor,ct));
    [HttpPost("vehicles/{id}/country"),Authorize(Roles=UserRoles.FleetRouteCoordinator)]public async Task<IActionResult> VehicleCountry(string id,[FromBody]string country,CancellationToken ct)=>Result(await service.VehicleCountryAsync(id,Actor,country,ct));
    [HttpPost("flights"),Authorize(Roles=UserRoles.FleetRouteCoordinator)]public async Task<IActionResult> Flight(FlightInput i,CancellationToken ct)=>Result(await service.AddFlightAsync(Actor,i,ct));
    [HttpPost("trips/{id}/plan"),Authorize(Roles=UserRoles.FleetRouteCoordinator)]public async Task<IActionResult> Save(string id,FlowPlanInput i,CancellationToken ct)=>Result(await service.SavePlanAsync(id,Actor,i,ct));
    [HttpPost("trips/{id}/{operation}")]public async Task<IActionResult> Action(string id,string operation,PlanDecision i,CancellationToken ct)=>Result(await service.PlanActionAsync(id,Actor,operation,i,ct));
    [HttpPost("trips/{id}/documents"),Authorize(Roles=UserRoles.TransportSpecialist)]public async Task<IActionResult> Document(string id,PlanningDocumentReview i,CancellationToken ct)=>Result(await service.ReviewPlanningDocumentAsync(id,Actor,i,ct));
    [HttpPost("trips/{id}/documents/upload"),Authorize(Roles=UserRoles.TransportSpecialist),Consumes("multipart/form-data"),RequestSizeLimit(6*1024*1024)]public async Task<IActionResult> UploadDocument(string id,[FromForm]PlanningFileForm i,CancellationToken ct)=>Result(await service.UploadPlanningDocumentAsync(id,Actor,i.Version,i.HorseId,i.DocumentType,await Upload(i.File,ct),ct));
}
public sealed class PlanningFileForm{public string Version{get;set;}="";public string HorseId{get;set;}="";public string DocumentType{get;set;}="";public IFormFile File{get;set;}=null!;}
