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
        public string ProviderName { get; set; } = string.Empty;
        public string Airline { get; set; } = string.Empty;
        public string FlightNumber { get; set; } = string.Empty;
        public int? DepartureAirportCheckpointId { get; set; }
        public int? ArrivalAirportCheckpointId { get; set; }
        public DateTime DepartureAt { get; set; }
        public DateTime ArrivalAt { get; set; }
        public string BookingReference { get; set; } = string.Empty;
        public List<string> HorseIds { get; set; } = new();
        public string? Note { get; set; }
    }
}

