using System.Net;
using System.Text.Json;
using Xunit;

namespace Flow1.Tests;

public sealed class RelationalNotificationTests
{
    [LocalSqlFact]
    public async Task Activation_notice_is_transactional_deduplicated_and_owned_without_exposing_otp_reservations()
    {
        await using var f = await RelationalFlow1Tests.Fixture.Create();
        var (_,c) = await f.Published(); var pid = await f.Session(c);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='FLOW1_ACTIVATED';"));
        await f.Service.IpnAsync(f.Callback(pid), default);
        await f.NewService().IpnAsync(f.Callback(pid), default);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='FLOW1_ACTIVATED';"));
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        await f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code,PdfSha256:c.PdfSha256),default);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='FLOW1_ACTIVATED' AND UserID='owner' AND Channel='IN_APP';"));
        using var app = new RelationalHttpFactory(f); using var owner = app.Client(); using var other = app.Client("other"); using var anonymous = app.Client(null);
        var response = await owner.GetAsync("/api/flow1/notifications"); response.EnsureSuccessStatusCode();
        var notices = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("data");
        Assert.Equal(4, notices.GetArrayLength());
        Assert.DoesNotContain(notices.EnumerateArray(), n => n.GetProperty("type").GetString() == "CONTRACT_OTP");
        var id = notices.EnumerateArray().Single(n => n.GetProperty("type").GetString() == "FLOW1_ACTIVATED").GetProperty("id").GetString();
        Assert.Equal(HttpStatusCode.NotFound, (await other.PostAsync($"/api/flow1/notifications/{id}/read", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/flow1/notifications")).StatusCode);
        (await owner.PostAsync($"/api/flow1/notifications/{id}/read", null)).EnsureSuccessStatusCode();
        (await owner.PostAsync($"/api/flow1/notifications/{id}/read", null)).EnsureSuccessStatusCode();
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='FLOW1_ACTIVATED' AND IsRead=1;"));
        var otherResponse = JsonDocument.Parse(await (await other.GetAsync("/api/flow1/notifications")).Content.ReadAsStringAsync());
        Assert.Equal(0, otherResponse.RootElement.GetProperty("data").GetArrayLength());
    }

    [LocalSqlFact]
    public async Task Operational_notifications_follow_explicit_confirm_and_do_not_release_held_handoffs()
    {
        await using var f = await RelationalFlow1Tests.Fixture.Create(); var c = await f.Signed();
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='FLOW1_HANDOFF';"));
        c = await f.Service.ContractAsync(c.ContractId, "manager", true, default);
        c = await f.Service.DeploymentAsync(c.ContractId, "manager", "confirm", new(c.Trip!.Version, "Ready",AssignedSpecialistId:"docs",AssignedCoordinatorId:"route"), default);
        Assert.Equal(2, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='FLOW1_HANDOFF';"));
        c = await f.Service.DeploymentAsync(c.ContractId, "manager", "hold", new(c.Trip!.Version, "Weather"), default);
        Assert.Empty(await f.Service.OperationsAsync("route", default));
        c = await f.Service.DeploymentAsync(c.ContractId, "manager", "resume", new(c.Trip!.Version, "Recheck"), default);
        Assert.Empty(await f.Service.OperationsAsync("docs", default));
        await f.Service.DeploymentAsync(c.ContractId, "manager", "confirm", new(c.Trip!.Version, "Ready again",AssignedSpecialistId:"docs",AssignedCoordinatorId:"route"), default);
        Assert.Equal(4, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='FLOW1_HANDOFF';"));
    }
}
