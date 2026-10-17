using System.Globalization;
using System.Text.Json;
using Application.DTOs.Flow1;
using Domain.Enums;
using Domain.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service
{
    public Task<FlowContractCard> DraftAsync(string request,string actor,string key,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        Key(key); var r=await Request(request,actor,true,t); var id=Id("c",request,actor,key); var prior=await db.FindAsync<FlowContract>(id,t);
        if(prior is not null) { Require(prior.TotalQuotedPrice==i.Price && i.Deadline is not null && prior.CompletionDeadline==Utc(i.Deadline.Value) && r.PreparationDays==i.PreparationDays,"IDEMPOTENCY_KEY_REUSED","Draft key used with different terms."); return await Card(prior,t); }
        Require(RequestReady(r),"DATA_REVIEW_REQUIRED","Request needs reviewed relational data before quoting.");
        Check(r.RowVersion,i.Version); Require(r.Status=="ACCEPTED","DRAFT_CLOSED","Accept the request first.");
        Require(!(await db.QueryAsync<FlowContract>(c=>c.RequestID==request && c.IsCurrent,t)).Any(),"CONTRACT_OPEN","A current Contract already exists.");
        Require(i.Price is >=3 and <=9999999999m && i.Price==decimal.Truncate(i.Price.Value),"INVALID_PRICE","Enter an integral VND quote.");
        var floor=r.DestinationCountry=="JP"?7:r.DistanceKm>500?3:2;
        Require(i.PreparationDays>=Math.Max(floor,r.PreparationDays??floor),"INVALID_PREPARATION","Preparation may only increase."); r.PreparationDays=i.PreparationDays;
        Require(i.Deadline>clock.GetUtcNow() && i.Deadline<=new DateTimeOffset(Cutoff(r)),"INVALID_DEADLINE","Signing deadline must allow the preparation interval.");
        var c=new FlowContract { ContractID=id,RequestID=request,CustomerID=r.CustomerID,ContractCode="F1-"+id[1..17].ToUpperInvariant(),CurrencyCode="VND",ExchangeRateToLocal=1,
            TotalQuotedPrice=i.Price,DepositRateStandard=40,DepositAmount=decimal.Round(i.Price.Value*.4m,0,MidpointRounding.AwayFromZero),CompletionDeadline=Utc(i.Deadline.Value),ContractStatus="DRAFT",IsCurrent=true };
        db.Add(c); r.Status="DRAFT_CONTRACT"; await db.SaveAsync(t); return await Card(c,t);
    },ct);

    public async Task<FlowContractCard> PublishAsync(string id,string actor,FlowAction i,CancellationToken ct)
    {
        var snapshot=await db.RunAsync(async t=>{
            var(c,r)=await Contract(id,actor,true,t); Check(c.RowVersion,i.Version);
            Require(c.IsCurrent && c.ContractStatus=="DRAFT" && Now<SignDue(c) && Now<Cutoff(r),"PUBLICATION_CLOSED","Draft or preparation deadline is closed.");
            var u=(await db.FindAsync<FlowUser>(c.CustomerID,t))!; var horses=new List<FlowHorse>();
            foreach(var l in await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==r.RequestID,t)) {
                var h=(await db.FindAsync<FlowHorse>(l.HorseID,t))!; Require(h.OwnerID==c.CustomerID && h.PhotoUrl is not null && h.PassportScanUrl is not null,"HORSE_DOCUMENTS_REQUIRED","Horse documents missing.");
                await files.ReadAsync(h.PhotoUrl!,t); await files.ReadAsync(h.PassportScanUrl!,t); horses.Add(h);
            }
            Require(horses.Count>0,"HORSE_DOCUMENTS_REQUIRED","Request has no horses.");
            return (Version:Token(c.RowVersion),RequestVersion:Token(r.RowVersion),Email:u.Email,Name:u.FullName,Phone:u.Phone,Horses:horses.Select(h=>new{Id=h.HorseID,Version=Token(h.RowVersion)}).ToArray(),Model:PdfModel(c,r,u,horses));
        },ct);
        var rendered=await pdf.GenerateAsync(new(id,1,"v3",JsonSerializer.SerializeToElement(snapshot.Model,new JsonSerializerOptions(JsonSerializerDefaults.Web))),ct);
        var key="private/"+rendered.PrivateStorageKey+".pdf"; await files.ReadAsync(key,ct);
        return await db.RunAsync(async t=>{
            var(c,r)=await Contract(id,actor,true,t); Check(c.RowVersion,snapshot.Version); Check(r.RowVersion,snapshot.RequestVersion);
            Require(c.IsCurrent && c.ContractStatus=="DRAFT" && Now<SignDue(c) && Now<Cutoff(r),"PUBLICATION_CLOSED","Draft changed or expired during rendering.");
            foreach(var horse in snapshot.Horses){var currentHorse=await db.FindAsync<FlowHorse>(horse.Id,t);Require(currentHorse is not null,"HORSE_DOCUMENTS_REQUIRED","Horse changed during rendering.");Check(currentHorse.RowVersion,horse.Version);}
            var currentUser=(await db.FindAsync<FlowUser>(c.CustomerID,t))!;
            Require(currentUser.Email==snapshot.Email && currentUser.FullName==snapshot.Name && currentUser.Phone==snapshot.Phone,"CUSTOMER_CHANGED","Customer details changed during rendering; regenerate the PDF.");
            Require(rendered.PrivateStorageKey.Equals(rendered.Sha256,StringComparison.OrdinalIgnoreCase),"FILE_INTEGRITY_ERROR","Rendered PDF hash differs from its storage key.");
            c.SignerEmail=snapshot.Email;
            c.PdfUrl=key; c.PdfSha256=rendered.Sha256.ToLowerInvariant(); c.PublishedAtUtc=Now; c.PublishedBy=actor;
            c.ContractStatus="PENDING_SIGNATURE"; r.Status="AWAITING_SIGNATURE"; await db.SaveAsync(t); return await Card(c,t);
        },ct);
    }
    private ContractPdfModel PdfModel(FlowContract c,FlowRequest r,FlowUser u,List<FlowHorse> horses)
    {
        var total=c.TotalQuotedPrice??throw Error("Contract quote missing.","DATA_REVIEW_REQUIRED",409);
        var deposit=c.DepositAmount??throw Error("Deposit missing.","DATA_REVIEW_REQUIRED",409);
        var v=new Dictionary<string,string>();
        foreach(var key in new[]{"COMPANY_NAME","COMPANY_ADDRESS","COMPANY_EMAIL","COMPANY_HOTLINE","COMPANY_TAX_CODE","COMPANY_BANK_ACCOUNT","COMPANY_BANK_NAME","COMPANY_REPRESENTATIVE","COMPANY_REP_POSITION"})
        { Require(issuer.Issuer.TryGetValue(key,out var value)&&!string.IsNullOrWhiteSpace(value),"CONTRACT_ISSUER_NOT_CONFIGURED","Configure the issuer before publication."); v[key]=value!; }
        string D(DateTime? date)=>date is null?"Chưa cung cấp / Not supplied":new DateTimeOffset(date.Value).ToOffset(TimeSpan.FromHours(7)).ToString("dd/MM/yyyy HH:mm 'UTC+07'",CultureInfo.InvariantCulture);
        string M(decimal amount)=>amount.ToString("N0",CultureInfo.GetCultureInfo("vi-VN"));
        void P(string k,string? value)=>v[k]=string.IsNullOrWhiteSpace(value)?"Chưa cung cấp / Not supplied":value;
        P("CONTRACT_CODE",c.ContractCode); P("REQUEST_ID",r.RequestID); P("PLAN_VERSION","1"); P("CREATED_DATE",D(Now)); P("COMPLETION_DEADLINE",D(c.CompletionDeadline));
        P("PREPARATION_CUTOFF",D(Cutoff(r))); P("CUSTOMER_FULL_NAME",u.FullName); P("CUSTOMER_USER_ID",u.UserID); P("CUSTOMER_EMAIL",u.Email); P("CUSTOMER_PHONE",u.Phone);
        P("CUSTOMER_ADDRESS",null); P("CUSTOMER_ID_NUMBER",null); P("DEPARTURE_LOCATION",r.Departure); P("DESTINATION_LOCATION",r.Destination); P("TRANSPORT_MODE",r.TransportType); P("TRANSPORT_PURPOSE",r.Purpose);
        P("TRANSPORT_SCOPE",r.TransportType=="AIR"?"VN → JP; airport-to-airport; ground legs excluded":"ROAD");
        P("TOTAL_DISTANCE_KM",r.DistanceKm?.ToString("N2",CultureInfo.InvariantCulture)); P("EXPECTED_DEPARTURE_DATETIME",D(r.ExpectedDate)); P("COMMITTED_DEADLINE_DATETIME",D(r.CommittedDeadline));
        P("DESIGNATED_RECEIVER_NAME",r.DesignatedReceiverName); P("DESIGNATED_RECEIVER_PHONE",r.DesignatedReceiverPhone); P("CURRENCY_CODE","VND"); P("EXCHANGE_RATE","1");
        foreach(var k in new[]{"BASE_PRICE_P","TOTAL_PRICE_VND"}) P(k,M(total));
        foreach(var k in new[]{"BASE_PRICE_IN_WORDS","TOTAL_PRICE_VND_IN_WORDS"}) P(k,"Theo số tiền VND nêu trên / As the numeric VND amount above");
        foreach(var k in new[]{"DEPOSIT_AMOUNT_40","DEPOSIT_AMOUNT_40_VND"}) P(k,M(deposit));
        var middle=decimal.Round(total*.3m,0,MidpointRounding.AwayFromZero);
        foreach(var k in new[]{"MIDWAY_AMOUNT_30","MIDWAY_AMOUNT_30_VND"}) P(k,M(middle));
        foreach(var k in new[]{"FINAL_AMOUNT_30","FINAL_AMOUNT_30_VND"}) P(k,M(total-deposit-middle));
        P("SELLING_LINES","Giá chốt trọn gói / Final quoted price: "+M(total)+" VND");
        foreach(var k in new[]{"LIEN_DAILY_RATE","LIEN_DAILY_RATE_VND"}) P(k,"Chưa thỏa thuận / Not agreed");
        // No fictitious signature, OTP, Trip or completed handover values at issuance.
        foreach(var k in new[]{"ACTUAL_DELIVERY_LOCATION","ACTUAL_HANDOVER_TIMESTAMP","APP_DIGITAL_SIG_ID","APP_SIGNED_TIMESTAMP","CUSTOMER_OTP_AUTH_CODE","CUSTOMER_SIGNED_TIMESTAMP","HANDED_BY_STAFF_ID","HANDED_BY_STAFF_NAME","HANDOVER_ID","HORSE_1_VET_STATUS","RECEIVED_BY_NAME","RECEIVED_BY_PHONE","SAFETY_GATE_ETA","SAFETY_GATE_LOCATION","SIGNING_DATE","SIGNING_DAY","SIGNING_MONTH","SIGNING_YEAR","TRIP_ID"}) P(k,"CHƯA THỰC HIỆN / NOT PERFORMED");
        return new(v,horses.Select(h=>new Dictionary<string,string>{{"HORSE_1_ID",h.HorseID},{"HORSE_1_NAME",h.Name},{"HORSE_1_MICROCHIP",h.Microchip_ISO},{"HORSE_1_FEI_NO",h.FEI_Passport_No??"Not supplied"},{"HORSE_1_BREED",h.Breed??"Not supplied"},{"HORSE_1_SEX",h.Sex??"Not supplied"},{"HORSE_1_AGE",h.DOB is null?"Not supplied":Math.Max(0,(int)((Now-h.DOB.Value).TotalDays/365.2425)).ToString()}}).ToArray());
    }
    private string OtpDigest(FlowContract c,string email,string code)=>otp.Digest("relational-sign",$"{c.ContractID}|{c.CustomerID}|{c.PdfSha256}|{email}|{c.SignOtpSentAtUtc:O}|{c.SignOtpExpiry:O}|{SignDue(c):O}|{code}");
    public async Task SendOtpAsync(string id,string actor,FlowAction i,CancellationToken ct)
    {
        var code=otp.NewCode(); otp.Digest("configuration-check",code);
        var reserved=await db.RunAsync(async t=>{
            var(c,r)=await Contract(id,actor,false,t); Check(c.RowVersion,i.Version);
            Require(c.IsCurrent && c.ContractStatus=="PENDING_SIGNATURE" && c.SignedAt is null && Now<SignDue(c) && Now<Cutoff(r),"SIGNING_CLOSED","Signing is closed.");
            Require(c.PdfSha256==i.PdfSha256,"PDF_CHANGED","Review the issued PDF before requesting OTP.");
            Require(c.SignOtpFailedAttempts<5 && (c.SignOtpSentAtUtc is null || Now>=c.SignOtpSentAtUtc.Value.AddSeconds(60)),"OTP_RATE_LIMITED","Wait for cooldown or contact the Manager after five failed attempts.");
            var u=(await db.FindAsync<FlowUser>(actor,t))!; Require(!string.IsNullOrWhiteSpace(u.Email),"EMAIL_REQUIRED","An account email is required.");
            Require(u.Email==c.SignerEmail,"CUSTOMER_CHANGED","Account email differs from the issued PDF; ask the Manager to reissue it.");
            var since=Now.AddMinutes(-15);
            Require((await db.QueryAsync<FlowNotice>(n=>n.UserID==actor && n.Type=="CONTRACT_OTP" && n.Channel=="EMAIL" && n.SentAt>=since,t)).Count<5,"OTP_RATE_LIMITED","Account email budget reached.");
            await files.ReadAsync(c.PdfUrl!,t); c.SignOtpHash=null; c.SignOtpSentAtUtc=Now; c.SignOtpExpiry=new[]{Now.AddMinutes(5),SignDue(c),Cutoff(r)}.Min();
            var notice=new FlowNotice{NotificationID=Id("n",id,Guid.NewGuid().ToString("N")),UserID=actor,ReferenceID=id,Type="CONTRACT_OTP",Channel="EMAIL",Title="Contract OTP delivery reserved",Message="A contract confirmation email was requested.",SentAt=Now,IsRead=false}; db.Add(notice);
            return (Email:u.Email!,Hash:c.PdfSha256!,Sent:c.SignOtpSentAtUtc.Value,Expiry:c.SignOtpExpiry.Value,Due:SignDue(c),Notice:notice.NotificationID);
        },ct);
        try { await sender.SendAsync(reserved.Email,code,id,1,reserved.Hash,new DateTimeOffset(reserved.Expiry),ct); }
        catch {
            await db.RunAsync(async t=>{var n=await db.FindAsync<FlowNotice>(reserved.Notice,t); if(n is not null)n.Title="Contract OTP delivery failed"; return 0;},CancellationToken.None); throw;
        }
        var enabled=await db.RunAsync(async t=>{
            var(c,r)=await Contract(id,actor,false,t); var u=(await db.FindAsync<FlowUser>(actor,t))!;
            var current=c.SignOtpSentAtUtc==reserved.Sent && c.SignOtpExpiry==reserved.Expiry && SignDue(c)==reserved.Due && c.PdfSha256==reserved.Hash && u.Email==reserved.Email && c.ContractStatus=="PENDING_SIGNATURE" && Now<SignDue(c) && Now<Cutoff(r);
            if(current) c.SignOtpHash=OtpDigest(c,u.Email!,code);
            var n=(await db.FindAsync<FlowNotice>(reserved.Notice,t))!; n.Title=current?"Contract OTP email delivered":"Contract OTP delivery superseded"; return current;
        },ct);
        Require(enabled,"OTP_REVOKED","Signing terms changed during email delivery; refresh and request a new code.");
    }
    public async Task<FlowContractCard> SignAsync(string id,string actor,FlowAction i,CancellationToken ct)
    {
        var result=await db.RunAsync(async t=>{
            var(c,r)=await Contract(id,actor,false,t);
            Require(c.PdfSha256 is not null && c.PdfSha256==i.PdfSha256,"PDF_CHANGED","Confirm the exact PDF you reviewed.");
            if(c.SignedAt is not null) return (Card:await Card(c,t),Error:(string?)null);
            Check(c.RowVersion,i.Version); Require(c.IsCurrent && c.ContractStatus=="PENDING_SIGNATURE" && Now<SignDue(c) && Now<Cutoff(r),"SIGNING_CLOSED","Signing deadline has passed.");
            var u=(await db.FindAsync<FlowUser>(actor,t))!;
            Require(u.Email==c.SignerEmail,"CUSTOMER_CHANGED","Account email differs from the issued PDF; ask the Manager to reissue it.");
            Require(c.SignOtpHash is not null && c.SignOtpExpiry>Now && c.SignOtpFailedAttempts<5,"OTP_EXPIRED","Request an active code or contact the Manager.");
            if(i.Otp is null || !otp.Matches(c.SignOtpHash!,OtpDigest(c,u.Email??"",i.Otp))) {
                c.SignOtpFailedAttempts++; if(c.SignOtpFailedAttempts>=5)c.SignOtpHash=null; await db.SaveAsync(t);
                return (Card:await Card(c,t),Error:(string?)"OTP_INVALID");
            }
            var file=await files.ReadAsync(c.PdfUrl!,t);
            Require(Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(file.Bytes)).Equals(c.PdfSha256,StringComparison.OrdinalIgnoreCase),"FILE_INTEGRITY_ERROR","Contract PDF hash differs.");
            c.SignedAt=Now; c.SignerEmail=u.Email; c.SignOtpHash=null; c.ContractStatus="SIGNED";
            c.DepositDeadline=c.SignedDepositDeadline=new[]{Now.AddHours(24),Cutoff(r)}.Min(); r.Status="AWAITING_DEPOSIT";
            Require(c.DepositDeadline>Now,"DEPOSIT_DEADLINE_CLOSED","No deposit window remains before preparation.");
            db.Add(new FlowInvoice{InvoiceID=Id("i",id),ContractID=id,InvoiceType="DEPOSIT",CurrencyCode="VND",TotalPayableAmount=c.DepositAmount!.Value,PaidAmount=0,DueDate=c.DepositDeadline,PaymentStatus="UNPAID"});
            await db.SaveAsync(t); return (Card:await Card(c,t),Error:(string?)null);
        },ct);
        if(result.Error is not null) throw Error("Incorrect OTP.",result.Error,409); return result.Card;
    }
    public Task<FlowContractCard> LifecycleAsync(string id,string actor,bool manager,string action,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,r)=await Contract(id,actor,manager,t); Check(c.RowVersion,i.Version); var reason=Text(i.Reason);
        Require(c.IsCurrent,"CONTRACT_CLOSED","Contract is not current.");
        if(action=="extend") {
            Require(manager && i.Deadline is not null && i.Deadline>clock.GetUtcNow() && i.Deadline<=new DateTimeOffset(Cutoff(r)),"INVALID_DEADLINE","Extension must remain feasible.");
            if(i.Target=="SIGN") { Require(c.SignedAt is null && c.ContractStatus=="PENDING_SIGNATURE" && Utc(i.Deadline!.Value)>SignDue(c),"INVALID_DEADLINE","Signing extension must increase the current limit."); c.EffectiveSignDeadline=Utc(i.Deadline.Value); c.SignOtpHash=null; }
            else { Require(i.Target=="DEPOSIT" && c.SignedAt is not null && c.ContractStatus=="SIGNED" && i.Deadline!.Value.UtcDateTime>c.DepositDeadline,"INVALID_DEADLINE","Deposit extension must increase its current limit."); c.DepositDeadline=Utc(i.Deadline.Value); var inv=await Invoice(c,t); inv.DueDate=c.DepositDeadline; }
            c.LastExtensionTarget=i.Target; c.LastExtensionReason=reason; c.LastExtensionBy=actor; c.LastExtensionAtUtc=Now;
        }
        else {
            Require(c.SignedAt is null && c.ContractStatus is "DRAFT" or "PENDING_SIGNATURE","LIFECYCLE_CLOSED","Signed terms cannot be discarded.");
            Require(action=="decline" && !manager || action=="expire" && manager && Now>=SignDue(c) || action=="withdraw" && manager,"FORBIDDEN","Action not allowed.");
            c.ContractStatus=action=="decline"?"DECLINED":action=="expire"?"EXPIRED":"WITHDRAWN"; c.IsCurrent=false; c.SignOtpHash=null;
            r.Status=action=="decline"?"CHANGES_REQUESTED":"ACCEPTED"; r.ManagerNotes=reason;
        }
        await db.SaveAsync(t); return await Card(c,t);
    },ct);
    public Task<(byte[] Bytes,string ContentType)> PdfAsync(string id,string actor,bool manager,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,_)=await Contract(id,actor,manager,t); Require(c.PdfUrl is not null,"PDF_UNAVAILABLE","Contract is not published.");
        var file=await files.ReadAsync(c.PdfUrl!,t); Require(Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(file.Bytes)).Equals(c.PdfSha256,StringComparison.OrdinalIgnoreCase),"FILE_INTEGRITY_ERROR","PDF differs from published hash."); return file;
    },ct);
}
