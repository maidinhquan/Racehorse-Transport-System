using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Microsoft.Data.SqlClient;
using Xunit;
using Fixture = Flow1.Tests.RelationalFlow1Tests.Fixture;

namespace Flow1.Tests;

public sealed class DepositRateTests
{
    private static async Task<FlowRequestCard> Accepted(Fixture f)
    {
        var r=await f.Request();
        return await f.Service.ReviewAsync(r.RequestId,"manager","accept",new(r.Version),default);
    }

    [LocalSqlFact]
    public async Task Custom_percentage_is_used_by_HTTP_PDF_invoice_payment_and_OTP_activation()
    {
        await using var f=await Fixture.Create();var r=await Accepted(f);
        using var app=new RelationalHttpFactory(f);using var manager=app.Client("manager","LOGISTICS_MANAGER");
        manager.DefaultRequestHeaders.Add("Idempotency-Key","custom-deposit-rate");
        var response=await manager.PostAsJsonAsync($"/api/manager/requests/{r.RequestId}/contracts",
            new FlowAction(r.Version,Price:100000003,Costs:CustomerTransportTests.Quote(100000003),PreparationDays:2,DepositRate:25.5m));
        Assert.Equal(HttpStatusCode.OK,response.StatusCode);
        using var json=JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data=json.RootElement.GetProperty("data");Assert.Equal(25.5m,data.GetProperty("depositRate").GetDecimal());
        var c=await f.Service.ContractAsync(data.GetProperty("contractId").GetString()!,"manager",true,default);
        c=await f.Service.PublishAsync(c.ContractId,"manager",new(c.Version),default);
        Assert.Equal(25500001,c.DepositAmount);Assert.True(c.RelationalTermsReady);
        Assert.Equal(25500001m,await f.Db.ScalarAsync<decimal>("SELECT TotalPayableAmount FROM INVOICE;"));
        var model=f.Renderer.Last!.FrozenSnapshot.Deserialize<ContractPdfModel>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Equal("25.5",model.Values["DEPOSIT_RATE"]);
        Assert.Equal("25.500.001",model.Values["DEPOSIT_AMOUNT"]);
        Assert.Equal("74.500.002",model.Values["REMAINING_AMOUNT"]);
        await f.Service.IpnAsync(f.Callback(await f.Session(c),amount:c.DepositAmount),default);
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        Assert.Equal("PENDING_SIGNATURE",c.Status);Assert.Null(c.Trip);
        await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        c=await f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code,PdfSha256:c.PdfSha256),default);
        Assert.Equal("EFFECTIVE",c.Status);Assert.NotNull(c.Trip);Assert.Equal(25.5m,c.DepositRate);
        var denied=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReissueAsync(c.ContractId,"manager",
            new(c.Version,100000003,2,new(r.DepartureAt!.Value),new(r.DeliveryAt!.Value),null,"Change rate",DepositRate:50),default));
        Assert.Equal("REISSUE_CLOSED",denied.ErrorCode);
    }

    [LocalSqlFact]
    public async Task Default_is_40_and_reissue_preserves_or_changes_rate_before_payment_only()
    {
        await using var f=await Fixture.Create();var(r,c)=await f.Published();Assert.Equal(40m,c.DepositRate);
        ContractReissueInput Input(decimal? rate=null)=>new(c.Version,100000000,2,new(r.DepartureAt!.Value),new(r.DeliveryAt!.Value),null,"Adjust deposit",DepositRate:rate);
        c=await f.Service.ReissueAsync(c.ContractId,"manager",Input(100),default);
        Assert.Equal(100m,c.DepositRate);Assert.Equal(c.TotalPrice,c.DepositAmount);
        c=await f.Service.ReissueAsync(c.ContractId,"manager",Input(),default);Assert.Equal(100m,c.DepositRate);
        c=await f.Service.ReissueAsync(c.ContractId,"manager",Input(30),default);
        Assert.Equal(30000000,c.DepositAmount);Assert.Equal(30000000m,await f.Db.ScalarAsync<decimal>("SELECT TotalPayableAmount FROM INVOICE;"));
        await f.Session(c);
        var denied=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReissueAsync(c.ContractId,"manager",Input(20),default));
        Assert.Equal("PAYMENT_STARTED",denied.ErrorCode);
        Assert.Equal(30m,(await f.Service.ContractAsync(c.ContractId,"manager",true,default)).DepositRate);
    }

    [LocalSqlFact]
    public async Task Invalid_rates_and_idempotent_payload_changes_do_not_mutate_draft()
    {
        await using var f=await Fixture.Create();var r=await Accepted(f);
        foreach(var rate in new[]{0m,-1m,100.01m,30.001m})
        {
            var error=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DraftAsync(r.RequestId,"manager","invalid-rate-key",
                new(r.Version,Price:100000000,Costs:CustomerTransportTests.Quote(100000000),PreparationDays:2,DepositRate:rate),default));
            Assert.Equal("VALIDATION_ERROR",error.ErrorCode);
        }
        var c=await f.Service.DraftAsync(r.RequestId,"manager","valid-rate-key",new(r.Version,Price:100000000,Costs:CustomerTransportTests.Quote(100000000),PreparationDays:2,DepositRate:30),default);
        var changed=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DraftAsync(r.RequestId,"manager","valid-rate-key",
            new(r.Version,Price:100000000,Costs:CustomerTransportTests.Quote(100000000),PreparationDays:2,DepositRate:40),default));
        Assert.Equal("IDEMPOTENCY_KEY_REUSED",changed.ErrorCode);
        Assert.Equal(30m,(await f.Service.ContractAsync(c.ContractId,"manager",true,default)).DepositRate);
        Assert.Equal(547,(await Assert.ThrowsAsync<SqlException>(()=>f.Db.ExecuteAsync("UPDATE CONTRACT SET DepositRateStandard=101;"))).Number);
        Assert.Equal(547,(await Assert.ThrowsAsync<SqlException>(()=>f.Db.ExecuteAsync("UPDATE CONTRACT SET DepositAmount=1;"))).Number);
    }

    [LocalSqlFact]
    public async Task Feedback_for_non_price_fields_cannot_change_deposit_rate()
    {
        await using var f=await Fixture.Create();var(r,c)=await f.Published();
        c=await f.Service.FeedbackAsync(c.ContractId,"owner",new(c.Version,"Adjust schedule",["DEPARTURE_AT"]),default);
        var error=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReissueAsync(c.ContractId,"manager",
            new(c.Version,c.TotalPrice,2,new(r.DepartureAt!.Value),new(r.DeliveryAt!.Value),null,"Change deposit",DepositRate:30),default));
        Assert.Equal("FIELD_LOCKED",error.ErrorCode);
    }

    [LocalSqlFact]
    public async Task Upgrade_from_fixed_40_preserves_verified_money_and_is_repeatable()
    {
        await using var f=await Fixture.Create();var c=await f.Paid();
        await f.Db.ExecuteAsync("""
            ALTER TABLE CONTRACT DROP CONSTRAINT CK_F1S_CONTRACT_Deposit;
            ALTER TABLE CONTRACT WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_Deposit CHECK (DepositAmount IS NULL OR (CurrencyCode='VND' AND TotalQuotedPrice IS NOT NULL AND TotalQuotedPrice>0 AND TotalQuotedPrice=ROUND(TotalQuotedPrice,0) AND DepositRateStandard IS NOT NULL AND DepositRateStandard=40 AND DepositAmount>0 AND DepositAmount=ROUND(TotalQuotedPrice*0.4,0)));
            DECLARE @fingerprint nvarchar(129);
            SELECT @fingerprint=N'A249C14691834D8D190066B45116EB7B2A5409371A7E6EA816F6C6815DBC4029:'+CONVERT(nvarchar(64),HASHBYTES('SHA2_256',definition),2)
            FROM sys.check_constraints WHERE name='CK_F1S_CONTRACT_Deposit';
            EXEC sys.sp_addextendedproperty @name=N'Flow1SimpleGuardFingerprint', @value=@fingerprint,
              @level0type=N'SCHEMA',@level0name=N'dbo',@level1type=N'TABLE',@level1name=N'CONTRACT',
              @level2type=N'CONSTRAINT',@level2name=N'CK_F1S_CONTRACT_Deposit';
            """);
        Assert.Equal(0,await f.Db.ScalarAsync<int>(Infrastructure.Data.Context.Flow1RelationalSchema.ValidationSql));
        await f.Db.ScriptAsync("002_flow1.sql");await f.Db.ScriptAsync("002_flow1.sql");
        Assert.Equal(1,await f.Db.ScalarAsync<int>(Infrastructure.Data.Context.Flow1RelationalSchema.ValidationSql));
        var after=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        Assert.Equal(c.DepositRate,after.DepositRate);Assert.Equal(c.PaidAmount,after.PaidAmount);
        Assert.Equal(c.DepositAmount,after.DepositAmount);Assert.Equal(c.PdfSha256,after.PdfSha256);
        Assert.Equal("PENDING_SIGNATURE",after.Status);Assert.Null(after.Trip);
    }
}
