namespace Application.DTOs.Flow5;

// ==========================================
// GROUP 1: CAPABILITIES & IMPACT ASSESSMENT
// ==========================================

public class CapabilitiesDto
{
    public List<string> IncidentCategories { get; set; } = new()
    {
        "VEHICLE_BREAKDOWN",
        "DELAY_AIR",
        "ROAD_CLOSURE",
        "TRAFFIC_ACCIDENT",
        "HORSE_HEALTH",
        "DOCUMENT_CUSTOMS_HOLD",
        "OTHER"
    };

    public List<string> ResolutionTypes { get; set; } = new()
    {
        "RESOLVED_CONTINUE_CURRENT",
        "RESOLVED_REPLACED_VEHICLE",
        "RESOLVED_REROUTED",
        "RESOLVED_CHARTER_FLIGHT",
        "TERMINATED_EARLY"
    };

    public List<string> TaskTypes { get; set; } = new()
    {
        "TECHNICAL_REPAIR",
        "VETERINARY_CHECK",
        "ROUTE_SURVEY",
        "CUSTOMS_LIAISON",
        "CUSTOMER_CARE",
        "CHARTER_BOOKING"
    };

    public List<string> ImpactScopes { get; set; } = new()
    {
        "VEHICLE",
        "SCHEDULE",
        "FLIGHT",
        "PAPERWORK",
        "INSURANCE",
        "HORSE_HEALTH",
        "DEADLINE",
        "EXTRA_COST"
    };
}

public class AssessmentInputDto
{
    public bool AffectedVehicle { get; set; }
    public bool AffectedSchedule { get; set; }
    public bool AffectedFlight { get; set; }
    public bool AffectedPaperwork { get; set; }
    public bool AffectedInsurance { get; set; }
    public bool AffectedHorseHealth { get; set; }
    public bool AffectedDeadlines { get; set; }
    public long EstimatedExtraCost { get; set; }
    public string? Summary { get; set; }
}

public class ImpactAssessmentResultDto
{
    public string IncidentId { get; set; } = null!;
    public bool AffectedVehicle { get; set; }
    public bool AffectedSchedule { get; set; }
    public bool AffectedFlight { get; set; }
    public bool AffectedPaperwork { get; set; }
    public bool AffectedInsurance { get; set; }
    public bool AffectedHorseHealth { get; set; }
    public bool AffectedDeadlines { get; set; }
    public long EstimatedExtraCost { get; set; }
    public string? Summary { get; set; }
    public string AssessedByUserId { get; set; } = null!;
    public DateTime AssessedAt { get; set; }
}

public class UpdateInputDto
{
    public string UpdateType { get; set; } = "FIELD_LOG"; // FIELD_LOG, MEDICAL_TREATMENT, LOGISTICS_PROGRESS, POLICE_REPORT
    public string Notes { get; set; } = null!;
    public string? ImmediateCare { get; set; }
    public string? ImageUrl { get; set; }
    public string? LocationCoordinates { get; set; }
}

public class IncidentUpdateDto
{
    public string UpdateId { get; set; } = null!;
    public string IncidentId { get; set; } = null!;
    public string UpdateType { get; set; } = null!;
    public string Notes { get; set; } = null!;
    public string? ImmediateCare { get; set; }
    public string? ImageUrl { get; set; }
    public string? LocationCoordinates { get; set; }
    public string CreatedByUserId { get; set; } = null!;
    public string CreatedByUserName { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}

// ==========================================
// GROUP 2: TASKS
// ==========================================

public class TaskInputDto
{
    public string Title { get; set; } = null!;
    public string TaskType { get; set; } = "TECHNICAL_REPAIR";
    public string AssignedToUserId { get; set; } = null!;
    public string Priority { get; set; } = "HIGH"; // LOW, MEDIUM, HIGH, URGENT
    public string? Notes { get; set; }
    public DateTime? DueAt { get; set; }
}

public class TaskProgressInputDto
{
    public string Status { get; set; } = "IN_PROGRESS"; // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    public string? Notes { get; set; }
    public string? CompletionProofUrl { get; set; }
}

public class IncidentTaskDto
{
    public string TaskId { get; set; } = null!;
    public string IncidentId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string TaskType { get; set; } = null!;
    public string AssignedToUserId { get; set; } = null!;
    public string? AssignedToUserName { get; set; }
    public string Priority { get; set; } = "HIGH";
    public string Status { get; set; } = "PENDING";
    public string? Notes { get; set; }
    public string? CompletionProofUrl { get; set; }
    public DateTime? DueAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

// ==========================================
// GROUP 3: RECOVERY PLAN LIFECYCLE
// ==========================================

public class RecoveryContextDto
{
    public string IncidentId { get; set; } = null!;
    public string TripId { get; set; } = null!;
    public string CurrentLocation { get; set; } = null!;
    public string DestinationLocation { get; set; } = null!;
    public bool SafetyBlockerActive { get; set; }
    public List<string> ImpactedLegs { get; set; } = new();
    public List<IncidentTaskDto> PendingTasks { get; set; } = new();
    public string? CurrentPlanStatus { get; set; }
}

public class RecoveryInputDto
{
    public string PlanType { get; set; } = "REPLACE_VEHICLE"; // REPLACE_VEHICLE, REROUTE, REBOOK_FLIGHT, EMERGENCY_REST
    public string Summary { get; set; } = null!;
    public string? NewVehicleId { get; set; }
    public string? NewDriverUserId { get; set; }
    public string? NewRouteSummary { get; set; }
    public double EstimatedDelayHours { get; set; }
    public long CostEstimate { get; set; }
}

public class RecoveryValidateResultDto
{
    public bool IsValid { get; set; }
    public List<string> ValidationErrors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public bool ResourceAvailable { get; set; }
    public bool SafetyStandardMet { get; set; }
}

public class RecoveryDecisionInputDto
{
    public string Decision { get; set; } = "APPROVED"; // APPROVED, REJECTED, REVISION_REQUESTED
    public string? Reason { get; set; }
    public string? ManagerNotes { get; set; }
}

public class RecoveryRevisionInputDto
{
    public string RevisionNotes { get; set; } = null!;
}

public class RecoveryPlanDto
{
    public string PlanId { get; set; } = null!;
    public string IncidentId { get; set; } = null!;
    public int Version { get; set; } = 1;
    public string PlanType { get; set; } = null!;
    public string Summary { get; set; } = null!;
    public string? NewVehicleId { get; set; }
    public string? NewDriverUserId { get; set; }
    public string? NewRouteSummary { get; set; }
    public double EstimatedDelayHours { get; set; }
    public long CostEstimate { get; set; }
    public string Status { get; set; } = "DRAFT"; // DRAFT, SUBMITTED, APPROVED, REJECTED, WITHDRAWN, APPLIED
    public string? ManagerDecision { get; set; }
    public string? ManagerNotes { get; set; }
    public string CreatedByUserId { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime? DecidedAt { get; set; }
}

public class IncidentHistoryDto
{
    public string IncidentId { get; set; } = null!;
    public List<HistoryRecordDto> Records { get; set; } = new();
}

public class HistoryRecordDto
{
    public string EventType { get; set; } = null!; // CREATED, IMPACT_ASSESSED, PLAN_SUBMITTED, MANAGER_DECISION, APPLIED, RESOLVED
    public string Description { get; set; } = null!;
    public string PerformedByUserId { get; set; } = null!;
    public DateTime Timestamp { get; set; }
    public string? ReferenceId { get; set; }
}

public class ResourceOptionDto
{
    public List<VehicleOptionDto> Vehicles { get; set; } = new();
    public List<DriverOptionDto> Drivers { get; set; } = new();
}

public class VehicleOptionDto
{
    public string VehicleId { get; set; } = null!;
    public string LicensePlate { get; set; } = null!;
    public string VehicleType { get; set; } = null!;
    public int CapacityStalls { get; set; }
    public string CurrentLocation { get; set; } = null!;
    public bool IsAvailable { get; set; }
    public double DistanceKmFromIncident { get; set; }
}

public class DriverOptionDto
{
    public string UserId { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string PhoneNumber { get; set; } = null!;
    public bool IsAvailable { get; set; }
    public string Status { get; set; } = null!;
}

// ==========================================
// GROUP 4: SPECIALIST & VET REVIEWS
// ==========================================

public class ComplianceInputDto
{
    public string Status { get; set; } = "VALID"; // VALID, PERMIT_REISSUED, REJECTED
    public string Findings { get; set; } = null!;
    public bool RequiresPermitReissue { get; set; }
    public string? Notes { get; set; }
}

public class ComplianceReviewDto
{
    public string ReviewId { get; set; } = null!;
    public string IncidentId { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string Findings { get; set; } = null!;
    public bool RequiresPermitReissue { get; set; }
    public string? Notes { get; set; }
    public string ReviewedByUserId { get; set; } = null!;
    public DateTime ReviewedAt { get; set; }
}

public class VetInputDto
{
    public string FitnessStatus { get; set; } = "FIT"; // FIT, UNFIT, FIT_WITH_REST
    public string AssessmentNotes { get; set; } = null!;
    public double Temperature { get; set; } = 38.0;
    public int HeartRate { get; set; } = 40;
    public string? Recommendation { get; set; }
    public string? ReportUrl { get; set; }
}

public class VetAssessmentDto
{
    public string AssessmentId { get; set; } = null!;
    public string IncidentId { get; set; } = null!;
    public string FitnessStatus { get; set; } = null!;
    public string AssessmentNotes { get; set; } = null!;
    public double Temperature { get; set; }
    public int HeartRate { get; set; }
    public string? Recommendation { get; set; }
    public string? ReportUrl { get; set; }
    public string ExaminedByUserId { get; set; } = null!;
    public DateTime ExaminedAt { get; set; }
}

public class ExternalActionInputDto
{
    public string ActionType { get; set; } = "RESCUE_TOWING"; // RESCUE_TOWING, CHARTER_FLIGHT_BOOKED, LOCAL_STABLE_RENTAL
    public string PartnerName { get; set; } = null!;
    public string? ReferenceCode { get; set; }
    public long ConfirmedCost { get; set; }
    public string? Notes { get; set; }
}

public class ExternalActionDto
{
    public string ActionId { get; set; } = null!;
    public string IncidentId { get; set; } = null!;
    public string ActionType { get; set; } = null!;
    public string PartnerName { get; set; } = null!;
    public string? ReferenceCode { get; set; }
    public long ConfirmedCost { get; set; }
    public string? Notes { get; set; }
    public string LoggedByUserId { get; set; } = null!;
    public DateTime LoggedAt { get; set; }
}

// ==========================================
// GROUP 5: APPLY, CONTINUATION & CLOSURE
// ==========================================

public class RecoveryApplyDto
{
    public string IncidentId { get; set; } = null!;
    public string AppliedPlanId { get; set; } = null!;
    public bool AppliedSuccessfully { get; set; }
    public string Message { get; set; } = null!;
    public DateTime AppliedAt { get; set; }
}

public class ContinuationReadinessDto
{
    public string IncidentId { get; set; } = null!;
    public bool IsReadyToContinue { get; set; }
    public bool VetCleared { get; set; }
    public bool ComplianceCleared { get; set; }
    public bool ResourceReady { get; set; }
    public bool SafetyBlockerCanBeRemoved { get; set; }
    public List<string> PendingBlockerReasons { get; set; } = new();
}

public class ContinuationInputDto
{
    public string? Notes { get; set; }
    public bool ClearedSafetyBlocker { get; set; } = true;
}

public class IncidentResolutionInputDto
{
    public string ResolutionType { get; set; } = "RESOLVED_CONTINUE_CURRENT";
    public string Notes { get; set; } = null!;
    public long FinalCost { get; set; }
}

public class IncidentReopenInputDto
{
    public string ReopenReason { get; set; } = null!;
}

// ==========================================
// GROUP 6: CUSTOMER COMMUNICATIONS
// ==========================================

public class CustomerIncidentSummaryDto
{
    public string IncidentId { get; set; } = null!;
    public string RequestId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string Severity { get; set; } = "MEDIUM";
    public DateTime OccurredAt { get; set; }
    public string? EstimatedDelayNotice { get; set; }
}

public class CustomerIncidentDetailDto
{
    public string IncidentId { get; set; } = null!;
    public string RequestId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string? HorseStatusNotice { get; set; }
    public string? ProposedNewEta { get; set; }
    public List<IncidentCommunicationDto> Communications { get; set; } = new();
    public List<IncidentFileDto> SharedFiles { get; set; } = new();
}

public class CommunicationInputDto
{
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public bool RequiresCustomerApproval { get; set; }
    public DateTime? ProposedNewEta { get; set; }
    public long ProposedCostAdjustment { get; set; }
}

public class CustomerReplyDto
{
    public bool Approved { get; set; }
    public string? CustomerNotes { get; set; }
}

public class ExternalAgreementInputDto
{
    public string ContactChannel { get; set; } = "PHONE"; // PHONE, EMAIL, DIRECT_MEETING
    public string AgreedSummary { get; set; } = null!;
    public string? EvidenceUrl { get; set; }
    public DateTime AgreedAt { get; set; } = DateTime.UtcNow;
}

public class IncidentCommunicationDto
{
    public string MessageId { get; set; } = null!;
    public string IncidentId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public bool RequiresCustomerApproval { get; set; }
    public DateTime? ProposedNewEta { get; set; }
    public long ProposedCostAdjustment { get; set; }
    public bool? CustomerApproved { get; set; }
    public string? CustomerNotes { get; set; }
    public DateTime? RepliedAt { get; set; }
    public string SentByUserId { get; set; } = null!;
    public DateTime SentAt { get; set; }
}

// ==========================================
// GROUP 7: FILES & EVIDENCE
// ==========================================

public class IncidentFileUploadInputDto
{
    public string FileName { get; set; } = null!;
    public string FileUrl { get; set; } = null!;
    public string FileType { get; set; } = "SCENE_PHOTO"; // SCENE_PHOTO, VET_REPORT, POLICE_RECORD, PARTNER_INVOICE
    public string? Description { get; set; }
}

public class IncidentFileDto
{
    public string FileId { get; set; } = null!;
    public string IncidentId { get; set; } = null!;
    public string? TripId { get; set; }
    public string FileName { get; set; } = null!;
    public string FileUrl { get; set; } = null!;
    public string FileType { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsSharedWithCustomer { get; set; }
    public string UploadedByUserId { get; set; } = null!;
    public DateTime UploadedAt { get; set; }
}

public class ShareFileInputDto
{
    public bool IsSharedWithCustomer { get; set; } = true;
    public string? DisplayName { get; set; }
}

// ==========================================
// GROUP 8: TERMINATION PROPOSALS
// ==========================================

public class TerminationInputDto
{
    public string Reason { get; set; } = null!;
    public string ProposedAction { get; set; } = "CANCEL_AND_RETURN"; // CANCEL_AND_RETURN, TRANSFER_TO_LOCAL_CARE, HANDOVER_TO_BUYER
    public string HorseCareArrangement { get; set; } = null!;
    public long EstimatedRefundOrFee { get; set; }
}

public class TerminationReplyInputDto
{
    public bool Accepted { get; set; }
    public string? CustomerNotes { get; set; }
}

public class TerminationReferInputDto
{
    public string ReferralDepartment { get; set; } = "LEGAL_INSURANCE";
    public string HandoffNotes { get; set; } = null!;
}

public class TerminationProposalDto
{
    public string ProposalId { get; set; } = null!;
    public string IncidentId { get; set; } = null!;
    public string Reason { get; set; } = null!;
    public string ProposedAction { get; set; } = null!;
    public string HorseCareArrangement { get; set; } = null!;
    public long EstimatedRefundOrFee { get; set; }
    public string Status { get; set; } = "PENDING_CUSTOMER"; // PENDING_CUSTOMER, ACCEPTED, REJECTED, REFERRED
    public bool? CustomerAccepted { get; set; }
    public string? CustomerNotes { get; set; }
    public string? ReferralDepartment { get; set; }
    public string? HandoffNotes { get; set; }
    public string CreatedByUserId { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}

