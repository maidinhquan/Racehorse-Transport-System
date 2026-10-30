using System.Net.Http.Json;
using System.Text.Json;
using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Flow1.Rebuild.Tests;

public sealed class PaymentSafetyTests(SqlFixture database) : IClassFixture<SqlFixture>
{
    private static async Task<JsonElement> Data(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"{response.StatusCode}: {body}");
        return JsonDocument.Parse(body).RootElement.GetProperty("data").Clone();
    }
    [Theory]
    [InlineData("cancelled", "00", "REVIEW_REQUIRED")]
    [InlineData("failed", "00", "REVIEW_REQUIRED")]
    [InlineData("forged", "97", "PENDING_GATEWAY")]
    [InlineData("amount", "04", "PENDING_GATEWAY")]
    public async Task Invalid_or_late_callbacks_never_credit_invoice(string scenario, string expectedCode, string expectedStatus)
    {
        using var factory = new ApiFactory(database); using var customer = factory.Customer(); using var manager = factory.Manager();
        var date = DateTime.UtcNow.AddDays(60).Date;
        var horseId = await SubmissionTest.NewHorseAsync(database);
        customer.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var request = await Data(await customer.PostAsync("/api/customer/requests", SubmissionTest.Body( new { origin="Hanoi",destination="Tokyo",originCountry="VN",destinationCountry="JP",mode="AIR",expectedTransportDate=date.ToString("yyyy-MM-dd"),expectedDeliveryDate=date.AddDays(2).ToString("yyyy-MM-dd"),careInstructions="Care",horses=new[]{horseId} })));
        var id = request.GetProperty("id").GetString()!;
        await using (var db = database.Context())
        {
            (await db.Set<TransportRequest>().SingleAsync(x=>x.RequestID==id)).Status="PENDING_REVIEW";
            await db.SaveChangesAsync();
        }
        await Data(await manager.PostAsJsonAsync($"/api/manager/requests/{id}/accept",new {}));
        var draft=await Data(await manager.PutAsJsonAsync($"/api/manager/requests/{id}/contract-draft",new {
            arriveAt=date.AddDays(2).ToString("yyyy-MM-dd HH:mm"),departAt=date.ToString("yyyy-MM-dd HH:mm"),depositPct=40,
            budget=new {TRANSPORT=100,PROCEDURE=100,VET=100,INSURANCE=100,STAFF=100},exception="",note="Test",
            items=new[]{new {amount=1000000,desc="Transport",required=true}},terms=new[]{new {title="Payment",text="Deposit before signature"}} }));
        var contract=draft.GetProperty("contractId").GetString()!;
        var publication=await Data(await manager.PostAsJsonAsync($"/api/manager/requests/{id}/contract/publish",new {versionNo=1}));
        var again=await Data(await manager.PostAsJsonAsync($"/api/manager/requests/{id}/contract/publish",new {versionNo=1}));
        Assert.Equal(publication.GetProperty("invoiceId").GetString(),again.GetProperty("invoiceId").GetString());
        var invoice=publication.GetProperty("invoiceId").GetString()!;
        await Data(await customer.PostAsJsonAsync($"/api/customer/contracts/{contract}/accept-terms",new {versionNo=1}));
        var session=await Data(await customer.PostAsJsonAsync($"/api/customer/invoices/{invoice}/payment-session",new {method="VNPAY"}));
        var payment=session.GetProperty("id").GetString()!;
        if(scenario=="cancelled") await Data(await customer.PostAsJsonAsync($"/api/customer/requests/{id}/cancel",new {reason="Cancel before payment settles"}));
        var payload=new Dictionary<string,string> { ["vnp_TmnCode"]="DEMO1234",["vnp_TxnRef"]=payment.Replace("_",""),["vnp_Amount"]=scenario=="amount"?"10000":"40000000",["vnp_CurrCode"]="VND",
            ["vnp_ResponseCode"]="00",["vnp_TransactionStatus"]="00",["vnp_TransactionNo"]=DateTime.UtcNow.Ticks.ToString(),["vnp_PayDate"]=DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(7)).ToString("yyyyMMddHHmmss") };
        async Task<JsonElement> Send()
        {
            payload["vnp_SecureHash"]=scenario=="forged"?new string('0',128):factory.Gateway.Sign(payload);
            var query=string.Join("&",payload.Select(x=>Uri.EscapeDataString(x.Key)+"="+Uri.EscapeDataString(x.Value)));
            return await customer.GetFromJsonAsync<JsonElement>("/api/payments/vnpay/ipn?"+query);
        }
        if(scenario=="failed")
        {
            payload["vnp_ResponseCode"]="24"; payload["vnp_TransactionStatus"]="02";
            Assert.Equal("00",(await Send()).GetProperty("RspCode").GetString());
            payload["vnp_ResponseCode"]="00"; payload["vnp_TransactionStatus"]="00";
        }
        Assert.Equal(expectedCode,(await Send()).GetProperty("RspCode").GetString());
        await using var check=database.Context();
        Assert.Equal(0,(await check.Set<Invoice>().SingleAsync(x=>x.InvoiceID==invoice)).PaidAmount);
        var row=await check.Set<Payment>().SingleAsync(x=>x.PaymentID==payment);
        Assert.Equal(expectedStatus,row.Status);
        if(expectedStatus=="REVIEW_REQUIRED") { Assert.Equal(400000,row.VnpayReceivedAmount); Assert.True(row.FinancialReviewRequired); }
        Assert.Empty(await check.Set<Trip>().Where(x=>x.RequestID==id).ToListAsync());
    }
}
