using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Application.Common.Exceptions;
using Application.Interfaces.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Xunit;

namespace Flow1.Tests;

public sealed class VnpayQueryTests
{
    private sealed class Handler(Func<HttpRequestMessage,Task<HttpResponseMessage>> callback):HttpMessageHandler
    {protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken ct)=>callback(request);}
    [Theory]
    [InlineData("00","00","SUCCESS")]
    [InlineData("00","02","FAILED")]
    [InlineData("00","01","UNRESOLVED")]
    [InlineData("91","00","UNRESOLVED")]
    public async Task Querydr_uses_its_distinct_checksum_and_never_treats_pending_or_not_found_as_failure(string response,string status,string expected)
    {
        var options=new Flow1VnpayOptions{Enabled=true,TmnCode="TEST0001",HashSecret="fixture-query-key"};var time=new RelationalFlow1Tests.Clock();
        var input=new GatewayQueryRequest("p123",options.TmnCode,time.Value.AddHours(-1),"127.0.0.1");
        using var http=new HttpClient(new Handler(async request=>{
            Assert.Equal("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",request.RequestUri!.AbsoluteUri);
            var sent=await request.Content!.ReadFromJsonAsync<Dictionary<string,string>>();
            Assert.Equal("querydr",sent!["vnp_Command"]);Assert.Equal("20261101090000",sent["vnp_TransactionDate"]);
            Assert.Equal(VnpayQueryGateway.Sign(options.HashSecret,new[]{"vnp_RequestId","vnp_Version","vnp_Command","vnp_TmnCode","vnp_TxnRef","vnp_TransactionDate","vnp_CreateDate","vnp_IpAddr","vnp_OrderInfo"}.Select(k=>sent[k])),sent["vnp_SecureHash"]);
            var body=new Dictionary<string,string>{{"vnp_ResponseId","response123"},{"vnp_Command","querydr"},{"vnp_ResponseCode",response},{"vnp_Message","Fixture"},{"vnp_TmnCode","TEST0001"},{"vnp_TxnRef","p123"},{"vnp_Amount","4000000000"},{"vnp_BankCode","NCB"},{"vnp_PayDate","20261101100000"},{"vnp_TransactionNo","12345"},{"vnp_TransactionType","01"},{"vnp_TransactionStatus",status},{"vnp_OrderInfo","Fixture"}};
            body["vnp_SecureHash"]=VnpayQueryGateway.Sign(options.HashSecret,VnpayQueryGateway.ResponseFields.Select(k=>body.GetValueOrDefault(k)??""));
            return new(HttpStatusCode.OK){Content=JsonContent.Create(body)};
        }));
        var result=await new VnpayQueryGateway(http,options,time).QueryAsync(input,default);Assert.True(result.Verified);Assert.Equal(expected,result.State);
        if(expected=="SUCCESS"){Assert.Equal(40000000,result.Amount);Assert.Equal("12345",result.TransactionId);}
    }
    [Fact]
    public async Task Querydr_rejects_unsigned_or_misbound_results_without_assuming_zero_money()
    {
        var options=new Flow1VnpayOptions{Enabled=true,TmnCode="TEST0001",HashSecret="fixture-query-key"};var time=new RelationalFlow1Tests.Clock();
        using var http=new HttpClient(new Handler(_=>Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK){Content=JsonContent.Create(new{vnp_ResponseCode="00",vnp_TransactionStatus="02",vnp_TxnRef="p123",vnp_SecureHash=new string('0',128)})})));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>new VnpayQueryGateway(http,options,time).QueryAsync(new("p123",options.TmnCode,time.Value,"127.0.0.1"),default));
    }
}
