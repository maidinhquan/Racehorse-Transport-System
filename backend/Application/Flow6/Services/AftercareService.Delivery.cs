using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using static Application.Flow6.Rules.BusinessRules;
namespace Application.Flow6.Services;
public sealed partial class AftercareService
{
    private const string RevisionSql="SELECT HandoverRevisionID id,HandoverID handoverId,RevisionNo number,Status status,ContentSnapshot content,CreatedAtUtc createdAtUtc,ConfirmedAtUtc confirmedAtUtc,RefusalReason refusalReason,RefusedAtUtc refusedAtUtc FROM HANDOVER_REVISION";
    private async Task<JsonObject> Revision(string id,CancellationToken ct)
    { var r=await One(RevisionSql+" WHERE HandoverRevisionID=@id",ct,("@id",id)); r["content"]=JsonNode.Parse(S(r,"content")!);
      try {ApiContract.Validate(r["content"],ApiContract.Schemas["FrozenContent"]!);}catch(AftercareException){throw new AftercareException("LEGACY_SNAPSHOT_UNAVAILABLE","Legacy handover has no complete immutable delivery snapshot; migration is required.");}
      return r; }
    private async Task<JsonObject> Delivery(string id,CancellationToken ct)=>await One("SELECT h.HandoverID id,h.TripID tripId,h.Status status,r.HandoverRevisionID currentRevisionId FROM HANDOVER h CROSS APPLY(SELECT TOP 1 HandoverRevisionID FROM HANDOVER_REVISION WHERE HandoverID=h.HandoverID ORDER BY RevisionNo DESC) r WHERE h.HandoverID=@id",ct,("@id",id));
    private async Task<JsonObject> RawRevision(string id,CancellationToken ct)
    {
        var r=await One("SELECT * FROM HANDOVER_REVISION WHERE HandoverRevisionID=@id",ct,("@id",id));
        var latest=await One("SELECT TOP 1 HandoverRevisionID FROM HANDOVER_REVISION WHERE HandoverID=@h ORDER BY RevisionNo DESC",ct,("@h",S(r,"HandoverID")));
        Require(S(latest,"HandoverRevisionID")==id,"INVALID_STATE","Only latest revision can be changed.");return r;
    }
    private async Task<JsonObject> Freeze(string trip,JsonObject content,CancellationToken ct)
    {
        var scope=await Scope(trip,ct); await Eligible(scope,ct);
        var horses=await Q("SELECT h.HorseID,h.Name,h.Microchip_ISO FROM REQUEST_HORSE_MAPPING m JOIN HORSE h ON h.HorseID=m.HorseID WHERE m.RequestID=@r",ct,("@r",S(scope,"RequestID")));
        var ids=content["items"]!.AsArray().Select(x=>x!["horseId"]!.GetValue<string>()).ToArray();
        Require(ids.Length==ids.Distinct().Count() && ids.Order().SequenceEqual(horses.Select(x=>S(x,"HorseID")!).Order()),"HORSE_SET_MISMATCH","All request horses must be present exactly once.",400);
        var frozen=content.DeepClone().AsObject();
        var designatedEmail=S(scope,"DesignatedReceiverEmail")??S(scope,"CustomerEmail");
        if(!string.IsNullOrWhiteSpace(designatedEmail)&&frozen["receiver"] is JsonObject rcv)
        {
            rcv["otpEmail"]=designatedEmail;
        }
        foreach(var item in frozen["items"]!.AsArray())
        {
            var h=horses.Single(x=>S(x,"HorseID")==item!["horseId"]!.GetValue<string>());
            item!["identity"]=J(new{name=S(h,"Name"),microchip=S(h,"Microchip_ISO")});
            Require(item["documentsReceivedAtUtc"] is null || DateTime.Parse(item["documentsReceivedAtUtc"]!.GetValue<string>()).ToUniversalTime()<=Now,"VALIDATION_ERROR","Document receipt cannot be in the future.",400);
        }
        return frozen;
    }
    private async Task UpdateItems(string handover,JsonObject content,CancellationToken ct)
    {
        var receiver=content["receiver"]!.AsObject();
        await E("UPDATE HANDOVER SET LocationName=@l,ReceiverName=@n,ReceiverPhone=@p,IsAuthorized=@a,DocumentsHandedOver=@d,Status='DRAFT' WHERE HandoverID=@h; DELETE HANDOVER_ITEM WHERE HandoverID=@h",ct,("@l",S(content,"location")),("@n",S(receiver,"name")),("@p",S(receiver,"phone")),("@a",B(receiver,"authorized")),("@d",S(content,"commonDocuments")),("@h",handover));
        foreach(var value in content["items"]!.AsArray())
        {
            var i=value!.AsObject();var iid=await Next("HANDOVER_ITEM","HANDOVER_ITEM",ct);
            await E("INSERT HANDOVER_ITEM(HandoverItemID,HandoverID,HorseID,MicrochipVerified,ConditionStatus,AssetCheck,DocumentsHandedOver,DocumentsReceivedAtUtc) VALUES(@id,@h,@horse,@chip,@condition,@assets,@docs,@at)",ct,("@id",iid),("@h",handover),("@horse",S(i,"horseId")),("@chip",B(i,"microchipVerified")),("@condition",S(i,"condition")),("@assets",S(i,"assets")),("@docs",S(i,"documents")),("@at",D(i,"documentsReceivedAtUtc")));
        }
    }
    private async Task<JsonObject> CreateRevision(string trip,string handover,string actor,JsonObject content,int number,CancellationToken ct)
    {
        var frozen=await Freeze(trip,content,ct);var id=await Next("HANDOVER_REVISION","HANDOVER_REVISION",ct);
        await E("INSERT HANDOVER_REVISION(HandoverRevisionID,HandoverID,TripID,RevisionNo,ContentSnapshot,CreatedBy,CreatedAtUtc) VALUES(@id,@h,@t,@n,@c,@a,@now)",ct,("@id",id),("@h",handover),("@t",trip),("@n",number),("@c",frozen.ToJsonString()),("@a",actor),("@now",Now));
        await UpdateItems(handover,content,ct);return await Revision(id,ct);
    }
    private async Task<object?> Dispatch(string op,string actor,string? id,JsonObject? body,string ip,CancellationToken ct)
    {
        switch(op)
        {
            case "F6-J01":return A(await Q("SELECT DISTINCT t.TripID tripId,t.RequestID requestId,t.Status status FROM TRIP_PLAN t JOIN TRIP_VEHICLE_ASSIGNMENT v ON v.TripID=t.TripID WHERE (v.DriverID=@a OR v.EscortID=@a) AND t.Status IN('IN_TRANSIT','COMPLETED')",ct,("@a",actor)));
            case "F6-J02":
            {
                var s=await Scope(id!,ct);var pickups=await Q("SELECT HandoverID FROM HANDOVER WHERE TripID=@t AND Type='PICKUP' AND Status='CONFIRMED'",ct,("@t",id));
                var horses=await Q("SELECT HorseID FROM REQUEST_HORSE_MAPPING WHERE RequestID=@r",ct,("@r",S(s,"RequestID")));
                var delivery=(await Q("SELECT HandoverID FROM HANDOVER WHERE TripID=@t AND Type='DELIVERY'",ct,("@t",id))).SingleOrDefault();
                return J(new{tripId=id,requestId=S(s,"RequestID"),contractId=S(s,"ContractID"),contractVersionNo=N(s,"CurrentVersionNo"),lifecycle=Lifecycle(s),pickupHandoverIds=pickups.Select(x=>S(x,"HandoverID")),horseIds=horses.Select(x=>S(x,"HorseID")),designatedReceiverName=S(s,"DesignatedReceiverName"),designatedReceiverPhone=S(s,"DesignatedReceiverPhone"),designatedReceiverEmail=S(s,"DesignatedReceiverEmail")??S(s,"CustomerEmail"),deliveryHandoverId=delivery is null?null:S(delivery,"HandoverID"),warnings=pickups.Count==0?new[]{"PICKUP_BASELINE_MISSING"}:Array.Empty<string>()});
            }
            case "F6-J03":
            {
                var frozen=await Freeze(id!,body!,ct);
                Require((await Q("SELECT HandoverID FROM HANDOVER WHERE TripID=@t AND Type='DELIVERY'",ct,("@t",id))).Count==0,"DELIVERY_EXISTS","Delivery already exists.");
                var h=await Next("HANDOVER","HANDOVER",ct);
                await E("INSERT HANDOVER(HandoverID,TripID,HandedByUserID,Type,Status) VALUES(@h,@t,@a,'DELIVERY','DRAFT')",ct,("@h",h),("@t",id),("@a",actor));
                await CreateRevision(id!,h,actor,body!,1,ct);return await Delivery(h,ct);
            }
            case "F6-J04":return await Delivery(id!,ct);
            case "F6-J05":return await Revision(id!,ct);
            case "F6-J06":
            {
                var r=await RawRevision(id!,ct);Require(S(r,"Status")=="DRAFT","INVALID_STATE","Invalidate OTP before changing content.");
                var frozen=await Freeze(S(r,"TripID")!,body!,ct);
                await E("UPDATE HANDOVER_REVISION SET ContentSnapshot=@c WHERE HandoverRevisionID=@id",ct,("@c",frozen.ToJsonString()),("@id",id));await UpdateItems(S(r,"HandoverID")!,body!,ct);return await Revision(id!,ct);
            }
            case "F6-J07":return await SendOtp(id!,actor,ct);
            case "F6-J08":
            {
                var r=await RawRevision(id!,ct);Require(S(r,"Status")=="AWAITING_OTP","INVALID_STATE","No active OTP.");
                runtime.ChargeOtp(S(r,"HandoverID")!,Now,false,60);
                runtime.ChargeOtp("actor:"+actor,Now,false,60);
                await ClearOtp(id!,"DRAFT",null,ct);return await Revision(id!,ct);
            }
            case "F6-J09":return await Confirm(id!,actor,S(body!,"otp")!,ct);
            case "F6-J10":
            {
                var r=await RawRevision(id!,ct);Require(S(r,"Status") is "DRAFT" or "AWAITING_OTP","INVALID_STATE","Revision is immutable.");
                await ClearOtp(id!,"REFUSED",S(body!,"reason"),ct);await Notify(S(r,"TripID")!,"DELIVERY_REFUSED",ct);return await Revision(id!,ct);
            }
            case "F6-J11":
            {
                var h=await Delivery(id!,ct);var r=await RawRevision(S(h,"currentRevisionId")!,ct);Require(S(r,"Status")=="REFUSED","INVALID_STATE","Only refused handovers allow a new revision.");
                return await CreateRevision(S(h,"tripId")!,id!,actor,body!,(int)N(r,"RevisionNo")+1,ct);
            }
            case "F6-J38":
            {
                var rows=await Q("SELECT HandoverID,ReceiverName FROM HANDOVER WHERE TripID=@t AND Type='PICKUP' AND Status='CONFIRMED'",ct,("@t",id));var result=new JsonArray();
                foreach(var h in rows) {var items=await Q("SELECT HorseID horseId,MicrochipVerified microchipVerified,ConditionStatus condition,AssetCheck assets,DocumentsHandedOver documents,DocumentsReceivedAtUtc documentsReceivedAtUtc FROM HANDOVER_ITEM WHERE HandoverID=@h",ct,("@h",S(h,"HandoverID")));result.Add(J(new{handoverId=S(h,"HandoverID"),receiverName=S(h,"ReceiverName"),items=A(items)}));}return result;
            }
            case "F6-J39":return A(await Q("SELECT LogID id,HorseID horseId,LogTime recordedAtUtc,Description description,HealthStatus healthStatus FROM HEALTH_LOG WHERE TripID=@t",ct,("@t",id)));
            case "F6-J40":return A(await Q("SELECT IncidentID id,Status status,Description description FROM INCIDENT WHERE TripID=@t",ct,("@t",id)));
            default:return await SettlementDispatch(op,actor,id??"",body,ip,ct);
        }
    }
    private async Task ClearOtp(string id,string state,string? reason,CancellationToken ct)
    {
        await E("UPDATE HANDOVER_REVISION SET Status=@s,OtpEmail=NULL,OtpHash=NULL,OtpSentAtUtc=NULL,OtpExpiresAtUtc=NULL,OtpFailedAttempts=0,RefusalReason=@r,RefusedAtUtc=@at WHERE HandoverRevisionID=@id; UPDATE h SET Status=@s FROM HANDOVER h JOIN HANDOVER_REVISION r ON r.HandoverID=h.HandoverID WHERE r.HandoverRevisionID=@id",ct,("@s",state),("@r",reason),("@at",reason is null?null:Now),("@id",id));
    }
    private async Task<object> SendOtp(string id,string actor,CancellationToken ct)
    {
        var r=await RawRevision(id,ct);Require(S(r,"Status") is "DRAFT" or "AWAITING_OTP","INVALID_STATE","Immutable revision.");
        var scope=await Scope(S(r,"TripID")!,ct);await Eligible(scope,ct);
        var content=JsonNode.Parse(S(r,"ContentSnapshot")!)!.AsObject();
        Require(B(content["receiver"]!.AsObject(),"authorized") && content["items"]!.AsArray().All(x=>x!["microchipVerified"]!.GetValue<bool>()),"HANDOVER_NOT_READY","Verify receiver authorization and every microchip.");
        var ttl=await Policy(scope,"HANDOVER_OTP_TTL_MINUTES","MINUTE",ct);var resend=await Policy(scope,"HANDOVER_OTP_RESEND_SECONDS","SECOND",ct);var max=await Policy(scope,"HANDOVER_OTP_MAX_ATTEMPTS","ATTEMPT",ct);
        Require(N(r,"OtpFailedAttempts")<max,"OTP_ATTEMPTS_EXCEEDED","Invalidate and recheck receiver before another session.");
        // The existing revision timestamp also enforces cooldown after process restart.
        Require(D(r,"OtpSentAtUtc") is not DateTime sent || sent.AddSeconds((double)resend)<=Now,
            "OTP_RESEND_TOO_SOON","Wait before requesting another OTP.",429);
        runtime.ChargeOtp(S(r,"HandoverID")!,Now,true,(int)resend);
        runtime.ChargeOtp("actor:"+actor,Now,false,(int)resend);
        var email=S(content["receiver"]!.AsObject(),"otpEmail")!;var code=security.NewCode();var expires=Now.AddMinutes((double)ttl);
        // Provider failure rolls back this attempt; hash is bound to immutable content + receiver.
        await sender.Send(email,code,id,Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(content.ToJsonString()))),expires,ct);
        await E("UPDATE HANDOVER_REVISION SET Status='AWAITING_OTP',OtpEmail=@e,OtpHash=@hash,OtpSentAtUtc=@now,OtpExpiresAtUtc=@exp WHERE HandoverRevisionID=@id; UPDATE HANDOVER SET Status='AWAITING_OTP' WHERE HandoverID=@h",ct,("@e",email),("@hash",security.Digest("flow6:"+id+":"+email,code)),("@now",Now),("@exp",expires),("@id",id),("@h",S(r,"HandoverID")));
        return J(new{revisionId=id,expiresAtUtc=expires.ToString("yyyy-MM-ddTHH:mm:ss.fffffffZ"),resendAfterUtc=Now.AddSeconds((double)resend).ToString("yyyy-MM-ddTHH:mm:ss.fffffffZ"),attemptsRemaining=max-N(r,"OtpFailedAttempts")});
    }
    private async Task<object> Confirm(string id,string actor,string otp,CancellationToken ct)
    {
        var r=await RawRevision(id,ct);var scope=await Scope(S(r,"TripID")!,ct);
        if(S(r,"Status")=="CONFIRMED")return J(new{revision=await Revision(id,ct),lifecycle=Lifecycle(scope)});
        await Eligible(scope,ct);Require(S(r,"Status")=="AWAITING_OTP","INVALID_STATE","Request an OTP first.");
        var max=await Policy(scope,"HANDOVER_OTP_MAX_ATTEMPTS","ATTEMPT",ct);
        Require(N(r,"OtpFailedAttempts")<max,"OTP_ATTEMPTS_EXCEEDED","Attempt limit reached.",400);
        if(D(r,"OtpExpiresAtUtc")<=Now || !security.Matches(S(r,"OtpHash")!,security.Digest("flow6:"+id+":"+S(r,"OtpEmail"),otp)))
        {await E("UPDATE HANDOVER_REVISION SET OtpFailedAttempts=OtpFailedAttempts+1 WHERE HandoverRevisionID=@id",ct,("@id",id));return J(new{flow6CommittedError="OTP_INVALID_OR_EXPIRED"});}
        await E("UPDATE HANDOVER_REVISION SET Status='CONFIRMED',OtpHash=NULL,ConfirmedAtUtc=@now WHERE HandoverRevisionID=@id; UPDATE HANDOVER SET Status='CONFIRMED' WHERE HandoverID=@h; UPDATE TRIP_PLAN SET Status='COMPLETED' WHERE TripID=@t; UPDATE TRANSPORT_REQUEST SET Status='DELIVERED' WHERE RequestID=@q",ct,("@now",Now),("@id",id),("@h",S(r,"HandoverID")),("@t",S(r,"TripID")),("@q",S(scope,"RequestID")));
        await E("UPDATE v SET Status='AVAILABLE' FROM VEHICLE v WHERE v.Status='ON_TRIP' AND EXISTS(SELECT 1 FROM TRIP_VEHICLE_ASSIGNMENT a WHERE a.VehicleID=v.VehicleID AND a.TripID=@t) AND NOT EXISTS(SELECT 1 FROM TRIP_VEHICLE_ASSIGNMENT a JOIN TRIP_PLAN p ON p.TripID=a.TripID WHERE a.VehicleID=v.VehicleID AND p.Status='IN_TRANSIT')",ct,("@t",S(r,"TripID")));
        var settlement=await Prepare(S(r,"TripID")!,actor,ct);
        await E("UPDATE TRIP_SETTLEMENT SET HandoverRevisionID=@r WHERE SettlementID=@s AND Status='DRAFT'",ct,("@r",id),("@s",S(settlement,"id")));
        await Notify(S(r,"TripID")!,"DELIVERY_CONFIRMED",ct);
        return J(new{revision=await Revision(id,ct),lifecycle=Lifecycle(await Scope(S(r,"TripID")!,ct))});
    }
    private async Task Notify(string trip,string kind,CancellationToken ct)
    {
        // Existing durable notification table; no claim of email delivery.
        var users=await Q("SELECT u.UserID FROM [USER] u WHERE u.IsActive=1 AND (u.UserID=(SELECT r.CustomerID FROM TRIP_PLAN t JOIN TRANSPORT_REQUEST r ON r.RequestID=t.RequestID WHERE t.TripID=@t) OR u.Role IN('Manager','MANAGER','LOGISTICS_MANAGER') OR u.UserID=(SELECT AssignedCoordinatorId FROM TRIP_PLAN WHERE TripID=@t))",ct,("@t",trip));
        var title = kind == "DELIVERY_CONFIRMED" ? "Giao ngựa thành công" : (kind == "DELIVERY_REFUSED" ? "Từ chối nhận bàn giao" : kind);
        var message = kind == "DELIVERY_CONFIRMED" ? $"Chuyến vận chuyển {trip} đã hoàn thành và giao ngựa an toàn." : (kind == "DELIVERY_REFUSED" ? $"Chuyến vận chuyển {trip} bị từ chối nhận bàn giao." : $"{kind}: {trip}");
        foreach(var u in users) await E("INSERT NOTIFICATION(NotificationID,UserID,Title,Message,IsRead,SentAt) VALUES(@id,@u,@k,@m,0,@now)",ct,("@id",await Next("NOTIFICATION","NOTIFICATION",ct)),("@u",S(u,"UserID")),("@k",title),("@m",message),("@now",Now));
    }
}
