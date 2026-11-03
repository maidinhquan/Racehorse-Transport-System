using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using System.Text.Json.Nodes;
using static Application.Flow6.Rules.BusinessRules;
namespace Application.Flow6.Services;
public sealed partial class AftercareService
{
    private const string SettlementSql="SELECT SettlementID id,ContractID contractId,TripID tripId,ContractVersionNo contractVersionNo,Status status,HandoverRevisionID handoverRevisionId,FinalInvoiceID finalInvoiceId,SettledAtUtc settledAtUtc,ClosedAtUtc closedAtUtc,FeedbackStartedAtUtc feedbackStartsAtUtc,FeedbackEndsAtUtc feedbackEndsAtUtc FROM TRIP_SETTLEMENT";
    private Task<JsonObject> Settlement(string id,CancellationToken ct)=>One(SettlementSql+" WHERE SettlementID=@id",ct,("@id",id));
    private async Task<JsonObject> Prepare(string trip,string actor,CancellationToken ct)
    {
        var old=(await Q(SettlementSql+" WHERE TripID=@t",ct,("@t",trip))).SingleOrDefault();if(old is not null)return old;
        var s=await Scope(trip,ct);Require(S(s,"VersionStatus")=="SIGNED" && S(s,"ContractStatus")=="EFFECTIVE","INVALID_STATE","Effective signed contract required.");
        var id=await Next("TRIP_SETTLEMENT","SETTLEMENT",ct);
        await E("INSERT TRIP_SETTLEMENT(SettlementID,ContractID,TripID,CustomerID,ContractVersionNo,PreparedBy,CreatedAtUtc) VALUES(@id,@c,@t,@u,@v,@a,@now)",ct,("@id",id),("@c",S(s,"ContractID")),("@t",trip),("@u",S(s,"CustomerID")),("@v",N(s,"CurrentVersionNo")),("@a",actor),("@now",Now));
        return await Settlement(id,ct);
    }
    private async Task<JsonObject> Balance(JsonObject s,CancellationToken ct)
    {
        var version=await One("SELECT ContentSnapshot FROM CONTRACT_VERSION WHERE ContractID=@c AND VersionNo=@v AND VersionStatus='SIGNED'",ct,("@c",S(s,"contractId")),("@v",N(s,"contractVersionNo")));
        var snapshot=JsonNode.Parse(S(version,"ContentSnapshot")!);
        Require(snapshot?["commercial"]?["totalPrice"] is not null,"SIGNED_PRICE_UNAVAILABLE","Signed snapshot has no supported commercial.totalPrice; do not use mutable quote.");
        var price=Money(snapshot!["commercial"]!["totalPrice"]!.GetValue<decimal>());
        var sums=await One("SELECT COALESCE(SUM(CASE WHEN AdjustmentType='CHARGE' THEN Amount ELSE 0 END),0) charges,COALESCE(SUM(CASE WHEN AdjustmentType='DISCOUNT' THEN Amount ELSE 0 END),0) discounts FROM SETTLEMENT_ADJUSTMENT WHERE SettlementID=@s",ct,("@s",S(s,"id")));
        var payments=await Q("SELECT p.*,i.InvoiceType FROM PAYMENT p JOIN INVOICE i ON i.InvoiceID=p.InvoiceID WHERE i.ContractID=@c AND i.ContractVersionNo=@v",ct,("@c",S(s,"contractId")),("@v",N(s,"contractVersionNo")));
        var deposit=payments.Where(x=>S(x,"InvoiceType")=="DEPOSIT" && S(x,"Status")=="SUCCESS" && S(x,"Method")=="VNPAY" && S(x,"CurrencyCode")=="VND").Sum(x=>N(x,"Amount"));
        var final=payments.Where(x=>S(x,"InvoiceID")==S(s,"finalInvoiceId") && S(x,"Status")=="SUCCESS" && S(x,"Method")=="VNPAY" && S(x,"CurrencyCode")=="VND").Sum(x=>N(x,"Amount"));
        var adjusted=price+N(sums,"charges")-N(sums,"discounts");Money(adjusted);
        var due=Money(Math.Max(0,adjusted-deposit));
        return J(new{signedPriceVnd=price,chargesVnd=Money(N(sums,"charges")),discountsVnd=Money(N(sums,"discounts")),depositPaidVnd=Money(deposit),finalDueVnd=due,finalPaidVnd=Money(final),remainingVnd=Math.Max(0,due-final),financialReviewRequired=payments.Any(x=>B(x,"FinancialReviewRequired"))||adjusted<deposit||final>due});
    }
    private const string AdjustmentSql="SELECT AdjustmentID id,SettlementID settlementId,AdjustmentType type,Amount amountVnd,Reason reason,DecisionReason decisionReason,IncidentID incidentId,CostItemID costItemId,OriginalInvoiceID originalInvoiceId,AdjustedInvoiceID adjustedInvoiceId,RefundStatus refundStatus,DecidedAtUtc decidedAtUtc FROM SETTLEMENT_ADJUSTMENT";
    private const string CaseSql="SELECT CaseID id,SettlementID settlementId,CaseType type,Subject subject,Description description,Status status,ResolutionText resolution,OpenedAtUtc openedAtUtc,ResolvedAtUtc resolvedAtUtc FROM CUSTOMER_CASE";
    private const string FeedbackSql="SELECT FeedbackID id,Rating rating,Comment comment,CreatedAtUtc createdAtUtc FROM CUSTOMER_FEEDBACK";
    private const string PaymentSql="SELECT PaymentID id,InvoiceID invoiceId,Amount amountVnd,Status status,FinancialReviewRequired financialReviewRequired FROM PAYMENT";
    private async Task<JsonObject> Invoice(JsonObject s,CancellationToken ct)=>await One("SELECT InvoiceID id,@s settlementId,TotalPayableAmount totalVnd,PaidAmount paidVnd,PaymentStatus status,DueDate dueAtUtc FROM INVOICE WHERE InvoiceID=@i",ct,("@s",S(s,"id")),("@i",S(s,"finalInvoiceId")));
    private async Task<bool> FinancialObligations(JsonObject s,CancellationToken ct)
    {
        var balance=await Balance(s,ct);
        var pending=await Q("SELECT AdjustmentID FROM SETTLEMENT_ADJUSTMENT WHERE SettlementID=@s AND ((AdjustmentType='REFUND' AND (RefundStatus IS NULL OR RefundStatus<>'COMPLETED')) OR (AdjustmentType IN('CHARGE','DISCOUNT') AND AppliedAtUtc IS NULL)) UNION ALL SELECT p.PaymentID FROM PAYMENT p JOIN INVOICE i ON p.InvoiceID=i.InvoiceID WHERE i.ContractID=@c AND i.ContractVersionNo=@v AND p.Status='PENDING_GATEWAY'",ct,("@s",S(s,"id")),("@c",S(s,"contractId")),("@v",N(s,"contractVersionNo")));
        return N(balance,"remainingVnd")>0 || B(balance,"financialReviewRequired") || pending.Count>0;
    }
    private async Task<bool> OpenComplaints(string id,CancellationToken ct)=>(await Q("SELECT CaseID FROM CUSTOMER_CASE WHERE SettlementID=@s AND CaseType='COMPLAINT' AND Status<>'RESOLVED'",ct,("@s",id))).Count>0;
    private async Task Restart(JsonObject s,CancellationToken ct)
    {
        Require(S(s,"status")=="SETTLED","INVALID_STATE","Settlement is not settled.");
        Require(!await OpenComplaints(S(s,"id")!,ct) && !await FinancialObligations(s,ct),"OPEN_OBLIGATIONS","Unresolved complaint or financial obligations.");
        // Last complaint resolution is the source marker. Replay must not extend the clock again.
        var last=await One("SELECT MAX(ResolvedAtUtc) lastResolved FROM CUSTOMER_CASE WHERE SettlementID=@s AND CaseType='COMPLAINT'",ct,("@s",S(s,"id")));
        if(D(last,"lastResolved") is not DateTime resolved || D(s,"feedbackStartsAtUtc")>=resolved)return;
        var hours=await Policy(await Scope(S(s,"tripId")!,ct),"FEEDBACK_WINDOW_HOURS","HOUR",ct);
        await E("UPDATE TRIP_SETTLEMENT SET FeedbackStartedAtUtc=@n,FeedbackEndsAtUtc=@end WHERE SettlementID=@s",ct,("@n",Now),("@end",Now.AddHours((double)hours)),("@s",S(s,"id")));
    }
    private async Task<object?> SettlementDispatch(string op,string actor,string id,JsonObject? body,string ip,CancellationToken ct)
    {
        switch(op)
        {
            case "F6-J12":return A(await Q(SettlementSql+" WHERE CustomerID=@a ORDER BY SettlementID",ct,("@a",actor)));
            case "F6-J14":
            {
                if (string.IsNullOrWhiteSpace(id))
                    return A(await Q(SettlementSql + " ORDER BY SettlementID", ct));
                var status = id.Trim().ToUpperInvariant();
                Require(new[] { "DRAFT", "AWAITING_PAYMENT", "SETTLED", "CLOSED" }.Contains(status), "VALIDATION_ERROR", "Invalid settlement status.", 400);
                return A(await Q(SettlementSql + " WHERE Status=@s ORDER BY SettlementID", ct, ("@s", status)));
            }
            case "F6-J15":return await Prepare(id,actor,ct);
            case "F6-J13":case "F6-J16":return await Settlement(id,ct);
            case "F6-J17":case "F6-J18":return await Balance(await Settlement(id,ct),ct);
            case "F6-J20":case "F6-J21":return A(await Q(AdjustmentSql+" WHERE SettlementID=@s ORDER BY CreatedAtUtc,AdjustmentID",ct,("@s",id)));
            case "F6-J19":return await AddAdjustment(id,actor,body!,ct);
            case "F6-J22":return await CreateInvoice(id,body!,ct);
            case "F6-J23":return await Invoice(await Settlement(id,ct),ct);
            case "F6-J24":return await PaymentSession(id,ip,ct);
            case "F6-J25":return await One(PaymentSql+" WHERE PaymentID=@id",ct,("@id",id));
            case "F6-J26":
            {
                var s=await Settlement(id,ct);if(S(s,"status")=="SETTLED")return s;
                Require(S(s,"status")=="AWAITING_PAYMENT" && S(s,"handoverRevisionId") is not null,"INVALID_STATE","Confirmed delivery and final invoice required.");
                Require(!await FinancialObligations(s,ct),"UNSETTLED_PAYMENT","Financial obligations remain.");
                var invoice=await Invoice(s,ct);Require(S(invoice,"status")=="PAID","UNSETTLED_PAYMENT","Invoice not paid.");
                var hours=await Policy(await Scope(S(s,"tripId")!,ct),"FEEDBACK_WINDOW_HOURS","HOUR",ct);
                await E("UPDATE TRIP_SETTLEMENT SET Status='SETTLED',SettledBy=@a,SettledAtUtc=@n,FeedbackStartedAtUtc=@n,FeedbackEndsAtUtc=@end WHERE SettlementID=@s; UPDATE CONTRACT SET ContractStatus='SETTLED' WHERE ContractID=@c",ct,("@a",actor),("@n",Now),("@end",Now.AddHours((double)hours)),("@s",id),("@c",S(s,"contractId")));
                return await Settlement(id,ct);
            }
            case "F6-J27":case "F6-J28":return await Refund(id,actor,body,op=="F6-J28",ct);
            case "F6-J29":
            {
                var s=await Settlement(id,ct);var type=S(body!,"type");
                Require(S(s,"handoverRevisionId") is not null,"DELIVERY_NOT_CONFIRMED","Delivery required before opening a case.");
                if(type=="COMPLAINT")Require(S(s,"status")!="CLOSED" && (D(s,"feedbackEndsAtUtc") is null || Now<D(s,"feedbackEndsAtUtc") || await OpenComplaints(id,ct)),"FEEDBACK_WINDOW_EXPIRED","Complaint period has ended.");
                var key=await Next("CUSTOMER_CASE","CUSTOMER_CASE",ct);
                await E("INSERT CUSTOMER_CASE(CaseID,SettlementID,CaseType,Subject,Description,OpenedAtUtc) VALUES(@id,@s,@t,@sub,@d,@n)",ct,("@id",key),("@s",id),("@t",type),("@sub",S(body!,"subject")),("@d",S(body!,"description")),("@n",Now));return await One(CaseSql+" WHERE CaseID=@id",ct,("@id",key));
            }
            case "F6-J30":return A(await Q(CaseSql+" WHERE SettlementID=@s ORDER BY OpenedAtUtc,CaseID",ct,("@s",id)));
            case "F6-J31":return A(await Q(CaseSql+" ORDER BY OpenedAtUtc,CaseID",ct));
            case "F6-J32":case "F6-J33":
            {
                var c=await One(CaseSql+" WHERE CaseID=@id",ct,("@id",id));
                if(op=="F6-J32")
                {
                    Require(S(c,"status") is "OPEN" or "IN_PROGRESS","INVALID_STATE","Case already resolved.");
                    await E("UPDATE CUSTOMER_CASE SET Status='IN_PROGRESS',HandledBy=COALESCE(HandledBy,@a),HandledAtUtc=COALESCE(HandledAtUtc,@n) WHERE CaseID=@id",ct,("@a",actor),("@n",Now),("@id",id));
                }
                else
                {
                    if(S(c,"status")=="RESOLVED") {Require(S(c,"resolution")==S(body!,"resolution"),"INVALID_STATE","Resolved case cannot be overwritten.");return c;}
                    Require(S(c,"status")=="IN_PROGRESS","INVALID_STATE","Start processing first.");
                    await E("UPDATE CUSTOMER_CASE SET Status='RESOLVED',ResolutionText=@r,ResolvedAtUtc=@n WHERE CaseID=@id",ct,("@r",S(body!,"resolution")),("@n",Now),("@id",id));
                    var s=await Settlement(S(c,"settlementId")!,ct);
                    if(S(s,"status")=="SETTLED" && !await OpenComplaints(S(s,"id")!,ct) && !await FinancialObligations(s,ct))await Restart(s,ct);
                }
                return await One(CaseSql+" WHERE CaseID=@id",ct,("@id",id));
            }
            case "F6-J34":
            {
                var s=await Settlement(id,ct);Require(S(s,"status")=="SETTLED" && Now<D(s,"feedbackEndsAtUtc"),"FEEDBACK_WINDOW_EXPIRED","Rating period is not open.");
                Require((await Q(FeedbackSql+" WHERE SettlementID=@s",ct,("@s",id))).Count==0,"FEEDBACK_EXISTS","Only one rating per settlement.");
                var key=await Next("CUSTOMER_FEEDBACK","CUSTOMER_FEEDBACK",ct);
                await E("INSERT CUSTOMER_FEEDBACK(FeedbackID,SettlementID,Rating,Comment,CreatedAtUtc) VALUES(@id,@s,@r,@c,@n)",ct,("@id",key),("@s",id),("@r",(int)N(body!,"rating")),("@c",S(body!,"comment")),("@n",Now));return await One(FeedbackSql+" WHERE SettlementID=@s",ct,("@s",id));
            }
            case "F6-J35":case "F6-J43":return await One(FeedbackSql+" WHERE SettlementID=@s",ct,("@s",id));
            case "F6-J36":{var s=await Settlement(id,ct);await Restart(s,ct);return await Settlement(id,ct);}
            case "F6-J37":
            {
                var s=await Settlement(id,ct);if(S(s,"status")!="CLOSED")
                {
                    Require(CanClose(S(s,"status")!,D(s,"feedbackEndsAtUtc"),Now,await OpenComplaints(id,ct)||await FinancialObligations(s,ct)),"CLOSURE_BLOCKED","Feedback window or obligations remain.");
                    await Restart(s,ct);s=await Settlement(id,ct);
                    Require(Now>=D(s,"feedbackEndsAtUtc"),"CLOSURE_BLOCKED","A new feedback window is open.");
                    await E("UPDATE TRIP_SETTLEMENT SET Status='CLOSED',ClosedAtUtc=@n WHERE SettlementID=@s; UPDATE CONTRACT SET ContractStatus='CLOSED' WHERE ContractID=@c; UPDATE TRANSPORT_REQUEST SET Status='CLOSED' WHERE RequestID=(SELECT RequestID FROM TRIP_PLAN WHERE TripID=@t)",ct,("@n",Now),("@s",id),("@c",S(s,"contractId")),("@t",S(s,"tripId")));
                }
                s=await Settlement(id,ct);return J(new{settlementId=id,closedAtUtc=S(s,"closedAtUtc"),lifecycle=Lifecycle(await Scope(S(s,"tripId")!,ct))});
            }
            case "F6-J41":case "F6-J42":case "F6-J46":case "F6-J47":
            {var s=await Settlement(id,ct);Require(S(s,"handoverRevisionId") is not null,"NOT_FOUND","Confirmed delivery not found.",404);var r=await Revision(S(s,"handoverRevisionId")!,ct);return op is "F6-J46" or "F6-J47"?renderer.Render(r):r;}
            case "F6-J44":return A(await Q(PaymentSql+" WHERE InvoiceID IN(SELECT i.InvoiceID FROM INVOICE i JOIN TRIP_SETTLEMENT s ON s.ContractID=i.ContractID AND s.ContractVersionNo=i.ContractVersionNo WHERE s.SettlementID=@s)",ct,("@s",id)));
            case "F6-J45":return renderer.Render(await Revision(id,ct));
            case "F6-J48":
            {
                var p=await One(PaymentSql+" WHERE PaymentID=@id",ct,("@id",id));
                Require(S(p,"status")=="SUCCESS","INVALID_STATE","Only successful payments can be reviewed.");
                Require(B(p,"financialReviewRequired"),"INVALID_STATE","Payment does not require financial review.");
                var reason=S(body!,"reason")!;
                await E("UPDATE PAYMENT SET FinancialReviewRequired=0,FinancialReviewReason=@r,FinancialReviewedBy=@a,FinancialReviewedAtUtc=@now WHERE PaymentID=@id",ct,("@r",reason),("@a",actor),("@now",Now),("@id",id));
                return await One(PaymentSql+" WHERE PaymentID=@id",ct,("@id",id));
            }
            default:throw new AftercareException("FEATURE_NOT_SUPPORTED","Unknown Flow 6 operation.",501);
        }
    }
}
