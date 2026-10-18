using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Domain.Flow1;
using Flow1LegacySupport;
using Infrastructure.Data.Context;
using Infrastructure.Storage;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Flow1RelationalConvert;
public sealed record ConversionResult(string Fingerprint,string TypedParityFingerprint,int Documents,int Horses,int Requests,int Contracts,int Payments,int Trips,string[] Blockers,bool Applied,bool RetainedColumnsDropped,string[]? RetainedUnverifiedHistory=null);
public sealed class RelationalConverter(Flow1RelationalContext db,string sourceRoot,string privateRoot,IReadOnlySet<string>? retainUnverifiedHistory=null)
{
    private static readonly JsonSerializerOptions Json=new(JsonSerializerDefaults.Web){UnmappedMemberHandling=System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow};
    private static readonly (string Table,string Key)[] Tables=[("HORSE","HorseID"),("TRANSPORT_REQUEST","RequestID"),("CONTRACT","ContractID"),("PAYMENT","PaymentID"),("INVOICE","InvoiceID"),("TRIP_PLAN","TripID"),("REQUEST_HORSE_MAPPING","RequestHorseID"),("USER","UserID"),("NOTIFICATION","NotificationID")];
    private static readonly HashSet<string> NewColumns=new("RowVersion,PhotoUrl,PassportScanUrl,PickupLatitude,PickupLongitude,DeliveryLatitude,DeliveryLongitude,DistanceKm,PickupContactName,PickupContactPhone,ManagerNotes,OriginCountry,DestinationCountry,PreparationDays,PdfUrl,SignOtpHash,SignOtpExpiry,SignOtpFailedAttempts,DepositDeadline,DepositAmount,PdfSha256,SignOtpSentAtUtc,SignerEmail,PublishedAtUtc,PublishedBy,EffectiveSignDeadline,SignedDepositDeadline,LastExtensionTarget,LastExtensionReason,LastExtensionBy,LastExtensionAtUtc,CancellationId,CancellationStatus,CancellationReason,CancellationRequestedAtUtc,CancellationDecisionReason,CancellationDecidedBy,CancellationDecidedAtUtc,IsCurrent,VnpayBankCode,VnpayResponseCode,VnpayTransactionStatus,VnpayTmnCode,VnpayCreatedAtUtc,VnpayExpiresAtUtc,VnpayReceivedAmount,FinancialReviewRequired,FinancialReviewReason,FinancialReviewedBy,FinancialReviewedAtUtc,DeploymentStatus,DeploymentReason,DeploymentBy,DeploymentAtUtc,HandoffEventId,RoutingAcknowledgedBy,RoutingAcknowledgedAtUtc,DocumentsAcknowledgedBy,DocumentsAcknowledgedAtUtc".Split(','),StringComparer.Ordinal);
    private readonly Dictionary<(string,string),Flow1StateDocument> documents=[];
    private readonly List<string> blockers=[];
    private static string Hash(string x)=>Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(x)));
    private static void Ensure([System.Diagnostics.CodeAnalysis.DoesNotReturnIf(false)] bool test,string code){if(!test)throw new InvalidDataException(code);}
    private async Task<SqlCommand> Command(string sql)
    {
        var cn=(SqlConnection)db.Database.GetDbConnection();if(cn.State!=ConnectionState.Open)await cn.OpenAsync();
        return new(sql,cn,(SqlTransaction?)db.Database.CurrentTransaction?.GetDbTransaction()){CommandTimeout=60};
    }
    private async Task<string?> Property(string name)
    {await using var c=await Command("SELECT CONVERT(nvarchar(128),value) FROM sys.extended_properties WHERE class=0 AND name=@name;");c.Parameters.AddWithValue("@name",name);return await c.ExecuteScalarAsync() as string;}
    private async Task Property(string name,string value)
    {await using var c=await Command("IF EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=@name) EXEC sys.sp_updateextendedproperty @name=@name,@value=@value; ELSE EXEC sys.sp_addextendedproperty @name=@name,@value=@value;");c.Parameters.AddWithValue("@name",name);c.Parameters.AddWithValue("@value",value);await c.ExecuteNonQueryAsync();}
    private async Task<bool> Column(string table,string name)
    {await using var c=await Command("SELECT COL_LENGTH(N'dbo.'+QUOTENAME(@t),@n);");c.Parameters.AddWithValue("@t",table);c.Parameters.AddWithValue("@n",name);return await c.ExecuteScalarAsync() is not DBNull;}
    // Fingerprints stay in RAM/operational schema properties. No row payload is exported or persisted.
    private async Task<string> DataFingerprint(bool originalBusinessOnly=false)
    {
        using var hash=IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        foreach(var(t,k)in Tables.Where(x=>!originalBusinessOnly||x.Table!="NOTIFICATION"))
        {
            await using var cols=await Command("SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND name NOT IN ('Flow1StateJson','Flow1StateVersion') ORDER BY column_id;");cols.Parameters.AddWithValue("@t",t);var names=new List<string>();
            await using(var reader=await cols.ExecuteReaderAsync()){while(await reader.ReadAsync()){var n=reader.GetString(0);if(!originalBusinessOnly||!NewColumns.Contains(n))names.Add(n);}}
            Ensure(names.Count>0,"SCHEMA_MISSING");var quoted=string.Join(',',names.Select(n=>"["+n.Replace("]","]]")+"]"));
            await using var rows=await Command($"SELECT {quoted} FROM dbo.[{t}] WITH (TABLOCK,HOLDLOCK) ORDER BY [{k}];");await using var r=await rows.ExecuteReaderAsync();var count=0;
            hash.AppendData(Encoding.UTF8.GetBytes(t+"\n"));
            while(await r.ReadAsync()){Ensure(++count<=10000,"DATASET_LIMIT");var cells=new object?[r.FieldCount];for(var i=0;i<cells.Length;i++)cells[i]=r.IsDBNull(i)?null:r.GetValue(i);hash.AppendData(JsonSerializer.SerializeToUtf8Bytes(cells,Json));hash.AppendData([10]);}
        }
        return Convert.ToHexString(hash.GetHashAndReset());
    }
    private void Add(Flow1StateDocument d)
    {
        Ensure(d.SchemaVersion==1&&Regex.IsMatch(d.AggregateId,@"\A[A-Za-z0-9_-]{1,50}\z")&&d.Revisions.Count>0,"INVALID_DOCUMENT");
        Ensure(d.Revisions.Select((r,i)=>r.Version==i+1&&r.CreatedAtUtc.Kind==DateTimeKind.Utc&&r.Payload.ValueKind==JsonValueKind.Object&&r.RequestHash.Equals(Hash(JsonSerializer.Serialize(r.Payload,Json)),StringComparison.OrdinalIgnoreCase)).All(x=>x)&&d.Revisions.Select(r=>r.OperationId).Distinct().Count()==d.Revisions.Count,"REVISION_OR_HASH");
        var key=(d.AggregateType,d.AggregateId);if(documents.TryGetValue(key,out var old))Ensure(Hash(JsonSerializer.Serialize(old,Json))==Hash(JsonSerializer.Serialize(d,Json)),"SOURCE_CONFLICT");else documents.Add(key,d);
        Ensure(new[]{"horse","request","review","plan","contract","publication","contract-otp","acceptance","extensions","payment-ledger","payment-sessions","financial-review","cancellation","activation","deployment","lifecycle","otp-account"}.Contains(d.AggregateType),"UNKNOWN_DOCUMENT_KIND");
        var latest=d.Revisions[^1].Payload;
        if(latest.TryGetProperty("pending",out var pending)&&pending.ValueKind!=JsonValueKind.Null)throw new InvalidDataException("PENDING_SOURCE");
        if(latest.TryGetProperty("outcome",out var outcome)&&outcome.GetString()!="COMMITTED")throw new InvalidDataException("UNCOMMITTED_SOURCE");
        if(latest.TryGetProperty("operation",out var op)&&op.TryGetProperty("outcome",out outcome)&&outcome.GetString()!="COMMITTED")throw new InvalidDataException("UNCOMMITTED_SOURCE");
    }
    private T? Latest<T>(string kind,string id)where T:class=>documents.TryGetValue((kind,id),out var d)?d.Revisions[^1].Payload.Deserialize<T>(Json)??throw new InvalidDataException("INVALID_PAYLOAD"):null;
    private IEnumerable<T> All<T>(string kind,string id)=>documents.TryGetValue((kind,id),out var d)?d.Revisions.Select(x=>x.Payload.Deserialize<T>(Json)??throw new InvalidDataException("INVALID_PAYLOAD")):[];
    private async Task Load()
    {
        documents.Clear();foreach(var d in OfflineStateReader.Files(sourceRoot))Add(d);
        foreach(var(t,k)in Tables.Where(x=>new[]{"HORSE","TRANSPORT_REQUEST","CONTRACT","USER"}.Contains(x.Table)))
        {
            if(!await Column(t,"Flow1StateJson"))continue;
            await using var c=await Command($"SELECT [{k}],Flow1StateJson,Flow1StateVersion FROM dbo.[{t}] WITH (TABLOCK,HOLDLOCK) WHERE Flow1StateJson IS NOT NULL OR Flow1StateVersion<>0;");await using var r=await c.ExecuteReaderAsync();
            while(await r.ReadAsync())
            {
                Ensure(!r.IsDBNull(1)&&r.GetInt64(2)>0,"MISSING_OWNER_STATE");var raw=r.GetString(1);Ensure(Encoding.UTF8.GetByteCount(raw)<=8*1024*1024,"OWNER_LIMIT");using var e=JsonDocument.Parse(raw);OfflineStateReader.Validate(e.RootElement);
                Ensure(e.RootElement.ValueKind==JsonValueKind.Object&&e.RootElement.EnumerateObject().All(p=>new[]{"schemaVersion","documents","legacySources"}.Contains(p.Name))&&e.RootElement.GetProperty("documents").EnumerateObject().Any(),"UNSUPPORTED_ENVELOPE_OR_EMPTY_DOCUMENTS");
                Ensure(e.RootElement.GetProperty("schemaVersion").GetInt32()==1,"ENVELOPE_VERSION");
                foreach(var p in e.RootElement.GetProperty("documents").EnumerateObject())
                {
                    var d=p.Value.Deserialize<Flow1StateDocument>(Json)!;Ensure(d.AggregateId==r.GetString(0)&&d.AggregateType==p.Name,"OWNER_MISMATCH");
                    var expected=d.AggregateType switch{"horse"=>"HORSE","request" or "review" or "plan"=>"TRANSPORT_REQUEST","otp-account"=>"USER",_=>"CONTRACT"};Ensure(expected==t,"OWNER_MISMATCH");Add(d);
                }
            }
        }
    }
    private async Task<string> File(PrivateFileReference reference,bool photo)
    {
        await new LocalFlow1PrivateFileStore(privateRoot).ReadAsync(reference,default);
        var ext=reference.ContentType switch{"image/png"=>"png","image/jpeg"=>"jpg","application/pdf" when !photo=>"pdf",_=>throw new InvalidDataException("FILE_TYPE")};
        var key="private/"+reference.FileId+"."+ext;await new Flow1CurrentFiles(privateRoot,new LocalFlow1PrivateFileStore(privateRoot)).ReadAsync(key,default);return key;
    }
    private static string Same(string? current,string value){Ensure(current is null||current==value,"TYPED_VALUE_CONFLICT");return value;}
    private void Review(string owner,Action action){try{action();}catch(Exception e)when(e is InvalidDataException or JsonException or InvalidOperationException or KeyNotFoundException){blockers.Add(owner+":"+(e is InvalidDataException?e.Message:"INVALID_OR_MISSING_EVIDENCE"));}}
    public async Task<object> SchemaAsync()
    {
        var rows=new Dictionary<string,int>();foreach(var(t,_)in Tables){await using var c=await Command($"SELECT COUNT(*) FROM dbo.[{t}];");rows[t]=(int)(await c.ExecuteScalarAsync())!;}
        await using var columns=await Command("SELECT t.name,c.name,TYPE_NAME(c.user_type_id),c.max_length,c.is_nullable FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id WHERE t.name IN('HORSE','TRANSPORT_REQUEST','CONTRACT','PAYMENT','INVOICE','TRIP_PLAN','USER','REQUEST_HORSE_MAPPING','NOTIFICATION') ORDER BY t.name,c.column_id;");
        var definitions=new List<string>();await using(var r=await columns.ExecuteReaderAsync()){while(await r.ReadAsync())definitions.Add($"{r.GetString(0)}.{r.GetString(1)}:{r.GetString(2)}:{r.GetInt16(3)}:{r.GetBoolean(4)}");}
        return new{Mode="READ_ONLY_SCHEMA_INVENTORY",Has003=await Column("CONTRACT","CompletionDeadline"),Has004=await Column("CONTRACT","Flow1StateJson"),Has006=await Column("CONTRACT","SignedDepositDeadline"),Rows=rows,SchemaFingerprint=Hash(string.Join('\n',definitions)),Columns=definitions,RetainedSourceFingerprint=Flow1RetainedSources.Fingerprint(sourceRoot),PrivateRootExists=Directory.Exists(privateRoot)};
    }
    public async Task<ConversionResult> RunAsync(bool apply=false,bool offline=false,string? expectedFingerprint=null,bool dropRetained=false)
    {
        Ensure(!dropRetained||apply,"DROP_REQUIRES_APPLY");Ensure(!apply||offline,"OFFLINE_CONFIRMATION_REQUIRED");
        db.ChangeTracker.Clear();blockers.Clear();await using var tx=await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        await using(var gate=await Command("DECLARE @r int;EXEC @r=sys.sp_getapplock @Resource=N'RaceHorse.Flow1.Relational',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;IF @r<0 THROW 51300,'Conversion busy.',1;"))await gate.ExecuteNonQueryAsync();
        Ensure(await Flow1RelationalSchema.IsReadyAsync(db,default),"REVIEW_AND_APPLY_006_007_008_SEPARATELY");
        var before=await DataFingerprint();var originalBusiness=await DataFingerprint(true);var retained=Flow1RetainedSources.Fingerprint(sourceRoot);
        await Load();var source=Hash(string.Join('\n',documents.OrderBy(x=>x.Key.Item1).ThenBy(x=>x.Key.Item2).Select(x=>JsonSerializer.Serialize(x.Value,Json))));
        var history=retainUnverifiedHistory??new HashSet<string>();
        Ensure(history.All(id=>Regex.IsMatch(id,@"\A[A-Za-z0-9_-]{1,50}\z")),"INVALID_HISTORY_ID");
        var fingerprint=Hash(before+"\n"+source+"\n"+retained+"\n"+string.Join(',',history.Order(StringComparer.Ordinal)));
        if(apply)Ensure(expectedFingerprint==fingerprint,"FINGERPRINT_CHANGED");
        var horses=await db.Set<FlowHorse>().ToListAsync();var requests=await db.Set<FlowRequest>().ToListAsync();var contracts=await db.Set<FlowContract>().ToListAsync();var payments=await db.Set<FlowPayment>().ToListAsync();var trips=await db.Set<FlowTrip>().ToListAsync();var invoices=await db.Set<FlowInvoice>().ToListAsync();var users=await db.Set<FlowUser>().ToListAsync();
        Ensure(history.All(id=>contracts.Any(c=>c.ContractID==id)),"HISTORY_ID_NOT_FOUND");
        foreach(var id in history)
        {
            var c=contracts.Single(x=>x.ContractID==id);var request=requests.SingleOrDefault(x=>x.RequestID==c.RequestID);
            Ensure(!c.IsCurrent&&c.DepositAmount is null&&c.PublishedAtUtc is null&&c.PdfUrl is null&&c.PdfSha256 is null&&c.CancellationId is null&&
                !documents.Keys.Any(k=>k.Item2==id&&k.Item1 is not ("horse" or "request" or "review" or "plan" or "otp-account"))&&
                (request is null||request.PreparationDays is null&&request.OriginCountry is null),"HISTORY_POLICY_NOT_APPLICABLE");
        }
        foreach(var d in documents.Values)
        {
            var exists=d.AggregateType switch{"horse"=>horses.Any(x=>x.HorseID==d.AggregateId),"request" or "review" or "plan"=>requests.Any(x=>x.RequestID==d.AggregateId),"otp-account"=>users.Any(x=>x.UserID==d.AggregateId),_=>contracts.Any(x=>x.ContractID==d.AggregateId)};
            Ensure(exists,"ORPHAN_SOURCE_DOCUMENT");
        }
        foreach(var h in horses)
        {
            var old=Latest<HorseSnapshot>("horse",h.HorseID);if(old is null)continue;
            try{Ensure(old.Status=="ACTIVE"&&old.Identity.MicrochipIso==h.Microchip_ISO&&old.Identity.Name==h.Name&&old.Identity.FeiPassportNo==h.FEI_Passport_No&&old.Identity.Breed==h.Breed&&old.Identity.Sex==h.Sex&&old.Identity.Weight==h.Weight&&old.Identity.Dob==DateOnly.FromDateTime(h.DOB!.Value)&&documents[("horse",h.HorseID)].Revisions[^1].ActorUserId==h.OwnerID,"HORSE_IDENTITY_CONFLICT");h.PhotoUrl=Same(h.PhotoUrl,await File(old.Photo,true));h.PassportScanUrl=Same(h.PassportScanUrl,await File(old.PassportScan,false));}catch(Exception){blockers.Add("horse/"+h.HorseID+":FILE_OR_IDENTITY_REVIEW");}
        }
        foreach(var r in requests)Review("request/"+r.RequestID,()=>{
            var old=Latest<RequestSnapshot>("request",r.RequestID);if(old is null)return;var review=Latest<ReviewState>("review",r.RequestID);var plan=Latest<PreliminaryPlan>("plan",r.RequestID);var i=old.Input;
            Ensure(r.Departure==i.Trip.Pickup.Address&&r.Destination==i.Trip.Delivery.Address&&r.Purpose==i.Purpose&&r.DesignatedReceiverName==i.Receiver.Name&&r.DesignatedReceiverPhone==i.Receiver.Phone,"REQUEST_CANONICAL_CONFLICT");
            Ensure(plan?.Input.PlannedDepartureAt is not null&&r.ExpectedDate==plan.Input.PlannedDepartureAt.Value.UtcDateTime,"DEPARTURE_TIME_REVIEW_REQUIRED");
            r.PickupLatitude=(decimal)i.Trip.Pickup.Lat;r.PickupLongitude=(decimal)i.Trip.Pickup.Lng;r.DeliveryLatitude=(decimal)i.Trip.Delivery.Lat;r.DeliveryLongitude=(decimal)i.Trip.Delivery.Lng;r.DistanceKm=plan?.RoadDistanceKm??old.Estimate.RoadDistanceKm;
            r.PickupContactName=i.PickupContact.Name;r.PickupContactPhone=i.PickupContact.Phone;r.OriginCountry=i.Trip.Pickup.Country;r.DestinationCountry=i.Trip.Delivery.Country;r.PreparationDays=plan?.Input.PreparationDays??old.Estimate.MinimumPreparationDays;r.ManagerNotes=review?.Feedback;
            Ensure(r.ExpectedDate is not null&&r.CommittedDeadline>r.ExpectedDate,"REQUEST_DATES_REVIEW_REQUIRED");
            Ensure(i.Trip.HorseCount==(db.Set<FlowRequestHorse>().Local.Count(x=>x.RequestID==r.RequestID)==0?db.Set<FlowRequestHorse>().Count(x=>x.RequestID==r.RequestID):db.Set<FlowRequestHorse>().Local.Count(x=>x.RequestID==r.RequestID)),"HORSE_MAPPING_CONFLICT");
        });
        foreach(var c in contracts)Review("contract/"+c.ContractID,()=>{
            if(c.RequestID is null||history.Contains(c.ContractID))return;var draft=Latest<DraftSnapshot>("contract",c.ContractID);var pub=Latest<ContractPublication>("publication",c.ContractID);if(draft is null&&pub is null){Ensure(c.DepositAmount is not null&&c.CompletionDeadline is not null&&(c.SignedAt is null||c.PdfUrl is not null&&c.PdfSha256 is not null&&c.SignerEmail is not null&&c.SignedDepositDeadline is not null&&c.DepositDeadline is not null),"CONTRACT_EVIDENCE_MISSING");return;}
            var r=requests.Single(x=>x.RequestID==c.RequestID);var review=Latest<ReviewState>("review",r.RequestID);Ensure(review is not null,"CURRENT_CONTRACT_REVIEW_MISSING");
            Ensure(draft is not null,"DRAFT_EVIDENCE_MISSING");
            Ensure(c.TotalQuotedPrice==draft.Total&&c.DepositRateStandard==40&&c.CurrencyCode=="VND"&&draft.Deposit==decimal.Round(draft.Total*.4m,0,MidpointRounding.AwayFromZero),"CONTRACT_TERMS_CONFLICT");
            c.DepositAmount=draft.Deposit;c.IsCurrent=review?.CurrentContractId==c.ContractID&&c.ContractStatus is "DRAFT" or "PENDING_SIGNATURE" or "SIGNED" or "EFFECTIVE";
            if(pub is not null){Ensure(pub.Outcome=="COMMITTED"&&pub.ContractId==c.ContractID&&pub.CustomerId==c.CustomerID&&pub.CompletionDeadline.UtcDateTime==c.CompletionDeadline,"PUBLICATION_CONFLICT");Ensure(c.SignedAt is not null||!c.IsCurrent,"UNSIGNED_V2_PDF_REISSUE_REQUIRED");c.PdfUrl="private/"+pub.Document.PrivateStorageKey+".pdf";c.PdfSha256=pub.Document.Sha256.ToLowerInvariant();c.PublishedAtUtc=pub.IssuedAtUtc;c.PublishedBy=pub.Actor;c.SignerEmail=pub.FrozenModel.Values.GetValueOrDefault("CUSTOMER_EMAIL");}
            var acceptance=Latest<AcceptanceState>("acceptance",c.ContractID)?.Operation;
            if(c.SignedAt is not null){Ensure(acceptance is {Outcome:"COMMITTED"}&&acceptance.Evidence.SignedAtUtc==c.SignedAt&&acceptance.Evidence.DocumentHash.Equals(c.PdfSha256,StringComparison.OrdinalIgnoreCase),"SIGNATURE_PARITY_FAILED");var inv=invoices.Single(x=>x.InvoiceID==acceptance.Evidence.InvoiceId&&x.ContractID==c.ContractID);Ensure(inv.TotalPayableAmount==c.DepositAmount,"INVOICE_PARITY_FAILED");c.SignedDepositDeadline=acceptance.Evidence.InvoiceDueAtUtc;c.DepositDeadline=inv.DueDate;Ensure(c.DepositDeadline>=c.SignedDepositDeadline,"DEPOSIT_DEADLINE_PARITY_FAILED");}
            var extension=Latest<ContractDeadlineExtension>("extensions",c.ContractID);if(extension is not null){c.LastExtensionTarget=c.SignedAt is not null&&extension.AtUtc.UtcDateTime>=c.SignedAt?"DEPOSIT":"SIGN";c.LastExtensionReason=extension.Reason;c.LastExtensionBy=extension.Actor;c.LastExtensionAtUtc=extension.AtUtc.UtcDateTime;if(c.LastExtensionTarget=="SIGN")c.EffectiveSignDeadline=extension.NewDeadline.UtcDateTime;}
            var otp=Latest<ContractOtpState>("contract-otp",c.ContractID);if(otp is not null){c.SignOtpHash=null;c.SignOtpFailedAttempts=Math.Max(c.SignOtpFailedAttempts,otp.Attempts);c.SignOtpSentAtUtc=otp.SentAt.UtcDateTime;c.SignOtpExpiry=otp.ExpiresAt.UtcDateTime;}
            var cancel=Latest<CancellationEvent>("cancellation",c.ContractID);if(cancel is not null){c.CancellationId=cancel.Id;c.CancellationStatus=cancel.Status;c.CancellationReason=cancel.CustomerReason;c.CancellationRequestedAtUtc=cancel.RequestedAtUtc.UtcDateTime;c.CancellationDecisionReason=cancel.DecisionReason;c.CancellationDecidedAtUtc=cancel.Status=="PENDING"?null:cancel.AtUtc.UtcDateTime;c.CancellationDecidedBy=cancel.Status=="PENDING"?null:cancel.Actor;}
            var deployment=Latest<DeploymentState>("deployment",c.ContractID);if(deployment is not null){var trip=trips.Single(x=>x.TripID==deployment.TripId&&x.RequestID==r.RequestID);trip.DeploymentStatus=deployment.Status;trip.HandoffEventId=deployment.HandoffEventId;trip.DeploymentReason=deployment.LastOperation.Reason;trip.DeploymentBy=deployment.LastOperation.Actor;trip.DeploymentAtUtc=deployment.LastOperation.AtUtc.UtcDateTime;var route=deployment.Acknowledgements.SingleOrDefault(x=>x.EventId==deployment.HandoffEventId&&x.Stream=="ROUTING");var docs=deployment.Acknowledgements.SingleOrDefault(x=>x.EventId==deployment.HandoffEventId&&x.Stream=="DOCUMENTS");trip.RoutingAcknowledgedBy=route?.Actor;trip.RoutingAcknowledgedAtUtc=route?.AtUtc.UtcDateTime;trip.DocumentsAcknowledgedBy=docs?.Actor;trip.DocumentsAcknowledgedAtUtc=docs?.AtUtc.UtcDateTime;}
            foreach(var session in All<GatewayPaymentSession>("payment-sessions",c.ContractID)){var p=payments.Single(x=>x.PaymentID==session.PaymentId&&x.InvoiceID==session.InvoiceId&&x.Amount==session.RequestedAmount);p.VnpayTmnCode=session.MerchantId;p.VnpayCreatedAtUtc=session.CreatedAtUtc.UtcDateTime;p.VnpayExpiresAtUtc=session.ExpiresAtUtc.UtcDateTime;}
            if(documents.ContainsKey(("financial-review",c.ContractID)))throw new InvalidDataException("FINANCIAL_REVIEW_OPERATOR_REQUIRED");
        });
        // Verify published bytes without changing/regenerating them.
        foreach(var c in contracts.Where(x=>x.PdfUrl is not null))try{var f=await new Flow1CurrentFiles(privateRoot,new LocalFlow1PrivateFileStore(privateRoot)).ReadAsync(c.PdfUrl!,default);Ensure(HashBytes(f.Bytes).Equals(c.PdfSha256,StringComparison.OrdinalIgnoreCase),"PDF_HASH_PARITY_FAILED");}catch(Exception){blockers.Add("contract/"+c.ContractID+":PDF_BYTES_REVIEW_REQUIRED");}
        foreach(var p in payments.Where(x=>x.Method=="VNPAY"&&!history.Contains(invoices.Single(i=>i.InvoiceID==x.InvoiceID).ContractID)))Review("payment/"+p.PaymentID,()=>{
            Ensure(p.VnpayTmnCode is not null&&p.VnpayCreatedAtUtc is not null&&p.VnpayExpiresAtUtc is not null,"PAYMENT_SESSION_EVIDENCE_MISSING");
            if(p.Status=="SUCCESS"){var contract=invoices.Single(x=>x.InvoiceID==p.InvoiceID).ContractID;var evidence=All<DepositPaymentEvent>("payment-ledger",contract).LastOrDefault(x=>x.PaymentId==p.PaymentID&&x.Status=="SUCCESS");Ensure(evidence is not null&&evidence.Method=="VNPAY"&&evidence.InvoiceId==p.InvoiceID&&evidence.Amount==p.Amount&&evidence.Reference==p.TransactionCode,"VERIFIED_PAYMENT_EVIDENCE_MISSING");Ensure(!string.IsNullOrWhiteSpace(p.TransactionCode),"PAYMENT_RECEIPT_MISSING");p.VnpayReceivedAmount=p.Amount;p.VnpayResponseCode="00";p.VnpayTransactionStatus="00";}
        });
        foreach(var inv in invoices.Where(x=>x.InvoiceType=="DEPOSIT"&&!history.Contains(x.ContractID)))Review("invoice/"+inv.InvoiceID,()=>Ensure(inv.PaidAmount==payments.Where(p=>p.InvoiceID==inv.InvoiceID&&p.Status=="SUCCESS").Sum(p=>p.Amount),"VERIFIED_MONEY_PARITY_FAILED"));
        Ensure(contracts.Where(x=>x.IsCurrent).GroupBy(x=>x.RequestID).All(g=>g.Count()==1),"MULTIPLE_CURRENT_CONTRACTS");
        foreach(var user in users){var budget=Latest<ContractOtpAccount>("otp-account",user.UserID);if(budget is null)continue;foreach(var send in budget.Sends){var id="n"+Hash(user.UserID+"|"+send.ToString("O"))[..40].ToLowerInvariant();if(!await db.Set<FlowNotice>().AnyAsync(n=>n.NotificationID==id))db.Set<FlowNotice>().Add(new(){NotificationID=id,UserID=user.UserID,Type="CONTRACT_OTP",Channel="EMAIL",Title="Retained OTP delivery reservation",Message="A contract confirmation email was requested before source cutover.",SentAt=send.UtcDateTime,IsRead=false});}}
        foreach(var entry in db.ChangeTracker.Entries().Where(e=>e.State==EntityState.Modified))
        foreach(var property in entry.Properties.Where(p=>p.IsModified))
        {
            Ensure(NewColumns.Contains(property.Metadata.Name),"ORIGINAL_FIELD_MUTATION");
            var original=property.OriginalValue;
            if(original is not null&&original is not false&&original is not 0&&!Equals(original,property.CurrentValue))
                blockers.Add(entry.Metadata.GetTableName()+":"+property.Metadata.Name+":TYPED_VALUE_CONFLICT");
        }
        if(blockers.Count==0&&apply)
        {
            await db.SaveChangesAsync();Ensure(originalBusiness==await DataFingerprint(true),"ORIGINAL_BUSINESS_FIELDS_CHANGED");var parity=await DataFingerprint();
            await Property("Flow1.RelationalParityFingerprint",parity);await Property("Flow1.RelationalConversionVerified",fingerprint);
            if(retained is not null)await Property("Flow1.RelationalRetainedSourceFingerprint",retained);
            Ensure(retained==Flow1RetainedSources.Fingerprint(sourceRoot),"RETAINED_SOURCE_CHANGED");
            if(dropRetained)await Drop();
            await tx.CommitAsync();return new(fingerprint,parity,documents.Count,horses.Count,requests.Count,contracts.Count,payments.Count,trips.Count,[],true,dropRetained,history.Order().ToArray());
        }
        var result=new ConversionResult(fingerprint,before,documents.Count,horses.Count,requests.Count,contracts.Count,payments.Count,trips.Count,blockers.Distinct().Order().ToArray(),false,false,history.Order().ToArray());await tx.RollbackAsync();db.ChangeTracker.Clear();return result;
    }
    private static string HashBytes(byte[] bytes)=>Convert.ToHexString(SHA256.HashData(bytes));
    private async Task Drop()
    {
        Ensure(await Property("Flow1.RelationalParityFingerprint")==await DataFingerprint(),"PARITY_CHANGED");
        foreach(var(t,_)in Tables.Where(x=>new[]{"HORSE","TRANSPORT_REQUEST","CONTRACT","USER"}.Contains(x.Table)))
        {
            if(!await Column(t,"Flow1StateJson"))continue;
            // Only known004 constraints; any extra dependency makes SQL roll back instead of dropping another module's objects.
            foreach(var name in new[]{"CK_"+t+"_Flow1StateJson","CK_"+t+"_Flow1StateVersion","DF_"+t+"_Flow1StateVersion"})
            {await using var c=await Command($"IF OBJECT_ID(N'dbo.[{name}]') IS NOT NULL ALTER TABLE dbo.[{t}] DROP CONSTRAINT [{name}];");await c.ExecuteNonQueryAsync();}
            await using var drop=await Command($"ALTER TABLE dbo.[{t}] DROP COLUMN Flow1StateJson,Flow1StateVersion;");await drop.ExecuteNonQueryAsync();
        }
        Ensure(await Property("Flow1.RelationalParityFingerprint")==await DataFingerprint(),"DROP_PARITY_FAILED");
    }
}
