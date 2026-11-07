using System.Globalization;
using System.Text.Json;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Domain.Enums;
using Domain.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service
{
    public async Task<FlowContractCard> DraftAsync(string request,string actor,string key,FlowAction i,CancellationToken ct)
    {
        Key(key);Require(i.AdditionalClauses is null or {Count:0},"VALIDATION_ERROR","Send additionalClauses when publishing; they are not saved in the draft.");
        var snapshot=await db.RunAsync(async t=>{
            var r=await Request(request,actor,true,t);var prior=(await db.QueryAsync<FlowContract>(x=>x.RequestID==request,t)).SingleOrDefault();
            if(prior is not null){Require((i.Price is null || i.Price==prior.TotalQuotedPrice) && (i.DepositRate is null || i.DepositRate==prior.DepositRateStandard) && (i.PreparationDays is null || i.PreparationDays==r.PreparationDays) && (i.TransportMode is null || i.TransportMode==r.TransportType) && (i.DepartureAt is null || Utc(i.DepartureAt.Value)==r.ExpectedDate) && (i.DeliveryAt is null || Utc(i.DeliveryAt.Value)==r.CommittedDeadline) && (i.CommercialNotes is null || OptionalText(i.CommercialNotes,2000)==prior.CommercialNotes) && (i.Costs is null || i.Costs==await StoredCosts(prior.ContractID,t)),"IDEMPOTENCY_KEY_REUSED","A contract already exists with different terms; update its draft or reissue it.");return(R:r,Prior:await Card(prior,t),Version:Token(r.RowVersion));}
            Check(r.RowVersion,i.Version);Require(r.Status=="ACCEPTED","DRAFT_CLOSED","Accept the request first.");
            return(R:r,Prior:(FlowContractCard?)null,Version:Token(r.RowVersion));
        },ct);
        if(snapshot.Prior is not null)return snapshot.Prior;
        var plan=await PlanContract(snapshot.R,new(TransportMode:i.TransportMode,DepartureAt:i.DepartureAt,DeliveryAt:i.DeliveryAt),i.PreparationDays,ct);
        return await db.RunAsync(async t=>{
            var r=await Request(request,actor,true,t);Check(r.RowVersion,snapshot.Version);Require(r.Status=="ACCEPTED","DRAFT_CLOSED","Request changed during planning.");
            Require(!(await db.QueryAsync<FlowContract>(x=>x.RequestID==request,t)).Any(),"CONTRACT_OPEN","A contract already exists.");
            var costs=i.Costs??plan.Costs;var total=QuoteTotal(i.Price,costs);var rate=i.DepositRate??Flow1ContractFactory.DepositPercent;
            var deposit=ContractDeposit(total,rate);var id=Id("c",request);
            await ApplyContractPlan(r,plan,t);
            var c=new FlowContract {ContractID=id,RequestID=request,CustomerID=r.CustomerID,ContractCode="F1-"+id[1..17].ToUpperInvariant(),CurrencyCode="VND",TotalQuotedPrice=total,DepositRateStandard=rate,DepositAmount=deposit,CommercialNotes=OptionalText(i.CommercialNotes,2000),ContractStatus="DRAFT"};
            db.Add(c);await SaveCosts(id,costs,t);r.Status="DRAFT_CONTRACT";await db.SaveAsync(t);return await Card(c,t);
        },ct);
    }

    public async Task<FlowContractCard> PublishAsync(string id,string actor,FlowAction i,CancellationToken ct)
    {
        var snapshot=await db.RunAsync(async t=>{
            var(c,r)=await Contract(id,actor,true,t); Check(c.RowVersion,i.Version);
            Require(c.ContractStatus!="CANCELLED" && c.ContractStatus=="DRAFT" && Now.AddHours(24)<=Cutoff(r),"PUBLICATION_CLOSED","Draft needs a complete 24-hour window before preparation.");
            Require(i.DepositRate is null || i.DepositRate==c.DepositRateStandard,"VALIDATION_ERROR","Set depositRate in the draft or reissue operation before publication.");
            await RequireNoMoneyOrAttempts(c,t);
            var costs=await StoredCosts(id,t)??throw Error("Five quoted cost rows are required.","DATA_REVIEW_REQUIRED",409);QuoteTotal(c.TotalQuotedPrice,costs);
            var selected=await SelectedClauses(i.ClauseIds,t); var additional=AdditionalTerms(i.AdditionalClauses); var publicationDeadline=Now.AddHours(24);
            var u=(await db.FindAsync<FlowUser>(c.CustomerID,t))!; var horses=new List<FlowHorse>();
            foreach(var l in await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==r.RequestID,t)) {
                var h=(await db.FindAsync<FlowHorse>(l.HorseID,t))!; Require(h.OwnerID==c.CustomerID && h.PhotoUrl is not null && h.PassportScanUrl is not null,"HORSE_DOCUMENTS_REQUIRED","Horse documents missing.");
                await files.ReadAsync(h.PhotoUrl!,t); await files.ReadAsync(h.PassportScanUrl!,t); horses.Add(h);
            }
            Require(horses.Count>0,"HORSE_DOCUMENTS_REQUIRED","Request has no horses.");
            var horseCare=await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==r.RequestID,t);
            var model=PdfModel(c,r,u,horses) with { Clauses=selected,AdditionalClauses=additional,Costs=costs }; foreach(var horse in model.Horses)horse["HORSE_CARE"]=horseCare.Single(x=>x.HorseID==horse["HORSE_1_ID"]).CareInstructions??""; model.Values["COMPLETION_DEADLINE"]=new DateTimeOffset(publicationDeadline,TimeSpan.Zero).ToOffset(TimeSpan.FromHours(7)).ToString("dd/MM/yyyy HH:mm 'UTC+07'",CultureInfo.InvariantCulture);
            return (Deadline:publicationDeadline,Version:Token(c.RowVersion),RequestVersion:Token(r.RowVersion),Email:u.Email,Name:u.FullName,Phone:u.Phone,Horses:horses.Select(h=>new{Id=h.HorseID,Version=Token(h.RowVersion)}).ToArray(),Clauses:selected,Model:model);
        },ct);
        var rendered=await pdf.GenerateAsync(new(id,1,"v3",JsonSerializer.SerializeToElement(snapshot.Model,new JsonSerializerOptions(JsonSerializerDefaults.Web))),ct);
        var key="private/"+rendered.PrivateStorageKey+".pdf"; await files.ReadAsync(key,ct);
        return await db.RunAsync(async t=>{
            var(c,r)=await Contract(id,actor,true,t); Check(c.RowVersion,snapshot.Version); Check(r.RowVersion,snapshot.RequestVersion);
            Require(c.ContractStatus!="CANCELLED" && c.ContractStatus=="DRAFT" && Now<snapshot.Deadline && Now<Cutoff(r),"PUBLICATION_CLOSED","Draft changed or expired during rendering.");
            foreach(var horse in snapshot.Horses){var currentHorse=await db.FindAsync<FlowHorse>(horse.Id,t);Require(currentHorse is not null,"HORSE_DOCUMENTS_REQUIRED","Horse changed during rendering.");Check(currentHorse.RowVersion,horse.Version);}
            await RequireNoMoneyOrAttempts(c,t);
            var activeClauses=await SelectedClauses(i.ClauseIds,t); Require(activeClauses.SequenceEqual(snapshot.Clauses),"CLAUSES_CHANGED","Clause catalogue changed during rendering; retry publication.");
            var currentUser=(await db.FindAsync<FlowUser>(c.CustomerID,t))!;
            Require(currentUser.Email==snapshot.Email && currentUser.FullName==snapshot.Name && currentUser.Phone==snapshot.Phone,"CUSTOMER_CHANGED","Customer details changed during rendering; regenerate the PDF.");
            Require(rendered.PrivateStorageKey.Equals(rendered.Sha256,StringComparison.OrdinalIgnoreCase),"FILE_INTEGRITY_ERROR","Rendered PDF hash differs from its storage key.");
            c.SignerEmail=snapshot.Email;
            c.PdfUrl=key; c.PdfSha256=rendered.Sha256.ToLowerInvariant(); c.PublishedAtUtc=snapshot.Deadline.AddHours(-24); c.PublishedBy=actor;
            c.CompletionDeadline=snapshot.Deadline;
            Require(c.CompletionDeadline<=Cutoff(r),"INVALID_DEADLINE","Insufficient preparation window.");
            c.ContractStatus="AWAITING_DEPOSIT"; r.Status="AWAITING_DEPOSIT"; c.FeedbackStatus=c.FeedbackStatus=="PENDING"?"ACCEPTED":c.FeedbackStatus;
            var inv=(await db.QueryAsync<FlowInvoice>(x=>x.ContractID==id && x.InvoiceType=="DEPOSIT",t)).SingleOrDefault();
            if(inv is null) db.Add(new FlowInvoice{InvoiceID=Id("i",id),ContractID=id,InvoiceType="DEPOSIT",CurrencyCode="VND",TotalPayableAmount=c.DepositAmount!.Value,PaidAmount=0,DueDate=c.CompletionDeadline,PaymentStatus="UNPAID"});
            else { Require(inv.PaidAmount==0,"PAYMENT_STARTED","Cannot replace paid terms."); inv.TotalPayableAmount=c.DepositAmount!.Value;inv.DueDate=c.CompletionDeadline; }
            await Notify(c.CustomerID,c.ContractID+":"+c.PdfSha256,"FLOW1_CONTRACT_READY","Hợp đồng đã sẵn sàng",
                "Manager đã phát hành PDF hợp đồng. Vui lòng xem tài liệu, thanh toán cọc và ký OTP trong một hạn chung 24 giờ.",t);
            await db.SaveAsync(t); return await Card(c,t);
        },ct);
    }
    private ContractPdfModel PdfModel(FlowContract c,FlowRequest r,FlowUser u,List<FlowHorse> horses)
    {
        var total=c.TotalQuotedPrice??throw Error("Contract quote missing.","DATA_REVIEW_REQUIRED",409);
        var deposit=c.DepositAmount??throw Error("Deposit missing.","DATA_REVIEW_REQUIRED",409);
        var v=new Dictionary<string,string>();
        foreach(var key in new[]{"COMPANY_NAME","COMPANY_ADDRESS","COMPANY_EMAIL","COMPANY_HOTLINE","COMPANY_TAX_CODE"})
        { Require(issuer.Issuer.TryGetValue(key,out var value)&&!string.IsNullOrWhiteSpace(value),"CONTRACT_ISSUER_NOT_CONFIGURED","Configure the issuer before publication."); v[key]=value!; }
        foreach(var key in new[]{"COMPANY_BANK_ACCOUNT","COMPANY_BANK_NAME","COMPANY_REPRESENTATIVE","COMPANY_REP_POSITION"})
        { v[key]=issuer.Issuer.TryGetValue(key,out var value)&&!string.IsNullOrWhiteSpace(value)?value!:""; }
        string D(DateTime? date)=>date is null?"Chưa cung cấp / Not supplied":new DateTimeOffset(date.Value).ToOffset(TimeSpan.FromHours(7)).ToString("dd/MM/yyyy HH:mm 'UTC+07'",CultureInfo.InvariantCulture);
        string M(decimal amount)=>amount.ToString("N0",CultureInfo.GetCultureInfo("vi-VN"));
        void P(string k,string? value)=>v[k]=string.IsNullOrWhiteSpace(value)?"Chưa cung cấp / Not supplied":value;
        P("CONTRACT_CODE",c.ContractCode); P("REQUEST_ID",r.RequestID); P("PLAN_VERSION","1"); P("CREATED_DATE",D(Now)); P("COMPLETION_DEADLINE",D(c.CompletionDeadline));
        P("PREPARATION_CUTOFF",D(Cutoff(r))); P("CUSTOMER_FULL_NAME",u.FullName); P("CUSTOMER_USER_ID",u.UserID); P("CUSTOMER_EMAIL",u.Email); P("CUSTOMER_PHONE",u.Phone);
        P("CUSTOMER_ADDRESS",null); P("CUSTOMER_ID_NUMBER",null); P("DEPARTURE_LOCATION",r.Departure); P("DESTINATION_LOCATION",r.Destination); P("TRANSPORT_MODE",r.TransportType); P("TRANSPORT_PURPOSE",r.Purpose);
        P("TRANSPORT_SCOPE",r.TransportType=="AIR"?r.OriginCountry+" → "+r.DestinationCountry+"; airport-to-airport; ground legs excluded":"ROAD");
        P("PICKUP_CONTACT_NAME",r.PickupContactName);P("PICKUP_CONTACT_PHONE",r.PickupContactPhone);P("PICKUP_STABLE",r.PickupStableName);P("DELIVERY_STABLE",r.DeliveryStableName);P("PICKUP_POSTAL_CODE",r.PickupPostalCode);P("DELIVERY_POSTAL_CODE",r.DeliveryPostalCode);P("PICKUP_INSTRUCTIONS",r.PickupInstructions);P("DELIVERY_INSTRUCTIONS",r.DeliveryInstructions);P("CARE_INSTRUCTIONS",r.CareInstructions);P("COMMERCIAL_NOTES",c.CommercialNotes);
        P("TOTAL_DISTANCE_KM",r.DistanceKm?.ToString("N2",CultureInfo.InvariantCulture)); P("EXPECTED_DEPARTURE_DATETIME",D(r.ExpectedDate)); P("COMMITTED_DEADLINE_DATETIME",D(r.CommittedDeadline));
        P("DESIGNATED_RECEIVER_NAME",r.DesignatedReceiverName); P("DESIGNATED_RECEIVER_PHONE",r.DesignatedReceiverPhone); P("CURRENCY_CODE","VND"); P("EXCHANGE_RATE","1");
        foreach(var k in new[]{"BASE_PRICE_P","TOTAL_PRICE_VND"}) P(k,M(total));
        foreach(var k in new[]{"BASE_PRICE_IN_WORDS","TOTAL_PRICE_VND_IN_WORDS"}) P(k,"Theo số tiền VND nêu trên / As the numeric VND amount above");
        P("DEPOSIT_RATE",c.DepositRateStandard?.ToString("0.##",CultureInfo.InvariantCulture));
        P("DEPOSIT_AMOUNT",M(deposit));
        P("REMAINING_AMOUNT",M(total-deposit));
        P("SELLING_LINES","Giá chốt trọn gói / Final quoted price: "+M(total)+" VND");
        foreach(var k in new[]{"LIEN_DAILY_RATE","LIEN_DAILY_RATE_VND"}) P(k,"Chưa thỏa thuận / Not agreed");
        // No fictitious signature, OTP, Trip or completed handover values at issuance.
        foreach(var k in new[]{"ACTUAL_DELIVERY_LOCATION","ACTUAL_HANDOVER_TIMESTAMP","APP_DIGITAL_SIG_ID","APP_SIGNED_TIMESTAMP","CUSTOMER_OTP_AUTH_CODE","CUSTOMER_SIGNED_TIMESTAMP","HANDED_BY_STAFF_ID","HANDED_BY_STAFF_NAME","HANDOVER_ID","HORSE_1_VET_STATUS","RECEIVED_BY_NAME","RECEIVED_BY_PHONE","SAFETY_GATE_ETA","SAFETY_GATE_LOCATION","SIGNING_DATE","SIGNING_DAY","SIGNING_MONTH","SIGNING_YEAR","TRIP_ID"}) P(k,"CHƯA THỰC HIỆN / NOT PERFORMED");
        return new(v,horses.Select(h=>new Dictionary<string,string>{{"HORSE_HEALTH_NOTES",h.SpecialHealthNotes??""},{"HORSE_1_ID",h.HorseID},{"HORSE_1_NAME",h.Name},{"HORSE_1_MICROCHIP",h.Microchip_ISO},{"HORSE_1_FEI_NO",h.FEI_Passport_No??"Not supplied"},{"HORSE_1_BREED",h.Breed??"Not supplied"},{"HORSE_1_SEX",h.Sex??"Not supplied"},{"HORSE_1_AGE",h.DOB is null?"Not supplied":Math.Max(0,(int)((Now-h.DOB.Value).TotalDays/365.2425)).ToString()}}).ToArray());
    }
    private string OtpDigest(FlowContract c,string email,string code)=>otp.Digest("relational-sign",$"{c.ContractID}|{c.CustomerID}|{c.PdfSha256}|{email}|{c.SignOtpSentAtUtc:O}|{c.SignOtpExpiry:O}|{SignDue(c):O}|{code}");
    public async Task SendOtpAsync(string id,string actor,FlowAction i,CancellationToken ct)
    {
        var code=otp.NewCode(); otp.Digest("configuration-check",code);
        var reserved=await db.RunAsync(async t=>{
            var(c,r)=await Contract(id,actor,false,t); Check(c.RowVersion,i.Version);
            await RequireSignable(c,r,t);
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
            await db.RunAsync(async t=>{var n=await db.FindAsync<FlowNotice>(reserved.Notice,t); if(n is not null)n.Title="Contract OTP delivery simulated"; return 0;},CancellationToken.None);
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
            Check(c.RowVersion,i.Version); await RequireSignable(c,r,t);
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
            await Activate(c,r,await Invoice(c,t),t);
            await db.SaveAsync(t); return (Card:await Card(c,t),Error:(string?)null);
        },ct);
        if(result.Error is not null) throw Error("Incorrect OTP.",result.Error,409); return result.Card;
    }
    public Task<FlowContractCard> LifecycleAsync(string id,string actor,bool manager,string action,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        Require(manager && action is "extend" or "withdraw" or "expire","FORBIDDEN","Only Managers may extend, withdraw or expire an unsigned contract.");
        var(c,r)=await Contract(id,actor,manager,t); Check(c.RowVersion,i.Version); var reason=Text(i.Reason);
        Require(c.ContractStatus!="CANCELLED" && c.SignedAt is null,"CONTRACT_CLOSED","Only the current unsigned contract may be changed.");
        if(action=="extend") {
            Require(manager && c.PublishedAtUtc is not null && i.Deadline is not null && Utc(i.Deadline.Value)>SignDue(c) && Utc(i.Deadline.Value)<=Cutoff(r),"INVALID_DEADLINE","Extend the shared deadline within the preparation cutoff.");
            c.CompletionDeadline=Utc(i.Deadline!.Value);
            c.LastExtensionReason=reason;c.LastExtensionBy=actor;c.LastExtensionAtUtc=Now;
            var invoice=await Invoice(c,t);invoice.DueDate=c.CompletionDeadline;c.SignOtpHash=null;
        } else {
            await RequireNoMoneyOrAttempts(c,t);
            if(action=="expire") Require(Now>=SignDue(c),"NOT_OVERDUE","Contract is not overdue.");
            c.ContractStatus="WITHDRAWN";c.SignOtpHash=null;r.Status="ACCEPTED";
        }
        await db.SaveAsync(t);return await Card(c,t);
    },ct);
    public Task<(byte[] Bytes,string ContentType)> PdfAsync(string id,string actor,bool manager,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,_)=await Contract(id,actor,manager,t); Require(c.PdfUrl is not null && (manager || c.ContractStatus is not ("DRAFT" or "WITHDRAWN")),"PDF_UNAVAILABLE","Contract is not published.");
        var file=await files.ReadAsync(c.PdfUrl!,t); Require(Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(file.Bytes)).Equals(c.PdfSha256,StringComparison.OrdinalIgnoreCase),"FILE_INTEGRITY_ERROR","PDF differs from published hash."); return file;
    },ct);
    private static FlowContractTerms ReadTerms(byte[] bytes)
    {
        try { return new(PublishedClauseSelection.Read(bytes),PublishedClauseSelection.ReadAdditional(bytes)); }
        catch(Exception ex) when(ex is System.IO.InvalidDataException or FormatException or JsonException)
        { throw Error("Issued PDF terms require explicit review; no current catalogue content was substituted.","DATA_REVIEW_REQUIRED",409); }
    }
    public async Task<FlowContractTerms> ContractTermsAsync(string id,string actor,bool manager,CancellationToken ct)
    {
        var pdf=await PdfAsync(id,actor,manager,ct);
        return ReadTerms(pdf.Bytes);
    }
}
