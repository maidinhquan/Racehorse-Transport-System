using Application.DTOs.Flow1;
using Application.Common.Exceptions;
using System.Text.Json;
using Xunit;
namespace Flow1.Tests;

public sealed class AgreedFlowTests
{
    internal static async Task<FlowContractCard> Accepted(RelationalFlow1Tests.Fixture f){var(_,c)=await f.Published(legacy:false);return await f.Service.AcceptTermsAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);}
    internal static async Task<FlowContractCard> Paid(RelationalFlow1Tests.Fixture f){var c=await Accepted(f);await f.Service.IpnAsync(f.Callback(await f.Session(c)),default);return await f.Service.ContractAsync(c.ContractId,"owner",false,default);}
    internal static async Task<FlowContractCard> Sign(RelationalFlow1Tests.Fixture f,FlowContractCard c){await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);return await f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code,PdfSha256:c.PdfSha256),default);}
    [LocalSqlFact] public async Task Deposit_before_signature_uses_one_deadline_and_creates_exactly_one_trip_at_signature(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var c=await Accepted(f);var due=c.SignDeadline;Assert.Equal(f.Time.Value.AddHours(24).UtcDateTime,due);Assert.Equal(due,c.DepositDeadline);
        var pid=await f.Session(c);var callback=f.Callback(pid);await Task.WhenAll(f.Service.IpnAsync(callback,default),f.NewService().IpnAsync(callback,default));
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);Assert.Equal(40000000,c.PaidAmount);Assert.Null(c.Trip);Assert.Null(c.SignedAt);Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN"));
        c=await Sign(f,c);Assert.Equal("EFFECTIVE",c.Status);Assert.NotNull(c.Trip);Assert.Equal(due,c.SignDeadline);Assert.Equal(due,c.DepositDeadline);
        var retry=await f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code,PdfSha256:c.PdfSha256),default);Assert.Equal(c.Trip!.TripId,retry.Trip!.TripId);Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN"));
    }
    [LocalSqlFact] public async Task Unaccepted_terms_block_payment_and_unpaid_contract_blocks_otp(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var(_,c)=await f.Published(false);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Session(c));await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.AcceptTermsAsync(c.ContractId,"owner",new(c.Version,PdfSha256:"wrong"),default));Assert.Null(c.Trip);
    }
    [LocalSqlFact] public async Task Rejected_change_resets_full_24_hours_on_same_pdf_and_version(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var(_,c)=await f.Published(false);var hash=c.PdfSha256;
        c=await f.Service.RequestContractChangeAsync(c.ContractId,"owner",new(c.Version,"Please amend terms",Sections:["TERMS"]),default);f.Time.Value=f.Time.Value.AddHours(8);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.AcceptTermsAsync(c.ContractId,"owner",new(c.Version,PdfSha256:hash),default));
        c=await f.Service.DecideContractChangeAsync(c.ContractId,"manager","reject",new(c.Version,"Existing terms retained",ChangeId:c.Changes!.Single().ChangeId),default);
        Assert.Equal(hash,c.PdfSha256);Assert.Equal(1,c.ContractVersion);Assert.Equal(f.Time.Value.AddHours(24).UtcDateTime,c.SignDeadline);Assert.Equal(c.SignDeadline,c.DepositDeadline);Assert.Contains(c.History!,x=>x.Action=="CHANGE_REJECTED");
    }
    [LocalSqlFact] public async Task Approved_change_clones_only_unlocked_sections_and_publication_restarts_full_window(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var(_,c)=await f.Published(false);
        c=await f.Service.RequestContractChangeAsync(c.ContractId,"owner",new(c.Version,"Update terms",Sections:["TERMS"]),default);var id=c.Changes!.Single().ChangeId;
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DecideContractChangeAsync(c.ContractId,"manager","approve",new(c.Version,"Updated",Price:1,Terms:"Updated terms",ChangeId:id),default));
        var revised=await f.Service.DecideContractChangeAsync(c.ContractId,"manager","approve",new(c.Version,"Updated",Terms:"Updated terms",ChangeId:id),default);
        Assert.Equal(2,revised.ContractVersion);Assert.Equal(c.TotalPrice,revised.TotalPrice);Assert.Equal("Updated terms",revised.Terms);Assert.Null(revised.TermsAcceptedAtUtc);
        f.Time.Value=f.Time.Value.AddHours(2);revised=await f.Service.PublishAsync(revised.ContractId,"manager",new(revised.Version),default);Assert.Equal(f.Time.Value.AddHours(24).UtcDateTime,revised.SignDeadline);
        Assert.False((await f.Service.ContractAsync(c.ContractId,"owner",false,default)).IsCurrent);Assert.NotEqual(c.PdfSha256,revised.PdfSha256);
    }
    [LocalSqlFact] public async Task Pending_or_expired_unreconciled_gateway_attempt_blocks_contract_edits_and_new_attempts(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var c=await Accepted(f);await f.Session(c);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.RequestContractChangeAsync(c.ContractId,"owner",new(c.Version,"Change",Sections:["PRICE"]),default));
        f.Time.Value=f.Time.Value.AddMinutes(16);await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Session(c,"another-session-key"));Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM PAYMENT"));
    }
    [LocalSqlFact] public async Task Cancellation_retains_full_verified_deposit_until_actual_refund_is_recorded(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var c=await Paid(f);
        c=await f.Service.CancellationAsync(c.ContractId,"owner",false,"request",new(c.Version,"Cancel before signing"),default);
        c=await f.Service.CancellationAsync(c.ContractId,"manager",true,"approve",new(c.Version,"Refund verified deposit",CancellationId:c.CancellationId),default);Assert.Equal("REQUESTED",c.RefundStatus);Assert.Equal(c.PaidAmount,c.RefundAmount);Assert.Null(c.Trip);
        c=await f.Service.RefundAsync(c.ContractId,"manager","start",new(c.Version,"Bank refund started"),default);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.RefundAsync(c.ContractId,"manager","complete",new(c.Version,"Done",RefundAmount:1,RefundReference:"bank-ref"),default));
        c=await f.Service.RefundAsync(c.ContractId,"manager","complete",new(c.Version,"Bank confirms refund",RefundAmount:c.PaidAmount,RefundReference:"bank-ref"),default);Assert.Equal("COMPLETED",c.RefundStatus);Assert.Equal(40000000,c.PaidAmount);
    }
    [LocalSqlFact] public async Task Late_money_is_retained_without_auto_activation_or_refund_and_requires_extension_review_signature(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var c=await Accepted(f);var p=await f.Session(c);var callback=f.Callback(p);f.Time.Value=f.Time.Value.AddHours(25);
        await f.Service.IpnAsync(callback,default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);Assert.Equal(40000000,c.PaidAmount);Assert.True(c.Payments.Single().ReviewRequired);Assert.Null(c.Trip);Assert.Null(c.RefundStatus);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>Sign(f,c));
        c=await f.Service.LifecycleAsync(c.ContractId,"manager",true,"extend",new(c.Version,"Late receipt accepted",Deadline:f.Time.Value.AddHours(24),Target:"SIGN"),default);
        c=await f.Service.FinancialReviewAsync(c.ContractId,p,"manager",new(c.Payments.Single().Version,"Verified provider evidence"),default);Assert.Null(c.Trip);c=await Sign(f,c);Assert.NotNull(c.Trip);
    }
    [LocalSqlFact] public async Task Mismatched_signed_amount_never_enables_signature(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var c=await Accepted(f);await f.Service.IpnAsync(f.Callback(await f.Session(c),amount:1),default);
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);Assert.Equal(0,c.PaidAmount);Assert.True(c.Payments.Single().ReviewRequired);await Assert.ThrowsAsync<BusinessRuleException>(()=>Sign(f,c));
    }
    [LocalSqlFact] public async Task Wrong_otp_attempts_commit_and_resend_does_not_restart_common_deadline(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var c=await Paid(f);var due=c.SignDeadline;
        await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:"invalid",PdfSha256:c.PdfSha256),default));Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT SignOtpFailedAttempts FROM CONTRACT"));
        f.Time.Value=f.Time.Value.AddSeconds(61);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);Assert.Equal(due,c.SignDeadline);
    }
    [LocalSqlFact] public async Task Empty_database_reads_do_not_seed_operational_samples_and_roles_are_checked(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();Assert.Empty(JsonSerializer.SerializeToElement(await f.Service.PlanningQueueAsync("route",default)).EnumerateArray());
        var catalog=JsonSerializer.SerializeToElement(await f.Service.PlanningCatalogAsync("route",default));Assert.Equal(0,catalog.GetProperty("flights").GetArrayLength());Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM VEHICLE"));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PlanningCatalogAsync("owner",default));
    }
    [LocalSqlFact] public async Task Migrations_can_be_reapplied_without_losing_contract_or_financial_receipts(){
        await using var f=await RelationalFlow1Tests.Fixture.Create();var c=await Paid(f);await f.Db.ScriptAsync("008_flow1_deposit_before_signature.sql");await f.Db.ScriptAsync("009_flow3_persistent_planning.sql");
        var persisted=await f.NewService().ContractAsync(c.ContractId,"owner",false,default);Assert.Equal(c.PaidAmount,persisted.PaidAmount);Assert.Equal(c.PdfSha256,persisted.PdfSha256);Assert.Single(persisted.Payments);
    }
}
