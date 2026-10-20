namespace Application.DTOs
{
    public class TripMonitoringDto
    {
        public string TripId { get; set; } = string.Empty;
        public string TripCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public VehiclePositionDto VehiclePosition { get; set; } = new();
        public List<FixedMarkerDto> FixedMarkers { get; set; } = new();
        public List<double[]> RoutePolyline { get; set; } = new();
        public string CurrentLocationName { get; set; } = string.Empty;
        public DateTime? EtaDestination { get; set; }
    }

    public class VehiclePositionDto
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string LastUpdated { get; set; } = string.Empty;
        public string CurrentStatus { get; set; } = "Moving";
    }

    public class FixedMarkerDto
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // ORIGIN, REST_STOP, CUSTOMS, DESTINATION
        public double Lat { get; set; }
        public double Lng { get; set; }
        public string Color { get; set; } = "#3B82F6";
        public string Icon { get; set; } = "📍";
        public string Status { get; set; } = "PLANNED"; // PLANNED, PASSED, CURRENT
    }
}

