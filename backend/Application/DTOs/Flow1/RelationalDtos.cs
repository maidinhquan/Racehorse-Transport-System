using System.ComponentModel.DataAnnotations;

namespace Application.DTOs.Flow1;

public sealed record HorseSelection(string HorseId, string Version);
public sealed record FlowRequestInput(EstimateInput Trip, DateTimeOffset DepartureAt, DateTimeOffset DeliveryAt,
    string Purpose, ContactInput PickupContact, ContactInput Receiver, IReadOnlyList<HorseSelection> Horses,
    decimal? DeclaredValueUsd = null);
public sealed record RequestDocumentUpload(string HorseId, UploadedFile File);
public sealed record FlowRequestDocument(string DocumentId, string HorseId, string DocumentType, string Status);
public sealed record FlowAction(string Version, string? Reason = null, decimal? Price = null, int? PreparationDays = null,
    DateTimeOffset? Deadline = null, string? Target = null, string? Otp = null, string? PdfSha256 = null,
    string? CancellationId = null, string? EventId = null, decimal? DepositPercent = null,
    decimal? InsuranceAmount = null, string? Terms = null, IReadOnlyList<string>? Sections = null, string? ChangeId = null,
    decimal? RefundAmount = null, string? RefundReference = null);
public sealed record FlowHorseCard(string HorseId, string Name, string MicrochipIso, string? PassportNo, string Version,
    bool HasDocuments, bool Selectable, string? Breed = null, string? Sex = null, DateTime? Dob = null);
public sealed record FlowPaymentCard(string PaymentId, string Version, decimal Amount, decimal? ReceivedAmount,
    string Status, string? TransactionCode, DateTime? PaidAt, bool ReviewRequired, string? ReviewReason, string? Method = null, string Currency = "VND");
public sealed record FlowTripCard(string TripId, string Version, string Status, string? DeploymentStatus,
    string? EventId, string? Reason, string? RoutingAcknowledgedBy, string? DocumentsAcknowledgedBy);
public sealed record FlowContractCard(string ContractId, string Version, string Status, bool IsCurrent, decimal TotalPrice,
    decimal DepositAmount, DateTime? SignDeadline, DateTime? DepositDeadline, DateTime? SignedAt, string? PdfSha256,
    string? CancellationId, string? CancellationStatus, string? CancellationReason, string? CancellationDecision,
    string? ExtensionTarget, string? ExtensionReason, decimal PaidAmount, string? InvoiceStatus,
    IReadOnlyList<FlowPaymentCard> Payments, FlowTripCard? Trip, DateTime? PreparationCutoff = null, string Currency = "VND", bool RelationalTermsReady = false, bool HasAcceptanceEvidence = false,
    int WorkflowVersion = 0, int ContractVersion = 1, decimal? DepositPercent = null, decimal? InsuranceAmount = null,
    string? Terms = null, DateTime? TermsAcceptedAtUtc = null, string? RefundStatus = null, decimal? RefundAmount = null,
    string? RefundReference = null, IReadOnlyList<FlowChangeCard>? Changes = null, IReadOnlyList<FlowEventCard>? History = null,
    IReadOnlyList<string>? AllowedActions = null);
public sealed record FlowChangeCard(string ChangeId, string Status, string Reason, string? Decision, DateTime RequestedAtUtc,
    DateTime? DecidedAtUtc, IReadOnlyList<string> Sections);
public sealed record FlowEventCard(string Action, string Reason, string ActorId, DateTime AtUtc, DateTime? PreviousDeadline, DateTime? NewDeadline);
public sealed record FlowRequestCard(string RequestId, string Version, string Status, string Departure, string Destination,
    DateTime? DepartureAt, DateTime? DeliveryAt, string? ManagerNotes, decimal? DistanceKm, int? PreparationDays,
    string? PickupContactName, string? PickupContactPhone, string? ReceiverName, string? ReceiverPhone,
    IReadOnlyList<FlowHorseCard> Horses, IReadOnlyList<FlowContractCard> Contracts, FlowRequestInput? Input = null, string? MapAttribution = null,
    string? CustomerName = null, string? CustomerEmail = null, decimal? DeclaredValueUsd = null,
    IReadOnlyList<FlowRequestDocument>? Documents = null);
public sealed record FlowHandoff(FlowTripCard Trip, string RequestId, string Departure, string Destination,
    DateTime? DepartureAt, DateTime? DeliveryAt, string ContractId, string PdfSha256, IReadOnlyList<FlowHorseCard> Horses,
    decimal? DeclaredValueUsd = null, IReadOnlyList<FlowRequestDocument>? Documents = null);
