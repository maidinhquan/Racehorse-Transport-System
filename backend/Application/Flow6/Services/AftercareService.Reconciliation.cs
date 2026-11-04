using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow1.Interfaces;
namespace Application.Flow6.Services;
public sealed partial class AftercareService
{
    public IGatewayQuery? QueryGateway {private get;set;}
    public async Task<int> ReconcilePending(CancellationToken ct)
    {
        if(QueryGateway is null)return 0;
        var rows=await Q("SELECT p.* FROM PAYMENT p JOIN INVOICE i ON i.InvoiceID=p.InvoiceID WHERE i.InvoiceType='FINAL_SETTLEMENT' AND p.Method='VNPAY' AND p.Status='PENDING_GATEWAY' AND p.VnpayCreatedAtUtc<=@before",ct,("@before",Now.AddSeconds(-20)));
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
}
