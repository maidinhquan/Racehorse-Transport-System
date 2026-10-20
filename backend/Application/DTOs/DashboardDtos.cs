namespace Application.DTOs
{
    public class CoordinatorDashboardDto
    {
        public int NeedRoute { get; set; }
        public int NeedAssignment { get; set; }
        public int AvailableVehicles { get; set; }
        public int TotalVehicles { get; set; }
        public int ActiveTrips { get; set; }
        public int IncidentsCount { get; set; }
        public FleetSummaryDto Fleet { get; set; } = new();
        public List<PlanningTripSummaryDto> RecentTrips { get; set; } = new();
    }

    public class FleetSummaryDto
    {
        public int Ready { get; set; }
        public int Maintenance { get; set; }
        public int Inactive { get; set; }
        public int Total { get; set; }
    }

    public class PlanningTripSummaryDto
    {
        public string TripId { get; set; } = string.Empty;
        public string TripCode { get; set; } = string.Empty;
        public string RouteName { get; set; } = string.Empty;
        public int HorseCount { get; set; }
        public string PlannedDeparture { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }
}

