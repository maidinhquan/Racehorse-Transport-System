using Domain.Entities;
using Infrastructure.Services;
using Xunit;

namespace Flow1.Tests;

public sealed class CoordinatorPlanModeTests
{
    [Fact]
    public void Contract_transport_mode_takes_precedence_over_planning_draft()
    {
        var trip = new TripPlan { Request = new TransportRequest { TransportType = "ROAD", Destination = "Tokyo, Japan" },
            DraftPlanJson = "{\"mode\":\"AIR\"}" };
        Assert.Equal("ROAD", CoordinatorPlanMode.Selected(trip));
    }
    [Theory]
    [InlineData("{\"mode\":\"ROAD\"}", "ROAD")]
    [InlineData("{\"Mode\":\"AIR\"}", "AIR")]
    [InlineData("{}", null)]
    [InlineData("invalid", null)]
    public void Only_an_explicit_mode_in_a_saved_plan_is_used(string json, string? expected)
    {
        Assert.Equal(expected, CoordinatorPlanMode.Selected(new TripPlan { DraftPlanJson = json }));
    }
    [Fact]
    public void Approved_plan_takes_precedence_over_a_draft()
    {
        Assert.Equal("AIR", CoordinatorPlanMode.Selected(new TripPlan
        { ApprovedPlanJson = "{\"mode\":\"AIR\"}", DraftPlanJson = "{\"mode\":\"ROAD\"}" }));
    }
}
