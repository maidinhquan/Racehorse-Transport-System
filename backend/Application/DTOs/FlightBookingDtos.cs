namespace Application.DTOs
{
    public class FlightBookingDto
    {
        public int FlightBookingId { get; set; }
        public int BookingVersion { get; set; } = 1;
        public string TripId { get; set; } = string.Empty;
        public int? RouteVersionId { get; set; }
        public string ProviderName { get; set; } = string.Empty;
        public string Airline { get; set; } = string.Empty;
        public string FlightNumber { get; set; } = string.Empty;
        public int? DepartureAirportCheckpointId { get; set; }
        public int? ArrivalAirportCheckpointId { get; set; }
        public DateTime DepartureAt { get; set; }
        public DateTime ArrivalAt { get; set; }
        public bool DirectFlight { get; set; } = true;
        public string BookingReference { get; set; } = string.Empty;
        public bool BookingConfirmed { get; set; } = true;
        public List<string> HorseIds { get; set; } = new();
        public string? Note { get; set; }
    }

    public class UpdateFlightBookingDto
    {
        public int? ExpectedBookingVersion { get; set; }
        public int? RouteVersionId { get; set; }
        public string ProviderName { get; set; } = string.Empty;
        public string Airline { get; set; } = string.Empty;
        public string FlightNumber { get; set; } = string.Empty;
        public int? DepartureAirportCheckpointId { get; set; }
        public int? ArrivalAirportCheckpointId { get; set; }
        public DateTime DepartureAt { get; set; }
        public DateTime? DepartureTime { get => DepartureAt; set { if (value.HasValue) DepartureAt = value.Value; } }
        public DateTime ArrivalAt { get; set; }
        public DateTime? ArrivalTime { get => ArrivalAt; set { if (value.HasValue) ArrivalAt = value.Value; } }
        public string BookingReference { get; set; } = string.Empty;
        public string? BookingRef { get => BookingReference; set { if (!string.IsNullOrEmpty(value)) BookingReference = value; } }
        public string? CargoAwb { get; set; }
        public int? AirStallsCount { get; set; }
        public string? Status { get; set; }
        public List<string> HorseIds { get; set; } = new();
        public string? Note { get; set; }
    }
}

