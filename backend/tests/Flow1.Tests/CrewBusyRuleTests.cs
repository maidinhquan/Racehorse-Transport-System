using Xunit;

namespace Flow1.Tests;

/// <summary>Quy tắc: mỗi nhân sự tổ xe chỉ được giao cho một chuyến chưa bàn giao xong.</summary>
public class CrewBusyRuleTests
{
    private static string Source(string relative)
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "backend", "Infrastructure", "Services", "Coordinator", "CoordinatorService.StaffWorkload.cs"))) dir = dir.Parent;
        Assert.NotNull(dir);
        return File.ReadAllText(Path.Combine(dir!.FullName, relative));
    }

    [Fact]
    public void Only_trips_that_are_not_handed_over_hold_their_crew()
    {
        var source = Source("backend/Infrastructure/Services/Coordinator/CoordinatorService.StaffWorkload.cs");
        Assert.Contains("\"PLANNING\", \"READY_TO_DEPART\", \"IN_TRANSIT\"", source);
        Assert.DoesNotContain("\"COMPLETED\"", source[source.IndexOf("CrewHoldingTripStatuses", StringComparison.Ordinal)..source.IndexOf("};", StringComparison.Ordinal)]);
    }

    [Fact]
    public void Every_assignment_path_checks_the_rule()
    {
        var assignments = Source("backend/Infrastructure/Services/Coordinator/CoordinatorService.Assignments.cs");
        Assert.Equal(2, assignments.Split("CrewBusyOnOtherTripsAsync(tripId)").Length - 1);
        Assert.Contains("STAFF_BUSY_ON_ACTIVE_TRIP", assignments);
        Assert.Contains("CrewBusyOnOtherTripsAsync(tripId)", Source("backend/Infrastructure/Services/Coordinator/CoordinatorService.FleetStaff.cs"));
    }
}
