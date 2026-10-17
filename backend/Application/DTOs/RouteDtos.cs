namespace Application.DTOs
{
    public class RouteCalculateRequestDto
    {
        public string? TripId { get; set; }
        public DateTime PlannedDepartureAt { get; set; }
        public List<RoutePointInputDto> Points { get; set; } = new();
        public List<RouteLegInputDto> Legs { get; set; } = new();
        public string? DeadlineJustification { get; set; }
    }

    public class RoutePointInputDto
    {
        public int Sequence { get; set; }
        public string Type { get; set; } = "ORIGIN"; // ORIGIN, REST_STOP, CHECKPOINT, AIRPORT, DESTINATION
        public string Name { get; set; } = string.Empty;
        public int? CheckpointId { get; set; }
        public decimal Lat { get; set; }
        public decimal Lng { get; set; }
        public int PlannedStopMinutes { get; set; }
    }

    public class RouteLegInputDto
    {
        public int FromSequence { get; set; }
        public int ToSequence { get; set; }
        public string Mode { get; set; } = "ROAD"; // ROAD, AIR
        public decimal? ManualDistanceKm { get; set; }
        public int? ManualDurationMinutes { get; set; }
        public FlightInputDto? Flight { get; set; }
    }

    public class FlightInputDto
    {
        public string Airline { get; set; } = string.Empty;
        public string FlightNumber { get; set; } = string.Empty;
        public DateTime DepartureAt { get; set; }
        public DateTime ArrivalAt { get; set; }
    }

    public class RouteCalculateResponseDto
    {
        public decimal TotalDistanceKm { get; set; }
        public decimal TotalElapsedHours { get; set; }
        public DateTime EtaDestination { get; set; }
        public DateTime? DeliveryDeadline { get; set; }
        public bool MeetsEquineWelfare { get; set; } // true if continuous drive <= 6h
        public RouteValidationResultDto Validation { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
        public List<RouteLegResultDto> Legs { get; set; } = new();
        public List<double[]> PolylineCoordinates { get; set; } = new();
    }

    public class RouteValidationResultDto
    {
        public bool CanSubmit { get; set; } = true;
        public List<string> Errors { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    public class RouteLegResultDto
    {
        public int FromSequence { get; set; }
        public int ToSequence { get; set; }
        public string Mode { get; set; } = "ROAD";
        public decimal DistanceKm { get; set; }
        public int DurationMinutes { get; set; }
        public string DistanceSource { get; set; } = "MAP_SERVICE";
        public DateTime DepartureAt { get; set; }
        public DateTime ArrivalAt { get; set; }
        public List<double[]> Path { get; set; } = new();
    }

    public class RouteVersionSummaryDto
    {
        public int RouteVersionId { get; set; }
        public string TripId { get; set; } = string.Empty;
        public int Version { get; set; } = 1;
        public string Status { get; set; } = "DRAFT"; // DRAFT, PENDING_APPROVAL, APPROVED, RETURNED
        public string Source { get; set; } = "PLANNING";
        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? ReturnReason { get; set; }
        public DateTime? EtaDestination { get; set; }
        public List<string> AllowedActions { get; set; } = new();
    }

    public class RouteDraftPayloadDto
    {
        public int? ExpectedVersion { get; set; }
        public DateTime PlannedDepartureAt { get; set; }
        public List<RoutePointInputDto> Points { get; set; } = new();
        public List<RouteLegInputDto> Legs { get; set; } = new();
        public string? DeadlineJustification { get; set; }
    }

    public class SubmitRouteDto
    {
        public int ExpectedVersion { get; set; } = 1;
        public string? DeadlineJustification { get; set; }
    }

    public class SubmitRouteResponseDto
    {
        public int RouteVersionId { get; set; }
        public int Version { get; set; }
        public string Status { get; set; } = "PENDING_APPROVAL";
        public DateTime SubmittedAt { get; set; }
        public bool ManagerNotified { get; set; } = true;
    }

    public class SaveRouteSegmentsDto
    {
        public List<RouteSegmentItemDto> Segments { get; set; } = new();
    }

    public class RouteSegmentItemDto
    {
        public string? SegmentId { get; set; }
        public string LocationName { get; set; } = string.Empty;
        public string SegmentType { get; set; } = "ORIGIN"; // ORIGIN, REST_STOP, CHECKPOINT, DESTINATION
        public string TransportMode { get; set; } = "ROAD";
        public string? FacilityId { get; set; }
        public string? CarrierName { get; set; }
        public string? FlightVoyageNo { get; set; }
        public DateTime? ExpectedEta { get; set; }
        public string? Status { get; set; } = "PLANNED";
        public decimal? Lat { get; set; }
        public decimal? Lng { get; set; }
    }
}

