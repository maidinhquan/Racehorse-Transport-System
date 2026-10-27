using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using Domain.Enums;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class HandoffService(IDataSession data, AccessService access, IPrivateFiles files)
{
    private async Task<Trip> TripAsync(string actor, string id, string eventId, CancellationToken ct)
    {
        var user = await access.AccountAsync(actor, null, ct); var role = UserRoles.NormalizeRole(user.Role);
        var trip = await data.FindAsync<Trip>(ct, id);
        Require(trip is not null && trip.DeploymentStatus == "CONFIRMED" && trip.HandoffEventId == eventId &&
            (role == UserRoles.TransportSpecialist && trip.AssignedSpecialistId == actor || role == UserRoles.FleetRouteCoordinator && trip.AssignedCoordinatorId == actor),
            "NOT_FOUND", "Assigned handoff not found.", 404);
        return trip!;
    }
    public async Task<object> ListAsync(string actor, CancellationToken ct)
    {
        var user = await access.AccountAsync(actor, null, ct); var role = UserRoles.NormalizeRole(user.Role);
        Require(role is UserRoles.TransportSpecialist or UserRoles.FleetRouteCoordinator, "FORBIDDEN_ROLE", "Operational staff required.", 403);
        return (await data.ListAsync<Trip>(t => t.DeploymentStatus == "CONFIRMED" &&
            (role == UserRoles.TransportSpecialist && t.AssignedSpecialistId == actor || role == UserRoles.FleetRouteCoordinator && t.AssignedCoordinatorId == actor), ct))
            .Select(t => new { tripId=t.TripID, requestId=t.RequestID, eventId=t.HandoffEventId, status=t.Status, specialistId=t.AssignedSpecialistId, coordinatorId=t.AssignedCoordinatorId }).ToArray();
    }
    public async Task<(byte[] Bytes,string ContentType)> PdfAsync(string actor,string id,string eventId,CancellationToken ct)
    {
        var trip=await TripAsync(actor,id,eventId,ct);
        var contract=(await data.ListAsync<Contract>(c=>c.TripID==id && c.ContractStatus=="EFFECTIVE",ct)).SingleOrDefault();
        Require(contract?.CurrentVersionNo is not null,"NOT_FOUND","Effective contract not found.",404);
        var version=await data.FindAsync<ContractVersion>(ct,contract!.ContractID,contract.CurrentVersionNo!.Value);
        Require(version?.VersionStatus=="SIGNED" && version.PdfUrl is not null,"NOT_FOUND","Signed PDF not found.",404);
        return await files.ReadAsync(version!.PdfUrl!,ct);
    }
    public async Task<(byte[] Bytes,string ContentType)> HorseAsync(string actor,string id,string horseId,string kind,string eventId,CancellationToken ct)
    {
        var trip=await TripAsync(actor,id,eventId,ct);
        Require((await data.ListAsync<RequestHorse>(h=>h.RequestID==trip.RequestID && h.HorseID==horseId,ct)).Any(),"NOT_FOUND","Horse not in assigned request.",404);
        var horse=await data.FindAsync<Horse>(ct,horseId) ?? throw Failure("NOT_FOUND","Horse not found.",404);
        var key=kind switch {"photo"=>horse.PhotoUrl,"passport"=>horse.PassportScanUrl,"ownership"=>horse.OwnershipCertificateFileUrl,"value-proof"=>horse.ValuationDocumentFileUrl,_=>null};
        Require(key is not null,"NOT_FOUND","File not found.",404);return await files.ReadAsync(key!,ct);
    }
    public async Task<(byte[] Bytes,string ContentType)> DocumentAsync(string actor,string id,string recordId,string eventId,CancellationToken ct)
    {
        await access.AccountAsync(actor,UserRoles.TransportSpecialist,ct);var trip=await TripAsync(actor,id,eventId,ct);
        var record=await data.FindAsync<MedicalRecord>(ct,recordId);
        Require(record?.RequestID==trip.RequestID && record.UploadedFileUrl is not null,"NOT_FOUND","Document not in assigned request.",404);
        return await files.ReadAsync(record!.UploadedFileUrl!,ct);
    }
}
