using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Infrastructure.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace Flow1.Tests;

public sealed class RequestReviewTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private sealed class Fixture : IAsyncDisposable
    {
        public required Flow1TestDatabase Db; public required string Root; public required CustomerTestFactory Factory;
        public required HttpClient Customer; public required HttpClient Manager; public required string Id;
        public required SubmitRequestInput Input; public required SqlStateFaults Fault;
        public static async Task<Fixture> CreateAsync()
        {
            var db = await Flow1TestDatabase.CreateAsync(); var root = Path.Combine(Path.GetTempPath(), "RaceHorseFlow1Api-" + Guid.NewGuid().ToString("N"));
            var fault = new SqlStateFaults();
            var factory = new CustomerTestFactory(db.ConnectionString, root, customize: services => {
                services.RemoveAll<SqlStateFaults>(); services.AddSingleton(fault);
            });
            var customer = factory.Client(); var manager = factory.Client("manager", "LOGISTICS_MANAGER");
            try
            {
                var horse = await Data<HorseView>(await Send(customer, "/api/customer/horses", CustomerTransportTests.HorseBody()), HttpStatusCode.Created);
                var input = CustomerTransportTests.Request(horse.HorseId);
                var request = await Data<RequestView>(await Send(customer, "/api/customer/requests", input, "request-original-001"), HttpStatusCode.Created);
                return new() { Db = db, Root = root, Fault = fault, Factory = factory, Customer = customer, Manager = manager, Id = request.RequestId, Input = input };
            }
            catch { customer.Dispose(); manager.Dispose(); factory.Dispose(); await db.DisposeAsync(); Flow1TestFolders.Cleanup(root); throw; }
        }
        public Task<ManagerReviewView> View() => Get<ManagerReviewView>(Manager, "/api/manager/requests/" + Id);
        public Task<CustomerReviewView> CustomerView() => Get<CustomerReviewView>(Customer, "/api/customer/requests/" + Id + "/review");
        public Task<HttpResponseMessage> M(string action, ReviewCommand command, string? key = null) => Send(Manager, $"/api/manager/requests/{Id}/{action}", command, key);
        public Task<HttpResponseMessage> C(string action, ReviewCommand command, string? key = null) => Send(Customer, $"/api/customer/requests/{Id}/{action}", command, key);
        public async ValueTask DisposeAsync() { Customer.Dispose(); Manager.Dispose(); Factory.Dispose(); await Db.DisposeAsync(); Flow1TestFolders.Cleanup(Root); }
    }
    private static async Task<HttpResponseMessage> Send(HttpClient client, string path, object body, string? key = null, HttpMethod? method = null)
    {
        using var request = new HttpRequestMessage(method ?? HttpMethod.Post, path) { Content = body is HttpContent content ? content : JsonContent.Create(body) };
        request.Headers.Add("Idempotency-Key", key ?? Guid.NewGuid().ToString());
        return await client.SendAsync(request);
    }
    private static async Task<T> Data<T>(HttpResponseMessage response, HttpStatusCode code = HttpStatusCode.OK)
    {
        var text = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == code, $"Expected {code}, got {response.StatusCode}: {text}");
        return JsonDocument.Parse(text).RootElement.GetProperty("data").Deserialize<T>(Json)!;
    }
    private static async Task<T> Get<T>(HttpClient client, string path) => await Data<T>(await client.GetAsync(path));
    private static PlanInput Plan(Fixture f, int days = 2) => new(f.Input.Trip.DesiredDepartureDate, f.Input.DeliveryDeadline, days, 1, 1, "Xe chuyên dụng + lái xe + handler dự kiến");
    private static SellingLine[] Lines(decimal total) => [new("TRANSPORT", "Vận chuyển và dịch vụ theo kế hoạch", 1, total)];
    private static async Task<ManagerReviewView> AcceptedPlan(Fixture f)
    {
        var accepted = await Data<ManagerReviewView>(await f.M("accept", new(0)));
        return await Data<ManagerReviewView>(await f.M("preliminary-plan", new(accepted.Version, Plan: Plan(f))));
    }
    [LocalSqlFact]
    public async Task Review_plan_draft_prices_and_private_customer_projection_are_real_and_idempotent()
    {
        await using var f = await Fixture.CreateAsync();
        var noPlan = await f.M("contracts", new(0, Lines: Lines(115_000_000)));
        Assert.Equal(HttpStatusCode.Conflict, noPlan.StatusCode); Assert.Contains("PRELIMINARY_PLAN_REQUIRED", await noPlan.Content.ReadAsStringAsync());
        var accepted = await Data<ManagerReviewView>(await f.M("accept", new(0), "accept-retry-01"));
        Assert.Equal("ACCEPTED", accepted.Request.Status);
        Assert.Equal(accepted.Version, (await Data<ManagerReviewView>(await f.M("accept", new(0), "accept-retry-01"))).Version);
        var badPlan = await f.M("preliminary-plan", new(accepted.Version, Plan: Plan(f, 1)));
        Assert.Equal(HttpStatusCode.Conflict, badPlan.StatusCode);
        var plan = await Data<ManagerReviewView>(await f.M("preliminary-plan", new(accepted.Version, Plan: Plan(f))));
        Assert.Equal(40_500_000m, plan.Plan!.EstimatedCost); Assert.Equal(42_525_000m, plan.Plan.Floor);
        Assert.Equal(HttpStatusCode.Conflict, (await f.M("contracts", new(plan.Version, Lines: Lines(10_000_000)))).StatusCode);
        var draft = await Data<ManagerReviewView>(await f.M("contracts", new(plan.Version, Lines: Lines(115_000_000)), "draft-retry-001"));
        Assert.Equal(46_000_000m, draft.Contract!.Deposit); Assert.Equal("DRAFT", draft.Contract.Status);
        var managerContract = await Get<JsonElement>(f.Manager, $"/api/manager/contracts/{draft.Contract.ContractId}");
        Assert.True(managerContract.GetProperty("editable").GetBoolean());
        var customerContract = await (await f.Customer.GetAsync($"/api/customer/contracts/{draft.Contract.ContractId}")).Content.ReadAsStringAsync();
        Assert.DoesNotContain("estimatedCost", customerContract); Assert.DoesNotContain("floor", customerContract);
        Assert.Equal(draft.Contract.ContractId, (await Data<ManagerReviewView>(await f.M("contracts", new(plan.Version, Lines: Lines(115_000_000)), "draft-retry-001"))).Contract!.ContractId);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        var text = await (await f.Customer.GetAsync($"/api/customer/requests/{f.Id}")).Content.ReadAsStringAsync();
        Assert.Contains("46000000", text); Assert.DoesNotContain("estimatedCost", text); Assert.DoesNotContain("belowFloorReason", text); Assert.DoesNotContain("floor", text);
        var replace = new ReviewCommand(draft.Version, Reason: "Nội bộ: ưu đãi có lý do", Lines: Lines(10_000_000));
        var replacement = await Data<ManagerReviewView>(await Send(f.Manager, $"/api/manager/contracts/{draft.Contract.ContractId}", replace, "replace-draft-put", HttpMethod.Put));
        Assert.Equal(replacement.Contract!.ContractId, (await Data<ManagerReviewView>(await Send(f.Manager,
            $"/api/manager/contracts/{draft.Contract.ContractId}", replace, "replace-draft-put", HttpMethod.Put))).Contract!.ContractId);
        Assert.Equal(replace.Reason, replacement.BelowFloorReason);
        Assert.NotEqual(draft.Contract.ContractId, replacement.Contract!.ContractId);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE ContractStatus='SUPERSEDED';"));
        var replan = await Data<ManagerReviewView>(await f.M("preliminary-plan", new(replacement.Version, Plan: Plan(f, 3))));
        Assert.Null(replan.Contract); Assert.Equal(2, replan.Review.PlanVersion);
        Assert.Equal(2, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE ContractStatus='SUPERSEDED';"));
        Assert.Null((await f.CustomerView()).Contract);
        Assert.Equal(HttpStatusCode.Conflict, (await f.M("preliminary-plan", new(replan.Version, Plan: Plan(f, 2)))).StatusCode);
    }
    [LocalSqlFact]
    public async Task Questions_are_not_revisions_and_resubmit_preserves_complete_canonical_history()
    {
        await using var f = await Fixture.CreateAsync();
        var question = await Data<ManagerReviewView>(await f.M("info-requests", new(0, "Xác nhận số điện thoại người nhận?")));
        var customer = await f.CustomerView();
        await Data<CustomerReviewView>(await f.C("info-responses", new(customer.Version, "Số điện thoại đúng", QuestionId: question.Review.Questions[0].Id)));
        var original = await Get<RequestView>(f.Customer, $"/api/customer/requests/{f.Id}");
        Assert.Equal(1, original.Version); Assert.Equal(JsonSerializer.Serialize(f.Input, Json), JsonSerializer.Serialize(original.Snapshot!.Input, Json));
        var view = await f.View();
        var revision = await Data<ManagerReviewView>(await f.M("request-revision", new(view.Version, "Sửa người nhận", ["CONTACTS"])));
        Assert.Equal("CHANGES_REQUESTED", revision.Request.Status);
        var revised = f.Input with { Receiver = f.Input.Receiver with { Name = "Người nhận mới" } };
        f.Fault.Mode = "canonical-written";
        var command = new ReviewCommand(revision.Version, Request: revised);
        Assert.Equal(HttpStatusCode.InternalServerError, (await f.C("revision", command, "revision-retry-01")).StatusCode);
        var recovered = await Get<RequestView>(f.Customer, $"/api/customer/requests/{f.Id}");
        Assert.Equal("CHANGES_REQUESTED", recovered.Status); Assert.Equal(1, recovered.Version); Assert.Equal("Người nhận", recovered.Snapshot!.Input.Receiver.Name);
        await Data<CustomerReviewView>(await f.C("revision", command, "revision-retry-01"));
        var history = await Get<JsonElement>(f.Manager, $"/api/manager/requests/{f.Id}/revisions");
        Assert.Equal(2, history.GetArrayLength()); Assert.Equal("Người nhận", history[0].GetProperty("snapshot").GetProperty("input").GetProperty("receiver").GetProperty("name").GetString());
        // Original create retry still uses its original submission hash, even after canonical revision.
        var retry = await Data<RequestView>(await Send(f.Customer, "/api/customer/requests", f.Input, "request-original-001"), HttpStatusCode.Created);
        Assert.Equal(f.Id, retry.RequestId); Assert.Equal(2, retry.Version);
    }
    [LocalSqlFact]
    public async Task Pending_change_blocks_accept_and_draft_until_decided_and_approval_invalidates_plan()
    {
        await using var f = await Fixture.CreateAsync(); var plan = await AcceptedPlan(f);
        var draft = await Data<ManagerReviewView>(await f.M("contracts", new(plan.Version, Lines: Lines(115_000_000))));
        var proposal = f.Input with { Receiver = f.Input.Receiver with { Name = "Người nhận đề xuất" } };
        var pending = await Data<CustomerReviewView>(await f.C("change-requests", new(draft.Version, "Đổi người nhận", Request: proposal)));
        Assert.Equal("Người nhận", (await Get<RequestView>(f.Customer, $"/api/customer/requests/{f.Id}")).Snapshot!.Input.Receiver.Name);
        Assert.Equal(HttpStatusCode.Conflict, (await f.M("contract-versions", new(pending.Version, Lines: Lines(115_000_000)))).StatusCode);
        var approved = await Data<ManagerReviewView>(await f.M($"change-requests/{pending.Changes[0].Id}/approve", new(pending.Version, "Đã kiểm tra")));
        Assert.Equal("PENDING", approved.Request.Status); Assert.Equal(2, approved.Request.Version);
        Assert.Null(approved.Contract); Assert.Null(approved.Plan);
        Assert.Equal("Người nhận đề xuất", approved.Request.Snapshot!.Input.Receiver.Name);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE ContractStatus='SUPERSEDED';"));
        var customerDetail = await Get<RequestView>(f.Customer, $"/api/customer/requests/{f.Id}");
        Assert.Equal(customerDetail.Version, customerDetail.Review!.RequestVersion);
        Assert.Equal(approved.Request.Snapshot.Input.Receiver.Name, customerDetail.Snapshot!.Input.Receiver.Name);
        Assert.Null(customerDetail.Review.Contract);
    }
    [LocalSqlFact]
    public async Task Roles_ownership_private_files_and_stale_concurrent_decisions_are_enforced()
    {
        await using var f = await Fixture.CreateAsync(); using var other = f.Factory.Client("other"); using var guest = f.Factory.Client(null);
        Assert.Equal(HttpStatusCode.Forbidden, (await f.Customer.GetAsync("/api/manager/requests")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await guest.GetAsync("/api/manager/requests")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/customer/requests/{f.Id}/review")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Send(other, $"/api/customer/requests/{f.Id}/cancel", new ReviewCommand(0, "Không phải chủ"))).StatusCode);
        var horse = f.Input.Horses[0];
        Assert.Equal(HttpStatusCode.OK, (await f.Manager.GetAsync($"/api/manager/requests/{f.Id}/horses/{horse.HorseId}/documents/1/passport")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await f.Customer.GetAsync($"/api/manager/requests/{f.Id}/horses/{horse.HorseId}/documents/1/passport")).StatusCode);
        var results = await Task.WhenAll(f.M("accept", new(0)), f.M("reject", new(0, "Không đáp ứng yêu cầu")));
        Assert.Single(results, x => x.StatusCode == HttpStatusCode.OK); Assert.Single(results, x => x.StatusCode == HttpStatusCode.Conflict);
        var state = await f.View(); Assert.Contains(state.Request.Status, new[] { "ACCEPTED", "REJECTED" });
        Assert.Single(state.Review.Notices);
    }
    [LocalSqlFact]
    public async Task Failed_review_state_rolls_back_and_exact_retry_commits_once_without_recovery()
    {
        await using var f = await Fixture.CreateAsync(); f.Fault.Mode = "review-after-state";
        var command = new ReviewCommand(0);
        Assert.Equal(HttpStatusCode.InternalServerError, (await f.M("accept", command, "accept-sql-01")).StatusCode);
        Assert.Equal("PENDING", (await f.View()).Request.Status); Assert.Equal(0, (await f.View()).Version);
        Assert.Null(await f.Factory.State("review", f.Id));
        var accepted = await Data<ManagerReviewView>(await f.M("accept", command, "accept-sql-01"));
        Assert.Equal("ACCEPTED", accepted.Request.Status); Assert.Equal(1, accepted.Version);
        Assert.Equal(accepted.Version, (await Data<ManagerReviewView>(await f.M("accept", command, "accept-sql-01"))).Version);
        Assert.Single(accepted.Review.Notices);
    }
    [LocalSqlFact]
    public async Task Failure_after_sql_save_or_draft_snapshot_write_rolls_back_business_and_receipt()
    {
        await using var f = await Fixture.CreateAsync(); f.Fault.Mode = "after-save";
        Assert.Equal(HttpStatusCode.InternalServerError, (await f.M("accept", new(0))).StatusCode);
        Assert.Equal("PENDING", (await f.View()).Request.Status); Assert.Null(await f.Factory.State("review", f.Id));
        var plan = await AcceptedPlan(f); f.Fault.Mode = "contract-after-state";
        var command = new ReviewCommand(plan.Version, Lines: Lines(115_000_000));
        Assert.Equal(HttpStatusCode.InternalServerError, (await f.M("contracts", command, "draft-atomic-sql")).StatusCode);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));
        Assert.Null((await f.View()).Contract); Assert.Equal(plan.Version, (await f.View()).Version);
        var draft = await Data<ManagerReviewView>(await f.M("contracts", command, "draft-atomic-sql"));
        Assert.NotNull(draft.Contract); Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));
    }
    [LocalSqlFact]
    public async Task Failed_draft_SQL_does_not_publish_a_contract_and_manager_can_recover_without_Trip()
    {
        await using var f = await Fixture.CreateAsync(); var plan = await AcceptedPlan(f);
        await f.Db.ExecuteAsync("ALTER TABLE CONTRACT ADD CONSTRAINT TestDraftLimit CHECK(TotalQuotedPrice < 100000000);");
        Assert.Equal(HttpStatusCode.InternalServerError, (await f.M("contracts", new(plan.Version, Lines: Lines(115_000_000)))).StatusCode);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));
        Assert.Null((await f.CustomerView()).Contract);
        var unchanged = await f.View(); Assert.Equal(plan.Version, unchanged.Version);
        var valid = await Data<ManagerReviewView>(await f.M("contracts", new(unchanged.Version, Lines: Lines(80_000_000))));
        Assert.Equal(32_000_000, valid.Contract!.Deposit);
        await f.Db.ExecuteAsync("UPDATE CONTRACT SET ContractStatus='SIGNED', SignedAt=GETUTCDATE();");
        Assert.Equal(HttpStatusCode.Conflict, (await f.M("preliminary-plan", new(valid.Version, Plan: Plan(f)))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await f.C("cancel", new(valid.Version, "Không được hủy trực tiếp sau ký"))).StatusCode);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Approval_revalidates_horse_availability_and_does_not_steal_another_request_booking()
    {
        await using var f = await Fixture.CreateAsync();
        var horse = await Data<HorseView>(await Send(f.Customer, "/api/customer/horses", CustomerTransportTests.HorseBody(
            CustomerTransportTests.Horse() with { MicrochipIso = "223456789012345", Name = "Second horse" })), HttpStatusCode.Created);
        var secondInput = CustomerTransportTests.Request(horse.HorseId);
        await Data<RequestView>(await Send(f.Customer, "/api/customer/requests", secondInput), HttpStatusCode.Created);
        var proposedDocument = $"/api/manager/requests/{f.Id}/horses/{horse.HorseId}/documents/1/passport";
        Assert.Equal(HttpStatusCode.NotFound, (await f.Manager.GetAsync(proposedDocument)).StatusCode);
        var proposed = await Data<CustomerReviewView>(await f.C("change-requests", new(0, "Chọn ngựa khác", Request: secondInput)));
        Assert.Equal(HttpStatusCode.OK, (await f.Manager.GetAsync(proposedDocument)).StatusCode);
        var approval = await f.M($"change-requests/{proposed.Changes[0].Id}/approve", new(proposed.Version, "Kiểm tra lại lịch"));
        Assert.Equal(HttpStatusCode.Conflict, approval.StatusCode); Assert.Contains("SCHEDULE_CONFLICT", await approval.Content.ReadAsStringAsync());
        Assert.Equal(1, (await Get<RequestView>(f.Customer, $"/api/customer/requests/{f.Id}")).Version);
        Assert.Equal("PENDING", (await f.CustomerView()).Changes[0].Status);
        var rejected = await Data<ManagerReviewView>(await f.M($"change-requests/{proposed.Changes[0].Id}/reject", new(proposed.Version, "Ngựa đã trùng lịch")));
        Assert.Contains("ACCEPT", rejected.AllowedActions);
        Assert.Equal(HttpStatusCode.NotFound, (await f.Manager.GetAsync(proposedDocument)).StatusCode);
    }
    [LocalSqlFact]
    public async Task Air_plan_requires_gateways_and_explicit_exclusion_of_ground_legs()
    {
        await using var f = await Fixture.CreateAsync();
        var v = await Data<ManagerReviewView>(await f.M("request-revision", new(0, "Đổi tuyến theo khách", ["ROUTE"])));
        var air = f.Input with { Trip = f.Input.Trip with { PreferredTransportMode = "AIR", Delivery = new("Tokyo", 35.6, 139.7, "JP") } };
        var revised = await Data<CustomerReviewView>(await f.C("revision", new(v.Version, Request: air)));
        var accepted = await Data<ManagerReviewView>(await f.M("accept", new(revised.Version)));
        var input = new PlanInput(air.Trip.DesiredDepartureDate, air.DeliveryDeadline, 7, 0, 1, "Air stall và handler dự kiến");
        Assert.Equal(HttpStatusCode.Conflict, (await f.M("preliminary-plan", new(accepted.Version, Plan: input))).StatusCode);
        input = input with { DepartureGateway = "SGN", ArrivalGateway = "NRT" };
        var planned = await Data<ManagerReviewView>(await f.M("preliminary-plan", new(accepted.Version, Plan: input)));
        Assert.Equal(120_000_000, planned.Plan!.Suggested); Assert.Equal(7, planned.Plan.MinimumPreparationDays);
        Assert.Equal("EXCLUDED", planned.Plan.Input.GroundLegScope); Assert.NotNull(planned.Plan.Input.PlannedDepartureAt);
        Assert.Null(planned.Plan.RoadDistanceKm);
    }
}
