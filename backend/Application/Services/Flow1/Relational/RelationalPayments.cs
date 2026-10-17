using Application.DTOs.Flow1;
using Domain.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service
{
    private async Task<FlowInvoice> Invoice(FlowContract c,CancellationToken ct)
    {
        var inv=(await db.QueryAsync<FlowInvoice>(x=>x.ContractID==c.ContractID && x.InvoiceType=="DEPOSIT",ct)).SingleOrDefault();
        Require(inv is not null && inv.TotalPayableAmount==c.DepositAmount && inv.CurrencyCode=="VND","DATA_REVIEW_REQUIRED","Deposit invoice does not match signed terms."); return inv!;
    }
    private Task<List<FlowPayment>> Payments(FlowInvoice i,CancellationToken ct)=>db.QueryAsync<FlowPayment>(x=>x.InvoiceID==i.InvoiceID,ct);
    private static void Flag(FlowPayment p,string reason) { p.FinancialReviewRequired=true; p.FinancialReviewReason=reason; p.FinancialReviewedAtUtc=null; p.FinancialReviewedBy=null; }
    private async Task Activate(FlowContract c,FlowRequest r,FlowInvoice inv,CancellationToken ct)
    {
        if(c.TripID is not null) {
            var existing=await db.FindAsync<FlowTrip>(c.TripID,ct);
            Require(existing?.RequestID==r.RequestID,"DATA_REVIEW_REQUIRED","Activated Trip link differs from request."); return;
        }
        if(!c.IsCurrent || c.SignedAt is null || c.ContractStatus!="SIGNED" || r.Status!="AWAITING_DEPOSIT" ||
            c.CancellationStatus=="PENDING" || inv.PaidAmount<inv.TotalPayableAmount || Now>c.DepositDeadline || Now>=Cutoff(r) ||
            (await Payments(inv,ct)).Any(p=>p.FinancialReviewRequired)) return;
        Require(!(await db.QueryAsync<FlowTrip>(x=>x.RequestID==r.RequestID,ct)).Any(),"DATA_REVIEW_REQUIRED","An unexpected Trip already exists.");
        var trip=new FlowTrip{TripID=Id("t",r.RequestID),RequestID=r.RequestID,TotalDistance_km=r.DistanceKm,Status="PLANNING",DeploymentStatus="PENDING",DeploymentReason="Signed terms and verified deposit",DeploymentBy="SYSTEM",DeploymentAtUtc=Now};
        db.Add(trip); c.TripID=trip.TripID; c.ContractStatus="EFFECTIVE"; r.Status="ACTIVATED";
    }
    public Task<object> PaymentSessionAsync(string id,string actor,string key,string ip,CancellationToken ct)=>db.RunAsync<object>(async t=>{
        Key(key); var(c,r)=await Contract(id,actor,false,t); var inv=await Invoice(c,t); var payments=await Payments(inv,t);
        Require(c.IsCurrent && c.SignedAt is not null && c.ContractStatus=="SIGNED" && r.Status=="AWAITING_DEPOSIT" &&
            c.CancellationStatus!="PENDING" && c.DepositDeadline>Now && Now<Cutoff(r) && !payments.Any(p=>p.FinancialReviewRequired),"PAYMENT_CLOSED","Deposit payment is closed or awaiting review.");
        var amount=inv.TotalPayableAmount-inv.PaidAmount; Require(amount>0,"DEPOSIT_ALREADY_PAID","Deposit already paid.");
        var pid=Id("p",inv.InvoiceID,actor,key); var p=await db.FindAsync<FlowPayment>(pid,t);
        p??=payments.FirstOrDefault(x=>x.Status=="PENDING_GATEWAY" && x.VnpayExpiresAtUtc>Now);
        if(p is not null) Require(p.Status=="PENDING_GATEWAY" && p.VnpayExpiresAtUtc>Now && p.Amount==amount,"SESSION_CLOSED","This payment attempt is closed; refresh before retrying.");
        var expiry=p?.VnpayExpiresAtUtc??new[]{Now.AddMinutes(15),c.DepositDeadline!.Value}.Min(); var created=p?.VnpayCreatedAtUtc??Now;
        var session=await gateway.CreateSessionAsync(new(p?.PaymentID??pid,inv.InvoiceID,amount,"VND",new(expiry),ip,new(created)),t);
        if(p is null) { p=new FlowPayment{PaymentID=pid,InvoiceID=inv.InvoiceID,CurrencyCode="VND",Amount=amount,Method="VNPAY",Status="PENDING_GATEWAY",PaymentDate=created,VnpayCreatedAtUtc=created,VnpayExpiresAtUtc=expiry,VnpayTmnCode=session.MerchantId}; db.Add(p); }
        Require(p.VnpayTmnCode==session.MerchantId,"MERCHANT_CHANGED","Merchant changed since this attempt was issued; reconcile before proceeding.");
        await db.SaveAsync(t); return new { paymentId=p.PaymentID,paymentUrl=session.PaymentUrl.AbsoluteUri,expiresAtUtc=expiry };
    },ct);

    public async Task<object> IpnAsync(IReadOnlyDictionary<string,string> payload,CancellationToken ct)
    {
        var v=await gateway.VerifyAsync(payload,ct);
        if(!v.Verified) return new { RspCode="97",Message="Invalid signature or payload" };
        return await db.RunAsync<object>(async t=>{
            var p=await db.FindAsync<FlowPayment>(v.ProviderReference,t);
            if(p is null || p.Method!="VNPAY") return new{RspCode="01",Message="Order not found"};
            if(p.VnpayTmnCode!=v.MerchantId) return new{RspCode="97",Message="Merchant differs"};
            var inv=(await db.FindAsync<FlowInvoice>(p.InvoiceID,t))!; var c=(await db.FindAsync<FlowContract>(inv.ContractID,t))!; var r=(await db.FindAsync<FlowRequest>(c.RequestID,t))!;
            if(p.Status is "SUCCESS" or "REVIEW_REQUIRED") {
                if(p.Status=="SUCCESS" && v.Status=="SUCCESS" && p.TransactionCode==v.ProviderTransactionId && p.Amount==v.Amount && p.PaymentDate==v.PaidAtUtc?.UtcDateTime) return new{RspCode="02",Message="Already confirmed"};
                if(p.Status=="REVIEW_REQUIRED" && p.TransactionCode==v.ProviderTransactionId && p.VnpayReceivedAmount==v.Amount) return new{RspCode="02",Message="Already recorded for review"};
                Flag(p,"Contradictory signed callback; retain original receipt and reconcile with VNPay."); return new{RspCode="02",Message="Receipt retained; review required"};
            }
            var wasFailed=p.Status=="FAILED";
            p.VnpayResponseCode=v.ResponseCode; p.VnpayTransactionStatus=v.TransactionStatus; p.VnpayBankCode=v.BankCode;
            if(v.Status!="SUCCESS") { p.Status="FAILED"; return new{RspCode="00",Message="Failure recorded"}; }
            p.TransactionCode=v.ProviderTransactionId; p.VnpayReceivedAmount=v.Amount; p.PaymentDate=v.PaidAtUtc!.Value.UtcDateTime;
            if(v.Amount!=p.Amount || v.Currency!="VND") {p.Status="REVIEW_REQUIRED"; Flag(p,"Signed callback amount differs from the requested VND amount; allocation blocked."); return new{RspCode="04",Message="Amount differs; recorded for review"};}
            var duplicate=(await db.QueryAsync<FlowPayment>(x=>x.PaymentID!=p.PaymentID && x.VnpayTmnCode==p.VnpayTmnCode && x.TransactionCode==p.TransactionCode,t)).Any();
            if(duplicate) {p.Status="REVIEW_REQUIRED"; Flag(p,"Provider transaction is already recorded on another attempt; do not allocate twice."); return new{RspCode="02",Message="Transaction already recorded"};}
            p.Status="SUCCESS";
            if(wasFailed || Now>c.DepositDeadline || v.PaidAtUtc.Value.UtcDateTime>c.DepositDeadline || v.PaidAtUtc.Value.UtcDateTime>p.VnpayExpiresAtUtc || v.PaidAtUtc.Value.UtcDateTime<p.VnpayCreatedAtUtc || !c.IsCurrent || c.ContractStatus is not ("SIGNED" or "EFFECTIVE") || r.Status=="CANCELLED") Flag(p,"Late, previously failed or closed-contract payment; verified money retained for review.");
            var entries=await Payments(inv,t); // Includes the tracked current row.
            inv.PaidAmount=entries.Where(x=>x.Status=="SUCCESS").Sum(x=>x.Amount);
            inv.PaymentStatus=inv.PaidAmount>=inv.TotalPayableAmount?"PAID":inv.PaidAmount>0?"PARTIALLY_PAID":"UNPAID";
            if(inv.PaidAmount>inv.TotalPayableAmount) Flag(p,"Verified payments exceed the required deposit; no automatic refund.");
            await Activate(c,r,inv,t); return new{RspCode="00",Message="Confirmed"};
        },ct);
    }
    public Task<FlowContractCard> FinancialReviewAsync(string id,string payment,string actor,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,r)=await Contract(id,actor,true,t); var inv=await Invoice(c,t); var p=await db.FindAsync<FlowPayment>(payment,t);
        Require(p is not null && p.InvoiceID==inv.InvoiceID,"NOT_FOUND","Payment not found."); Check(p!.RowVersion,i.Version);
        Require(p.FinancialReviewRequired && p.Status=="SUCCESS" && p.VnpayReceivedAmount==p.Amount && c.IsCurrent && c.ContractStatus is "SIGNED" or "EFFECTIVE" &&
            (c.TripID is not null || c.DepositDeadline>Now && Now<Cutoff(r)) && inv.PaidAmount<=inv.TotalPayableAmount,"REVIEW_UNRESOLVED","Provider/amount/refund or deadline reconciliation remains unresolved.");
        p.FinancialReviewReason=Text(i.Reason); p.FinancialReviewRequired=false; p.FinancialReviewedBy=actor; p.FinancialReviewedAtUtc=Now;
        await Activate(c,r,inv,t); await db.SaveAsync(t); return await Card(c,t);
    },ct);
    public Task<FlowContractCard> CancellationAsync(string id,string actor,bool manager,string action,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,r)=await Contract(id,actor,manager,t); Check(c.RowVersion,i.Version); var inv=await Invoice(c,t);
        Require(c.IsCurrent && c.ContractStatus=="SIGNED" && c.TripID is null && r.Status=="AWAITING_DEPOSIT","CANCELLATION_CLOSED","Cancellation is available before activation only.");
        if(!manager && action=="request") {
            Require(c.CancellationStatus!="PENDING","CANCELLATION_PENDING","A request is already pending."); c.CancellationId=Id("cancel",id,Guid.NewGuid().ToString("N")); c.CancellationStatus="PENDING"; c.CancellationReason=Text(i.Reason); c.CancellationRequestedAtUtc=Now;
            c.CancellationDecisionReason=null; c.CancellationDecidedBy=null; c.CancellationDecidedAtUtc=null;
        }
        else {
            Require(manager && action is "approve" or "reject" && c.CancellationStatus=="PENDING" && c.CancellationId==i.CancellationId,"CANCELLATION_CHANGED","Select the current cancellation request.");
            if(action=="approve") Require(inv.PaidAmount==0 && !(await Payments(inv,t)).Any(p=>p.Status is "SUCCESS" or "PENDING_GATEWAY" or "REVIEW_REQUIRED" || p.FinancialReviewRequired),"FINANCIAL_REVIEW_REQUIRED","Received money or unresolved attempts prevent approval.");
            c.CancellationStatus=action=="approve"?"APPROVED":"REJECTED"; c.CancellationDecisionReason=Text(i.Reason); c.CancellationDecidedBy=actor; c.CancellationDecidedAtUtc=Now;
            if(action=="approve") {c.ContractStatus="CANCELLED"; c.IsCurrent=false; r.Status="CANCELLED";}
            else await Activate(c,r,inv,t);
        }
        await db.SaveAsync(t); return await Card(c,t);
    },ct);
}
