using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Interfaces.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.ExternalServices.Flow1;

// Read-only querydr; never invokes refund. HMAC format differs from PAY/IPN.
public sealed class VnpayQueryGateway(HttpClient http,Flow1VnpayOptions options,TimeProvider clock):IFlow1GatewayQuery
{
    public static readonly string[] ResponseFields=["vnp_ResponseId","vnp_Command","vnp_ResponseCode","vnp_Message","vnp_TmnCode","vnp_TxnRef","vnp_Amount","vnp_BankCode","vnp_PayDate","vnp_TransactionNo","vnp_TransactionType","vnp_TransactionStatus","vnp_OrderInfo","vnp_PromotionCode","vnp_PromotionAmount"];
    public static string Sign(string secret,IEnumerable<string> values)=>Convert.ToHexString(HMACSHA512.HashData(Encoding.UTF8.GetBytes(secret),Encoding.UTF8.GetBytes(string.Join('|',values)))).ToLowerInvariant();
    public async Task<GatewayQueryResult> QueryAsync(GatewayQueryRequest i,CancellationToken ct)
    {
        if(!options.Enabled || string.IsNullOrWhiteSpace(options.HashSecret) || !Regex.IsMatch(options.TmnCode,"\\A[A-Za-z0-9]{8}\\z") || i.MerchantId!=options.TmnCode || !IPAddress.TryParse(i.ClientIp,out _) || !Regex.IsMatch(i.PaymentId,"\\A[A-Za-z0-9]{1,50}\\z")) throw Error("Configure the original Sandbox merchant before reconciliation.","VNPAY_NOT_CONFIGURED",503);
        var clientIp=VnpaySandboxGateway.NormalizeClientIp(i.ClientIp);
        string D(DateTimeOffset x)=>x.ToOffset(TimeSpan.FromHours(7)).ToString("yyyyMMddHHmmss",CultureInfo.InvariantCulture);
        var requestId=Guid.NewGuid().ToString("N");var info="Flow1 reconciliation "+i.PaymentId;
        var body=new Dictionary<string,string>{{"vnp_RequestId",requestId},{"vnp_Version","2.1.0"},{"vnp_Command","querydr"},{"vnp_TmnCode",i.MerchantId},{"vnp_TxnRef",i.PaymentId},{"vnp_TransactionDate",D(i.CreatedAtUtc)},{"vnp_CreateDate",D(clock.GetUtcNow())},{"vnp_IpAddr",clientIp},{"vnp_OrderInfo",info}};
        body["vnp_SecureHash"]=Sign(options.HashSecret,new[]{requestId,"2.1.0","querydr",i.MerchantId,i.PaymentId,body["vnp_TransactionDate"],body["vnp_CreateDate"],clientIp,info});
        try
        {
            using var response=await http.PostAsJsonAsync("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",body,ct);
            if(!response.IsSuccessStatusCode)throw Error("VNPay reconciliation unavailable.","VNPAY_QUERY_UNAVAILABLE",503);
            await using var stream=await response.Content.ReadAsStreamAsync(ct);using var limited=new MemoryStream();var buffer=new byte[4096];int read;
            while((read=await stream.ReadAsync(buffer,ct))>0){if(limited.Length+read>32768)throw Error("Invalid provider query response.","VNPAY_QUERY_INVALID",503);await limited.WriteAsync(buffer.AsMemory(0,read),ct);}
            using var document=JsonDocument.Parse(limited.ToArray());var root=document.RootElement;
            if(root.ValueKind!=JsonValueKind.Object || root.EnumerateObject().GroupBy(x=>x.Name).Any(g=>g.Count()!=1) || root.EnumerateObject().Count()>30)throw Error("Invalid provider response.","VNPAY_QUERY_INVALID",503);
            string G(string key)=>root.TryGetProperty(key,out var v)?v.ValueKind==JsonValueKind.String?v.GetString()??"":v.ValueKind==JsonValueKind.Number?v.GetRawText():"":"";
            var hash=G("vnp_SecureHash");var expected=Sign(options.HashSecret,ResponseFields.Select(G));
            var verified=hash.Length==128 && CryptographicOperations.FixedTimeEquals(Convert.FromHexString(hash),Convert.FromHexString(expected)) && G("vnp_Command")=="querydr" && G("vnp_TmnCode")==i.MerchantId && G("vnp_TxnRef")==i.PaymentId;
            if(!verified)throw Error("Provider reconciliation signature/binding invalid.","VNPAY_QUERY_INVALID",503);
            if(G("vnp_ResponseCode")!="00" || G("vnp_TransactionType")!="01")return new(true,i.PaymentId,i.MerchantId,"UNRESOLVED");
            if(G("vnp_TransactionStatus")=="02")return new(true,i.PaymentId,i.MerchantId,"FAILED",TransactionStatus:"02");
            if(G("vnp_TransactionStatus")!="00")return new(true,i.PaymentId,i.MerchantId,"UNRESOLVED");
            if(!Regex.IsMatch(G("vnp_Amount"),"\\A[0-9]{1,12}\\z") || !decimal.TryParse(G("vnp_Amount"),NumberStyles.None,CultureInfo.InvariantCulture,out var units) || units<=0 || units%100!=0 || !Regex.IsMatch(G("vnp_TransactionNo"),"\\A[0-9]{1,30}\\z") || G("vnp_TransactionNo").All(c=>c=='0') || G("vnp_BankCode").Length>50 || !DateTime.TryParseExact(G("vnp_PayDate"),"yyyyMMddHHmmss",CultureInfo.InvariantCulture,DateTimeStyles.None,out var paid))throw Error("Invalid provider receipt.","VNPAY_QUERY_INVALID",503);
            var paidAt=new DateTimeOffset(DateTime.SpecifyKind(paid,DateTimeKind.Unspecified),TimeSpan.FromHours(7)).ToUniversalTime();
            if(paidAt>clock.GetUtcNow().AddMinutes(5) || paidAt<=DateTimeOffset.UnixEpoch)throw Error("Invalid provider receipt time.","VNPAY_QUERY_INVALID",503);
            return new(true,i.PaymentId,i.MerchantId,"SUCCESS",units/100,G("vnp_TransactionNo"),paidAt,G("vnp_BankCode"),"00");
        }
        catch(Exception e)when(e is HttpRequestException or JsonException or FormatException or TaskCanceledException)
        {if(ct.IsCancellationRequested)throw new OperationCanceledException(ct);throw Error("VNPay query unavailable or unverified; state retained.","VNPAY_QUERY_UNAVAILABLE",503);}
    }
}
