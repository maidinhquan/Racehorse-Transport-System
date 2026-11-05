using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow1.Interfaces;
namespace Application.Flow6.Services;
public sealed partial class AftercareService
{
    public IGatewayQuery? QueryGateway {private get;set;}
    public async Task<int> ReconcilePending(CancellationToken ct,string? invoiceId=null)
    {
        if(QueryGateway is null)return 0;
        var rows=await Q("SELECT p.* FROM PAYMENT p JOIN INVOICE i ON i.InvoiceID=p.InvoiceID WHERE i.InvoiceType='FINAL_SETTLEMENT' AND p.Method='VNPAY' AND p.Status='PENDING_GATEWAY' AND p.VnpayCreatedAtUtc<=@before AND (@inv IS NULL OR p.InvoiceID=@inv)",ct,("@before",Now.AddSeconds(-20)),("@inv",invoiceId));
        var recorded=0;
        foreach(var p in rows)
        {
            var at=D(p,"VnpayCreatedAtUtc");var merchant=S(p,"VnpayTmnCode");if(at is null||merchant is null)continue;
            var reference="F6"+S(p,"PaymentID")!.Replace("_","")+"T"+at.Value.ToString("yyyyMMddHHmmss");
            var result=await QueryGateway.QueryAsync(new(reference,merchant,new DateTimeOffset(at.Value,TimeSpan.Zero),"127.0.0.1"),ct);
            if(!result.Verified||result.PaymentId!=reference||result.MerchantId!=merchant||result.State is not ("SUCCESS" or "FAILED"))continue;
            if(result.State=="SUCCESS"&&(result.Amount is null||string.IsNullOrWhiteSpace(result.TransactionId)||result.PaidAtUtc is null))continue;
            await RecordVerified(new(true,reference,result.TransactionId,result.State=="SUCCESS"?result.Amount!.Value:N(p,"Amount"),"VND",result.State,result.PaidAtUtc,default,merchant,result.BankCode),new Dictionary<string,string>{{"vnp_ResponseCode",result.State=="SUCCESS"?"00":"24"},{"vnp_TransactionStatus",result.TransactionStatus??"02"}},ct);
            recorded++;
        }
        return recorded;
    }
    /// <summary>Hỏi lại VNPay các giao dịch chờ của hóa đơn cuối thuộc hồ sơ này (IPN có thể chưa về được máy chủ); tối đa mỗi 10 giây.</summary>
    private static readonly Dictionary<string,DateTime> LastSettlementQuery=new();
    private async Task ReconcileSettlement(string settlementId,CancellationToken ct)
    {
        if(QueryGateway is null)return;
        lock(LastSettlementQuery){if(LastSettlementQuery.TryGetValue(settlementId,out var last)&&(DateTime.UtcNow-last).TotalSeconds<10)return;LastSettlementQuery[settlementId]=DateTime.UtcNow;}
        try
        {
            var inv=(await Q("SELECT FinalInvoiceID FROM TRIP_SETTLEMENT WHERE SettlementID=@s",ct,("@s",settlementId))).SingleOrDefault();
            var invoice=inv is null?null:S(inv,"FinalInvoiceID");
            if(!string.IsNullOrEmpty(invoice))await ReconcilePending(ct,invoice);
        }
        catch(Exception e)when(e is not OperationCanceledException){}
    }
}
