namespace Domain.Flow1.Entities;

public sealed class TransportRequest
{
    public string? PickupCityId { get; set; }
    public string? PickupCityName { get; set; }
    public string? DeliveryCityId { get; set; }
    public string? DeliveryCityName { get; set; }
    public string? PickupStableName { get; set; }
    public string? PickupPostalCode { get; set; }
    public string? PickupInstructions { get; set; }
    public string? DeliveryStableName { get; set; }
    public string? DeliveryPostalCode { get; set; }
    public string? DeliveryInstructions { get; set; }
    public string? CareInstructions { get; set; }
    public decimal? DeclaredValueVnd { get; set; }
    public string RequestID { get; set; } = null!;
    public string CustomerID { get; set; } = null!;
    public string Departure { get; set; } = null!;
    public string Destination { get; set; } = null!;
    public string? Purpose { get; set; }
    public string? TransportType { get; set; }
    public DateTime? CreatedAtUtc { get; set; }
    public DateTime? ExpectedDate { get; set; }
    public DateTime? CommittedDeadline { get; set; }
    public string? DesignatedReceiverName { get; set; }
    public string? DesignatedReceiverPhone { get; set; }
    public decimal? BaseCost { get; set; }
    public string Status { get; set; } = null!;
    public decimal? PickupLatitude { get; set; }
    public decimal? PickupLongitude { get; set; }
    public decimal? DeliveryLatitude { get; set; }
    public decimal? DeliveryLongitude { get; set; }
    public decimal? DistanceKm { get; set; }
    public string? PickupContactName { get; set; }
    public string? PickupContactPhone { get; set; }
    public string? ManagerNotes { get; set; }
    public string? OriginCountry { get; set; }
    public string? DestinationCountry { get; set; }
    public int? PreparationDays { get; set; }
    public string? SubmissionKeyHash { get; set; }
    public string? SubmissionContentHash { get; set; }
    public string? RevisionFeedback { get; set; }
    public string? CancellationPreviousStatus { get; set; }
    public string? CancellationReason { get; set; }
    public string? CancellationRequestedBy { get; set; }
    public DateTime? CancellationRequestedAtUtc { get; set; }
}
