using Application.Common.Exceptions;
using Application.DTOs.Flow1;
using Xunit;

namespace Flow1.Tests;

public sealed class OverdueCancellationTests
{
    [LocalSqlFact]
    public async Task Unsigned_overdue_cancels_without_invoice_and_keeps_pdf_while_revoking_otp()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var(request,c)=await f.Published();
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.CancelOverdueAsync(c.ContractId,"manager",new(c.Version,"Not due"),default));
        var hash=c.PdfSha256;f.Time.Value=f.Time.Value.AddDays(3);
        c=await f.Service.CancelOverdueAsync(c.ContractId,"manager",new(c.Version,"Signature overdue"),default);
        Assert.Equal("CANCELLED",c.Status);Assert.False(c.IsCurrent);Assert.Equal(hash,c.PdfSha256);Assert.Null(c.SignedAt);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        Assert.Equal("CANCELLED",(await f.Service.DetailAsync(request.RequestId,"manager",true,default)).Status);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }

    [LocalSqlFact]
    public async Task Signed_overdue_zero_money_keeps_signature_pdf_and_invoice()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var c=await f.Signed();f.Time.Value=f.Time.Value.AddDays(2);
        var result=await f.Service.CancelOverdueAsync(c.ContractId,"manager",new(c.Version,"Deposit overdue"),default);
        Assert.Equal("CANCELLED",result.Status);Assert.Equal(c.SignedAt,result.SignedAt);Assert.Equal(c.PdfSha256,result.PdfSha256);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));Assert.Equal(0m,result.PaidAmount);
    }

    [LocalSqlFact]
    public async Task Pending_gateway_attempt_even_expired_blocks_cancellation_until_reconciled()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var c=await f.Signed();await f.Session(c);f.Time.Value=f.Time.Value.AddDays(2);
        var error=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.CancelOverdueAsync(c.ContractId,"manager",new(c.Version,"Overdue"),default));
        Assert.Contains("Resolve money",error.Message);Assert.Equal("SIGNED",(await f.Service.ContractAsync(c.ContractId,"manager",true,default)).Status);
    }

    [LocalSqlFact]
    public async Task Verified_wrong_amount_blocks_cancellation_without_allocating_it()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var c=await f.Signed();var p=await f.Session(c);
        await f.Service.IpnAsync(f.Callback(p,amount:1),default);f.Time.Value=f.Time.Value.AddDays(2);
        c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.CancelOverdueAsync(c.ContractId,"manager",new(c.Version,"Overdue"),default));
        Assert.Equal(1m,await f.Db.ScalarAsync<decimal>("SELECT VnpayReceivedAmount FROM PAYMENT;"));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }

    [LocalSqlFact]
    public async Task Activated_trip_cannot_be_cancelled_as_overdue()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var c=await f.Signed();var p=await f.Session(c);await f.Service.IpnAsync(f.Callback(p),default);
        f.Time.Value=f.Time.Value.AddDays(2);c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.CancelOverdueAsync(c.ContractId,"manager",new(c.Version,"Overdue"),default));
        Assert.Equal(40000000m,c.PaidAmount);Assert.NotNull(c.Trip);
    }

    [LocalSqlFact]
    public async Task Manager_only_and_concurrent_stale_version_cannot_cancel_twice()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var(request,c)=await f.Published();f.Time.Value=f.Time.Value.AddDays(3);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.CancelOverdueAsync(c.ContractId,"owner",new(c.Version,"Overdue"),default));
        async Task<bool> Attempt(){try{await f.NewService().CancelOverdueAsync(c.ContractId,"manager",new(c.Version,"Overdue"),default);return true;}catch(BusinessRuleException){return false;}}
        var results=await Task.WhenAll(Attempt(),Attempt());Assert.Single(results,x=>x);
        Assert.Equal("CANCELLED",(await f.Service.DetailAsync(request.RequestId,"manager",true,default)).Status);
    }
}
