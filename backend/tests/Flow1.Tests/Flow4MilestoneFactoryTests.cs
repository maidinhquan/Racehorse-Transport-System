using Domain.Entities;
using Infrastructure.Services.Flow4;
using Xunit;

namespace Flow1.Tests;

public class Flow4MilestoneFactoryTests
{
    private const string RoadPlan = """
        {"planVersion":2,"status":"APPROVED","mode":"ROAD","stops":[
          {"stopId":"STOP_001","type":"ORIGIN","name":"Trang trại","arriveAt":"2026-11-19 06:00","geo":{"lat":10.855,"lng":106.6565}},
          {"stopId":"STOP_002","type":"REST_STOP","name":"Phan Thiet rest area","arriveAt":"2026-11-19 08:31","geo":{"lat":10.9289,"lng":108.1021}},
          {"stopId":"STOP_003","type":"CHECKPOINT","name":"Trạm kiểm dịch","arriveAt":"2026-11-19 12:00","geo":{"lat":12.2388,"lng":109.1967}},
          {"stopId":"STOP_004","type":"DESTINATION","name":"Điểm giao","arriveAt":"2026-11-20 02:32","geo":{"lat":16.070091,"lng":108.208119}}]}
        """;

    [Fact]
    public void Road_plan_becomes_ordered_milestones_with_coordinates()
    {
        var trip = new TripPlan { TripId = "TRIP_004", ApprovedPlanJson = RoadPlan };

        var milestones = Flow4MilestoneFactory.FromApprovedPlan(trip, 16);

        Assert.Equal(new[] { "DEPARTED", "STOP_ARRIVED", "CHECKPOINT_ARRIVED", "FINAL_ARRIVED" }, milestones.Select(m => m.MilestoneKind));
        Assert.Equal(new[] { "MILESTONE_017", "MILESTONE_018", "MILESTONE_019", "MILESTONE_020" }, milestones.Select(m => m.MilestoneId));
        Assert.Equal(new[] { 1, 2, 3, 4 }, milestones.Select(m => m.SequenceOrder));
        Assert.All(milestones, m => { Assert.Equal("TRIP_004", m.TripId); Assert.Equal("PENDING", m.Status); Assert.NotNull(m.Latitude); Assert.NotNull(m.Longitude); });
        Assert.Equal(10.9289m, milestones[1].Latitude);
        Assert.Equal(new DateTime(2026, 11, 19, 8, 31, 0), milestones[1].PlannedTime);
        Assert.True(milestones[1].RequiresHealthCheck);
        Assert.False(milestones[3].RequiresHealthCheck);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("""{"mode":"AIR","stops":[{"type":"ORIGIN"},{"type":"DESTINATION"}]}""")]
    [InlineData("""{"mode":"ROAD","stops":[{"type":"ORIGIN"}]}""")]
    public void Unusable_or_non_road_plans_create_no_milestones(string? plan)
    {
        Assert.Empty(Flow4MilestoneFactory.FromApprovedPlan(new TripPlan { TripId = "TRIP_X", ApprovedPlanJson = plan }, 0));
    }

    [Fact]
    public void Next_number_continues_after_the_highest_existing_id()
    {
        Assert.Equal(16, Flow4MilestoneFactory.MaxMilestoneNumber(new[] { "MILESTONE_003", "MILESTONE_016", "OTHER_099" }));
        Assert.Equal(0, Flow4MilestoneFactory.MaxMilestoneNumber(Array.Empty<string>()));
    }
}
