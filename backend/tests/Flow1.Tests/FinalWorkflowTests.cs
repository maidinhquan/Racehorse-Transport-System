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
    [LocalSqlFact]
    public async Task Removed_decline_is_not_exposed_and_feedback_and_cancellation_remain_available()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();
        using var app=new RelationalHttpFactory(f);using var customer=app.Client();
        var response=await customer.PostAsJsonAsync($"/api/customer/contracts/{c.ContractId}/decline",new FlowAction(c.Version,"Old action"));
        Assert.Equal(HttpStatusCode.NotFound,response.StatusCode);
        var spec=await customer.GetFromJsonAsync<System.Text.Json.JsonElement>("/swagger/v1/swagger.json");
        Assert.DoesNotContain(spec.GetProperty("paths").EnumerateObject(),p=>p.Name.EndsWith("/decline",StringComparison.Ordinal));
        var denied=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.LifecycleAsync(c.ContractId,"owner",false,"decline",new(c.Version,"Old action"),default));
        Assert.Equal("FORBIDDEN",denied.ErrorCode);
        var unchanged=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        Assert.Equal(c.Version,unchanged.Version);Assert.Equal("AWAITING_DEPOSIT",unchanged.Status);
        Assert.Equal(c.PdfSha256,unchanged.PdfSha256);
        c=await f.Service.FeedbackAsync(c.ContractId,"owner",new(c.Version,"Đề nghị giảm giá",["PRICE"]),default);
        Assert.Equal("PENDING",c.FeedbackStatus);Assert.Equal("AWAITING_DEPOSIT",c.Status);
        await f.Service.PdfAsync(c.ContractId,"owner",false,default);
        c=await f.Service.RejectFeedbackAsync(c.ContractId,"manager",new(c.Version,"Giữ giá đã báo"),default);
        c=await f.Service.CancellationAsync(c.ContractId,"owner",false,"request",new(c.Version,"Không tiếp tục vận chuyển"),default);
        Assert.Equal("PENDING",c.CancellationStatus);
        c=await f.Service.CancellationAsync(c.ContractId,"manager",true,"approve",new(c.Version,"Đồng ý hủy",CancellationId:c.CancellationId),default);
        Assert.Equal("CANCELLED",c.Status);
    }

    [LocalSqlFact]
    public async Task Consolidated_migration_removes_legacy_manager_ownership_and_preserves_requests()
    {
        await using var f=await Fixture.Create();var r=await f.Request();
        await f.Db.ExecuteAsync("ALTER TABLE dbo.TRANSPORT_REQUEST ADD AssignedManagerId varchar(50) NULL, ReviewedAtUtc datetime2(7) NULL;");
        await f.Db.ExecuteAsync("ALTER TABLE dbo.TRANSPORT_REQUEST WITH CHECK ADD CONSTRAINT FK_F1_Manager FOREIGN KEY(AssignedManagerId) REFERENCES dbo.[USER](UserID); UPDATE dbo.TRANSPORT_REQUEST SET AssignedManagerId='manager', ReviewedAtUtc='2026-10-19' WHERE Status='PENDING';");
        var count=await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM dbo.TRANSPORT_REQUEST;");
        await f.Db.ScriptAsync("002_flow1.sql");
        await f.Db.ScriptAsync("002_flow1.sql");
        Assert.Equal(count,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM dbo.TRANSPORT_REQUEST;"));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST') AND name='AssignedManagerId';"));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.foreign_keys WHERE name='FK_F1_Manager';"));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST') AND name='ReviewedAtUtc';"));
        Assert.Equal(r.RequestId,(await f.Service.DetailAsync(r.RequestId,"manager2",true,default)).RequestId);
    }

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
    public async Task Managers_share_requests_without_claiming_and_stale_updates_still_fail()
    {
        await using var f=await Fixture.Create();var r=await f.Request();
        var original=r.Version;
        r=await f.Service.ReviewAsync(r.RequestId,"manager","accept",new(r.Version,"Accepted"),default);
        Assert.Contains(await f.Service.ListAsync("manager2",true,default),x=>x.RequestId==r.RequestId);
        Assert.Equal(r.RequestId,(await f.Service.DetailAsync(r.RequestId,"manager2",true,default)).RequestId);
        var stale=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReviewAsync(r.RequestId,"manager2","reject",new(original,"Outdated"),default));
        Assert.Equal("STALE_VERSION",stale.ErrorCode);
        var c=await f.Service.DraftAsync(r.RequestId,"manager2","shared-manager-draft",new(r.Version,Price:100000000,Costs:CustomerTransportTests.Quote(100000000),PreparationDays:2),default);
        c=await f.Service.PublishAsync(c.ContractId,"manager",new(c.Version,ClauseIds:[f.ClauseId]),default);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ContractAsync(c.ContractId,"other",false,default));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST') AND name='AssignedManagerId';"));
    }
    [LocalSqlFact]
    public async Task Any_manager_can_reject_and_customer_receives_the_reason()
    {
        await using var f=await Fixture.Create();var r=await f.Request();
        r=await f.Service.ReviewAsync(r.RequestId,"manager2","reject",new(r.Version,"Không đủ thời gian chuẩn bị"),default);
        Assert.Equal("REJECTED",r.Status);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='REQUEST_REJECTED' AND UserID='owner' AND Message=N'Không đủ thời gian chuẩn bị';"));
    }
    [LocalSqlFact]
    public async Task Feedback_and_cancellation_notify_active_managers_and_can_be_handled_by_another_manager()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();
        await f.Db.ExecuteAsync("INSERT [USER](UserID,PasswordHash,Role,FullName,IsActive) VALUES ('inactive-manager','fixture','LOGISTICS_MANAGER','Inactive',0);");
        c=await f.Service.FeedbackAsync(c.ContractId,"owner",new(c.Version,"Đề nghị giảm giá",["PRICE"]),default);
        Assert.Equal(2,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='CONTRACT_FEEDBACK' AND UserID IN ('manager','manager2');"));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='CONTRACT_FEEDBACK' AND UserID NOT IN ('manager','manager2');"));
        c=await f.Service.RejectFeedbackAsync(c.ContractId,"manager2",new(c.Version,"Giữ giá đã báo"),default);
        c=await f.Service.CancellationAsync(c.ContractId,"owner",false,"request",new(c.Version,"Không còn nhu cầu"),default);
        Assert.Equal(2,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='CANCELLATION_REQUESTED' AND UserID IN ('manager','manager2');"));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='CANCELLATION_REQUESTED' AND UserID NOT IN ('manager','manager2');"));
        c=await f.Service.CancellationAsync(c.ContractId,"manager2",true,"approve",new(c.Version,"Đồng ý hủy",CancellationId:c.CancellationId),default);
        Assert.Equal("CANCELLED",c.Status);
    }
    [LocalSqlFact]
    public async Task Catalogue_edits_do_not_change_issued_pdf_and_reissue_overwrites_the_same_contract()
    {
        await using var f=await Fixture.Create();var(r,c)=await f.Published();var oldPdf=await f.Service.PdfAsync(c.ContractId,"owner",false,default);var oldHash=c.PdfSha256;
        await f.Service.SaveClauseAsync(f.ClauseId,"manager",new("Điều khoản đã sửa","Nội dung mới chỉ cho hợp đồng phát hành sau."),default);
        Assert.Equal(oldPdf.Bytes,(await f.Service.PdfAsync(c.ContractId,"owner",false,default)).Bytes);
        c=await f.Service.FeedbackAsync(c.ContractId,"owner",new(c.Version,"Đề nghị đổi điều khoản và giảm giá",["CLAUSES","PRICE"]),default);
        c=await f.Service.ReissueAsync(c.ContractId,"manager",new(c.Version,95000000,2,new DateTimeOffset(r.DepartureAt!.Value),new DateTimeOffset(r.DeliveryAt!.Value),[f.ClauseId],"Đã thống nhất",Costs:CustomerTransportTests.Quote(95000000)),default);
        Assert.NotEqual(oldHash,c.PdfSha256);Assert.Equal(95000000,c.TotalPrice);Assert.Equal(38000000,c.DepositAmount);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));Assert.Equal(2,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='FLOW1_CONTRACT_READY';"));
        var clauses=PublishedClauseSelection.Read((await f.Service.PdfAsync(c.ContractId,"owner",false,default)).Bytes);
        Assert.Equal(12,clauses.Count);Assert.Equal("Nội dung mới chỉ cho hợp đồng phát hành sau.",clauses.Single(x=>x.ClauseId==f.ClauseId).Content);
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
        var input=new ContractReissueInput(c.Version,c.TotalPrice,2,new DateTimeOffset(r.DepartureAt!.Value).AddDays(5),new DateTimeOffset(r.DeliveryAt!.Value).AddDays(5),[f.ClauseId],"Đã kiểm tra lịch",Costs:c.Costs);
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
        Assert.Empty(await f.Service.OperationsAsync("docs2",default));
        Assert.Equal(2,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='FLOW1_HANDOFF';"));
        var old=c.Trip!;
        foreach(var action in new[]{"hold","resume"})
            await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DeploymentAsync(c.ContractId,"manager",action,new(old.Version,"Unsupported"),default));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DeploymentAsync(c.ContractId,"manager","confirm",new(c.Trip!.Version,"Replace",AssignedSpecialistId:"docs2",AssignedCoordinatorId:"route"),default));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DeploymentAsync(c.ContractId,"manager","confirm",new(c.Trip!.Version,"Again",AssignedSpecialistId:"docs",AssignedCoordinatorId:"route"),default));
        await f.Service.OperationsPdfAsync(old.TripId,"route",old.EventId!,default);
        Assert.Single(await f.Service.OperationsAsync("route",default));
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
        var c=await f.Service.DraftAsync(r.RequestId,"manager","draft-key-one",new(r.Version,Price:100000000,Costs:CustomerTransportTests.Quote(100000000),PreparationDays:2),default);
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
        Assert.True(Example("/api/manager/contracts/{id}/deployment/confirm").TryGetProperty("assignedSpecialistId",out _));
        Assert.DoesNotContain(paths.EnumerateObject(),p=>p.Name.Contains("/deployment/") && !p.Name.EndsWith("/confirm",StringComparison.Ordinal));
        foreach(var operation in new[]{"hold","resume"})
            Assert.Equal(HttpStatusCode.NotFound,(await manager.PostAsJsonAsync($"/api/manager/contracts/unused/deployment/{operation}",new FlowAction("unused","Unsupported"))).StatusCode);
        Assert.True(Example("/api/manager/contracts/{id}/cancellation/{operation}").TryGetProperty("target",out _));
        Assert.DoesNotContain(paths.EnumerateObject(),p=>p.Name.EndsWith("/ack",StringComparison.Ordinal));
        var revisionExample=Example("/api/customer/requests/{id}/revision");
        Assert.True(revisionExample.TryGetProperty("version",out _));
        Assert.True(revisionExample.TryGetProperty("input",out _));
        Assert.DoesNotContain(paths.EnumerateObject(),p=>p.Name.EndsWith("/claim",StringComparison.Ordinal));
        Assert.Equal(HttpStatusCode.Forbidden,(await customer.PostAsJsonAsync("/api/manager/clauses",new ClauseInput("x","y"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,(await manager.PostAsync("/api/manager/clauses",new StringContent("{}",System.Text.Encoding.UTF8,"application/json"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK,(await manager.GetAsync("/api/manager/staff/operational")).StatusCode);
    }
}
