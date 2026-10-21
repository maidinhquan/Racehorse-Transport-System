using Application.Common.Exceptions;
using Application.DTOs.Flow1;
using Microsoft.Data.SqlClient;
using Xunit;
using Fixture = Flow1.Tests.RelationalFlow1Tests.Fixture;

namespace Flow1.Tests;

public sealed class SharedDeadlineTests
{
    [LocalSqlFact]
    public async Task One_persisted_deadline_drives_payment_and_signing_without_a_current_flag()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('CONTRACT') AND name IN ('EffectiveSignDeadline','DepositDeadline','SignedDepositDeadline','IsCurrent');"));
        Assert.Equal(c.SignDeadline,c.DepositDeadline);
        var original=c.SignDeadline!.Value;
        c=await f.Service.LifecycleAsync(c.ContractId,"manager",true,"extend",new(c.Version,"Extend shared deadline",Deadline:new DateTimeOffset(original,TimeSpan.Zero).AddHours(2)),default);
        Assert.Equal(original.AddHours(2),c.SignDeadline);Assert.Equal(c.SignDeadline,c.DepositDeadline);
        Assert.Equal(c.SignDeadline,await f.Db.ScalarAsync<DateTime>("SELECT CompletionDeadline FROM CONTRACT;"));
        Assert.Equal(c.SignDeadline,await f.Db.ScalarAsync<DateTime>("SELECT DueDate FROM INVOICE;"));
        await f.Service.IpnAsync(f.Callback(await f.Session(c)),default);
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        c=await f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code,PdfSha256:c.PdfSha256),default);
        Assert.Equal("EFFECTIVE",c.Status);Assert.Equal(original.AddHours(2),c.SignDeadline);Assert.NotNull(c.Trip);
        var error=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.LifecycleAsync(c.ContractId,"manager",true,"extend",new(c.Version,"After signing",Deadline:new DateTimeOffset(original,TimeSpan.Zero).AddHours(3)),default));
        Assert.Equal("CONTRACT_CLOSED",error.ErrorCode);
    }

    [LocalSqlFact]
    public async Task Cancelled_contract_cannot_be_reissued_signed_or_duplicated_for_the_same_request()
    {
        await using var f=await Fixture.Create();var(r,c)=await f.Published();
        c=await f.Service.CancellationAsync(c.ContractId,"owner",false,"request",new(c.Version,"Cancel test"),default);
        c=await f.Service.CancellationAsync(c.ContractId,"manager",true,"approve",new(c.Version,"Approved",CancellationId:c.CancellationId),default);
        Assert.Equal("CANCELLED",c.Status);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PaymentSessionAsync(c.ContractId,"owner","closed-payment-key","127.0.0.1",default));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReissueAsync(c.ContractId,"manager",new(c.Version,c.TotalPrice,2,new(r.DepartureAt!.Value),new(r.DeliveryAt!.Value),null,"Reopen"),default));
        Assert.Equal(2601,(await Assert.ThrowsAsync<SqlException>(()=>f.Db.ExecuteAsync("INSERT CONTRACT(ContractID,RequestID,CustomerID,ContractCode,CurrencyCode,ContractStatus) SELECT 'duplicate',RequestID,CustomerID,'DUP','VND','DRAFT' FROM CONTRACT;"))).Number);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));
    }
}
