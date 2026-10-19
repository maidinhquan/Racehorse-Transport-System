using Application.DTOs.Flow1;
using Domain.Flow1;
namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service
{
    private async Task<bool> PendingChange(FlowContract c,CancellationToken ct) =>
        (await db.QueryAsync<FlowContractChange>(x=>x.ContractID==c.ContractID&&x.Status=="PENDING",ct)).Any();
    private async Task NoMoney(FlowContract c,CancellationToken ct)
    {
        var invoices=await db.QueryAsync<FlowInvoice>(x=>x.ContractID==c.ContractID,ct);
        foreach(var inv in invoices)
            Require(inv.PaidAmount==0 && !(await Payments(inv,ct)).Any(p=>p.Status!="FAILED"||p.FinancialReviewRequired),
                "PAYMENT_UNRESOLVED","Resolve every payment attempt before changing or withdrawing terms.");
    }
    private void Audit(FlowContract c,string actor,string action,string reason,DateTime? previous=null) =>
        db.Add(new FlowContractEvent{EventID=Id("event",Guid.NewGuid().ToString()),ContractID=c.ContractID,ActorID=actor,
            Action=action,Reason=reason,AtUtc=Now,PreviousDeadline=previous,NewDeadline=c.CompletionDeadline is null?null:SignDue(c)});
    private async Task PaidForSignature(FlowContract c,CancellationToken ct)
    {
        if(c.WorkflowVersion==0)return;
        var inv=await Invoice(c,ct);
        Require(c.TermsAcceptedAtUtc is not null&&c.TermsAcceptedPdfSha256==c.PdfSha256&&
            inv.PaidAmount==inv.TotalPayableAmount&&!(await Payments(inv,ct)).Any(p=>p.FinancialReviewRequired||p.Status=="PENDING_GATEWAY")&&
            c.CancellationStatus!="PENDING"&&!await PendingChange(c,ct),"DEPOSIT_REQUIRED","Agree to this version and verify the full deposit before OTP signing.");
    }
    public Task<FlowContractCard> AcceptTermsAsync(string id,string actor,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,r)=await Contract(id,actor,false,t);Check(c.RowVersion,i.Version);
        Require(c.WorkflowVersion==1&&c.IsCurrent&&c.SignedAt is null&&c.ContractStatus=="PENDING_SIGNATURE"&&Now<SignDue(c)&&Now<Cutoff(r)&&
            c.CancellationStatus!="PENDING"&&!await PendingChange(c,t),"ACCEPTANCE_CLOSED","Terms acceptance is closed.");
        Require(c.PdfSha256 is not null&&c.PdfSha256==i.PdfSha256,"PDF_CHANGED","Review the exact issued contract.");
        await files.ReadAsync(c.PdfUrl!,t);
        c.TermsAcceptedAtUtc??=Now;c.TermsAcceptedPdfSha256=c.PdfSha256;r.Status="AWAITING_DEPOSIT";
        Audit(c,actor,"TERMS_ACCEPTED","Customer agreed to content; this is not a signature.");
        await db.SaveAsync(t);return await Card(c,t);
    },ct);
    public Task<FlowContractCard> RequestContractChangeAsync(string id,string actor,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,r)=await Contract(id,actor,false,t);Check(c.RowVersion,i.Version);
        Require(c.WorkflowVersion==1&&c.IsCurrent&&c.SignedAt is null&&c.ContractStatus=="PENDING_SIGNATURE"&&Now<SignDue(c)&&
            c.CancellationStatus!="PENDING"&&!await PendingChange(c,t),"REVISION_CLOSED","Contract cannot be changed now.");
        await NoMoney(c,t);
        var fields=i.Sections?.Distinct().ToArray()??[];
        Require(fields.Length>0&&fields.All(x=>new[]{"PRICE","DEPOSIT","INSURANCE","TERMS"}.Contains(x)),"INVALID_SECTIONS","Select the sections to unlock.");
        var change=new FlowContractChange{ChangeID=Id("chg",Guid.NewGuid().ToString()),ContractID=id,Reason=Text(i.Reason),RequestedAtUtc=Now};db.Add(change);
        foreach(var field in fields)db.Add(new FlowContractChangeField{FieldID=Id("field",change.ChangeID,field),ChangeID=change.ChangeID,FieldName=field});
        c.SignOtpHash=null;Audit(c,actor,"CHANGE_REQUESTED",change.Reason);await db.SaveAsync(t);return await Card(c,t);
    },ct);
    public Task<FlowContractCard> DecideContractChangeAsync(string id,string actor,string action,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,r)=await Contract(id,actor,true,t);Check(c.RowVersion,i.Version);
        Require(c.WorkflowVersion==1&&c.IsCurrent&&c.SignedAt is null&&c.CancellationStatus!="PENDING","REVISION_CLOSED","Unsigned current terms required.");
        await NoMoney(c,t);
        var change=(await db.QueryAsync<FlowContractChange>(x=>x.ContractID==id&&x.Status=="PENDING",t)).SingleOrDefault();
        Require(change is not null&&change.ChangeID==i.ChangeId,"CHANGE_CHANGED","Refresh the current change request.");
        var reason=Text(i.Reason);change.Decision=reason;change.DecidedBy=actor;change.DecidedAtUtc=Now;
        var previous=SignDue(c);
        if(action=="reject"){
            Require(Now.AddHours(24)<Cutoff(r),"INVALID_DEADLINE","Preparation interval cannot accommodate a new full 24 hours.");
            change.Status="REJECTED";c.EffectiveSignDeadline=c.DepositDeadline=Now.AddHours(24);c.SignOtpHash=null;
            var inv=await Invoice(c,t);inv.DueDate=c.DepositDeadline;Audit(c,actor,"CHANGE_REJECTED",reason,previous);
            await db.SaveAsync(t);return await Card(c,t);
        }
        Require(action=="approve","INVALID_ACTION","Unknown revision decision.");
        var fields=(await db.QueryAsync<FlowContractChangeField>(x=>x.ChangeID==change.ChangeID,t)).Select(x=>x.FieldName).ToArray();
        Require((fields.Contains("PRICE")||i.Price is null||i.Price==c.TotalQuotedPrice)&&
            (fields.Contains("DEPOSIT")||i.DepositPercent is null||i.DepositPercent==c.DepositRateStandard)&&
            (fields.Contains("INSURANCE")||i.InsuranceAmount is null||i.InsuranceAmount==c.InsuranceAmount)&&
            (fields.Contains("TERMS")||i.Terms is null||i.Terms==c.TermsText),"SECTION_LOCKED","Only customer-selected fields can be changed.");
        var price=fields.Contains("PRICE")?i.Price??c.TotalQuotedPrice:c.TotalQuotedPrice;
        var rate=fields.Contains("DEPOSIT")?i.DepositPercent??c.DepositRateStandard:c.DepositRateStandard;
        var insurance=fields.Contains("INSURANCE")?i.InsuranceAmount??c.InsuranceAmount:c.InsuranceAmount;
        ValidateAgreedTerms(price,rate,insurance);
        var next=new FlowContract{ContractID=Id("c",change.ChangeID),RequestID=c.RequestID,CustomerID=c.CustomerID,
            ContractCode=c.ContractCode.Split("-R")[0]+"-R"+(c.ContractVersion+1),WorkflowVersion=1,ContractVersion=c.ContractVersion+1,SourceContractID=id,
            CurrencyCode=c.CurrencyCode,ExchangeRateToLocal=c.ExchangeRateToLocal,TotalQuotedPrice=price,DepositRateStandard=rate,
            DepositAmount=decimal.Round(price!.Value*rate!.Value/100,0,MidpointRounding.AwayFromZero),InsuranceAmount=insurance,
            TermsText=fields.Contains("TERMS")?Text(i.Terms??c.TermsText,4000):c.TermsText,CompletionDeadline=Now.AddHours(24),ContractStatus="DRAFT",IsCurrent=true};
        change.Status="APPROVED";c.IsCurrent=false;c.ContractStatus="SUPERSEDED";c.SignOtpHash=null;
        await db.SaveAsync(t);db.Add(next);r.Status="DRAFT_CONTRACT";Audit(c,actor,"CHANGE_APPROVED",reason);await db.SaveAsync(t);return await Card(next,t);
    },ct);
    private static void ValidateAgreedTerms(decimal? price,decimal? rate,decimal? insurance)
    {
        Require(price is >=3 and <=9999999999m&&price==decimal.Truncate(price.Value)&&rate is >0 and <=100&&rate==decimal.Round(rate.Value,2)&&
            insurance is >0&&insurance<=price&&insurance==decimal.Truncate(insurance.Value)&&decimal.Round(price.Value*rate.Value/100,0)>0,
            "INVALID_TERMS","Provide the total VND price including mandatory insurance, insurance amount and explicit deposit percentage.");
    }
    public Task<FlowContractCard> RefundAsync(string id,string actor,string operation,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,r)=await Contract(id,actor,true,t);Check(c.RowVersion,i.Version);var inv=await Invoice(c,t);
        Require(c.WorkflowVersion==1&&c.SignedAt is null&&c.ContractStatus=="CANCELLED"&&c.CancellationStatus=="APPROVED"&&c.RefundAmount==inv.PaidAmount&&inv.PaidAmount>0,
            "REFUND_CLOSED","Only the full verified pre-signature deposit can be refunded here.");
        Require(!(await Payments(inv,t)).Any(p=>p.Status is "PENDING_GATEWAY" or "REVIEW_REQUIRED"||p.FinancialReviewRequired),"PAYMENT_UNRESOLVED","Reconcile every receipt before recording a refund.");
        if(operation=="start"){Require(c.RefundStatus=="REQUESTED","REFUND_CLOSED","Refund already started.");c.RefundStatus="PROCESSING";}
        else {Require(operation=="complete"&&c.RefundStatus=="PROCESSING"&&i.RefundAmount==inv.PaidAmount,"REFUND_AMOUNT_MISMATCH","Record the full verified amount after actual refund.");c.RefundReference=Text(i.RefundReference,200);c.RefundStatus="COMPLETED";}
        Audit(c,actor,"REFUND_"+c.RefundStatus,Text(i.Reason));await db.SaveAsync(t);return await Card(c,t);
    },ct);
}
