using Application.DTOs.Flow1;
using Domain.Enums;
using Domain.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service
{
    private async Task<(FlowTrip Trip,FlowContract C,FlowRequest R)> Released(string request,string actor,string? expectedEvent,CancellationToken ct)
    {
        var u=await Actor(actor,null,ct); Require(Role(u) is UserRoles.FleetRouteCoordinator or UserRoles.TransportSpecialist,"FORBIDDEN","Operational role required.");
        var trip=(await db.QueryAsync<FlowTrip>(x=>x.RequestID==request,ct)).SingleOrDefault();
        Require(trip is not null && trip.DeploymentStatus=="CONFIRMED" && trip.HandoffEventId is not null && trip.Status is "PLANNING" or "READY_TO_DEPART" && (expectedEvent is null || expectedEvent==trip.HandoffEventId),"HANDOFF_CLOSED","Handoff is unavailable or the event does not match.");
        var c=(await db.QueryAsync<FlowContract>(x=>x.TripID==trip!.TripID && x.IsCurrent,ct)).SingleOrDefault();
        Require(Role(u)==UserRoles.TransportSpecialist ? trip!.AssignedSpecialistId==actor : trip!.AssignedCoordinatorId==actor,"FORBIDDEN","This trip is assigned to another staff member.");
        Require(c is not null && c.ContractStatus=="EFFECTIVE" && c.SignedAt is not null,"HANDOFF_CLOSED","Activated signed terms required.");
        return(trip!,c!,(await db.FindAsync<FlowRequest>(request,ct))!);
    }
    public Task<FlowContractCard> DeploymentAsync(string id,string actor,string action,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        Require(action=="confirm","DEPLOYMENT_CLOSED","Only the initial handoff confirmation is supported.");
        var(c,r)=await Contract(id,actor,true,t);
        Require(c.IsCurrent && c.ContractStatus=="EFFECTIVE" && c.TripID is not null && r.Status=="ACTIVATED","DEPLOYMENT_CLOSED","Trip must be activated first.");
        var trip=(await db.FindAsync<FlowTrip>(c.TripID!,t))!; Check(trip.RowVersion,i.Version); Text(i.Reason);
        Require(trip.Status=="PLANNING" && trip.DeploymentStatus=="PENDING","DEPLOYMENT_CLOSED","Only an activated trip awaiting its first assignment may be handed off.");
            var specialist=await db.FindAsync<FlowUser>(i.AssignedSpecialistId??"",t);
            var coordinator=await db.FindAsync<FlowUser>(i.AssignedCoordinatorId??"",t);
            if(specialist is not {IsActive:true} || Role(specialist)!=UserRoles.TransportSpecialist || coordinator is not {IsActive:true} || Role(coordinator)!=UserRoles.FleetRouteCoordinator)
                throw Error("Choose an active Specialist and Coordinator with the correct roles.","VALIDATION_ERROR",400);
            Require((trip.AssignedSpecialistId is null || trip.AssignedSpecialistId==specialist.UserID) && (trip.AssignedCoordinatorId is null || trip.AssignedCoordinatorId==coordinator.UserID),"ASSIGNMENT_FIXED","Assigned staff cannot be replaced.");
            trip.DeploymentStatus="CONFIRMED"; trip.HandoffEventId=Id("event",trip.TripID,Guid.NewGuid().ToString("N"));
            trip.AssignedSpecialistId=specialist.UserID;trip.AssignedCoordinatorId=coordinator.UserID;
            foreach(var user in new[]{specialist,coordinator})
                await Notify(user.UserID,trip.HandoffEventId,"FLOW1_HANDOFF","Bạn được phân công phụ trách chuyến",
                    "Manager đã giao chuyến "+trip.TripID+". Mở hộp bàn giao để xem hợp đồng và hồ sơ hiện hành.",t);
        trip.DeploymentReason=Text(i.Reason); trip.DeploymentBy=actor; trip.DeploymentAtUtc=Now; await db.SaveAsync(t); return await Card(c,t);
    },ct);
    public Task<IReadOnlyList<FlowHandoff>> OperationsAsync(string actor,CancellationToken ct)=>db.RunAsync<IReadOnlyList<FlowHandoff>>(async t=>{
        var u=await Actor(actor,null,t); Require(Role(u) is UserRoles.FleetRouteCoordinator or UserRoles.TransportSpecialist,"FORBIDDEN","Operational role required.");
        var result=new List<FlowHandoff>();
        foreach(var trip in await db.QueryAsync<FlowTrip>(x=>x.DeploymentStatus=="CONFIRMED" && (x.Status=="PLANNING" || x.Status=="READY_TO_DEPART"),t)) {
            if(Role(u)==UserRoles.TransportSpecialist ? trip.AssignedSpecialistId!=actor : trip.AssignedCoordinatorId!=actor)continue;
            var x=await Released(trip.RequestID,actor,null,t); result.Add(await Handoff(x.Trip,x.C,x.R,t));
        }
        return result;
    },ct);
    private async Task<FlowHandoff> Handoff(FlowTrip trip,FlowContract c,FlowRequest r,CancellationToken ct)
    {
        var horses=new List<FlowHorseCard>(); foreach(var l in await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==r.RequestID,ct)) horses.Add(HorseCard((await db.FindAsync<FlowHorse>(l.HorseID,ct))!));
        return new(new(trip.TripID,Token(trip.RowVersion),trip.Status,trip.DeploymentStatus,trip.HandoffEventId,trip.DeploymentReason,trip.RoutingAcknowledgedBy,trip.DocumentsAcknowledgedBy,trip.AssignedSpecialistId,trip.AssignedCoordinatorId),r.RequestID,r.Departure,r.Destination,r.ExpectedDate,r.CommittedDeadline,c.ContractID,c.PdfSha256!,horses,r.DeclaredValueUsd,await RequestDocuments(r.RequestID,ct));
    }
    public Task<FlowHandoff> AckAsync(string tripId,string actor,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        var trip=await db.FindAsync<FlowTrip>(tripId,t)??throw Error("Trip not found.","NOT_FOUND",404); var x=await Released(trip.RequestID,actor,i.EventId,t);
        Require(i.EventId is not null,"HANDOFF_CHANGED","Current event is required."); var u=(await db.FindAsync<FlowUser>(actor,t))!;
        if(Role(u)==UserRoles.FleetRouteCoordinator && trip.RoutingAcknowledgedBy==actor || Role(u)==UserRoles.TransportSpecialist && trip.DocumentsAcknowledgedBy==actor) return await Handoff(trip,x.C,x.R,t);
        Check(trip.RowVersion,i.Version);
        if(Role(u)==UserRoles.FleetRouteCoordinator) {trip.RoutingAcknowledgedBy=actor;trip.RoutingAcknowledgedAtUtc=Now;}
        else {trip.DocumentsAcknowledgedBy=actor;trip.DocumentsAcknowledgedAtUtc=Now;}
        await db.SaveAsync(t); return await Handoff(trip,x.C,x.R,t);
    },ct);
    public Task<(byte[] Bytes,string ContentType)> OperationsPdfAsync(string tripId,string actor,string expectedEvent,CancellationToken ct)=>db.RunAsync(async t=>{
        var trip=await db.FindAsync<FlowTrip>(tripId,t)??throw Error("Trip not found.","NOT_FOUND",404); var x=await Released(trip.RequestID,actor,expectedEvent,t);
        Require(!string.IsNullOrEmpty(expectedEvent),"HANDOFF_CHANGED","Current event required.");var file=await files.ReadAsync(x.C.PdfUrl!,t);
        Require(Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(file.Bytes)).Equals(x.C.PdfSha256,StringComparison.OrdinalIgnoreCase),"FILE_INTEGRITY_ERROR","Handoff PDF differs from the signed hash.");return file;
    },ct);
    public Task<(byte[] Bytes,string ContentType)> OperationsHorseFileAsync(string tripId,string horse,string kind,string actor,string eventId,CancellationToken ct)=>db.RunAsync(async t=>{
        var trip=await db.FindAsync<FlowTrip>(tripId,t)??throw Error("Trip not found.","NOT_FOUND",404);var x=await Released(trip.RequestID,actor,eventId,t);
        Require(!string.IsNullOrEmpty(eventId) && (await db.QueryAsync<FlowRequestHorse>(l=>l.RequestID==x.R.RequestID && l.HorseID==horse,t)).Any(),"HANDOFF_CHANGED","Current event and attached horse required.");
        var h=(await db.FindAsync<FlowHorse>(horse,t))!;var key=kind switch{"photo"=>h.PhotoUrl,"passport"=>h.PassportScanUrl,_=>null};Require(key is not null,"FILE_UNAVAILABLE","Document unavailable.");return await files.ReadAsync(key,t);
    },ct);
}
