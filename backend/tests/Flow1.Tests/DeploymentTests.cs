using System.Net;
using System.Text.Json;
using Application.DTOs.Flow1;
using Xunit;
using static Flow1.Tests.ContractPublicationTests;

namespace Flow1.Tests;

public sealed class DeploymentTests
{
    private static async Task<Fixture> Setup(decimal amount = 46_000_000)
    {
        var f = await DepositPaymentTests.Setup();
        try { var p = (await Data<DepositPaymentsView>(await DepositPaymentTests.Proof(f, amount))).Payments[0]; await Data<DepositPaymentsView>(await DepositPaymentTests.Confirm(f, p.PaymentId, amount)); return f; }
        catch { await f.DisposeAsync(); throw; }
    }
    private static string Url(Fixture f, bool manager = true) => $"/api/{(manager ? "manager" : "customer")}/contracts/{f.ContractId}/deployment";
    private static async Task<DeploymentView> View(Fixture f) => await Data<DeploymentView>(await f.Manager.GetAsync(Url(f)));
    private static Task<HttpResponseMessage> Act(Fixture f, string action, int version, string key = "deploy-action-001") => Send(f.Manager, Url(f) + "/" + action, new DeploymentInput(version, "OPERATOR INTERNAL REASON"), key);
    [LocalSqlFact]
    public async Task Deployment_is_separate_from_activation_and_confirm_is_guarded_idempotent_and_owner_scoped()
    {
        await using var f = await Setup(); var v = await View(f); Assert.Equal("PENDING", v.Status); Assert.True(v.CanConfirm); Assert.Equal(1, v.Version);
        using var other = f.Factory.Client("other"); Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync(Url(f, false))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(f.Customer, Url(f) + "/confirm", new DeploymentInput(1, "Forbidden"))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Act(f, "confirm", 0)).StatusCode);
        var replies = await Task.WhenAll(Act(f, "confirm", 1), Act(f, "confirm", 1));
        foreach (var reply in replies) Assert.Equal("CONFIRMED", (await Data<DeploymentView>(reply)).Status);
        var customer = await (await f.Customer.GetAsync(Url(f, false))).Content.ReadAsStringAsync(); Assert.DoesNotContain("OPERATOR INTERNAL REASON", customer);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN WHERE Status='PLANNING';"));
    }
    [LocalSqlFact]
    public async Task Real_operational_consumers_receive_frozen_package_and_acknowledge_only_their_stream_after_release()
    {
        await using var f = await Setup(); var v = await View(f);
        using var route = f.Factory.Client("route-fixture", "FLEET_ROUTE_COORDINATOR"); using var specialist = f.Factory.Client("docs-fixture", "TRANSPORT_SPECIALIST");
        var url = $"/api/operations/trips/{v.TripId}/flow1-handoff";
        Assert.Equal(HttpStatusCode.Conflict, (await route.GetAsync(url)).StatusCode);
        await Data<DeploymentView>(await Act(f, "confirm", v.Version));
        var package = await Data<Flow1Handoff>(await route.GetAsync(url)); Assert.Equal(1, package.SchemaVersion); Assert.Equal("PENDING_SPECIALIST_REVIEW", package.DocumentReviewStatus);
        Assert.Equal(f.RequestId, package.RequestId); Assert.Equal(1, package.PlanVersion); Assert.Single(package.Request.Horses);
        var json = await (await specialist.GetAsync(url)).Content.ReadAsStringAsync(); Assert.DoesNotContain("estimatedCost", json); Assert.DoesNotContain("floor", json); Assert.DoesNotContain("suggested", json);
        v = await View(f); var ack = new HandoffAckInput(v.Version, package.EventId, "ROUTING");
        Assert.Equal(HttpStatusCode.Conflict, (await Send(specialist, url + "/acknowledgements", ack)).StatusCode);
        var response = await Data<Flow1Handoff>(await Send(route, url + "/acknowledgements", ack, "route-ack-001")); Assert.Single(response.Acknowledgements);
        await Data<Flow1Handoff>(await Send(route, url + "/acknowledgements", ack, "route-ack-001"));
        v = await View(f); var docsAck = ack with { ExpectedVersion = v.Version, Stream = "DOCUMENTS" };
        var documents = await Data<Flow1Handoff>(await Send(specialist, url + "/acknowledgements", docsAck, "docs-ack-001")); Assert.Equal(2, documents.Acknowledgements.Length);
        var horse = package.Request.Horses[0]; var download = await specialist.GetAsync($"/api/operations/trips/{v.TripId}/horses/{horse.HorseId}/documents/{horse.DocumentVersion}/passport");
        Assert.Equal(HttpStatusCode.OK, download.StatusCode); Assert.Contains("Demo passport", await download.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.Forbidden, (await f.Customer.GetAsync(url)).StatusCode);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Hold_revokes_handoff_and_resets_ready_while_resume_requires_new_confirmation_and_new_event()
    {
        await using var f = await Setup(); var v = await View(f); v = await Data<DeploymentView>(await Act(f, "confirm", v.Version));
        using var route = f.Factory.Client("route-fixture", "FLEET_ROUTE_COORDINATOR"); var url = $"/api/operations/trips/{v.TripId}/flow1-handoff";
        var old = await Data<Flow1Handoff>(await route.GetAsync(url));
        await f.Db.ExecuteAsync("UPDATE TRIP_PLAN SET Status='READY_TO_DEPART';");
        v = await Data<DeploymentView>(await Act(f, "hold", v.Version, "hold-001")); Assert.Equal("ON_HOLD", v.Status); Assert.Equal("PLANNING", v.TripStatus);
        Assert.Equal(HttpStatusCode.Conflict, (await route.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Send(route, url + "/acknowledgements", new HandoffAckInput(v.Version, old.EventId, "ROUTING"))).StatusCode);
        v = await Data<DeploymentView>(await Act(f, "resume", v.Version, "resume-001")); Assert.Equal("PENDING", v.Status); Assert.Equal("PLANNING", v.TripStatus);
        Assert.Equal(HttpStatusCode.Conflict, (await route.GetAsync(url)).StatusCode);
        v = await Data<DeploymentView>(await Act(f, "confirm", v.Version, "confirm-new-001"));
        var next = await Data<Flow1Handoff>(await route.GetAsync(url)); Assert.NotEqual(old.EventId, next.EventId);
        Assert.Equal(HttpStatusCode.Conflict, (await Send(route, url + "/acknowledgements", new HandoffAckInput(v.Version, old.EventId, "ROUTING"))).StatusCode);
        await f.Db.ExecuteAsync("UPDATE TRIP_PLAN SET Status='IN_TRANSIT';");
        Assert.Equal(HttpStatusCode.Conflict, (await Act(f, "hold", v.Version, "hold-departed-001")).StatusCode);
        Assert.Equal("IN_TRANSIT", await f.Db.ScalarAsync<string>("SELECT Status FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Deployment_blocks_unpaid_partial_overpayment_unreviewed_impossible_dates_and_stale_documents()
    {
        await using (var unpaid = await DepositPaymentTests.Setup()) Assert.Equal(HttpStatusCode.Conflict, (await unpaid.Manager.GetAsync(Url(unpaid))).StatusCode);
        await using var f = await Setup(47_000_000); var v = await View(f); Assert.False(v.CanConfirm);
        Assert.Contains("FINANCIAL_REVIEW_REQUIRED", await (await Act(f, "confirm", v.Version)).Content.ReadAsStringAsync());
        var financial = await DepositPaymentTests.View(f);
        financial = await Data<DepositPaymentsView>(await Send(f.Manager, DepositPaymentTests.Path(f, true) + "/financial-review",
            new AcknowledgeFinancialReviewInput(financial.LedgerVersion, financial.DeadlineVersion, "Đã đối soát phần dư, xử lý riêng theo nghiệp vụ", true), "review-money-001"));
        Assert.False(financial.FinancialReviewRequired); Assert.Equal(47_000_000, financial.VerifiedAmount); Assert.Equal(1_000_000, financial.ExcessAmount);
        var horse = (await Data<ManagerReviewView>(await f.Manager.GetAsync($"/api/manager/requests/{f.RequestId}"))).Request.Snapshot!.Input.Horses[0];
        var upload = CustomerTransportTests.HorseBody(); upload.Add(new StringContent("1"), "expectedVersion");
        await Data<JsonElement>(await Send(f.Customer, $"/api/customer/horses/{horse.HorseId}/documents", upload));
        Assert.Contains("STALE_VERSION", await (await Act(f, "confirm", v.Version)).Content.ReadAsStringAsync());
        f.Clock.Now = new(2026, 11, 20, 0, 0, 0, TimeSpan.Zero);
        Assert.Contains("DEPARTURE_SCHEDULE_NOT_FEASIBLE", await (await Act(f, "confirm", v.Version)).Content.ReadAsStringAsync());
    }
    [LocalSqlFact]
    public async Task Hold_racing_operational_ack_leaves_no_active_receipt_and_no_work_after_hold()
    {
        await using var f = await Setup(); var v = await View(f); v = await Data<DeploymentView>(await Act(f, "confirm", v.Version));
        using var route = f.Factory.Client("route-fixture", "FLEET_ROUTE_COORDINATOR"); var url = $"/api/operations/trips/{v.TripId}/flow1-handoff";
        var package = await Data<Flow1Handoff>(await route.GetAsync(url));
        var held = Act(f, "hold", v.Version, "race-hold-001"); var acked = Send(route, url + "/acknowledgements", new HandoffAckInput(v.Version, package.EventId, "ROUTING"), "race-ack-001");
        await Task.WhenAll(held, acked);
        // If acknowledgement won, the optimistic hold must reload before mutating the new version.
        if (held.Result.StatusCode == HttpStatusCode.Conflict) { var latest = await View(f); await Data<DeploymentView>(await Act(f, "hold", latest.Version, "race-hold-retry-001")); }
        else await Data<DeploymentView>(held.Result);
        var current = await View(f); Assert.Equal("ON_HOLD", current.Status); Assert.Empty(current.Acknowledgements);
        Assert.Equal(HttpStatusCode.Conflict, (await route.GetAsync(url)).StatusCode);
        Assert.Contains(acked.Result.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict });
    }
    [LocalSqlFact]
    public async Task Failure_after_deployment_state_rolls_back_hold_and_ready_status_and_same_key_retries()
    {
        await using var f = await Setup(); var v = await View(f); v = await Data<DeploymentView>(await Act(f, "confirm", v.Version));
        await f.Db.ExecuteAsync("UPDATE TRIP_PLAN SET Status='READY_TO_DEPART';");
        f.Fault.Mode = "deployment-after-state"; Assert.Equal(HttpStatusCode.InternalServerError, (await Act(f, "hold", v.Version, "hold-fault-001")).StatusCode);
        var current = await View(f); Assert.Equal(v.Version, current.Version); Assert.Equal("CONFIRMED", current.Status); Assert.Equal("READY_TO_DEPART", current.TripStatus);
        var retry = await Data<DeploymentView>(await Act(f, "hold", v.Version, "hold-fault-001")); Assert.Equal("ON_HOLD", retry.Status); Assert.Equal("PLANNING", retry.TripStatus);
    }
}
