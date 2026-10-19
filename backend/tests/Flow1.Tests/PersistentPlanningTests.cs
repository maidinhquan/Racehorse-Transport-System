using Application.DTOs.Flow1;
using Application.Common.Exceptions;
using System.Text.Json;
using Xunit;
namespace Flow1.Tests;
public sealed class PersistentPlanningTests
{
    private static JsonElement Json(object v)=>JsonSerializer.SerializeToElement(v,new JsonSerializerOptions(JsonSerializerDefaults.Web));
    private static string Version(object v)=>Json(v).GetProperty("version").GetString()!;
    private static async Task<(FlowContractCard C,FlowPlanInput Input)> Prepare(RelationalFlow1Tests.Fixture f){
        var c=await AgreedFlowTests.Sign(f,await AgreedFlowTests.Paid(f));c=await f.Service.DeploymentAsync(c.ContractId,"manager","confirm",new(c.Trip!.Version,"Release for planning"),default);
        await f.Db.ExecuteAsync("""
            INSERT [USER](UserID,PasswordHash,Role,FullName,IsActive) VALUES ('driver-a','fixture','DRIVER_ESCORT','Driver A',1),('driver-b','fixture','DRIVER_ESCORT','Driver B',1),('vet-a','fixture','DRIVER_ESCORT','Vet A',1);
            INSERT VEHICLE(VehicleID,Type,CapacityStalls,Status,OperatingCountry) VALUES('truck-a','HORSE_TRUCK',1,'READY','VN');
            INSERT STAFF_DOCUMENT(DocumentID,UserID,DocType,ValidForCountries,ExpiryDate,Status) VALUES('license-a','driver-a','DRIVER_LICENSE','VN','20300101','VALID'),('license-b','driver-b','DRIVER_LICENSE','VN','20300101','VALID'),('license-v','vet-a','VET_LICENSE','VN','20300101','VALID');
            """);
        var r=await f.Service.DetailAsync((await f.Service.ListAsync("owner",false,default)).Single(x=>x.Contracts.Count>0).RequestId,"owner",false,default);
        var input=new FlowPlanInput(c.Trip!.Version,[new("VN",r.Departure,r.Destination,new(r.DepartureAt!.Value),new(r.DeliveryAt!.Value),[new("truck-a","driver-a","driver-b","vet-a",r.Horses.Select(h=>h.HorseId).ToArray())])]);return(c,input);
    }
    private static async Task<object> Approved(RelationalFlow1Tests.Fixture f,string trip,object draft){var p=await f.Service.PlanActionAsync(trip,"route","submit",new(Version(draft),"Ready for feasibility"),default);p=await f.Service.PlanActionAsync(trip,"docs","feasible",new(Version(p),"Documents can be ready on time"),default);return await f.Service.PlanActionAsync(trip,"manager","approve",new(Version(p),"Plan approved"),default);}
    [LocalSqlFact] public async Task Plan_is_persistent_and_cannot_book_before_feasibility_and_manager_approval(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var(c,input)=await Prepare(f);var id=c.Trip!.TripId;var p=await f.Service.SavePlanAsync(id,"route",input,default);
        Assert.Equal("DRAFT",Json(p).GetProperty("status").GetString());Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM FLOW3_ASSIGNMENT"));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PlanActionAsync(id,"route","operations-ready",new(Version(p),"Premature",Reference:"booking"),default));
        p=await Approved(f,id,p);Assert.Equal("APPROVED",Json(p).GetProperty("status").GetString());
        p=await f.Service.PlanActionAsync(id,"route","operations-ready",new(Version(p),"Vehicle and staff confirmed",Reference:"supplier-confirmation"),default);
        Assert.True(Json(p).GetProperty("operationsReady").GetBoolean());Assert.False(Json(p).GetProperty("departureAuthorized").GetBoolean());
        var queue=Json(await f.NewService().PlanningQueueAsync("route",default));Assert.Equal("APPROVED",queue[0].GetProperty("plan").GetProperty("status").GetString());
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PlanActionAsync(id,"manager","authorize-departure",new(Version(p),"Missing docs"),default));
    }
    [LocalSqlFact] public async Task Country_capacity_and_expired_credentials_are_enforced_at_submission(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var(c,input)=await Prepare(f);var p=await f.Service.SavePlanAsync(c.Trip!.TripId,"route",input,default);
        await f.Db.ExecuteAsync("UPDATE VEHICLE SET OperatingCountry='JP'");await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PlanActionAsync(c.Trip.TripId,"route","submit",new(Version(p),"Check"),default));
        await f.Db.ExecuteAsync("UPDATE VEHICLE SET OperatingCountry='VN',CapacityStalls=0");await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PlanActionAsync(c.Trip.TripId,"route","submit",new(Version(p),"Check"),default));
        await f.Db.ExecuteAsync("UPDATE VEHICLE SET CapacityStalls=1; UPDATE STAFF_DOCUMENT SET ExpiryDate='20200101' WHERE UserID='vet-a'");await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PlanActionAsync(c.Trip.TripId,"route","submit",new(Version(p),"Check"),default));
        Assert.Equal("DRAFT",await f.Db.ScalarAsync<string>("SELECT Status FROM FLOW3_PLAN"));
    }
    [LocalSqlFact] public async Task Submitted_plans_reserve_resources_but_drafts_do_not(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var(c,input)=await Prepare(f);var id=c.Trip!.TripId;var p=await f.Service.SavePlanAsync(id,"route",input,default);
        await f.Db.ExecuteAsync("""
            INSERT TRIP_PLAN(TripID,RequestID,Status) VALUES('other-trip','req-1','PLANNING');
            INSERT FLOW3_PLAN(PlanID,TripID,PlanVersion,Status,IsCurrent,OperationsReady,DocumentsReady,DepartureAuthorized,UpdatedBy,UpdatedAtUtc) VALUES('other-plan','other-trip',1,'DRAFT',1,0,0,0,'route','20261101');
            INSERT FLOW3_LEG(LegID,PlanID,Sequence,Country,Origin,Destination,DepartureUtc,ArrivalUtc) VALUES('other-leg','other-plan',1,'VN','A','B','20261120 03:00','20261121 03:00');
            INSERT FLOW3_ASSIGNMENT(AssignmentID,LegID,VehicleID,DriverID,CoDriverID,VetID) VALUES('other-assignment','other-leg','truck-a','driver-a','driver-b','vet-a');
            """);
        p=await f.Service.PlanActionAsync(id,"route","submit",new(Version(p),"Other is draft"),default);
        p=await f.Service.PlanActionAsync(id,"docs","infeasible",new(Version(p),"Please reschedule"),default);
        await f.Db.ExecuteAsync("UPDATE FLOW3_PLAN SET Status='FEASIBILITY_REVIEW' WHERE PlanID='other-plan'");
        var error=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PlanActionAsync(id,"route","submit",new(Version(p),"Now conflict"),default));Assert.Equal("RESOURCE_RESERVED",error.ErrorCode);
    }
    [LocalSqlFact] public async Task Departure_uses_same_approved_version_and_ignores_unfinished_future_checkpoints(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var(c,input)=await Prepare(f);var id=c.Trip!.TripId;var p=await Approved(f,id,await f.Service.SavePlanAsync(id,"route",input,default));
        var horse=await f.Db.ScalarAsync<string>("SELECT TOP(1) HorseID FROM REQUEST_HORSE_MAPPING");var request=await f.Db.ScalarAsync<string>("SELECT RequestID FROM TRIP_PLAN WHERE TripID='"+id+"'");var file=f.Storage.Values.First(x=>x.Key.EndsWith(".pdf")).Key;
        await f.Db.ExecuteAsync($"INSERT LEGAL_MEDICAL_RECORD(RecordID,HorseID,RequestID,VerifiedBy,DocumentType,RequirementStatus,DocumentStatus,UploadedFileUrl,ExpiryDate) VALUES('departure-doc','{horse}','{request}','docs','HEALTH','BEFORE_DEPARTURE_REQUIRED','VALID','{file}','20300101'),('future-doc','{horse}','{request}',NULL,'ARRIVAL_CUSTOMS','FUTURE_CHECKPOINT','PENDING',NULL,NULL)");
        p=await f.Service.PlanActionAsync(id,"docs","documents-ready",new(Version(p),"Departure file verified; future checkpoints pending",Reference:"policy-confirmed",InsuranceThrough:new(2026,11,22,3,0,0,TimeSpan.Zero)),default);
        p=await f.Service.PlanActionAsync(id,"route","operations-ready",new(Version(p),"Confirmed",Reference:"booking-a"),default);
        p=await f.Service.PlanActionAsync(id,"manager","authorize-departure",new(Version(p),"All current gates met"),default);Assert.True(Json(p).GetProperty("departureAuthorized").GetBoolean());
        var replacement=input with{Version=Version(p),NewVersion=true};var next=await f.Service.SavePlanAsync(id,"route",replacement,default);Assert.Equal(2,Json(next).GetProperty("planVersion").GetInt32());Assert.False(Json(next).GetProperty("operationsReady").GetBoolean());Assert.False(Json(next).GetProperty("documentsReady").GetBoolean());
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PlanActionAsync(id,"manager","authorize-departure",new(Version(p),"Stale approved version"),default));
    }
}
