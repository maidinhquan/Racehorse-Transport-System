using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Application.Flow1.Interfaces;
using static Application.Flow6.Rules.BusinessRules;
namespace Application.Flow6.Services;
public sealed partial class AftercareService
{
    public IRefundVerifier RefundVerifier { private get; set; } = null!;
    private async Task<object> AddAdjustment(string id,string actor,JsonObject body,CancellationToken ct)
    {
        var s=await Settlement(id,ct);Require(S(s,"status") is "DRAFT" or "AWAITING_PAYMENT" or "SETTLED","INVALID_STATE","Closed settlement is immutable.");
        Require(S(s,"finalInvoiceId") is not null,"FINAL_INVOICE_REQUIRED","Issue the base invoice before recording an adjustment.");
        var incident=S(body,"incidentId");var cost=S(body,"costItemId");
        if(incident is not null)await One("SELECT IncidentID FROM INCIDENT WHERE IncidentID=@i AND TripID=@t",ct,("@i",incident),("@t",S(s,"tripId")));
        if(cost is not null)await One("SELECT CostItemID FROM COST_ITEM WHERE CostItemID=@i AND ContractID=@c",ct,("@i",cost),("@c",S(s,"contractId")));
        var type=S(body,"type");
        if(type=="REFUND")
        {
            var paid=await One("SELECT COALESCE(SUM(p.Amount),0) amount FROM PAYMENT p WHERE p.InvoiceID=@i AND p.Status='SUCCESS' AND p.Method='VNPAY'",ct,("@i",S(s,"finalInvoiceId")));
            var refunds=await One("SELECT COALESCE(SUM(Amount),0) amount FROM SETTLEMENT_ADJUSTMENT WHERE SettlementID=@s AND AdjustmentType='REFUND'",ct,("@s",id));
            Require(N(body,"amountVnd")<=N(paid,"amount")-N(refunds,"amount"),"REFUND_EXCEEDS_RECEIPTS","Refund cannot exceed verified final receipts.");
        }
        else Require(S(s,"status")!="SETTLED","INVALID_STATE","No repricing after settlement.");
        var key=await Next("SETTLEMENT_ADJUSTMENT","SETTLEMENT_ADJUSTMENT",ct);
        await E("INSERT SETTLEMENT_ADJUSTMENT(AdjustmentID,SettlementID,IncidentID,CostItemID,OriginalInvoiceID,AdjustmentType,Amount,Reason,CreatedBy,CreatedAtUtc,DecidedBy,DecidedAtUtc,DecisionReason,RefundStatus) VALUES(@id,@s,@i,@c,@invoice,@type,@amount,@reason,@a,@now,@a,@now,@decision,@refund)",ct,("@id",key),("@s",id),("@i",incident),("@c",cost),("@invoice",S(s,"finalInvoiceId")),("@type",type),("@amount",N(body,"amountVnd")),("@reason",S(body,"reason")),("@a",actor),("@now",Now),("@decision",S(body,"decisionReason")),("@refund",type=="REFUND"?"REQUESTED":null));
        var balance=await Balance(s,ct);
        if(type!="REFUND")Require(N(balance,"signedPriceVnd")+N(balance,"chargesVnd")-N(balance,"discountsVnd")>=N(balance,"depositPaidVnd")+N(balance,"finalPaidVnd"),"PAYMENT_RECONCILIATION_REQUIRED","Discount cannot erase received money or create an implicit refund.");
        return await One(AdjustmentSql+" WHERE AdjustmentID=@id",ct,("@id",key));
    }
    private async Task<object> CreateInvoice(string id,JsonObject body,CancellationToken ct)
    {
        var s=await Settlement(id,ct);Require(S(s,"status") is "DRAFT" or "AWAITING_PAYMENT","INVALID_STATE","Settlement cannot issue invoices.");
        Require(S(s,"handoverRevisionId") is not null,"DELIVERY_NOT_CONFIRMED","Confirm delivery first.");
        var due=D(body,"dueAtUtc");Require(due is null || due>Now,"VALIDATION_ERROR","Invoice due date must be future UTC.",400);
        var unapplied=await Q("SELECT AdjustmentID FROM SETTLEMENT_ADJUSTMENT WHERE SettlementID=@s AND AdjustmentType IN('CHARGE','DISCOUNT') AND AppliedAtUtc IS NULL",ct,("@s",id));
        var original=S(s,"finalInvoiceId");
        if(original is not null)
        {
            if(unapplied.Count==0)return await Invoice(s,ct);
            var frozen=await Q("SELECT PaymentID FROM PAYMENT WHERE InvoiceID=@i AND (Status IN('SUCCESS','PENDING_GATEWAY') OR FinancialReviewRequired=1)",ct,("@i",original));
            var previous=await Invoice(s,ct);
            Require(frozen.Count==0 && N(previous,"paidVnd")==0,"INVOICE_RECONCILIATION_REQUIRED","Cannot replace a paid, pending or unreconciled invoice.");
            await E("UPDATE INVOICE SET PaymentStatus='CANCELLED' WHERE InvoiceID=@i",ct,("@i",original));
        }
        var balance=await Balance(s,ct);var amount=N(balance,"finalDueVnd");var key=await Next("INVOICE","INVOICE",ct);
        await E("INSERT INVOICE(InvoiceID,ContractID,ContractVersionNo,InvoiceType,CurrencyCode,TotalPayableAmount,PaidAmount,DueDate,PaymentStatus) VALUES(@id,@c,@v,'FINAL_SETTLEMENT','VND',@amount,0,@due,@status)",ct,("@id",key),("@c",S(s,"contractId")),("@v",N(s,"contractVersionNo")),("@amount",amount),("@due",due),("@status",amount==0?"PAID":"UNPAID"));
        if(original is not null)await E("UPDATE SETTLEMENT_ADJUSTMENT SET AdjustedInvoiceID=@new,AppliedAtUtc=@now WHERE SettlementID=@s AND AdjustmentType IN('CHARGE','DISCOUNT') AND AppliedAtUtc IS NULL",ct,("@new",key),("@now",Now),("@s",id));
        await E("UPDATE TRIP_SETTLEMENT SET FinalInvoiceID=@i,Status='AWAITING_PAYMENT' WHERE SettlementID=@s",ct,("@i",key),("@s",id));return await Invoice(await Settlement(id,ct),ct);
    }
    private async Task<object> Refund(string id,string actor,JsonObject? body,bool complete,CancellationToken ct)
    {
        var a=await One("SELECT * FROM SETTLEMENT_ADJUSTMENT WHERE AdjustmentID=@id AND AdjustmentType='REFUND'",ct,("@id",id));
        Require(S(a,"RefundStatus") is "REQUESTED" or "PROCESSING" or "COMPLETED","INVALID_STATE","No refund obligation.");
        if(complete)
        {
            if(S(a,"RefundStatus")=="COMPLETED") {Require(S(a,"RefundReference")==S(body!,"reference"),"INVALID_STATE","Refund already completed with a different reference.");return RefundDto(a);}
            var at=D(body!,"refundedAtUtc")!.Value;
            Require(at<=Now && at>=D(a,"DecidedAtUtc"),"VALIDATION_ERROR","Invalid actual refund time.",400);
            Require((await Q("SELECT AdjustmentID FROM SETTLEMENT_ADJUSTMENT WHERE RefundReference=@r AND AdjustmentID<>@id",ct,("@r",S(body!,"reference")),("@id",id))).Count==0,"REFUND_REFERENCE_USED","Reference already used.");
            Require(await RefundVerifier.Verify(S(body!,"reference")!,N(a,"Amount"),at,ct),"REFUND_NOT_VERIFIED","Refund could not be verified.");
            await E("UPDATE SETTLEMENT_ADJUSTMENT SET RefundStatus='COMPLETED',RefundedBy=@a,RefundedAtUtc=@n,RefundReference=@r WHERE AdjustmentID=@id",ct,("@a",actor),("@n",at),("@r",S(body!,"reference")),("@id",id));
            var s=await Settlement(S(a,"SettlementID")!,ct);if(S(s,"status")=="SETTLED" && !await OpenComplaints(S(s,"id")!,ct) && !await FinancialObligations(s,ct))await Restart(s,ct);
        }
        else if(S(a,"RefundStatus")!="COMPLETED")await E("UPDATE SETTLEMENT_ADJUSTMENT SET RefundStatus='PROCESSING' WHERE AdjustmentID=@id",ct,("@id",id));
        return RefundDto(await One("SELECT * FROM SETTLEMENT_ADJUSTMENT WHERE AdjustmentID=@id",ct,("@id",id)));
    }
    private static JsonObject RefundDto(JsonObject a)=>J(new{adjustmentId=S(a,"AdjustmentID"),status=S(a,"RefundStatus"),reference=S(a,"RefundReference"),refundedAtUtc=S(a,"RefundedAtUtc")});
    private async Task<object> PaymentSession(string invoice,string ip,CancellationToken ct)
    {
        Require(gateway.IsConfigured,"FEATURE_NOT_SUPPORTED","Configure VNPay before creating a session.",501);
        // Hỏi lại VNPay trước: giao dịch chờ cũ có thể đã thành công/thất bại mà IPN chưa về được máy chủ
        try { await ReconcilePending(ct,invoice); } catch (Exception e) when (e is not OperationCanceledException) { }
        var s=await One(SettlementSql+" WHERE FinalInvoiceID=@i",ct,("@i",invoice));
        Require(S(s,"status")=="AWAITING_PAYMENT","INVALID_STATE","Final settlement is not awaiting payment.");
        var pending=await Q("SELECT PaymentID FROM PAYMENT WHERE InvoiceID=@i AND (Status='PENDING_GATEWAY' OR FinancialReviewRequired=1)",ct,("@i",invoice));
        Require(pending.Count==0,"PAYMENT_PENDING","Existing payment must be completed or reconciled.");
        var unapplied=await Q("SELECT AdjustmentID FROM SETTLEMENT_ADJUSTMENT WHERE SettlementID=@s AND AdjustmentType IN('CHARGE','DISCOUNT') AND AppliedAtUtc IS NULL",ct,("@s",S(s,"id")));
        Require(unapplied.Count==0,"PENDING_ADJUSTMENT","Apply invoice changes first.");
        var b=await Balance(s,ct);Require(N(b,"remainingVnd")>0 && !B(b,"financialReviewRequired"),"INVALID_STATE","No payable balance or reconciliation required.");
        var key=await Next("PAYMENT","PAYMENT",ct);var created=Now;var reference="F6"+key.Replace("_","")+"T"+created.ToString("yyyyMMddHHmmss");
        var session=await gateway.CreateSessionAsync(new(reference,invoice,N(b,"remainingVnd"),"VND",new DateTimeOffset(created.AddMinutes(15),TimeSpan.Zero),ip,new DateTimeOffset(created,TimeSpan.Zero)),ct);
        Require(session.ProviderReference==reference,"GATEWAY_REFERENCE_MISMATCH","Gateway changed the payment reference.",502);
        await E("INSERT PAYMENT(PaymentID,InvoiceID,CurrencyCode,Amount,Method,Status,PaymentDate,VnpayTmnCode,VnpayCreatedAtUtc,VnpayExpiresAtUtc) VALUES(@id,@i,'VND',@amount,'VNPAY','PENDING_GATEWAY',@now,@merchant,@now,@expires)",ct,("@id",key),("@i",invoice),("@amount",N(b,"remainingVnd")),("@now",created),("@merchant",session.MerchantId),("@expires",session.ExpiresAtUtc.UtcDateTime));
        return J(new{paymentId=key,paymentUrl=session.PaymentUrl.ToString(),expiresAtUtc=session.ExpiresAtUtc.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ss.fffffffZ")});
    }
    public async Task<object> Ipn(IReadOnlyDictionary<string,string> payload,CancellationToken ct)
    {
        var verified=await gateway.VerifyAsync(payload,ct);
        if(!verified.Verified)return new{RspCode="97",Message="Invalid signature"};
        return await RecordVerified(verified,payload,ct);
    }
    private async Task<object> RecordVerified(VerifiedGatewayResult verified,IReadOnlyDictionary<string,string> payload,CancellationToken ct)
    {
        var match=Regex.Match(verified.ProviderReference,@"\AF6PAYMENT([0-9]{3,})T([0-9]{14})\z");
        if(!match.Success)return new{RspCode="01",Message="Unknown reference"};
        return await db.Transaction<object>(async()=>
        {
            var p=(await Q("SELECT * FROM PAYMENT WHERE PaymentID=@id",ct,("@id","PAYMENT_"+match.Groups[1].Value))).SingleOrDefault();
            if(p is null || D(p,"VnpayCreatedAtUtc")?.ToString("yyyyMMddHHmmss")!=match.Groups[2].Value)return new{RspCode="01",Message="Order not found"};
            if(N(p,"Amount")!=verified.Amount || S(p,"VnpayTmnCode")!=verified.MerchantId || verified.Currency!="VND")return new{RspCode="04",Message="Amount or merchant mismatch"};
            if(S(p,"Status")=="SUCCESS" || N(p,"VnpayReceivedAmount")>0)return new{RspCode="02",Message="Already processed"};
            if(verified.ProviderTransactionId is string tx && (await Q("SELECT PaymentID FROM PAYMENT WHERE TransactionCode=@tx AND VnpayTmnCode=@m AND PaymentID<>@id",ct,("@tx",tx),("@m",verified.MerchantId),("@id",S(p,"PaymentID")))).Count>0)return new{RspCode="02",Message="Duplicate provider transaction"};
            var success=verified.Status=="SUCCESS";var s=await One(SettlementSql+" WHERE ContractID=(SELECT ContractID FROM INVOICE WHERE InvoiceID=@i)",ct,("@i",S(p,"InvoiceID")));
            var late=success&&(D(p,"VnpayExpiresAtUtc")<=Now||S(s,"finalInvoiceId")!=S(p,"InvoiceID")||S(s,"status")!="AWAITING_PAYMENT"||S(p,"Status")!="PENDING_GATEWAY");
            Require(!success || !string.IsNullOrWhiteSpace(verified.ProviderTransactionId),"INVALID_GATEWAY_RESULT","Verified payment lacks provider transaction.");
            await E("UPDATE PAYMENT SET Status=@status,TransactionCode=@tx,VnpayResponseCode=@rc,VnpayTransactionStatus=@ts,VnpayBankCode=@bank,VnpayReceivedAmount=@received,FinancialReviewRequired=@review,FinancialReviewReason=@reason WHERE PaymentID=@id",ct,("@status",success?"SUCCESS":"FAILED"),("@tx",verified.ProviderTransactionId),("@rc",payload.GetValueOrDefault("vnp_ResponseCode")),("@ts",payload.GetValueOrDefault("vnp_TransactionStatus")),("@bank",verified.BankCode),("@received",success?verified.Amount:null),("@review",late),("@reason",late?"FLOW6_LATE_OR_STALE_PAYMENT":null),("@id",S(p,"PaymentID")));
            if(success)
            {
                await E("UPDATE i SET PaidAmount=x.paid,PaymentStatus=CASE WHEN x.paid>=i.TotalPayableAmount THEN 'PAID' WHEN x.paid>0 THEN 'PARTIALLY_PAID' ELSE 'UNPAID' END FROM INVOICE i CROSS APPLY(SELECT COALESCE(SUM(Amount),0) paid FROM PAYMENT WHERE InvoiceID=i.InvoiceID AND Status='SUCCESS' AND Method='VNPAY') x WHERE i.InvoiceID=@i",ct,("@i",S(p,"InvoiceID")));
                if(late)await Notify(S(s,"tripId")!,"PAYMENT_RECONCILIATION_REQUIRED",ct);
            }
            return new{RspCode="00",Message="Confirm success"};
        },ct);
    }
}
