using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Application.Flow1.Interfaces;
using Application.Flow1.Services;
using Domain.Enums;
using Domain.Flow1.Entities;
using static Application.Flow6.Rules.BusinessRules;
namespace Application.Flow6.Services;
public sealed partial class AftercareService(IAftercareStore db, IOtpSecurity security, IDeliveryOtpSender sender, IPaymentGateway gateway, TimeProvider clock, IDeliveryRenderer renderer, IRuntimeGuards runtime)
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;
    private static string? S(JsonObject o,string k)=>o[k]?.GetValue<string>();
    private static decimal N(JsonObject o,string k)=>o[k]?.GetValue<decimal>()??0;
    private static bool B(JsonObject o,string k)=>o[k]?.GetValue<bool>()??false;
    private static DateTime? D(JsonObject o,string k)=>S(o,k) is string v ? DateTime.Parse(v,CultureInfo.InvariantCulture,DateTimeStyles.AdjustToUniversal):null;
    private static JsonObject J(object o)=>JsonSerializer.SerializeToNode(o,new JsonSerializerOptions(JsonSerializerDefaults.Web))!.AsObject();
    private static JsonArray A(IEnumerable<JsonObject> rows)=>new(rows.Select(x=>(JsonNode)x.DeepClone()).ToArray());
    private Task<List<JsonObject>> Q(string sql,CancellationToken ct,params (string,object?)[] args)=>db.Query(sql,ct,args);
    private async Task<JsonObject> One(string sql,CancellationToken ct,params (string,object?)[] args)
        =>(await Q(sql,ct,args)).SingleOrDefault()??throw new AftercareException("NOT_FOUND","Resource not found.",404);
    private Task E(string sql,CancellationToken ct,params (string,object?)[] args)=>db.Execute(sql,ct,args);
    public async Task<object?> Invoke(string op,string actor,string? id,JsonObject? body,string key,string ip,CancellationToken ct)
    {
        var schema=ApiContract.Operations[op]?["schema"];
        if(schema is not null) ApiContract.Validate(body,schema);
        else Require(body is null,"VALIDATION_ERROR","This operation has no body.",400);
        foreach(var p in ApiContract.Operations[op]!["parameters"]!.AsArray().Where(x=>S(x!.AsObject(),"in")=="path"))
            ApiContract.Validate(JsonValue.Create(id),p!["schema"]!,"id");
        var dedupe=op is "F6-J11" or "F6-J19" or "F6-J29" or "F6-J34";
        if(dedupe) Require(Guid.TryParseExact(key,"D",out _),"VALIDATION_ERROR","Idempotency-Key UUID is required.",400);
        var cacheKey=actor+":"+op+":"+(dedupe?Guid.Parse(key).ToString("D"):"");
        var hash=Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(id+":"+Canonical(body))));
        // Acquire the local retry lock before the SQL lock; remember only committed results.
        using var lease=dedupe?await runtime.LockCommands(ct):null;
        var replayed=false;
        var committed = await db.Transaction<object?>(async()=>
        {
            await Authorize(op,actor,id,ct); // Recheck access even for cached responses.
            if(dedupe && runtime.TryReplay(cacheKey,hash,out var previous)) {replayed=true;return previous;}
            return await Dispatch(op,actor,id,body,ip,ct);
        },ct);
        if(dedupe && !replayed)runtime.Remember(cacheKey,hash,committed);
        if(committed is JsonObject err && S(err,"flow6CommittedError") is string error) throw new AftercareException(error,"OTP is invalid or expired.",400);
        return committed;
    }
    private static string Canonical(JsonNode? node) => node switch
    {
        JsonObject o=>"{"+string.Join(",",o.OrderBy(x=>x.Key,StringComparer.Ordinal).Select(x=>JsonSerializer.Serialize(x.Key)+":"+Canonical(x.Value)))+"}",
        JsonArray a=>"["+string.Join(",",a.Select(Canonical))+"]", _=>node?.ToJsonString()??"null"
    };
    private async Task Authorize(string op,string actor,string? id,CancellationToken ct)
    {
        var account=await One("SELECT Role,IsActive FROM [USER] WHERE UserID=@a",ct,("@a",actor));
        Require(B(account,"IsActive"),"FORBIDDEN","Inactive account.",403);
        var storedRole=S(account,"Role")?.Trim().ToUpperInvariant();
        Require(new[]{"CUSTOMER","CUST","MANAGER","LOGISTICS_MANAGER","DRIVER","ESCORT","DRIVER_ESCORT","COORDINATOR","FLEET_ROUTE_COORDINATOR","SPECIALIST","TRANSPORT_SPECIALIST","ADMIN"}.Contains(storedRole),"FORBIDDEN","Unknown database role.",403);
        var num=int.Parse(op[^2..]);
        var role=num<=11||num is 38 or 39 or 40 or 45?UserRoles.DriverEscort:num is 12 or 13 or 18 or 21 or 23 or 24 or 25 or 29 or 30 or 34 or 35 or 41 or 46?UserRoles.Customer:UserRoles.LogisticsManager;
        Require(UserRoles.NormalizeRole(S(account,"Role"))==role,"FORBIDDEN","Role not permitted.",403);
        if(id is null || role==UserRoles.LogisticsManager) return;
        if(role==UserRoles.Customer)
        {
            var rows=await Q("SELECT s.SettlementID FROM TRIP_SETTLEMENT s WHERE s.CustomerID=@a AND (s.SettlementID=@id OR s.FinalInvoiceID=@id OR EXISTS(SELECT 1 FROM PAYMENT p WHERE p.InvoiceID=s.FinalInvoiceID AND p.PaymentID=@id))",ct,("@a",actor),("@id",id));
            Require(rows.Count==1,"NOT_FOUND","Resource not found.",404);return;
        }
        var scope=await Q("SELECT DISTINCT t.TripID FROM TRIP_PLAN t JOIN TRIP_VEHICLE_ASSIGNMENT v ON v.TripID=t.TripID WHERE (v.DriverID=@a OR v.EscortID=@a) AND (t.TripID=@id OR EXISTS(SELECT 1 FROM HANDOVER h WHERE h.TripID=t.TripID AND h.HandoverID=@id) OR EXISTS(SELECT 1 FROM HANDOVER_REVISION r WHERE r.TripID=t.TripID AND r.HandoverRevisionID=@id))",ct,("@a",actor),("@id",id));
        Require(scope.Count==1,"NOT_FOUND","Resource not found.",404);
    }
    private async Task<string> Next(string sequence,string prefix,CancellationToken ct)
    {
        // Names come exclusively from module constants, never caller input.
        var row=await One($"SELECT NEXT VALUE FOR dbo.[SEQ_{sequence}_ID] AS n",ct);
        return prefix+"_"+((long)N(row,"n")).ToString("000",CultureInfo.InvariantCulture);
    }
    private Task<JsonObject> Scope(string trip,CancellationToken ct)=>One("SELECT t.TripID,t.Status TripStatus,t.DeploymentStatus,r.RequestID,r.CustomerID,r.Status RequestStatus,r.DesignatedReceiverName,r.DesignatedReceiverPhone,r.DestinationCountry,r.TransportType,c.ContractID,c.CurrentVersionNo,c.ContractStatus,c.DepositAmount,v.ContentSnapshot,v.VersionStatus FROM TRIP_PLAN t JOIN TRANSPORT_REQUEST r ON r.RequestID=t.RequestID JOIN CONTRACT c ON c.TripID=t.TripID AND c.RequestID=r.RequestID AND c.CustomerID=r.CustomerID JOIN CONTRACT_VERSION v ON v.ContractID=c.ContractID AND v.VersionNo=c.CurrentVersionNo WHERE t.TripID=@id",ct,("@id",trip));
    private static JsonObject Lifecycle(JsonObject s)=>J(new{tripStatus=S(s,"TripStatus"),requestStatus=S(s,"RequestStatus"),contractStatus=S(s,"ContractStatus")});
    private async Task Eligible(JsonObject scope,CancellationToken ct)
    {
        Require(S(scope,"TripStatus")=="IN_TRANSIT" && S(scope,"RequestStatus")=="IN_PROGRESS" && S(scope,"ContractStatus")=="EFFECTIVE" && S(scope,"VersionStatus")=="SIGNED" && S(scope,"DeploymentStatus")=="CONFIRMED","INVALID_STATE","Trip is not eligible for delivery.");
        var arrived=await Q("SELECT SegmentID FROM ROUTE_SEGMENT WHERE TripID=@t AND SegmentType='DESTINATION' AND Status='COMPLETED' AND ActualTime IS NOT NULL UNION ALL SELECT MilestoneID FROM TRIP_MILESTONE WHERE TripID=@t AND MilestoneKind='FINAL_ARRIVED' AND Status='COMPLETED' AND OccurredAt IS NOT NULL",ct,("@t",S(scope,"TripID")));
        Require(arrived.Count>0,"HANDOVER_NOT_READY","Actual final arrival must be recorded; ETA is not evidence of arrival.");
        var paid=await One("SELECT COALESCE(SUM(p.Amount),0) paid FROM INVOICE i JOIN PAYMENT p ON p.InvoiceID=i.InvoiceID AND p.Status='SUCCESS' AND p.Method='VNPAY' AND p.CurrencyCode='VND' WHERE i.ContractID=@c AND i.ContractVersionNo=@v AND i.InvoiceType='DEPOSIT' AND i.PaymentStatus='PAID'",ct,("@c",S(scope,"ContractID")),("@v",N(scope,"CurrentVersionNo")));
        Require(N(scope,"DepositAmount")>0 && N(paid,"paid")>=N(scope,"DepositAmount"),"DEPOSIT_NOT_VERIFIED","Verified deposit is insufficient.");
    }
    private async Task<decimal> Policy(JsonObject scope,string code,string unit,CancellationToken ct)
    {
        var rows=await Q("SELECT * FROM BUSINESS_POLICY WHERE Code=@c",ct,("@c",code));
        var policies=rows.Select(x=>new BusinessPolicy{Code=S(x,"Code")!,ScopeType=S(x,"ScopeType")!,ScopeID=S(x,"ScopeID"),ValueType=S(x,"ValueType")!,Unit=S(x,"Unit"),NumberValue=x["NumberValue"] is null?null:N(x,"NumberValue"),TextValue=S(x,"TextValue"),BoolValue=x["BoolValue"] is null?null:B(x,"BoolValue")}).ToArray();
        return PolicyService.Resolve(policies,code,unit,S(scope,"DestinationCountry"),S(scope,"TransportType"),1,10080,true);
    }
}
