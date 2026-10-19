using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Domain.Flow1;
using Xunit;
using Fixture = Flow1.Tests.RelationalFlow1Tests.Fixture;

namespace Flow1.Tests;

public sealed class FinalWorkflowTests
{
    private static async Task<FlowContractCard> Sign(Fixture f,FlowContractCard c)
    {
        await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        return await f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code,PdfSha256:c.PdfSha256),default);
    }
    [LocalSqlFact]
    public async Task Deposit_precedes_otp_and_signing_alone_activates_exactly_one_trip()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();var deadline=c.SignDeadline;
        Assert.Equal("AWAITING_DEPOSIT",c.Status);Assert.Equal(c.SignDeadline,c.DepositDeadline);
        var e=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default));
        Assert.Equal("SIGNING_CLOSED",e.ErrorCode);
        var pid=await f.Session(c);var callback=f.Callback(pid);
        await Task.WhenAll(f.Service.IpnAsync(callback,default),f.NewService().IpnAsync(callback,default));
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        Assert.Equal("PENDING_SIGNATURE",c.Status);Assert.Null(c.Trip);Assert.Null(c.SignedAt);Assert.Equal(40000000,c.PaidAmount);
        c=await Sign(f,c);Assert.Equal("EFFECTIVE",c.Status);Assert.NotNull(c.Trip);Assert.Equal(deadline,c.DepositDeadline);
        c=await f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:"retry",PdfSha256:c.PdfSha256),default);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM PAYMENT;"));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.LifecycleAsync(c.ContractId,"manager",true,"withdraw",new(c.Version,"Try changing signed terms"),default));
    }
    [LocalSqlFact]
    public async Task First_manager_claim_is_atomic_fixed_and_reject_notice_contains_the_reason()
    {
        await using var f=await Fixture.Create();var r=await f.Request();
        var outcomes=await Task.WhenAll(new[]{"manager","manager2"}.Select(async a=>{try{await f.NewService().ClaimAsync(r.RequestId,a,new(r.Version),default);return a;}catch(BusinessRuleException){return null;}}));
        var winner=Assert.Single(outcomes,x=>x is not null)!;var loser=winner=="manager"?"manager2":"manager";
        r=await f.Service.DetailAsync(r.RequestId,"owner",false,default);Assert.Equal(winner,r.AssignedManagerId);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReviewAsync(r.RequestId,loser,"reject",new(r.Version,"Not assigned"),default));
        r=await f.Service.ReviewAsync(r.RequestId,winner,"reject",new(r.Version,"Không đủ thời gian chuẩn bị"),default);
        Assert.NotNull(r.ReviewedAtUtc);Assert.Equal("REJECTED",r.Status);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='REQUEST_REJECTED' AND UserID='owner' AND Message=N'Không đủ thời gian chuẩn bị';"));
    }
    [LocalSqlFact]
    public async Task Catalogue_edits_do_not_change_issued_pdf_and_reissue_overwrites_the_same_contract()
    {
        await using var f=await Fixture.Create();var(r,c)=await f.Published();var oldPdf=await f.Service.PdfAsync(c.ContractId,"owner",false,default);var oldHash=c.PdfSha256;
        await f.Service.SaveClauseAsync(f.ClauseId,"manager",new("Điều khoản đã sửa","Nội dung mới chỉ cho hợp đồng phát hành sau."),default);
        Assert.Equal(oldPdf.Bytes,(await f.Service.PdfAsync(c.ContractId,"owner",false,default)).Bytes);
        c=await f.Service.FeedbackAsync(c.ContractId,"owner",new(c.Version,"Đề nghị đổi điều khoản và giảm giá",["CLAUSES","PRICE"]),default);
        c=await f.Service.ReissueAsync(c.ContractId,"manager",new(c.Version,95000000,2,new DateTimeOffset(r.DepartureAt!.Value),new DateTimeOffset(r.DeliveryAt!.Value),[f.ClauseId],"Đã thống nhất"),default);
        Assert.NotEqual(oldHash,c.PdfSha256);Assert.Equal(95000000,c.TotalPrice);Assert.Equal(38000000,c.DepositAmount);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));Assert.Equal(2,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='FLOW1_CONTRACT_READY';"));
        var clauses=PublishedClauseSelection.Read((await f.Service.PdfAsync(c.ContractId,"owner",false,default)).Bytes);
        Assert.Equal("Nội dung mới chỉ cho hợp đồng phát hành sau.",clauses.Single().Content);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables WHERE name='CONTRACT_CLAUSE';"));
    }
    [LocalSqlFact]
    public async Task Feedback_locks_payment_and_rejected_feedback_keeps_pdf_and_restarts_shared_deadline()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();var hash=c.PdfSha256;
        c=await f.Service.FeedbackAsync(c.ContractId,"owner",new(c.Version,"Đề nghị giảm giá",["PRICE"]),default);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Session(c));f.Time.Value=f.Time.Value.AddHours(2);
        c=await f.Service.RejectFeedbackAsync(c.ContractId,"manager",new(c.Version,"Giá đã bao gồm toàn bộ dịch vụ"),default);
        Assert.Equal(hash,c.PdfSha256);Assert.Equal(f.Time.Value.UtcDateTime.AddHours(24),c.SignDeadline);Assert.Equal(c.SignDeadline,c.DepositDeadline);
        Assert.Equal("REJECTED",c.FeedbackStatus);await f.Session(c);
    }
    [LocalSqlFact]
    public async Task Reissue_validates_requested_fields_and_transport_dates_without_overwriting_on_error()
    {
        await using var f=await Fixture.Create();var(r,c)=await f.Published();
        c=await f.Service.FeedbackAsync(c.ContractId,"owner",new(c.Version,"Dời ngày đón và giao",["DEPARTURE_AT","DELIVERY_AT"]),default);
        var input=new ContractReissueInput(c.Version,c.TotalPrice,2,new DateTimeOffset(r.DepartureAt!.Value).AddDays(5),new DateTimeOffset(r.DeliveryAt!.Value).AddDays(5),[f.ClauseId],"Đã kiểm tra lịch");
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReissueAsync(c.ContractId,"manager",input with {Price=1},default));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReissueAsync(c.ContractId,"manager",input with {DeliveryAt=input.DepartureAt.AddHours(-1)},default));
        c=await f.Service.ReissueAsync(c.ContractId,"manager",input,default);var updated=await f.Service.DetailAsync(r.RequestId,"owner",false,default);
        Assert.Equal(input.DepartureAt.UtcDateTime,updated.DepartureAt);Assert.Equal(input.DeliveryAt.UtcDateTime,updated.DeliveryAt);
    }
    [LocalSqlFact]
    public async Task Payment_attempt_blocks_feedback_and_late_or_mismatched_money_never_enables_signing()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();var pid=await f.Session(c);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.FeedbackAsync(c.ContractId,"owner",new(c.Version,"Change",["PRICE"]),default));
        await f.Service.IpnAsync(f.Callback(pid,amount:1),default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        Assert.True(c.Payments.Single().ReviewRequired);Assert.Equal(0,c.PaidAmount);Assert.Null(c.Trip);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>Sign(f,c));
    }
    [LocalSqlFact]
    public async Task Signing_retry_after_transaction_failure_preserves_money_and_creates_one_trip()
    {
        await using var f=await Fixture.Create();var c=await f.Paid();await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        await f.Db.ExecuteAsync("CREATE TRIGGER FixtureTripFailure ON TRIP_PLAN AFTER INSERT AS THROW 51999,'Fixture activation failure',1;");
        await Assert.ThrowsAsync<Microsoft.EntityFrameworkCore.DbUpdateException>(()=>f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code,PdfSha256:c.PdfSha256),default));
        Assert.Equal(40000000m,await f.Db.ScalarAsync<decimal>("SELECT PaidAmount FROM INVOICE;"));Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE SignedAt IS NOT NULL;"));
        await f.Db.ExecuteAsync("DROP TRIGGER FixtureTripFailure;");
        await f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code,PdfSha256:c.PdfSha256),default);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Otp_failure_attempts_persist_and_extension_during_email_revokes_the_challenge()
    {
        await using var f=await Fixture.Create();var c=await f.Paid();
        f.Email.Fail=true;await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default));
        f.Email.Fail=false;f.Time.Value=f.Time.Value.AddSeconds(61);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:"wrong",PdfSha256:c.PdfSha256),default));
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT SignOtpFailedAttempts FROM CONTRACT;"));
        f.Time.Value=f.Time.Value.AddSeconds(61);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        f.Email.DuringSend=async()=>{var current=await f.NewService().ContractAsync(c.ContractId,"manager",true,default);await f.NewService().LifecycleAsync(c.ContractId,"manager",true,"extend",new(current.Version,"More time",Deadline:f.Time.Value.AddHours(25)),default);};
        var e=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default));Assert.Equal("OTP_REVOKED",e.ErrorCode);
    }
    [LocalSqlFact]
    public async Task Only_named_staff_receive_handoff_and_direct_downloads_are_authorized()
    {
        await using var f=await Fixture.Create();var c=await f.Signed();
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DeploymentAsync(c.ContractId,"manager","confirm",new(c.Trip!.Version,"Ready",AssignedSpecialistId:"route",AssignedCoordinatorId:"docs"),default));
        c=await f.Service.DeploymentAsync(c.ContractId,"manager","confirm",new(c.Trip!.Version,"Ready",AssignedSpecialistId:"docs",AssignedCoordinatorId:"route"),default);
        Assert.Single(await f.Service.OperationsAsync("route",default));Assert.Empty(await f.Service.OperationsAsync("route2",default));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.OperationsPdfAsync(c.Trip!.TripId,"route2",c.Trip.EventId!,default));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.AckAsync(c.Trip!.TripId,"docs2",new(c.Trip.Version,EventId:c.Trip.EventId),default));
        Assert.Equal(2,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='FLOW1_HANDOFF';"));
        var old=c.Trip!;c=await f.Service.DeploymentAsync(c.ContractId,"manager","hold",new(c.Trip!.Version,"Weather"),default);Assert.Empty(await f.Service.OperationsAsync("route",default));
        c=await f.Service.DeploymentAsync(c.ContractId,"manager","resume",new(c.Trip!.Version,"Clear"),default);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DeploymentAsync(c.ContractId,"manager","confirm",new(c.Trip!.Version,"Replace",AssignedSpecialistId:"docs2",AssignedCoordinatorId:"route"),default));
        c=await f.Service.DeploymentAsync(c.ContractId,"manager","confirm",new(c.Trip!.Version,"Ready",AssignedSpecialistId:"docs",AssignedCoordinatorId:"route"),default);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.OperationsPdfAsync(old.TripId,"route",old.EventId!,default));
    }
    [LocalSqlFact]
    public async Task Paid_unsigned_cancellation_requires_explicit_full_refund_confirmation()
    {
        await using var f=await Fixture.Create();var c=await f.Paid();
        c=await f.Service.CancellationAsync(c.ContractId,"owner",false,"request",new(c.Version,"Cancel before signing"),default);
        c=await f.Service.CancellationAsync(c.ContractId,"manager",true,"approve",new(c.Version,"Refund full deposit",CancellationId:c.CancellationId),default);
        Assert.Equal("REQUESTED",c.RefundStatus);Assert.Equal(40000000,c.RefundAmount);Assert.Null(c.Trip);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>Sign(f,c));
        c=await f.Service.CancellationAsync(c.ContractId,"manager",true,"refund-start",new(c.Version,"Bank refund processing",CancellationId:c.CancellationId),default);
        Assert.Equal("PROCESSING",c.RefundStatus);
        c=await f.Service.CancellationAsync(c.ContractId,"manager",true,"refund-complete",new(c.Version,"Verified bank refund",Target:"BANK-REFUND-123",CancellationId:c.CancellationId),default);
        Assert.Equal("COMPLETED",c.RefundStatus);Assert.Equal("CANCELLED",c.Status);Assert.Equal(40000000,c.PaidAmount);
    }
    [LocalSqlFact]
    public async Task Publication_rechecks_catalogue_and_customer_after_renderer_io()
    {
        await using var f=await Fixture.Create();var r=await f.Request();r=await f.Service.ReviewAsync(r.RequestId,"manager","accept",new(r.Version,"Accepted"),default);
        var c=await f.Service.DraftAsync(r.RequestId,"manager","draft-key-one",new(r.Version,Price:100000000,PreparationDays:2),default);
        f.Renderer.DuringRender=async()=>{await f.NewService().SaveClauseAsync(f.ClauseId,"manager",new("Changed","Changed while rendering"),default);};
        var e=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PublishAsync(c.ContractId,"manager",new(c.Version,ClauseIds:[f.ClauseId]),default));
        Assert.Equal("CLAUSES_CHANGED",e.ErrorCode);Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
    }
    [LocalSqlFact]
    public async Task All_new_routes_have_openapi_schema_and_reject_wrong_roles_or_invalid_payloads()
    {
        await using var f=await Fixture.Create();using var app=new RelationalHttpFactory(f);using var manager=app.Client("manager","LOGISTICS_MANAGER");using var customer=app.Client();
        var spec=await manager.GetAsync("/swagger/v1/swagger.json");Assert.Equal(HttpStatusCode.OK,spec.StatusCode);
        var json=await spec.Content.ReadAsStringAsync();Assert.Contains("/api/manager/clauses",json);Assert.Contains("/api/customer/contracts/{id}/feedback",json);Assert.Contains("/api/manager/staff/operational",json);
        using var document=System.Text.Json.JsonDocument.Parse(json);var paths=document.RootElement.GetProperty("paths");
        System.Text.Json.JsonElement Example(string path)=>paths.GetProperty(path).GetProperty("post").GetProperty("requestBody").GetProperty("content").GetProperty("application/json").GetProperty("example");
        Assert.True(Example("/api/manager/contracts/{id}/deployment/{operation}").TryGetProperty("assignedSpecialistId",out _));
        Assert.True(Example("/api/manager/contracts/{id}/cancellation/{operation}").TryGetProperty("target",out _));
        Assert.True(Example("/api/operations/flow1/trips/{id}/ack").TryGetProperty("eventId",out _));
        Assert.False(paths.GetProperty("/api/customer/requests/{id}/revision").GetProperty("post").GetProperty("requestBody").GetProperty("content").GetProperty("application/json").TryGetProperty("example",out _));
        Assert.Equal(HttpStatusCode.Forbidden,(await customer.PostAsJsonAsync("/api/manager/clauses",new ClauseInput("x","y"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,(await manager.PostAsync("/api/manager/clauses",new StringContent("{}",System.Text.Encoding.UTF8,"application/json"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK,(await manager.GetAsync("/api/manager/staff/operational")).StatusCode);
    }
}
