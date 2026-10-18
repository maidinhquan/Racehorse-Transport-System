using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Domain.Enums;
using Domain.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service(IFlow1Data db, IFlow1CurrentFiles files, TransportEstimateService estimates,
    TimeProvider clock, IContractOtpSecurity otp, IContractOtpSender sender, IFlow1ContractDocumentGenerator pdf,
    Flow1ContractOptions issuer, IFlow1PaymentGateway gateway, IFlow1GatewayQuery? query = null)
{
    private DateTime Now => Utc(clock.GetUtcNow());
    private static string Id(string kind, params string[] values) => kind + Convert.ToHexString(SHA256.HashData(
        Encoding.UTF8.GetBytes(string.Join('\n', values))))[..40].ToLowerInvariant();
    private static string Token(byte[] b) => Convert.ToBase64String(b);
    private static void Check(byte[] actual, string expected) => Require(Token(actual) == expected, "STALE_VERSION", "Data changed; reload.");
    private static void Require([System.Diagnostics.CodeAnalysis.DoesNotReturnIf(false)] bool condition, string code, string message) { if (!condition) throw Error(message, code, 409); }
    private static string Text(string? x, int max = 1000)
    { if (string.IsNullOrWhiteSpace(x) || x.Length > max) throw Error("A valid value/reason is required.", "VALIDATION_ERROR"); return x.Trim(); }
    private static string Key(string key) { if(string.IsNullOrWhiteSpace(key)||!Regex.IsMatch(key,@"\A[A-Za-z0-9_-]{8,100}\z"))throw Error("Idempotency-Key must be8–100 ASCII letters, digits, underscores or hyphens.","INVALID_IDEMPOTENCY_KEY"); return key; }
    private static string Role(FlowUser user)=>UserRoles.NormalizeRole(user.Role);
    private static DateTime Utc(DateTimeOffset x) => new(x.UtcTicks - x.UtcTicks % TimeSpan.TicksPerSecond, DateTimeKind.Utc);
    private static DateTime Cutoff(FlowRequest r) => r.ExpectedDate is not null&&r.PreparationDays is not null?r.ExpectedDate.Value.AddDays(-r.PreparationDays.Value):throw Error("Preparation data requires review.","DATA_REVIEW_REQUIRED",409);
    private static bool RequestReady(FlowRequest r)=>r.ExpectedDate is not null&&r.CommittedDeadline>r.ExpectedDate&&r.PreparationDays is not null&&
        r.PickupLatitude is not null&&r.PickupLongitude is not null&&r.DeliveryLatitude is not null&&r.DeliveryLongitude is not null&&r.OriginCountry=="VN"&&
        (r.TransportType=="ROAD"&&r.DestinationCountry=="VN"&&r.DistanceKm>0||r.TransportType=="AIR"&&r.DestinationCountry=="JP"&&r.DistanceKm is null)&&
        !string.IsNullOrWhiteSpace(r.PickupContactName)&&!string.IsNullOrWhiteSpace(r.PickupContactPhone)&&!string.IsNullOrWhiteSpace(r.DesignatedReceiverName)&&!string.IsNullOrWhiteSpace(r.DesignatedReceiverPhone)&&!string.IsNullOrWhiteSpace(r.Purpose);
    private static DateTime SignDue(FlowContract c) => c.EffectiveSignDeadline ?? c.CompletionDeadline ?? throw Error("Signing deadline missing.", "DATA_REVIEW_REQUIRED", 409);
    private async Task<FlowUser> Actor(string id, string? role, CancellationToken ct)
    {
        var u = await db.FindAsync<FlowUser>(id, ct);
        Require(u is { IsActive: true }, "FORBIDDEN", "This account is not active.");
        // Normalize known legacy spellings without treating unknown roles as Customer.
        var known = new[] { "CUSTOMER", "CUST", "MANAGER", "LOGISTICS_MANAGER", "SPECIALIST", "TRANSPORT_SPECIALIST", "COORDINATOR", "FLEET_ROUTE_COORDINATOR", "DRIVER", "ESCORT", "DRIVER_ESCORT", "ADMIN" };
        Require(known.Contains(u.Role.ToUpperInvariant()) && (role is null || UserRoles.NormalizeRole(u.Role)==role), "FORBIDDEN", "This action is not available for this account.");
        return u;
    }
    private async Task<FlowRequest> Request(string id, string actor, bool manager, CancellationToken ct)
    {
        await Actor(actor, manager ? UserRoles.LogisticsManager : UserRoles.Customer, ct);
        var r = await db.FindAsync<FlowRequest>(id, ct);
        if (r is null || !manager && r.CustomerID != actor) throw Error("Request not found.", "NOT_FOUND", 404);
        return r;
    }
    private async Task<(FlowContract C, FlowRequest R)> Contract(string id, string actor, bool manager, CancellationToken ct)
    {
        var c = await db.FindAsync<FlowContract>(id, ct) ?? throw Error("Contract not found.", "NOT_FOUND", 404);
        var r = await Request(c.RequestID, actor, manager, ct);
        Require(c.CustomerID == r.CustomerID, "DATA_REVIEW_REQUIRED", "Contract ownership differs from request."); return (c, r);
    }
    private static FlowHorseCard HorseCard(FlowHorse h, bool available = true) => new(h.HorseID, h.Name, h.Microchip_ISO,
        h.FEI_Passport_No, Token(h.RowVersion), h.PhotoUrl is not null && h.PassportScanUrl is not null, available, h.Breed, h.Sex, h.DOB);
    private async Task<bool> Busy(string horse, DateTime from, DateTime to, string? exclude, CancellationToken ct)
    {
        var links = await db.QueryAsync<FlowRequestHorse>(h => h.HorseID == horse && h.RequestID != exclude, ct);
        foreach (var link in links)
        {
            var r = await db.FindAsync<FlowRequest>(link.RequestID, ct);
            if (r is not null && r.Status is not ("CANCELLED" or "REJECTED" or "COMPLETED") &&
                (r.ExpectedDate is null || r.CommittedDeadline is null || r.ExpectedDate <= to && r.CommittedDeadline >= from)) return true;
        }
        return false;
    }
    private async Task<FlowContractCard> Card(FlowContract c, CancellationToken ct)
    {
        var inv = (await db.QueryAsync<FlowInvoice>(x => x.ContractID == c.ContractID && x.InvoiceType == "DEPOSIT", ct)).SingleOrDefault();
        var payments = inv is null ? [] : await db.QueryAsync<FlowPayment>(x => x.InvoiceID == inv.InvoiceID, ct);
        var t = c.TripID is null ? null : await db.FindAsync<FlowTrip>(c.TripID, ct);
        var request=await db.FindAsync<FlowRequest>(c.RequestID,ct);
        return new(c.ContractID, Token(c.RowVersion), c.ContractStatus, c.IsCurrent, c.TotalQuotedPrice ?? 0, c.DepositAmount ?? 0,
            c.CompletionDeadline is null ? null : SignDue(c), c.DepositDeadline, c.SignedAt, c.PdfSha256,
            c.CancellationId, c.CancellationStatus, c.CancellationReason, c.CancellationDecisionReason,
            c.LastExtensionTarget, c.LastExtensionReason, inv?.PaidAmount ?? 0, inv?.PaymentStatus,
            payments.Select(p => new FlowPaymentCard(p.PaymentID, Token(p.RowVersion), p.Amount, p.VnpayReceivedAmount, p.Status,
                p.TransactionCode, p.Status == "SUCCESS" ? p.PaymentDate : null, p.FinancialReviewRequired, p.FinancialReviewReason, p.Method, p.CurrencyCode)).ToArray(),
            t is null ? null : new(t.TripID, Token(t.RowVersion), t.Status, t.DeploymentStatus, t.HandoffEventId, t.DeploymentReason,
                t.RoutingAcknowledgedBy, t.DocumentsAcknowledgedBy),request is {ExpectedDate:not null,PreparationDays:not null}?Cutoff(request):null,c.CurrencyCode,
            c.DepositAmount>0&&c.DepositRateStandard==40&&c.CurrencyCode=="VND"&&c.CompletionDeadline is not null,
            c.SignedAt is not null&&c.PublishedAtUtc is not null&&c.SignerEmail is not null&&c.SignedDepositDeadline is not null&&c.PdfUrl is not null&&c.PdfSha256 is not null);
    }
    private async Task<FlowRequestCard> Card(FlowRequest r, CancellationToken ct)
    {
        var horses = new List<FlowHorseCard>();
        foreach (var l in await db.QueryAsync<FlowRequestHorse>(x => x.RequestID == r.RequestID, ct))
            horses.Add(HorseCard((await db.FindAsync<FlowHorse>(l.HorseID, ct))!));
        var contracts = new List<FlowContractCard>();
        foreach (var c in await db.QueryAsync<FlowContract>(x => x.RequestID == r.RequestID, ct)) contracts.Add(await Card(c, ct));
        FlowRequestInput? input=null;
        if(r.ExpectedDate is not null && r.CommittedDeadline is not null && r.PickupLatitude is not null && r.DeliveryLatitude is not null && r.PickupLongitude is not null && r.DeliveryLongitude is not null)
            input=new(new(new(r.Departure,(double)r.PickupLatitude.Value,(double)r.PickupLongitude.Value,r.OriginCountry!),new(r.Destination,(double)r.DeliveryLatitude.Value,(double)r.DeliveryLongitude.Value,r.DestinationCountry!),r.TransportType!,horses.Count,DateOnly.FromDateTime(new DateTimeOffset(r.ExpectedDate.Value).ToOffset(TimeSpan.FromHours(7)).DateTime)),new(r.ExpectedDate.Value),new(r.CommittedDeadline.Value),r.Purpose??"",new(r.PickupContactName??"",r.PickupContactPhone??""),new(r.DesignatedReceiverName??"",r.DesignatedReceiverPhone??""),horses.Select(h=>new HorseSelection(h.HorseId,h.Version)).ToArray());
        var customer = await db.FindAsync<FlowUser>(r.CustomerID, ct);
        return new(r.RequestID, Token(r.RowVersion), r.Status, r.Departure, r.Destination, r.ExpectedDate, r.CommittedDeadline,
            r.ManagerNotes, r.DistanceKm, r.PreparationDays, r.PickupContactName, r.PickupContactPhone,
            r.DesignatedReceiverName, r.DesignatedReceiverPhone, horses, contracts,input,input is null?null:estimates.LocationAttribution,customer?.FullName,customer?.Email);
    }
    public Task<FlowRequestCard> DetailAsync(string id, string actor, bool manager, CancellationToken ct) =>
        db.RunAsync(async t => await Card(await Request(id, actor, manager, t), t), ct);
    public Task<FlowContractCard> ContractAsync(string id, string actor, bool manager, CancellationToken ct) =>
        db.RunAsync(async t => await Card((await Contract(id, actor, manager, t)).C, t), ct);
    public Task<IReadOnlyList<FlowRequestCard>> ListAsync(string actor, bool manager, CancellationToken ct) => db.RunAsync<IReadOnlyList<FlowRequestCard>>(async t =>
    {
        await Actor(actor, manager ? UserRoles.LogisticsManager : UserRoles.Customer, t);
        var result = new List<FlowRequestCard>();
        foreach (var r in (await db.QueryAsync<FlowRequest>(x => manager || x.CustomerID == actor, t)).OrderByDescending(x => x.ExpectedDate).Take(100)) result.Add(await Card(r, t));
        return result;
    }, ct);
    public Task<IReadOnlyList<FlowHorseCard>> HorsesAsync(string actor,CancellationToken ct,DateTimeOffset? departureAt=null,DateTimeOffset? deliveryAt=null,string? requestId=null)=>db.RunAsync<IReadOnlyList<FlowHorseCard>>(async t=>
    {
        await Actor(actor,UserRoles.Customer,t);Require(departureAt.HasValue==deliveryAt.HasValue&&(!departureAt.HasValue||deliveryAt>departureAt),"INVALID_DATE_RANGE","Provide both dates in chronological order.");
        if(requestId is not null)await Request(requestId,actor,false,t);
        var result=new List<FlowHorseCard>();foreach(var horse in await db.QueryAsync<FlowHorse>(h=>h.OwnerID==actor,t))
            result.Add(HorseCard(horse,horse.PhotoUrl is not null&&horse.PassportScanUrl is not null&&(!departureAt.HasValue||!await Busy(horse.HorseID,Utc(departureAt.Value),Utc(deliveryAt!.Value),requestId,t))));
        return result;
    },ct);
    private async Task<bool> DocumentsLocked(string horse,CancellationToken ct)
    {
        foreach(var link in await db.QueryAsync<FlowRequestHorse>(x=>x.HorseID==horse,ct))
        {
            var request=await db.FindAsync<FlowRequest>(link.RequestID,ct);
            if(request is null||request.Status is "CANCELLED" or "REJECTED" or "COMPLETED")continue;
            if(request.Status=="CHANGES_REQUESTED"&&!(await db.QueryAsync<FlowContract>(c=>c.RequestID==request.RequestID&&c.IsCurrent,ct)).Any())continue;
            return true;
        }
        return false;
    }

    public async Task<FlowHorseCard> HorseAsync(string actor, string key, HorseInput i, UploadedFile photo, UploadedFile passport, string? id, string? version, CancellationToken ct)
    {
        Key(key); Text(i.Name,100); Text(i.Breed,100); Text(i.FeiPassportNo,50);
        Require(Regex.IsMatch(i.MicrochipIso??"", "\\A[0-9]{15}\\z") && i.Sex is "STALLION" or "MARE" or "GELDING" &&
            i.Weight is > 0 and <= 2000 && i.Dob <= Today(clock) && i.Dob > Today(clock).AddYears(-60), "VALIDATION_ERROR", "Invalid horse identity.");
        // Bytes are immutable and may be orphaned on rollback; no public URLs or state files.
        var photoKey = await files.PutAsync(photo,true,ct); var passportKey = await files.PutAsync(passport,false,ct);
        return await db.RunAsync(async t => {
            await Actor(actor, UserRoles.Customer,t); var hid=id ?? Id("h",actor,key); var h=await db.FindAsync<FlowHorse>(hid,t);
            if (h is not null)
            {
                Require(h.OwnerID==actor,"FORBIDDEN","Horse belongs to another customer.");
                if(id is null) { Require(h.Name==i.Name.Trim() && h.Microchip_ISO==i.MicrochipIso && h.FEI_Passport_No==i.FeiPassportNo.Trim() && h.Breed==i.Breed.Trim() && h.Sex==i.Sex && h.Weight==i.Weight && h.DOB==i.Dob.ToDateTime(TimeOnly.MinValue) && h.PhotoUrl==photoKey && h.PassportScanUrl==passportKey,"IDEMPOTENCY_KEY_REUSED","Key used for different horse data."); return HorseCard(h); }
                Check(h.RowVersion,version??"");
                Require(!await DocumentsLocked(hid,t),"HORSE_IN_USE","Horse identity/documents are locked by an active request.");
            }
            else { Require(id is null,"NOT_FOUND","Horse not found."); h=new(){HorseID=hid,OwnerID=actor}; db.Add(h); }
            Require(!(await db.QueryAsync<FlowHorse>(x=>x.Microchip_ISO==i.MicrochipIso && x.HorseID!=hid,t)).Any(),"MICROCHIP_EXISTS","Microchip already registered.");
            h.Name=i.Name.Trim(); h.Microchip_ISO=i.MicrochipIso!; h.FEI_Passport_No=i.FeiPassportNo.Trim(); h.Breed=i.Breed.Trim(); h.Sex=i.Sex; h.Weight=i.Weight; h.DOB=i.Dob.ToDateTime(TimeOnly.MinValue); h.PhotoUrl=photoKey; h.PassportScanUrl=passportKey;
            await db.SaveAsync(t); return HorseCard(h);
        },ct);
    }
    private async Task ApplyRequest(FlowRequest r, FlowRequestInput i, EstimateCalculation estimate, CancellationToken ct)
    {
        Text(i.Purpose,100); Text(i.PickupContact.Name,100); Text(i.Receiver.Name,100);
        Require(Regex.IsMatch(i.PickupContact.Phone,"\\A\\+?[0-9 ()-]{7,20}\\z") && Regex.IsMatch(i.Receiver.Phone,"\\A\\+?[0-9 ()-]{7,20}\\z"),"VALIDATION_ERROR","Invalid contact phone.");
        Require(i.Horses.Count is >=1 and <=100 && i.Horses.Count==i.Trip.HorseCount && i.Horses.Select(h=>h.HorseId).Distinct().Count()==i.Horses.Count,"VALIDATION_ERROR","Select unique horses matching the requested count.");
        Require(DateOnly.FromDateTime(i.DepartureAt.ToOffset(TimeSpan.FromHours(7)).DateTime)==i.Trip.DesiredDepartureDate && i.DepartureAt>=clock.GetUtcNow().AddDays(estimate.Customer.MinimumPreparationDays) && i.DeliveryAt>i.DepartureAt,"INVALID_DATE_RANGE","Departure must allow preparation and precede delivery.");
        foreach(var selection in i.Horses)
        {
            var h=await db.FindAsync<FlowHorse>(selection.HorseId,ct);
            Require(h is not null && h.OwnerID==r.CustomerID && h.PhotoUrl is not null && h.PassportScanUrl is not null,"HORSE_DOCUMENTS_REQUIRED","Owned horse with both files is required.");
            Check(h!.RowVersion,selection.Version); await files.ReadAsync(h.PhotoUrl!,ct); await files.ReadAsync(h.PassportScanUrl!,ct);
            Require(!await Busy(h.HorseID,Utc(i.DepartureAt),Utc(i.DeliveryAt),r.RequestID,ct),"SCHEDULE_CONFLICT","Horse is assigned to an overlapping request.");
        }
        foreach(var l in await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==r.RequestID,ct)) db.Remove(l);
        await db.SaveAsync(ct);
        foreach(var selection in i.Horses) db.Add(new FlowRequestHorse{RequestHorseID=Id("rh",r.RequestID,selection.HorseId),RequestID=r.RequestID,HorseID=selection.HorseId});
        r.Departure=i.Trip.Pickup.Address; r.Destination=i.Trip.Delivery.Address; r.OriginCountry=i.Trip.Pickup.Country; r.DestinationCountry=i.Trip.Delivery.Country;
        r.PickupLatitude=(decimal)i.Trip.Pickup.Lat; r.PickupLongitude=(decimal)i.Trip.Pickup.Lng; r.DeliveryLatitude=(decimal)i.Trip.Delivery.Lat; r.DeliveryLongitude=(decimal)i.Trip.Delivery.Lng;
        r.DistanceKm=estimate.Customer.RoadDistanceKm is decimal km ? decimal.Round(km,2) : null; r.PreparationDays=estimate.Customer.MinimumPreparationDays;
        r.Purpose=i.Purpose.Trim(); r.PickupContactName=i.PickupContact.Name.Trim(); r.PickupContactPhone=i.PickupContact.Phone;
        r.DesignatedReceiverName=i.Receiver.Name.Trim(); r.DesignatedReceiverPhone=i.Receiver.Phone; r.ExpectedDate=Utc(i.DepartureAt); r.CommittedDeadline=Utc(i.DeliveryAt); r.TransportType=i.Trip.PreferredTransportMode; r.Status="PENDING";
    }
    public async Task<FlowRequestCard> SubmitAsync(string actor,string key,FlowRequestInput i,string? id,string? version,CancellationToken ct)
    {
        Require(i is not null && i.Trip is not null && i.Trip.Pickup is not null && i.Trip.Delivery is not null && i.Horses is not null && i.PickupContact is not null && i.Receiver is not null,"VALIDATION_ERROR","Complete all required request fields.");
        Key(key); var estimate=await estimates.CalculateAsync(i.Trip,ct);
        return await db.RunAsync(async t=>{
            await Actor(actor,UserRoles.Customer,t); var rid=id??Id("r",actor,key); var r=await db.FindAsync<FlowRequest>(rid,t);
            if(r is not null)
            {
                Require(r.CustomerID==actor,"FORBIDDEN","Request belongs to another account.");
                if(id is null) { Require(r.Departure==i.Trip.Pickup.Address && r.Destination==i.Trip.Delivery.Address && r.OriginCountry==i.Trip.Pickup.Country && r.DestinationCountry==i.Trip.Delivery.Country && r.TransportType==i.Trip.PreferredTransportMode && r.PickupLatitude==decimal.Round((decimal)i.Trip.Pickup.Lat,6) && r.PickupLongitude==decimal.Round((decimal)i.Trip.Pickup.Lng,6) && r.DeliveryLatitude==decimal.Round((decimal)i.Trip.Delivery.Lat,6) && r.DeliveryLongitude==decimal.Round((decimal)i.Trip.Delivery.Lng,6) && r.ExpectedDate==Utc(i.DepartureAt) && r.CommittedDeadline==Utc(i.DeliveryAt) && r.Purpose==i.Purpose.Trim() && r.PickupContactName==i.PickupContact.Name.Trim() && r.PickupContactPhone==i.PickupContact.Phone && r.DesignatedReceiverName==i.Receiver.Name.Trim() && r.DesignatedReceiverPhone==i.Receiver.Phone && (await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==rid,t)).Select(x=>x.HorseID).Order().SequenceEqual(i.Horses.Select(x=>x.HorseId).Order()),"IDEMPOTENCY_KEY_REUSED","Key used with different request data."); return await Card(r,t); }
                Require(RequestReady(r),"DATA_REVIEW_REQUIRED","Legacy request needs review before entering the new revision workflow.");
                Check(r.RowVersion,version??""); Require(r.Status=="CHANGES_REQUESTED" && !(await db.QueryAsync<FlowContract>(c=>c.RequestID==rid && c.IsCurrent,t)).Any(),"REVISION_CLOSED","Only requests returned for changes can be revised.");
            }
            else { Require(id is null,"NOT_FOUND","Request not found."); r=new(){RequestID=rid,CustomerID=actor,Departure=i.Trip.Pickup.Address,Destination=i.Trip.Delivery.Address,Status="PENDING"}; db.Add(r); }
            await ApplyRequest(r,i,estimate,t); await db.SaveAsync(t); return await Card(r,t);
        },ct);
    }
    public Task<FlowRequestCard> ReviewAsync(string id,string actor,string action,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        var r=await Request(id,actor,true,t);Require(RequestReady(r),"DATA_REVIEW_REQUIRED","Legacy request needs review before a new A1 decision."); Check(r.RowVersion,i.Version); Text(i.Reason);
        Require(r.Status is "PENDING" or "ACCEPTED"||r.Status=="CHANGES_REQUESTED"&&action=="reject","REVIEW_CLOSED","Request cannot be reviewed in this status.");
        Require(!(await db.QueryAsync<FlowContract>(c=>c.RequestID==id && c.IsCurrent,t)).Any(),"CONTRACT_OPEN","Close the unsigned contract before requesting changes.");
        r.Status=action switch {"accept"=>"ACCEPTED","reject"=>"REJECTED","request-changes"=>"CHANGES_REQUESTED",_=>throw Error("Unknown action.","NOT_FOUND",404)};
        r.ManagerNotes=Text(i.Reason); await db.SaveAsync(t); return await Card(r,t);
    },ct);
    public Task<(byte[] Bytes,string ContentType)> HorseFileAsync(string actor,string horse,string kind,string? requestId,CancellationToken ct)=>db.RunAsync(async t=>{
        var u=await Actor(actor,null,t); var h=await db.FindAsync<FlowHorse>(horse,t)??throw Error("Horse not found.","NOT_FOUND",404);
        if(Role(u)==UserRoles.Customer) Require(h.OwnerID==actor,"FORBIDDEN","Horse file not available.");
        else {
            Require(requestId is not null && (await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==requestId && x.HorseID==horse,t)).Any(),"FORBIDDEN","File not attached to request.");
            if(Role(u)!=UserRoles.LogisticsManager) await Released(requestId!,actor,null,t);
        }
        var file=kind switch {"photo"=>h.PhotoUrl,"passport"=>h.PassportScanUrl,_=>null};
        Require(file is not null,"FILE_UNAVAILABLE","Document unavailable."); return await files.ReadAsync(file!,t);
    },ct);
    public async Task<FlowHorseCard> UpdateFilesAsync(string id,string actor,string version,UploadedFile photo,UploadedFile passport,CancellationToken ct)
    {
        await db.RunAsync(async t=>{await Actor(actor,UserRoles.Customer,t);var h=await db.FindAsync<FlowHorse>(id,t);Require(h is not null && h.OwnerID==actor,"NOT_FOUND","Horse not found.");Check(h.RowVersion,version);Require(!await DocumentsLocked(id,t),"HORSE_IN_USE","An active request locks this horse's files.");return 0;},ct);
        var p=await files.PutAsync(photo,true,ct);var scan=await files.PutAsync(passport,false,ct);
        return await db.RunAsync(async t=>{await Actor(actor,UserRoles.Customer,t);var h=(await db.FindAsync<FlowHorse>(id,t))!;Require(h.OwnerID==actor,"FORBIDDEN","Horse belongs to another account.");Check(h.RowVersion,version);Require(!await DocumentsLocked(id,t),"HORSE_IN_USE","Horse is now assigned to an active request.");h.PhotoUrl=p;h.PassportScanUrl=scan;await db.SaveAsync(t);return HorseCard(h);},ct);
    }
}
