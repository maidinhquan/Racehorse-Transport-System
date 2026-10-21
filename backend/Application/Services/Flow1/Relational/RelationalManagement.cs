using Application.DTOs.Flow1;
using Domain.Entities;
using Domain.Enums;
using Domain.Flow1;
using Application.Common.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service
{
    private static decimal ContractDeposit(decimal total,decimal percent)
    {
        Require(Flow1ContractFactory.IsValidDepositPercent(percent),"VALIDATION_ERROR","depositRate must be > 0 and <= 100 percent with at most two decimal places.");
        var deposit=Flow1ContractFactory.DepositAmount(total,percent);
        Require(deposit>0 && deposit<=total,"VALIDATION_ERROR","The rounded VND deposit must be positive and no greater than the contract price.");
        return deposit;
    }
    private static readonly string[] EditableFields = ["PRICE", "PREPARATION_DAYS", "DEPARTURE_AT", "DELIVERY_AT", "CLAUSES", "DEADLINE"];
    private static ClauseCard Clause(ContractTemplate c) => new(c.TemplateId,c.TemplateName,c.BodyContent,c.LanguageCode,c.IsActive,
        RequiredContractClauses.Order(c.TemplateId) is not null,RequiredContractClauses.Order(c.TemplateId));
    public Task<IReadOnlyList<ClauseCard>> ClausesAsync(string actor,bool includeInactive,CancellationToken ct)=>db.RunAsync<IReadOnlyList<ClauseCard>>(async t=>{
        await Actor(actor,UserRoles.LogisticsManager,t);
        return (await db.QueryAsync<ContractTemplate>(x=>includeInactive || x.IsActive,t)).Select(Clause)
            .OrderBy(c=>c.DisplayOrder??int.MaxValue).ThenBy(c=>c.Title).ToArray();
    },ct);
    public Task<ClauseCard> SaveClauseAsync(string? id,string actor,ClauseInput input,CancellationToken ct)=>db.RunAsync(async t=>{
        await Actor(actor,UserRoles.LogisticsManager,t);
        var title=Text(input.Title,255);var content=Text(input.Content,20000);
        Require(input.LanguageCode is "VI" or "EN","VALIDATION_ERROR","Language must be VI or EN.");
        ContractTemplate c;
        if(id is null){c=new(){TemplateId=Id("clause",Guid.NewGuid().ToString("N")),CreatedAt=Now};db.Add(c);}
        else c=await db.FindAsync<ContractTemplate>(id,t)??throw Error("Clause not found.","NOT_FOUND",404);
        Require(RequiredContractClauses.Order(c.TemplateId) is null || input.IsActive,"REQUIRED_CLAUSE","A required clause cannot be deactivated.");
        c.TemplateName=title;c.BodyContent=content;c.LanguageCode=input.LanguageCode;c.IsActive=input.IsActive;c.UpdatedAt=Now;
        await db.SaveAsync(t);return Clause(c);
    },ct);
    private async Task<IReadOnlyList<ClauseCard>> SelectedClauses(IReadOnlyList<string>? ids,CancellationToken ct)
    {
        Require(ids is null || ids.Count<=50 && ids.Distinct(StringComparer.Ordinal).Count()==ids.Count && ids.All(id=>!string.IsNullOrWhiteSpace(id)),"VALIDATION_ERROR","Choose distinct active clause IDs (at most 50).");
        var result=new List<ClauseCard>();
        foreach(var id in RequiredContractClauses.Ids){var c=await db.FindAsync<ContractTemplate>(id,ct);Require(c is {IsActive:true},"REQUIRED_CLAUSES_MISSING","Restore all twelve active required clauses using SQL 002 before publication.");result.Add(Clause(c!));}
        foreach(var id in ids??[]){if(RequiredContractClauses.Order(id) is not null)continue;var c=await db.FindAsync<ContractTemplate>(id,ct);Require(c is {IsActive:true},"CLAUSE_UNAVAILABLE","A selected clause is missing or inactive.");result.Add(Clause(c!));}
        Require(result.Count<=50,"VALIDATION_ERROR","A contract supports at most 50 catalogue clauses including the twelve required clauses.");
        return result;
    }
    private static IReadOnlyList<string> AdditionalTerms(IReadOnlyList<string>? values)
    {
        Require(values is null || values.Count<=20,"VALIDATION_ERROR","At most 20 additional clauses are allowed.");
        var result=(values??[]).Select(value=>Text(value,2000)).ToArray();
        Require(result.Sum(value=>value.Length)<=20000,"VALIDATION_ERROR","Additional clauses must not exceed 20000 characters in total.");
        return result;
    }
    public Task<object> OperationalStaffAsync(string actor,CancellationToken ct)=>db.RunAsync<object>(async t=>{
        await Actor(actor,UserRoles.LogisticsManager,t);var users=await db.QueryAsync<FlowUser>(u=>u.IsActive,t);
        object[] List(string role)=>users.Where(u=>Role(u)==role).Select(u=>(object)new{userId=u.UserID,fullName=u.FullName,email=u.Email,phone=u.Phone}).ToArray();
        return new{specialists=List(UserRoles.TransportSpecialist),coordinators=List(UserRoles.FleetRouteCoordinator)};
    },ct);
    private async Task RequireNoMoneyOrAttempts(FlowContract c,CancellationToken ct)
    {
        foreach(var inv in await db.QueryAsync<FlowInvoice>(x=>x.ContractID==c.ContractID,ct))
            Require(inv.PaidAmount==0 && !(await Payments(inv,ct)).Any(p=>p.Status is "SUCCESS" or "PENDING_GATEWAY" or "REVIEW_REQUIRED" || p.FinancialReviewRequired || p.VnpayReceivedAmount>0),"PAYMENT_STARTED","Reconcile any payment attempt before changing the issued contract.");
    }
    private async Task RequireSignable(FlowContract c,FlowRequest r,CancellationToken ct)
    {
        Require(c.ContractStatus!="CANCELLED" && c.SignedAt is null && c.ContractStatus=="PENDING_SIGNATURE" && c.FeedbackStatus!="PENDING" && c.CancellationStatus!="PENDING" && c.RefundStatus is null && Now<SignDue(c) && Now<Cutoff(r),"SIGNING_CLOSED","Signing is closed, overdue or awaiting review.");
        var inv=await Invoice(c,ct);
        Require(inv.PaidAmount==inv.TotalPayableAmount && inv.PaymentStatus=="PAID" && !(await Payments(inv,ct)).Any(p=>p.FinancialReviewRequired),"DEPOSIT_NOT_VERIFIED","Verify the full deposit before requesting or using signing OTP.");
    }
    public Task<FlowContractCard> FeedbackAsync(string id,string actor,ContractFeedbackInput input,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,r)=await Contract(id,actor,false,t);Check(c.RowVersion,input.Version);
        Require(c.ContractStatus!="CANCELLED" && c.SignedAt is null && c.PublishedAtUtc is not null && c.ContractStatus=="AWAITING_DEPOSIT" && c.FeedbackStatus!="PENDING" && Now<SignDue(c),"FEEDBACK_CLOSED","Feedback is only available on the current unpaid unsigned publication.");
        Require(input.Fields is {Count:>0} && input.Fields.Distinct().Count()==input.Fields.Count && input.Fields.All(EditableFields.Contains),"VALIDATION_ERROR","Select PRICE, PREPARATION_DAYS, DEPARTURE_AT, DELIVERY_AT or CLAUSES.");
        await RequireNoMoneyOrAttempts(c,t);
        c.CustomerFeedback=Text(input.FeedbackMessage,2000);c.FeedbackFields=string.Join(',',input.Fields);c.FeedbackAtUtc=Now;c.FeedbackStatus="PENDING";c.ManagerFeedback=null;c.FeedbackHandledAtUtc=null;c.SignOtpHash=null;
        await NotifyManagers(id+":"+Token(c.RowVersion),"CONTRACT_FEEDBACK","Khách hàng gửi góp ý hợp đồng",c.CustomerFeedback,t);
        await db.SaveAsync(t);return await Card(c,t);
    },ct);
    public Task<FlowContractCard> RejectFeedbackAsync(string id,string actor,FlowAction input,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,r)=await Contract(id,actor,true,t);Check(c.RowVersion,input.Version);
        Require(c.FeedbackStatus=="PENDING" && c.SignedAt is null && c.ContractStatus=="AWAITING_DEPOSIT","FEEDBACK_CLOSED","No current feedback awaiting decision.");
        await RequireNoMoneyOrAttempts(c,t);
        Require(Now.AddHours(24)<=Cutoff(r),"INVALID_DEADLINE","The shared deadline would violate preparation time.");
        c.FeedbackStatus="REJECTED";c.ManagerFeedback=Text(input.Reason,2000);c.FeedbackHandledAtUtc=Now;
        c.CompletionDeadline=Now.AddHours(24);c.SignOtpHash=null;(await Invoice(c,t)).DueDate=c.CompletionDeadline;
        await Notify(c.CustomerID,id+":"+Token(c.RowVersion),"CONTRACT_FEEDBACK_REJECTED","Phản hồi về đề nghị sửa hợp đồng",c.ManagerFeedback,t);
        await db.SaveAsync(t);return await Card(c,t);
    },ct);
    public async Task<FlowContractCard> ReissueAsync(string id,string actor,ContractReissueInput input,CancellationToken ct)
    {
        IReadOnlyList<string> additional=[];
        var draft=await db.RunAsync(async t=>{
            var(c,r)=await Contract(id,actor,true,t);Check(c.RowVersion,input.Version);
            Require(c.SignedAt is null && c.ContractStatus!="CANCELLED" && c.ContractStatus is "AWAITING_DEPOSIT" or "WITHDRAWN" or "DRAFT","REISSUE_CLOSED","Withdraw and replace only an unsigned contract.");
            await RequireNoMoneyOrAttempts(c,t);
            var depositRate=input.DepositRate??c.DepositRateStandard??Flow1ContractFactory.DepositPercent;
            var deposit=ContractDeposit(input.Price,depositRate);
            var allowed=(c.FeedbackFields??"").Split(',');
            FlowContractTerms? issuedTerms=null;
            if(c.PdfUrl is not null && (input.AdditionalClauses is null || c.FeedbackStatus=="PENDING" && !allowed.Contains("CLAUSES"))){var issued=await files.ReadAsync(c.PdfUrl,t);Require(Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(issued.Bytes)).Equals(c.PdfSha256,StringComparison.OrdinalIgnoreCase),"FILE_INTEGRITY_ERROR","Issued PDF changed.");issuedTerms=ReadTerms(issued.Bytes);}
            additional=AdditionalTerms(input.AdditionalClauses??issuedTerms?.AdditionalClauses);
            if(c.FeedbackStatus=="PENDING"){
                Require(c.DepositRateStandard==depositRate || allowed.Contains("PRICE"),"FIELD_LOCKED","Deposit percentage was not requested for change under PRICE.");
                Require(c.TotalQuotedPrice==input.Price || allowed.Contains("PRICE"),"FIELD_LOCKED","Price was not requested for change.");
                Require(r.PreparationDays==input.PreparationDays || allowed.Contains("PREPARATION_DAYS"),"FIELD_LOCKED","Preparation was not requested for change.");
                Require(r.ExpectedDate==Utc(input.DepartureAt) || allowed.Contains("DEPARTURE_AT"),"FIELD_LOCKED","Departure was not requested for change.");
                Require(r.CommittedDeadline==Utc(input.DeliveryAt) || allowed.Contains("DELIVERY_AT"),"FIELD_LOCKED","Delivery was not requested for change.");
                if(!allowed.Contains("CLAUSES")){
                    Require(issuedTerms is not null,"DATA_REVIEW_REQUIRED","Issued contract terms are missing.");
                    var selected=await SelectedClauses(input.ClauseIds,t);
                    Require(issuedTerms.Clauses.SequenceEqual(selected) && issuedTerms.AdditionalClauses.SequenceEqual(additional),"FIELD_LOCKED","Issued catalogue and additional clauses must remain unchanged unless clause changes were requested.");
                }
            }
            Require(input.Price is >=3 and <=9999999999m && input.Price==decimal.Truncate(input.Price),"INVALID_PRICE","Enter an integral VND quote.");
            var departure=Utc(input.DepartureAt);var delivery=Utc(input.DeliveryAt);var floor=r.DestinationCountry=="JP"?7:r.DistanceKm>500?3:2;
            Require(delivery>departure && input.PreparationDays>=floor && Now.AddHours(24)<=departure.AddDays(-input.PreparationDays),"INVALID_DATE_RANGE","Dates must allow transport, preparation and a complete shared 24-hour window.");
            foreach(var link in await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==r.RequestID,t))
                Require(!await Busy(link.HorseID,departure,delivery,r.RequestID,t),"HORSE_BOOKED","A selected horse is unavailable on the proposed dates.");
            await SelectedClauses(input.ClauseIds,t);
            r.ExpectedDate=departure;r.CommittedDeadline=delivery;r.PreparationDays=input.PreparationDays;
            var costs=input.Costs??(await CalculateCosts(r,new(),t)).Costs;
            await SaveCosts(id,costs,t);
            c.TotalQuotedPrice=input.Price;c.DepositRateStandard=depositRate;c.DepositAmount=deposit;
            c.CompletionDeadline=Now.AddHours(24);c.ContractStatus="DRAFT";c.SignOtpHash=null;c.SignOtpFailedAttempts=0;c.SignOtpSentAtUtc=null;c.SignOtpExpiry=null;
            c.ManagerFeedback=Text(input.Reason,2000);c.FeedbackHandledAtUtc=Now;r.Status="DRAFT_CONTRACT";
            await db.SaveAsync(t);return await Card(c,t);
        },ct);
        return await PublishAsync(id,actor,new(draft.Version,ClauseIds:input.ClauseIds,AdditionalClauses:additional),ct);
    }
}
