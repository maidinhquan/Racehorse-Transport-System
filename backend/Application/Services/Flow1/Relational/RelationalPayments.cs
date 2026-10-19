using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
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
    public Task<object> ReturnedAsync(string id,string actor,CancellationToken ct)=>db.RunAsync<object>(async t=>{
        var p=await db.FindAsync<FlowPayment>(id,t)??throw Error("Payment not found.","NOT_FOUND",404);var inv=(await db.FindAsync<FlowInvoice>(p.InvoiceID,t))!;
        var(c,r)=await Contract(inv.ContractID,actor,false,t);return new{requestId=r.RequestID,contract=await Card(c,t)};
    },ct);
    private static void Flag(FlowPayment p,string reason) { p.FinancialReviewRequired=true; p.FinancialReviewReason=reason; p.FinancialReviewedAtUtc=null; p.FinancialReviewedBy=null; }
    private async Task HoldFinancial(FlowContract c,CancellationToken ct)
    {
        if(c.TripID is null)return;var trip=await db.FindAsync<FlowTrip>(c.TripID,ct);
        if(trip is null || trip.Status is not ("PLANNING" or "READY_TO_DEPART"))return;
        trip.Status="PLANNING";trip.DeploymentStatus="ON_HOLD";trip.HandoffEventId=null;trip.RoutingAcknowledgedBy=null;trip.RoutingAcknowledgedAtUtc=null;trip.DocumentsAcknowledgedBy=null;trip.DocumentsAcknowledgedAtUtc=null;
        trip.DeploymentReason="Financial review required";trip.DeploymentBy="SYSTEM";trip.DeploymentAtUtc=Now;
    }
    private async Task Activate(FlowContract c,FlowRequest r,FlowInvoice inv,CancellationToken ct)
    {
        if(c.TripID is not null) {
            var existing=await db.FindAsync<FlowTrip>(c.TripID,ct);
            Require(existing?.RequestID==r.RequestID,"DATA_REVIEW_REQUIRED","Activated Trip link differs from request."); return;
        }
        if(!c.IsCurrent || c.SignedAt is null || c.ContractStatus!="SIGNED" || r.Status!="AWAITING_DEPOSIT" ||
            c.CancellationStatus=="PENDING" || inv.PaidAmount<inv.TotalPayableAmount || c.DepositDeadline is null || r.ExpectedDate is null || r.PreparationDays is null ||
            (await Payments(inv,ct)).Any(p=>p.FinancialReviewRequired) || Now>c.DepositDeadline || Now>=Cutoff(r)) return;
        Require(!(await db.QueryAsync<FlowTrip>(x=>x.RequestID==r.RequestID,ct)).Any(),"DATA_REVIEW_REQUIRED","An unexpected Trip already exists.");
        var trip=new FlowTrip{TripID=Id("t",r.RequestID),RequestID=r.RequestID,TotalDistance_km=r.DistanceKm,Status="PLANNING",DeploymentStatus="PENDING",DeploymentReason="Signed terms and verified deposit",DeploymentBy="SYSTEM",DeploymentAtUtc=Now};
        db.Add(trip); c.TripID=trip.TripID; c.ContractStatus="EFFECTIVE"; r.Status="ACTIVATED";
        await Notify(c.CustomerID,r.RequestID,"FLOW1_ACTIVATED","Yêu cầu đã được kích hoạt",
            "Đã ký hợp đồng và xác minh đủ cọc. Chuyến đang chờ Manager xác nhận bàn giao vận hành.",ct);
    }
    public Task<object> PaymentSessionAsync(string id,string actor,string key,string ip,CancellationToken ct)=>db.RunAsync<object>(async t=>{
        Key(key); var(c,r)=await Contract(id,actor,false,t); var inv=await Invoice(c,t); var payments=await Payments(inv,t);
        Require(c.IsCurrent && (c.WorkflowVersion==1?c.SignedAt is null && c.ContractStatus=="PENDING_SIGNATURE" && c.TermsAcceptedAtUtc is not null && c.TermsAcceptedPdfSha256==c.PdfSha256 && !await PendingChange(c,t):c.SignedAt is not null && c.ContractStatus=="SIGNED") && r.Status=="AWAITING_DEPOSIT" &&
            c.CancellationStatus!="PENDING" && c.DepositDeadline>Now && Now<Cutoff(r) && !payments.Any(p=>p.FinancialReviewRequired),"PAYMENT_CLOSED","Deposit payment is closed or awaiting review.");
        var amount=inv.TotalPayableAmount-inv.PaidAmount; Require(amount>0,"DEPOSIT_ALREADY_PAID","Deposit already paid.");
        if(c.WorkflowVersion==1)Require(!payments.Any(p=>p.Status=="PENDING_GATEWAY"&&p.VnpayExpiresAtUtc<=Now),"PAYMENT_UNRESOLVED","An expired gateway attempt must be reconciled before retrying.");
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
        return await ApplyGateway(v,ct);
    }
    private Task<object> ApplyGateway(VerifiedGatewayResult v,CancellationToken ct,string? expectedVersion=null)=>db.RunAsync<object>(async t=>{
            var p=await db.FindAsync<FlowPayment>(v.ProviderReference,t);
            if(p is null || p.Method!="VNPAY") return new{RspCode="01",Message="Order not found"};
            if(expectedVersion is not null)Check(p.RowVersion,expectedVersion);
            if(p.VnpayTmnCode!=v.MerchantId) return new{RspCode="97",Message="Merchant differs"};
            var inv=(await db.FindAsync<FlowInvoice>(p.InvoiceID,t))!; var c=(await db.FindAsync<FlowContract>(inv.ContractID,t))!; var r=(await db.FindAsync<FlowRequest>(c.RequestID,t))!;
            if(p.Status is "SUCCESS" or "REVIEW_REQUIRED") {
                if(p.Status=="SUCCESS" && v.Status=="SUCCESS" && p.TransactionCode==v.ProviderTransactionId && p.Amount==v.Amount && p.PaymentDate==v.PaidAtUtc?.UtcDateTime) return new{RspCode="02",Message="Already confirmed"};
                if(p.Status=="REVIEW_REQUIRED" && p.TransactionCode==v.ProviderTransactionId && p.VnpayReceivedAmount==v.Amount) return new{RspCode="02",Message="Already recorded for review"};
                Flag(p,"Contradictory signed callback; retain original receipt and reconcile with VNPay."); await HoldFinancial(c,t); return new{RspCode="02",Message="Receipt retained; review required"};
            }
            var wasFailed=p.Status=="FAILED";
            p.VnpayResponseCode=v.ResponseCode; p.VnpayTransactionStatus=v.TransactionStatus; p.VnpayBankCode=v.BankCode;
            if(v.Status!="SUCCESS") { p.Status="FAILED"; return new{RspCode="00",Message="Failure recorded"}; }
            p.TransactionCode=v.ProviderTransactionId; p.VnpayReceivedAmount=v.Amount; p.PaymentDate=v.PaidAtUtc!.Value.UtcDateTime;
            if(v.Amount!=p.Amount || v.Currency!="VND") {p.Status="REVIEW_REQUIRED"; Flag(p,"Signed callback amount differs from the requested VND amount; allocation blocked."); await HoldFinancial(c,t); return new{RspCode="04",Message="Amount differs; recorded for review"};}
            var duplicate=(await db.QueryAsync<FlowPayment>(x=>x.PaymentID!=p.PaymentID && x.VnpayTmnCode==p.VnpayTmnCode && x.TransactionCode==p.TransactionCode,t)).Any();
            if(duplicate) {p.Status="REVIEW_REQUIRED"; Flag(p,"Provider transaction is already recorded on another attempt; do not allocate twice."); await HoldFinancial(c,t); return new{RspCode="02",Message="Transaction already recorded"};}
            p.Status="SUCCESS";
            if(wasFailed || Now>c.DepositDeadline || v.PaidAtUtc.Value.UtcDateTime>c.DepositDeadline || v.PaidAtUtc.Value.UtcDateTime>p.VnpayExpiresAtUtc || v.PaidAtUtc.Value.UtcDateTime<p.VnpayCreatedAtUtc || !c.IsCurrent || !(c.ContractStatus is "SIGNED" or "EFFECTIVE" || c.WorkflowVersion==1&&c.ContractStatus=="PENDING_SIGNATURE") || r.Status=="CANCELLED") Flag(p,"Late, previously failed or closed-contract payment; verified money retained for review.");
            var entries=await Payments(inv,t); // Includes the tracked current row.
            inv.PaidAmount=entries.Where(x=>x.Status=="SUCCESS").Sum(x=>x.Amount);
            inv.PaymentStatus=inv.PaidAmount>=inv.TotalPayableAmount?"PAID":inv.PaidAmount>0?"PARTIALLY_PAID":"UNPAID";
            if(inv.PaidAmount>inv.TotalPayableAmount) Flag(p,"Verified payments exceed the required deposit; no automatic refund.");
            if(inv.TotalPayableAmount!=c.DepositAmount || inv.CurrencyCode!="VND" || c.CustomerID!=r.CustomerID || r.ExpectedDate is null || r.PreparationDays is null)
                Flag(p,"Invoice or ownership differs from signed terms; verified money retained without activation.");
            await Activate(c,r,inv,t);if(entries.Any(x=>x.FinancialReviewRequired))await HoldFinancial(c,t);return new{RspCode="00",Message="Confirmed"};
        },ct);
    public async Task<FlowContractCard> QueryPaymentAsync(string id,string payment,string actor,FlowAction i,string ip,CancellationToken ct)
    {
        Require(query is not null,"VNPAY_NOT_CONFIGURED","Provider reconciliation adapter is unavailable.");Text(i.Reason);
        var snapshot=await db.RunAsync(async t=>{
            var(c,_)=await Contract(id,actor,true,t);var inv=await Invoice(c,t);var p=await db.FindAsync<FlowPayment>(payment,t);
            Require(p is not null && p.InvoiceID==inv.InvoiceID && p.VnpayTmnCode is not null && p.VnpayCreatedAtUtc is not null,"NOT_FOUND","VNPay attempt unavailable.");Check(p.RowVersion,i.Version);
            return new GatewayQueryRequest(p.PaymentID,p.VnpayTmnCode,new(p.VnpayCreatedAtUtc.Value),ip);
        },ct);
        // Provider HTTP is outside the SQL transaction. Apply only against the original attempt version.
        var result=await query.QueryAsync(snapshot,ct);
        Require(result.Verified && result.PaymentId==payment && result.MerchantId==snapshot.MerchantId,"VNPAY_QUERY_INVALID","Provider result is unverified or belongs to another attempt.");
        if(result.State=="SUCCESS")
        {
            Require(result.Amount>0 && result.TransactionId is not null && result.PaidAtUtc is not null,"VNPAY_QUERY_INVALID","Provider receipt incomplete.");
            await ApplyGateway(new(true,payment,result.TransactionId,result.Amount.Value,"VND","SUCCESS",result.PaidAtUtc,System.Text.Json.JsonSerializer.SerializeToElement(new{}),result.MerchantId,result.BankCode,"00","00"),ct,i.Version);
        }
        else await db.RunAsync(async t=>{
            var(c,_)=await Contract(id,actor,true,t);var p=(await db.FindAsync<FlowPayment>(payment,t))!;Check(p.RowVersion,i.Version);
            if(result.State=="FAILED" && p.Status!="SUCCESS" && p.VnpayReceivedAmount is null) {
                p.Status="FAILED";p.VnpayTransactionStatus="02";p.FinancialReviewRequired=false;p.FinancialReviewReason=Text(i.Reason);p.FinancialReviewedBy=actor;p.FinancialReviewedAtUtc=Now;
            } else {Flag(p,result.State=="FAILED"?"Provider query conflicts with retained money; original evidence preserved.":"Provider query is unresolved; no absence of money assumed.");await HoldFinancial(c,t);}
            return 0;
        },ct);
        return await ContractAsync(id,actor,true,ct);
    }
    public Task<FlowContractCard> CancelOverdueAsync(string id,string actor,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,r)=await Contract(id,actor,true,t);Check(c.RowVersion,i.Version);var inv=await Invoice(c,t);
        Require(c.IsCurrent && c.ContractStatus=="SIGNED" && c.TripID is null && c.DepositDeadline<Now && r.Status=="AWAITING_DEPOSIT","CANCELLATION_CLOSED","Only an overdue unactivated deposit may be closed.");
        Require(inv.PaidAmount==0 && !(await Payments(inv,t)).Any(p=>p.Status is "SUCCESS" or "PENDING_GATEWAY" or "REVIEW_REQUIRED" || p.FinancialReviewRequired),"FINANCIAL_REVIEW_REQUIRED","Resolve money and gateway attempts first.");
        c.ContractStatus="CANCELLED";c.IsCurrent=false;r.Status="CANCELLED";r.ManagerNotes=Text(i.Reason);await db.SaveAsync(t);return await Card(c,t);
    },ct);
    public Task<FlowContractCard> FinancialReviewAsync(string id,string payment,string actor,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,r)=await Contract(id,actor,true,t); var inv=await Invoice(c,t); var p=await db.FindAsync<FlowPayment>(payment,t);
        Require(p is not null && p.InvoiceID==inv.InvoiceID,"NOT_FOUND","Payment not found."); Check(p!.RowVersion,i.Version);
        Require(p.FinancialReviewRequired && p.Status=="SUCCESS" && p.VnpayReceivedAmount==p.Amount && c.IsCurrent && (c.ContractStatus is "SIGNED" or "EFFECTIVE" || c.WorkflowVersion==1&&c.ContractStatus=="PENDING_SIGNATURE") &&
            (c.TripID is not null || c.DepositDeadline>Now && Now<Cutoff(r)) && inv.PaidAmount<=inv.TotalPayableAmount,"REVIEW_UNRESOLVED","Provider/amount/refund or deadline reconciliation remains unresolved.");
        p.FinancialReviewReason=Text(i.Reason); p.FinancialReviewRequired=false; p.FinancialReviewedBy=actor; p.FinancialReviewedAtUtc=Now;
        await Activate(c,r,inv,t); await db.SaveAsync(t); return await Card(c,t);
    },ct);
    public Task<FlowContractCard> CancellationAsync(string id,string actor,bool manager,string action,FlowAction i,CancellationToken ct)=>db.RunAsync(async t=>{
        var(c,r)=await Contract(id,actor,manager,t); Check(c.RowVersion,i.Version); var inv=await Invoice(c,t);
        Require(c.IsCurrent && (c.WorkflowVersion==1?c.SignedAt is null&&c.ContractStatus=="PENDING_SIGNATURE":c.ContractStatus=="SIGNED"&&r.Status=="AWAITING_DEPOSIT") && c.TripID is null,"CANCELLATION_CLOSED","Cancellation is available before signature only.");
        if(!manager && action=="request") {
            Require(c.CancellationStatus!="PENDING","CANCELLATION_PENDING","A request is already pending."); c.CancellationId=Id("cancel",id,Guid.NewGuid().ToString("N")); c.CancellationStatus="PENDING"; c.CancellationReason=Text(i.Reason); c.CancellationRequestedAtUtc=Now;
            c.CancellationDecisionReason=null; c.CancellationDecidedBy=null; c.CancellationDecidedAtUtc=null;
        }
        else {
            Require(manager && action is "approve" or "reject" && c.CancellationStatus=="PENDING" && c.CancellationId==i.CancellationId,"CANCELLATION_CHANGED","Select the current cancellation request.");
            if(action=="approve") {
                var receipts=await Payments(inv,t);
                Require(!receipts.Any(p=>p.Status is "PENDING_GATEWAY" or "REVIEW_REQUIRED"||p.FinancialReviewRequired),"FINANCIAL_REVIEW_REQUIRED","Reconcile all gateway attempts first.");
                if(c.WorkflowVersion==0)Require(inv.PaidAmount==0,"FINANCIAL_REVIEW_REQUIRED","Legacy money requires manual review.");
                else {c.RefundAmount=inv.PaidAmount;c.RefundStatus=inv.PaidAmount>0?"REQUESTED":"NOT_REQUIRED";}
            }
            c.CancellationStatus=action=="approve"?"APPROVED":"REJECTED"; c.CancellationDecisionReason=Text(i.Reason); c.CancellationDecidedBy=actor; c.CancellationDecidedAtUtc=Now;
            if(action=="approve") {c.ContractStatus="CANCELLED"; c.IsCurrent=false; c.SignOtpHash=null;r.Status="CANCELLED";Audit(c,actor,"CANCELLED",c.CancellationDecisionReason!);}
            else await Activate(c,r,inv,t);
        }
        await db.SaveAsync(t); return await Card(c,t);
    },ct);
}
