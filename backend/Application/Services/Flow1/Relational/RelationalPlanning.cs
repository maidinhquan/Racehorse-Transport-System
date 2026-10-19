using Application.DTOs.Flow1;
using Domain.Flow1;
using Domain.Enums;
namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service
{
    private static readonly string[] ReservedPlanStates=["FEASIBILITY_REVIEW","PENDING_APPROVAL","APPROVED"];
    private async Task<FlowUser> PlanningActor(string actor,CancellationToken ct){var u=await Actor(actor,null,ct);Require(new[]{UserRoles.FleetRouteCoordinator,UserRoles.TransportSpecialist,UserRoles.LogisticsManager}.Contains(Role(u)),"FORBIDDEN","Planning role required.");return u;}
    private async Task<FlowTrip> PlanningTrip(string id,string actor,CancellationToken ct){
        await PlanningActor(actor,ct);var trip=await db.FindAsync<FlowTrip>(id,ct);
        Require(trip is not null&&trip.Status is "PLANNING" or "READY_TO_DEPART"&&trip.DeploymentStatus=="CONFIRMED","TRIP_NOT_RELEASED","Manager must hand the effective contract to operations first.");
        var effective=(await db.QueryAsync<FlowContract>(c=>c.TripID==id&&c.IsCurrent&&c.ContractStatus=="EFFECTIVE",ct)).SingleOrDefault();
        Require(effective is not null,"CONTRACT_NOT_EFFECTIVE","Effective contract required.");var invoice=await Invoice(effective,ct);
        Require(invoice.PaidAmount==invoice.TotalPayableAmount&&!(await Payments(invoice,ct)).Any(p=>p.FinancialReviewRequired),"FINANCIAL_REVIEW_REQUIRED","Resolve financial holds before changing operational plans.");return trip;
    }
    private async Task<object> PlanCard(FlowPlan p,CancellationToken ct){
        var legs=new List<object>();foreach(var leg in (await db.QueryAsync<FlowPlanLeg>(x=>x.PlanID==p.PlanID,ct)).OrderBy(x=>x.Sequence)){
            var vehicles=new List<object>();foreach(var a in await db.QueryAsync<FlowPlanAssignment>(x=>x.LegID==leg.LegID,ct))vehicles.Add(new{vehicleId=a.VehicleID,driverId=a.DriverID,coDriverId=a.CoDriverID,vetId=a.VetID,horseIds=(await db.QueryAsync<FlowPlanHorse>(x=>x.AssignmentID==a.AssignmentID,ct)).Select(x=>x.HorseID)});
            legs.Add(new{legId=leg.LegID,country=leg.Country,origin=leg.Origin,destination=leg.Destination,departureAt=leg.DepartureUtc,arrivalAt=leg.ArrivalUtc,vehicles});
        }
        return new{planId=p.PlanID,tripId=p.TripID,planVersion=p.PlanVersion,version=Token(p.RowVersion),p.Status,p.IsCurrent,p.FlightID,p.OperationsReady,p.DocumentsReady,p.InsuranceReference,p.InsuranceThroughUtc,p.BookingReference,p.DepartureAuthorized,p.Decision,p.UpdatedBy,p.UpdatedAtUtc,legs};
    }
    public Task<object> PlanningQueueAsync(string actor,CancellationToken ct)=>db.RunAsync<object>(async t=>{
        await PlanningActor(actor,t);var result=new List<object>();foreach(var trip in await db.QueryAsync<FlowTrip>(x=>x.DeploymentStatus=="CONFIRMED"&&(x.Status=="PLANNING"||x.Status=="READY_TO_DEPART"),t)){
            var c=(await db.QueryAsync<FlowContract>(x=>x.TripID==trip.TripID&&x.IsCurrent&&x.ContractStatus=="EFFECTIVE",t)).SingleOrDefault();if(c is null)continue;
            var r=await db.FindAsync<FlowRequest>(trip.RequestID,t);if(r is null)continue;
            var plan=(await db.QueryAsync<FlowPlan>(x=>x.TripID==trip.TripID&&x.IsCurrent,t)).SingleOrDefault();
            result.Add(new{tripId=trip.TripID,tripVersion=Token(trip.RowVersion),requestId=r.RequestID,origin=r.Departure,destination=r.Destination,transportMode=r.TransportType,departureAt=r.ExpectedDate,deliveryAt=r.CommittedDeadline,
                horses=(await Card(r,t)).Horses,eventId=trip.HandoffEventId,documents=(await db.QueryAsync<FlowMedicalRecord>(x=>x.RequestID==r.RequestID,t)).Select(d=>new{recordId=d.RecordID,horseId=d.HorseID,documentType=d.DocumentType,requirementStatus=d.RequirementStatus,documentStatus=d.DocumentStatus,expiryDate=d.ExpiryDate,verifiedBy=d.VerifiedBy}),plan=plan is null?null:await PlanCard(plan,t)});
        }return result;
    },ct);
    public Task<object> PlanningCatalogAsync(string actor,CancellationToken ct)=>db.RunAsync<object>(async t=>{
        await PlanningActor(actor,t);var staff=await db.QueryAsync<FlowUser>(x=>x.IsActive,t);var credentials=await db.QueryAsync<FlowStaffCredential>(x=>true,t);
        return new{vehicles=await db.QueryAsync<FlowVehicle>(x=>true,t),flights=await db.QueryAsync<FlowFlight>(x=>x.Status=="AVAILABLE"&&x.DepartureUtc>Now,t),
            staff=staff.Where(x=>Role(x)==UserRoles.DriverEscort).Select(x=>new{userId=x.UserID,fullName=x.FullName,credentials=credentials.Where(d=>d.UserID==x.UserID).Select(d=>new{d.DocType,d.ValidForCountries,d.ExpiryDate,d.Status})})};
    },ct);
    public Task<object> AddFlightAsync(string actor,FlightInput i,CancellationToken ct)=>db.RunAsync<object>(async t=>{
        await Actor(actor,UserRoles.FleetRouteCoordinator,t);Require(i.DepartureUtc>clock.GetUtcNow()&&i.ArrivalUtc>i.DepartureUtc&&i.Capacity>0,"INVALID_FLIGHT","Future direct VN–JP flight with capacity required.");
        var f=new FlowFlight{FlightID=Id("flight",Guid.NewGuid().ToString()),Provider=Text(i.Provider,200),FlightNumber=Text(i.FlightNumber,100),DepartureAirport=Text(i.DepartureAirport,500),ArrivalAirport=Text(i.ArrivalAirport,500),DepartureUtc=Utc(i.DepartureUtc),ArrivalUtc=Utc(i.ArrivalUtc),Capacity=i.Capacity};db.Add(f);await db.SaveAsync(t);return f;
    },ct);
    public Task<object> SavePlanAsync(string tripId,string actor,FlowPlanInput i,CancellationToken ct)=>db.RunAsync<object>(async t=>{
        await Actor(actor,UserRoles.FleetRouteCoordinator,t);var trip=await PlanningTrip(tripId,actor,t);var r=(await db.FindAsync<FlowRequest>(trip.RequestID,t))!;
        var p=(await db.QueryAsync<FlowPlan>(x=>x.TripID==tripId&&x.IsCurrent,t)).SingleOrDefault();
        if(p is not null&&i.NewVersion){Check(p.RowVersion,i.Version);Require(p.Status=="APPROVED","PLAN_LOCKED","Only an approved plan starts a replacement version.");
            p.IsCurrent=false;p.Status="SUPERSEDED";p.DepartureAuthorized=false;var number=p.PlanVersion+1;await db.SaveAsync(t);
            p=new(){PlanID=Id("plan",Guid.NewGuid().ToString()),TripID=tripId,PlanVersion=number,UpdatedBy=actor};db.Add(p);trip.Status="PLANNING";
        }
        if(p is null){Check(trip.RowVersion,i.Version);p=new(){PlanID=Id("plan",Guid.NewGuid().ToString()),TripID=tripId,PlanVersion=1,UpdatedBy=actor};db.Add(p);}
        else if(!i.NewVersion) {Check(p.RowVersion,i.Version);Require(p.Status is "DRAFT" or "CHANGES_REQUESTED","PLAN_LOCKED","Only returned or draft plans can be edited; approved plans require a new version.");
            foreach(var leg in await db.QueryAsync<FlowPlanLeg>(x=>x.PlanID==p.PlanID,t)){
                foreach(var a in await db.QueryAsync<FlowPlanAssignment>(x=>x.LegID==leg.LegID,t)){foreach(var h in await db.QueryAsync<FlowPlanHorse>(x=>x.AssignmentID==a.AssignmentID,t))db.Remove(h);db.Remove(a);}db.Remove(leg);}
            await db.SaveAsync(t);
        }
        Require(i.Legs.Count==(r.TransportType=="AIR"?2:1),"INVALID_LEGS","Use one ROAD leg domestically or independent ROAD legs before and after AIR.");
        p.FlightID=i.FlightId;p.Status="DRAFT";p.OperationsReady=p.DocumentsReady=p.DepartureAuthorized=false;p.UpdatedAtUtc=Now;p.UpdatedBy=actor;
        var sequence=0;foreach(var l in i.Legs){Require(l.ArrivalAt>l.DepartureAt&&l.Origin.Length<=500&&l.Destination.Length<=500,"INVALID_LEG","Check leg addresses and time.");
            var leg=new FlowPlanLeg{LegID=Id("leg",p.PlanID,(sequence++).ToString()),PlanID=p.PlanID,Sequence=sequence,Country=l.Country,Origin=l.Origin,Destination=l.Destination,DepartureUtc=Utc(l.DepartureAt),ArrivalUtc=Utc(l.ArrivalAt)};db.Add(leg);
            Require(l.Vehicles.Select(a=>a.VehicleId).Distinct().Count()==l.Vehicles.Count,"DUPLICATE_VEHICLE","A vehicle can occur once per leg.");
            foreach(var a in l.Vehicles){if(string.IsNullOrEmpty(a.VehicleId)&&string.IsNullOrEmpty(a.DriverId)&&string.IsNullOrEmpty(a.CoDriverId)&&string.IsNullOrEmpty(a.VetId)&&a.HorseIds.Count==0)continue;
                Require(!string.IsNullOrWhiteSpace(a.VehicleId)&&new[]{a.DriverId,a.CoDriverId,a.VetId}.All(x=>!string.IsNullOrWhiteSpace(x))&&new[]{a.DriverId,a.CoDriverId,a.VetId}.Distinct().Count()==3&&a.HorseIds.Distinct().Count()==a.HorseIds.Count,"INVALID_ASSIGNMENT","Complete three distinct crew and unique horses for each selected vehicle.");
                var assignment=new FlowPlanAssignment{AssignmentID=Id("assign",leg.LegID,a.VehicleId),LegID=leg.LegID,VehicleID=a.VehicleId,DriverID=a.DriverId,CoDriverID=a.CoDriverId,VetID=a.VetId};db.Add(assignment);
                foreach(var horse in a.HorseIds)db.Add(new FlowPlanHorse{ID=Id("ph",assignment.AssignmentID,horse),AssignmentID=assignment.AssignmentID,HorseID=horse});}
        }
        await db.SaveAsync(t);return await PlanCard(p,t);
    },ct);
    private async Task ValidatePlan(FlowPlan p,FlowRequest r,CancellationToken ct){
        var legs=(await db.QueryAsync<FlowPlanLeg>(x=>x.PlanID==p.PlanID,ct)).OrderBy(x=>x.Sequence).ToArray();
        Require(legs.Length==(r.TransportType=="AIR"?2:1)&&legs[0].Origin==r.Departure&&legs[^1].Destination==r.Destination&&legs[0].DepartureUtc>=r.ExpectedDate&&legs[^1].ArrivalUtc<=r.CommittedDeadline&&legs[0].DepartureUtc>Now,"INVALID_SCHEDULE","Keep agreed pickup/delivery and transport window.");
        FlowFlight? flight=null;if(r.TransportType=="AIR"){
            flight=p.FlightID is null?null:await db.FindAsync<FlowFlight>(p.FlightID,ct);
            Require(flight is {Status:"AVAILABLE"}&&legs[0].Country=="VN"&&legs[1].Country=="JP"&&legs[0].Destination==flight.DepartureAirport&&legs[1].Origin==flight.ArrivalAirport&&legs[0].ArrivalUtc<=flight.DepartureUtc&&legs[1].DepartureUtc>=flight.ArrivalUtc,"FLIGHT_UNAVAILABLE","Choose an available direct flight and compatible independent ground legs.");
        }else Require(p.FlightID is null&&legs[0].Country=="VN","INVALID_ROUTE","Domestic ROAD plan cannot include a flight.");
        var horses=(await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==r.RequestID,ct)).Select(x=>x.HorseID).Order().ToArray();
        var reserved=await db.QueryAsync<FlowPlan>(x=>x.PlanID!=p.PlanID&&x.IsCurrent&&ReservedPlanStates.Contains(x.Status),ct);
        if(flight is not null){var booked=0;foreach(var other in reserved.Where(x=>x.FlightID==flight.FlightID)){var tr=(await db.FindAsync<FlowTrip>(other.TripID,ct))!;booked+=(await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==tr.RequestID,ct)).Count;}Require(booked+horses.Length<=flight.Capacity,"FLIGHT_FULL","Flight stall capacity has already been reserved.");}
        foreach(var leg in legs){var assignments=await db.QueryAsync<FlowPlanAssignment>(x=>x.LegID==leg.LegID,ct);var assigned=new List<string>();var crew=new HashSet<string>();
            Require(assignments.Count>0,"RESOURCES_REQUIRED","Assign vehicles and three distinct crew to each ROAD leg.");
            foreach(var a in assignments){var v=await db.FindAsync<FlowVehicle>(a.VehicleID,ct);Require(v is not null&&v.Status is "AVAILABLE" or "READY"&&v.CapacityStalls>0&&v.OperatingCountry==leg.Country,"VEHICLE_UNAVAILABLE","Vehicle must be available with capacity and verified operating country matching this leg.");
                var carried=(await db.QueryAsync<FlowPlanHorse>(x=>x.AssignmentID==a.AssignmentID,ct)).Select(x=>x.HorseID).ToArray();Require(carried.Length>0&&carried.Length<=v.CapacityStalls,"CAPACITY_EXCEEDED","Assign horses within vehicle stall capacity.");assigned.AddRange(carried);
                foreach(var pair in new[]{(a.DriverID,"DRIVER_LICENSE"),(a.CoDriverID,"DRIVER_LICENSE"),(a.VetID,"VET_LICENSE")}){
                    Require(crew.Add(pair.Item1),"CREW_CONFLICT","A person can hold only one position on this leg.");var user=await db.FindAsync<FlowUser>(pair.Item1,ct);
                    var docs=await db.QueryAsync<FlowStaffCredential>(x=>x.UserID==pair.Item1,ct);
                    Require(user is {IsActive:true}&&Role(user)==UserRoles.DriverEscort&&docs.Any(d=>(d.DocType==pair.Item2||pair.Item2=="DRIVER_LICENSE"&&d.DocType=="DRIVING_LICENSE")&&d.Status=="VALID"&&d.ExpiryDate?.Date>=leg.ArrivalUtc.Date&&(d.ValidForCountries??"").Split(new[]{',',';',' '},StringSplitOptions.RemoveEmptyEntries).Contains(leg.Country)),"STAFF_INELIGIBLE","Active crew with valid country-specific credentials through arrival required.");
                }
                foreach(var other in reserved)foreach(var otherLeg in await db.QueryAsync<FlowPlanLeg>(x=>x.PlanID==other.PlanID&&x.DepartureUtc<leg.ArrivalUtc&&x.ArrivalUtc>leg.DepartureUtc,ct))
                    foreach(var booking in await db.QueryAsync<FlowPlanAssignment>(x=>x.LegID==otherLeg.LegID,ct))
                        Require(booking.VehicleID!=a.VehicleID&&!new[]{booking.DriverID,booking.CoDriverID,booking.VetID}.Intersect(new[]{a.DriverID,a.CoDriverID,a.VetID}).Any(),"RESOURCE_RESERVED","Vehicle or crew already reserved by an overlapping submitted plan.");
            }
            Require(assigned.Order().SequenceEqual(horses),"HORSE_ASSIGNMENT_INVALID","Every selected horse must be assigned exactly once on each ROAD leg.");
        }
    }
    public Task<object> PlanActionAsync(string tripId,string actor,string operation,PlanDecision i,CancellationToken ct)=>db.RunAsync<object>(async t=>{
        var user=await PlanningActor(actor,t);var trip=await PlanningTrip(tripId,actor,t);var r=(await db.FindAsync<FlowRequest>(trip.RequestID,t))!;
        var p=(await db.QueryAsync<FlowPlan>(x=>x.TripID==tripId&&x.IsCurrent,t)).SingleOrDefault();Require(p is not null,"PLAN_REQUIRED","Save a plan first.");Check(p.RowVersion,i.Version);var reason=Text(i.Reason);
        if(operation=="submit") {Require(Role(user)==UserRoles.FleetRouteCoordinator&&p.Status is "DRAFT" or "CHANGES_REQUESTED","FORBIDDEN","Coordinator submits a draft.");await ValidatePlan(p,r,t);p.Status="FEASIBILITY_REVIEW";}
        else if(operation is "feasible" or "infeasible") {Require(Role(user)==UserRoles.TransportSpecialist&&p.Status=="FEASIBILITY_REVIEW","FORBIDDEN","Specialist feasibility review required.");if(operation=="feasible")await ValidatePlan(p,r,t);p.Status=operation=="feasible"?"PENDING_APPROVAL":"CHANGES_REQUESTED";}
        else if(operation is "approve" or "reject") {Require(Role(user)==UserRoles.LogisticsManager&&p.Status=="PENDING_APPROVAL","FORBIDDEN","Manager reviews a feasible plan.");if(operation=="approve")await ValidatePlan(p,r,t);p.Status=operation=="approve"?"APPROVED":"CHANGES_REQUESTED";}
        else if(operation=="operations-ready") {Require(Role(user)==UserRoles.FleetRouteCoordinator&&p.Status=="APPROVED"&&!p.DepartureAuthorized,"FORBIDDEN","Approved plan required before booking confirmation; authorized departure locks booking changes.");await ValidatePlan(p,r,t);p.BookingReference=Text(i.Reference,200);p.OperationsReady=true;}
        else if(operation=="documents-ready") {Require(Role(user)==UserRoles.TransportSpecialist&&p.Status=="APPROVED"&&!p.DepartureAuthorized,"FORBIDDEN","Specialist confirms documents and insurance before departure authorization.");
            await DepartureDocuments(r,t);
            Require(i.InsuranceThrough>=new DateTimeOffset(r.CommittedDeadline!.Value),"INSURANCE_REQUIRED","Purchased insurance must cover the transport window.");p.InsuranceReference=Text(i.Reference,200);p.InsuranceThroughUtc=Utc(i.InsuranceThrough!.Value);p.DocumentsReady=true;}
        else if(operation=="authorize-departure") {Require(Role(user)==UserRoles.LogisticsManager&&p.Status=="APPROVED"&&p.OperationsReady&&p.DocumentsReady&&p.InsuranceThroughUtc>=r.CommittedDeadline,"NOT_READY","Both readiness gates must refer to this approved version.");await ValidatePlan(p,r,t);await DepartureDocuments(r,t);p.DepartureAuthorized=true;trip.Status="READY_TO_DEPART";}
        else throw new InvalidOperationException("Unknown planning operation.");
        p.Decision=reason;p.UpdatedBy=actor;p.UpdatedAtUtc=Now;
        var recipients=operation switch{
            "submit"=>new[]{UserRoles.TransportSpecialist},"feasible"=>new[]{UserRoles.LogisticsManager},
            "infeasible" or "reject"=>new[]{UserRoles.FleetRouteCoordinator},
            "approve"=>new[]{UserRoles.FleetRouteCoordinator,UserRoles.TransportSpecialist},
            "operations-ready"=>new[]{UserRoles.LogisticsManager,UserRoles.TransportSpecialist},
            "documents-ready"=>new[]{UserRoles.LogisticsManager,UserRoles.FleetRouteCoordinator},
            _=>new[]{UserRoles.FleetRouteCoordinator,UserRoles.TransportSpecialist}};
        foreach(var recipient in await db.QueryAsync<FlowUser>(x=>x.IsActive,t))if(recipients.Contains(Role(recipient)))
            await Notify(recipient.UserID,tripId,"FLOW3_PLAN_UPDATED","Kế hoạch chuyến đã được cập nhật",$"Chuyến {tripId}, phiên bản {p.PlanVersion}: {operation}. {reason}",t);
        if(operation=="authorize-departure")await Notify(r.CustomerID,r.RequestID,"FLOW3_DEPARTURE_AUTHORIZED","Chuyến đã được cho phép khởi hành","Quản lý đã xác nhận kế hoạch và các điều kiện sẵn sàng cho chuyến của bạn.",t);
        await db.SaveAsync(t);return await PlanCard(p,t);
    },ct);
    private async Task DepartureDocuments(FlowRequest r,CancellationToken ct){
        var required=await db.QueryAsync<FlowMedicalRecord>(x=>x.RequestID==r.RequestID&&x.RequirementStatus=="BEFORE_DEPARTURE_REQUIRED",ct);
        var horses=await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==r.RequestID,ct);
        Require(horses.All(h=>required.Any(d=>d.HorseID==h.HorseID))&&required.Count>0&&required.All(d=>d.DocumentStatus=="VALID"&&d.VerifiedBy is not null&&d.UploadedFileUrl is not null&&(d.ExpiryDate is null||d.ExpiryDate.Value.Date>=r.ExpectedDate!.Value.Date)),"DOCUMENTS_NOT_READY","Specialist must identify and verify each horse's departure requirements. Future checkpoint documents remain independent.");
        foreach(var record in required)await files.ReadAsync(record.UploadedFileUrl!,ct);
    }
    public Task<object> VehicleCountryAsync(string id,string actor,string country,CancellationToken ct)=>db.RunAsync<object>(async t=>{
        await Actor(actor,UserRoles.FleetRouteCoordinator,t);Require(country is "VN" or "JP","INVALID_COUNTRY","Choose the documented operating country.");
        var vehicle=await db.FindAsync<FlowVehicle>(id,t);Require(vehicle is not null,"NOT_FOUND","Vehicle not found.");
        foreach(var p in await db.QueryAsync<FlowPlan>(x=>x.IsCurrent&&ReservedPlanStates.Contains(x.Status),t))foreach(var l in await db.QueryAsync<FlowPlanLeg>(x=>x.PlanID==p.PlanID,t))
            Require(!(await db.QueryAsync<FlowPlanAssignment>(a=>a.LegID==l.LegID&&a.VehicleID==id,t)).Any(),"VEHICLE_RESERVED","Operating country is locked while the vehicle is reserved.");
        vehicle.OperatingCountry=country;await db.SaveAsync(t);return vehicle;
    },ct);
    public Task<object> ReviewPlanningDocumentAsync(string tripId,string actor,PlanningDocumentReview i,CancellationToken ct)=>db.RunAsync<object>(async t=>{
        await Actor(actor,UserRoles.TransportSpecialist,t);var trip=await PlanningTrip(tripId,actor,t);
        var plan=(await db.QueryAsync<FlowPlan>(p=>p.TripID==tripId&&p.IsCurrent,t)).SingleOrDefault();Require(plan is not null&&plan.Status=="APPROVED","PLAN_NOT_APPROVED","Review documents for the approved current plan.");Check(plan.RowVersion,i.PlanVersion);
        var record=await db.FindAsync<FlowMedicalRecord>(i.RecordId,t);Require(record is not null&&record.RequestID==trip.RequestID&&record.UploadedFileUrl is not null,"DOCUMENT_UNAVAILABLE","Document must belong to this trip and have actual uploaded bytes.");
        if(i.Valid)await files.ReadAsync(record.UploadedFileUrl!,t);
        record.RequirementStatus=i.RequiredBeforeDeparture?"BEFORE_DEPARTURE_REQUIRED":"FUTURE_CHECKPOINT";record.DocumentStatus=i.Valid?"VALID":"INVALID";record.VerifiedBy=actor;record.ExpiryDate=i.ExpiresAt is null?null:Utc(i.ExpiresAt.Value).Date;
        plan.DocumentsReady=false;plan.DepartureAuthorized=false;trip.Status="PLANNING";plan.Decision=Text(i.Reason);plan.UpdatedAtUtc=Now;plan.UpdatedBy=actor;await db.SaveAsync(t);return await PlanCard(plan,t);
    },ct);
    public async Task<object> UploadPlanningDocumentAsync(string tripId,string actor,string version,string horse,string type,UploadedFile upload,CancellationToken ct){
        await db.RunAsync(async t=>{await Actor(actor,UserRoles.TransportSpecialist,t);var trip=await PlanningTrip(tripId,actor,t);Require((await db.QueryAsync<FlowRequestHorse>(h=>h.RequestID==trip.RequestID&&h.HorseID==horse,t)).Any(),"HORSE_NOT_ATTACHED","Select a horse on this trip.");return 0;},ct);
        var key=await files.PutAsync(upload,false,ct);
        return await db.RunAsync<object>(async t=>{await Actor(actor,UserRoles.TransportSpecialist,t);var trip=await PlanningTrip(tripId,actor,t);var plan=(await db.QueryAsync<FlowPlan>(p=>p.TripID==tripId&&p.IsCurrent,t)).SingleOrDefault();Require(plan is not null&&plan.Status=="APPROVED","PLAN_NOT_APPROVED","Upload against the approved plan.");Check(plan.RowVersion,version);
            Require((await db.QueryAsync<FlowRequestHorse>(h=>h.RequestID==trip.RequestID&&h.HorseID==horse,t)).Any(),"HORSE_NOT_ATTACHED","Horse is no longer attached.");
            var id=Id("doc",trip.RequestID,horse,key,type);if(await db.FindAsync<FlowMedicalRecord>(id,t) is null)db.Add(new FlowMedicalRecord{RecordID=id,HorseID=horse,RequestID=trip.RequestID,DocumentType=Text(type,50),UploadedFileUrl=key,DocumentStatus="UPLOADED",RequirementStatus="UNCLASSIFIED"});
            plan.DocumentsReady=plan.DepartureAuthorized=false;trip.Status="PLANNING";plan.UpdatedAtUtc=Now;plan.UpdatedBy=actor;await db.SaveAsync(t);return await PlanCard(plan,t);
        },ct);
    }
}
