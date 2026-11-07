using System.ComponentModel.DataAnnotations;

namespace Application.DTOs.Flow1;

public sealed record HorseSelection(
    string HorseId,
    string Version,
    string? CareInstructions = null
);

public sealed record FlowRequestInput(
    EstimateInput Trip,
    DateTimeOffset DepartureAt,
    DateTimeOffset DeliveryAt,
    string Purpose,
    ContactInput PickupContact,
    ContactInput Receiver,
    IReadOnlyList<HorseSelection> Horses,
    decimal? DeclaredValueUsd = null,
    string? CareInstructions = null
);

public sealed record RequestDocumentUpload(string HorseId, UploadedFile File);

public sealed record FlowRequestDocument(
    string DocumentId,
    string? HorseId,
    string DocumentType,
    string Status
);

public sealed record HorseDocumentState(string DocumentType, string Status, string? FileKind);

public sealed record FlowAction(
    string Version,
    string? Reason = null,
    decimal? Price = null,
    int? PreparationDays = null,
    DateTimeOffset? Deadline = null,
    string? Target = null,
    string? Otp = null,
    string? PdfSha256 = null,
    string? CancellationId = null,
    string? EventId = null,
    string? AssignedSpecialistId = null,
    string? AssignedCoordinatorId = null,
    IReadOnlyList<string>? ClauseIds = null,
    IReadOnlyList<string>? AdditionalClauses = null,
    CostAmounts? Costs = null,
    decimal? DepositRate = null,
    string? TransportMode = null,
    DateTimeOffset? DepartureAt = null,
    DateTimeOffset? DeliveryAt = null,
    string? CommercialNotes = null
);

public sealed record ContractFeedbackInput(
    string Version,
    string FeedbackMessage,
    IReadOnlyList<string> Fields
);

public sealed record ContractReissueInput(
    string Version,
    decimal Price,
    int PreparationDays,
    DateTimeOffset DepartureAt,
    DateTimeOffset DeliveryAt,
    IReadOnlyList<string>? ClauseIds,
    string Reason,
    IReadOnlyList<string>? AdditionalClauses = null,
    CostAmounts? Costs = null,
    decimal? DepositRate = null,
    string? TransportMode = null,
    string? CommercialNotes = null
);

public sealed record ClauseInput(
    string Title,
    string Content,
    string LanguageCode = "VI",
    bool IsActive = true
);

public sealed record ClauseCard(
    string ClauseId,
    string Title,
    string Content,
    string LanguageCode,
    bool IsActive,
    bool IsRequired = false,
    int? DisplayOrder = null
);

public sealed record FlowContractTerms(
    IReadOnlyList<ClauseCard> Clauses,
    IReadOnlyList<string> AdditionalClauses
);

public sealed record FlowHorseCard(
    string HorseId,
    string Name,
    string MicrochipIso,
    string? PassportNo,
    string Version,
    bool HasDocuments,
    bool Selectable,
    string? Breed = null,
    string? Sex = null,
    DateTime? Dob = null,
    decimal? Weight = null,
    string? PassportIssuedBy = null,
    DateTime? PassportIssuedDate = null,
    DateTime? PassportExpiryDate = null,
    decimal? DeclaredValueVnd = null,
    string? SpecialHealthNotes = null,
    IReadOnlyList<HorseDocumentState>? Documents = null,
    string? CareInstructions = null
);

public sealed record FlowPaymentCard(
    string PaymentId,
    string Version,
    decimal Amount,
    decimal? ReceivedAmount,
    string Status,
    string? TransactionCode,
    DateTime? PaidAt,
    bool ReviewRequired,
    string? ReviewReason,
    string? Method = null,
    string Currency = "VND"
);

public sealed record FlowTripCard(
    string TripId,
    string Version,
    string Status,
    string? DeploymentStatus,
    string? EventId,
    string? Reason,
    string? AssignedSpecialistId = null,
    string? AssignedCoordinatorId = null
);

public sealed record FlowContractCard(
    string ContractId,
    string Version,
    string Status,
    decimal TotalPrice,
    decimal DepositAmount,
    DateTime? SignDeadline,
    DateTime? DepositDeadline,
    DateTime? SignedAt,
    string? PdfSha256,
    string? CancellationId,
    string? CancellationStatus,
    string? CancellationReason,
    string? CancellationDecision,
    string? ExtensionReason,
    decimal PaidAmount,
    string? InvoiceStatus,
    IReadOnlyList<FlowPaymentCard> Payments,
    FlowTripCard? Trip,
    DateTime? PreparationCutoff = null,
    string Currency = "VND",
    bool RelationalTermsReady = false,
    bool HasAcceptanceEvidence = false,
    string? CustomerFeedback = null,
    string? FeedbackFields = null,
    string? FeedbackStatus = null,
    string? ManagerFeedback = null,
    DateTime? FeedbackAtUtc = null,
    DateTime? FeedbackHandledAtUtc = null,
    string? RefundStatus = null,
    decimal? RefundAmount = null,
    decimal? DepositRate = null,
    string? ContractCode = null,
    DateTime? PublishedAtUtc = null,
    string? CommercialNotes = null,
    CostAmounts? Costs = null,
    string? TransportMode = null,
    DateTime? DepartureAt = null,
    DateTime? DeliveryAt = null,
    int? PreparationDays = null
);

public sealed record FlowRequestCard(
    string RequestId,
    string Version,
    string Status,
    string Departure,
    string Destination,
    DateTime? DepartureAt,
    DateTime? DeliveryAt,
    string? ManagerNotes,
    decimal? DistanceKm,
    int? PreparationDays,
    string? PickupContactName,
    string? PickupContactPhone,
    string? ReceiverName,
    string? ReceiverPhone,
    IReadOnlyList<FlowHorseCard> Horses,
    IReadOnlyList<FlowContractCard> Contracts,
    FlowRequestInput? Input = null,
    string? MapAttribution = null,
    string? CustomerName = null,
    string? CustomerEmail = null,
    decimal? DeclaredValueUsd = null,
    IReadOnlyList<FlowRequestDocument>? Documents = null,
    decimal? EstimatedTransportCost = null,
    decimal? DeclaredValueVnd = null
);

public sealed record FlowHandoff(
    FlowTripCard Trip,
    string RequestId,
    string Departure,
    string Destination,
    DateTime? DepartureAt,
    DateTime? DeliveryAt,
    string ContractId,
    string PdfSha256,
    IReadOnlyList<FlowHorseCard> Horses,
    decimal? DeclaredValueUsd = null,
    IReadOnlyList<FlowRequestDocument>? Documents = null,
    decimal? DeclaredValueVnd = null
);

public sealed record ContractPdfModel(
    Dictionary<string, string> Values,
    Dictionary<string, string>[] Horses,
    IReadOnlyList<ClauseCard>? Clauses = null,
    IReadOnlyList<string>? AdditionalClauses = null,
    CostAmounts? Costs = null
);
