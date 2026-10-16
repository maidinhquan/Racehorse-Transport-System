using System.ComponentModel.DataAnnotations;

namespace Application.DTOs.Flow1;

public sealed record ReviewCommand([Range(0, int.MaxValue)] int ExpectedVersion,
    [StringLength(2000)] string? Reason = null, string[]? Fields = null,
    SubmitRequestInput? Request = null, string? QuestionId = null,
    PlanInput? Plan = null, SellingLine[]? Lines = null);
public sealed record PlanInput(DateOnly DepartureDate, DateOnly DeliveryDate, int PreparationDays,
    int VehicleCount, int StallsRequired, [Required, StringLength(100)] string Resources,
    [StringLength(3)] string? DepartureGateway = null, [StringLength(3)] string? ArrivalGateway = null,
    string GroundLegScope = "EXCLUDED", BudgetLine[]? AdditionalCosts = null, DateTimeOffset? PlannedDepartureAt = null);
public sealed record BudgetLine(string Category, string Description, decimal Quantity, decimal UnitCost);
public sealed record SellingLine(string Category, string Description, decimal Quantity, decimal UnitPrice);
public sealed record ReviewQuestion(string Id, string Question, string AskedBy, DateTime AskedAtUtc,
    string? Answer = null, DateTime? AnsweredAtUtc = null, int RequestVersion = 1);
public sealed record ReviewChange(string Id, string Reason, SubmitRequestInput Proposal, string Status,
    int BaseRequestVersion, string? DecisionReason = null);
public sealed record ReviewNotice(string Id, string Message, DateTime CreatedAtUtc);
public sealed record PreliminaryPlan(PlanInput Input, int RequestVersion, string PricingPolicyVersion,
    decimal EstimatedCost, decimal Floor, decimal Suggested, decimal? RoadDistanceKm, int MinimumPreparationDays,
    string? Attribution, DateTime CalculatedAtUtc);
public sealed record DraftSnapshot(int RequestVersion, int PlanVersion, SellingLine[] Lines,
    decimal Total, decimal Deposit, string? BelowFloorReason, PreliminaryPlan Plan);
public sealed record ContractSummary(string ContractId, string Status, int Version, string Currency,
    decimal Total, decimal Deposit, SellingLine[] Lines);
public sealed record ReviewReceipt(string Key, string Hash, string Actor, string Action, string Outcome, string? Reason = null);
// Every revision describes committed SQL state, including its operation receipt.
public sealed record ReviewState(int RequestVersion, string? Feedback, string[] RevisionFields,
    ReviewQuestion[] Questions, ReviewChange[] Changes, ReviewNotice[] Notices, int PlanVersion = 0,
    string? CurrentContractId = null, ReviewReceipt? LastOperation = null);
public sealed record RequestProjection(string Status, string Departure, string Destination, string? Purpose,
    string? TransportType, DateTime? ExpectedDate, DateTime? CommittedDeadline, string? ReceiverName,
    string? ReceiverPhone, string[] HorseIds);
public sealed record ContractProjection(string Id, bool Exists, string? Status, decimal? Total);
public sealed record ManagerReviewView(RequestView Request, int Version, ReviewState Review,
    PreliminaryPlan? Plan, ContractSummary? Contract, string[] AllowedActions, string? BelowFloorReason = null);
// Never serialize ReviewState/PreliminaryPlan to Customer: they contain cost/floor/override notes.
public sealed record CustomerReviewView(int Version, int RequestVersion, string? Feedback,
    string[] RevisionFields, ReviewQuestion[] Questions, ReviewChange[] Changes, ReviewNotice[] Notices,
    ContractSummary? Contract, bool RecoveryRequired, string[] AllowedActions);
