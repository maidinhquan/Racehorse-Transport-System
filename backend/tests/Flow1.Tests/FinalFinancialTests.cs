using Application.Common.Exceptions;
using Application.DTOs.Flow1;
using Xunit;
using Fixture=Flow1.Tests.RelationalFlow1Tests.Fixture;

namespace Flow1.Tests;
public sealed class FinalFinancialTests
{
    [LegacySqlFact]
    public async Task Late_receipt_is_retained_without_enabling_otp_or_auto_cancelling_the_request()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();var p=await f.Session(c);var callback=f.Callback(p);
        f.Time.Value=f.Time.Value.AddHours(25);await f.Service.IpnAsync(callback,default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        Assert.Equal(40000000,c.PaidAmount);Assert.True(c.Payments.Single().ReviewRequired);Assert.Null(c.Trip);Assert.Null(c.SignedAt);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.CancelOverdueAsync(c.ContractId,"manager",new(c.Version,"Unresolved money"),default));
        Assert.NotEqual("CANCELLED",c.Status);
    }
    [LegacySqlFact]
    public async Task Excess_receipt_after_signing_preserves_assignment_and_exactly_one_trip()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();var old=await f.Session(c);f.Time.Value=f.Time.Value.AddMinutes(16);var current=await f.Session(c,"second-attempt-key");
        await f.Service.IpnAsync(f.Callback(current,"2222"),default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        c=await f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code,PdfSha256:c.PdfSha256),default);
        c=await f.Service.DeploymentAsync(c.ContractId,"manager","confirm",new(c.Trip!.Version,"Ready",AssignedSpecialistId:"docs",AssignedCoordinatorId:"route"),default);
        var released=c.Trip!;
        await f.Service.IpnAsync(f.Callback(old,"1111"),default);c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);
        Assert.Equal(80000000,c.PaidAmount);Assert.Contains(c.Payments,p=>p.ReviewRequired);
        Assert.Equal("CONFIRMED",c.Trip!.DeploymentStatus);Assert.Equal(released.EventId,c.Trip.EventId);Assert.Equal("route",c.Trip.AssignedCoordinatorId);
        Assert.Single(await f.Service.OperationsAsync("route",default));
        await f.Service.OperationsPdfAsync(released.TripId,"route",released.EventId!,default);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LegacySqlFact]
    public async Task Signed_contract_can_be_assigned_without_reopening_financial_or_preparation_review()
    {
        await using var f=await Fixture.Create();var c=await f.Signed();
        await f.Service.IpnAsync(f.Callback(c.Payments.Single().PaymentId,amount:1),default);
        f.Time.Value=f.Time.Value.AddMonths(1);
        c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);
        Assert.True(c.Payments.Single().ReviewRequired);
        c=await f.Service.DeploymentAsync(c.ContractId,"manager","confirm",new(c.Trip!.Version,"Assign",AssignedSpecialistId:"docs",AssignedCoordinatorId:"route"),default);
        Assert.Equal("EFFECTIVE",c.Status);Assert.Equal("CONFIRMED",c.Trip!.DeploymentStatus);
        Assert.Single(await f.Service.OperationsAsync("docs",default));
    }
    [LegacySqlFact]
    public async Task A_repeated_provider_transaction_on_another_attempt_does_not_allocate_money_twice()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();var old=await f.Session(c);f.Time.Value=f.Time.Value.AddMinutes(16);var current=await f.Session(c,"second-attempt-key");
        await f.Service.IpnAsync(f.Callback(current,"777777"),default);await f.Service.IpnAsync(f.Callback(old,"777777"),default);
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);Assert.Equal(40000000,c.PaidAmount);Assert.Equal(2,c.Payments.Count);Assert.Contains(c.Payments,p=>p.Status=="REVIEW_REQUIRED");
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default));
    }
    [LegacySqlFact]
    public async Task Zero_money_overdue_cancellation_does_not_invent_payment_or_change_issued_pdf()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();var hash=c.PdfSha256;f.Time.Value=f.Time.Value.AddHours(25);
        c=await f.Service.CancelOverdueAsync(c.ContractId,"manager",new(c.Version,"Expired without payment"),default);
        Assert.Equal("CANCELLED",c.Status);Assert.Equal(hash,c.PdfSha256);Assert.Null(c.SignedAt);Assert.Null(c.Trip);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM PAYMENT;"));
    }
    [LegacySqlFact]
    public async Task Shared_deadline_is_not_reset_by_sending_otp_and_signing_cannot_use_a_changed_account_email()
    {
        await using var f=await Fixture.Create();var c=await f.Paid();var due=c.SignDeadline;
        await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);Assert.Equal(due,c.SignDeadline);
        await f.Db.ExecuteAsync("UPDATE [USER] SET Email='changed@example.invalid' WHERE UserID='owner';");
        var e=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code,PdfSha256:c.PdfSha256),default));
        Assert.Equal("CUSTOMER_CHANGED",e.ErrorCode);Assert.Null(c.Trip);
    }
}
