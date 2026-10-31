using System;
using System.Collections.Generic;

namespace Application.DTOs
{
    // =========================================================================
    // SPECIALIST DTOs - Matching Frontend specialist.types.ts Exactly
    // =========================================================================

    public class SpecHorseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Microchip { get; set; } = string.Empty;
        public string PassportNo { get; set; } = string.Empty;
    }

    public class InsuranceDto
    {
        public string Insurer { get; set; } = string.Empty;
        public string Policy { get; set; } = string.Empty;
        public string ValidFrom { get; set; } = string.Empty;
        public string ValidTo { get; set; } = string.Empty;
        public decimal Coverage { get; set; }
        public string Status { get; set; } = "PENDING"; // PENDING, VERIFIED
        public string? CheckedBy { get; set; }
        public string? CheckedAt { get; set; }
    }

    public class RouteCheckpointDto
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "QUARANTINE_STATION"; // LAND_BORDER, AIRPORT, QUARANTINE_STATION
        public string Country { get; set; } = "VN";
        public string PlannedAt { get; set; } = string.Empty;
        public string? ArrivedAt { get; set; }
        public ClearanceDetailDto? Clearance { get; set; }
    }

    public class ClearanceDetailDto
    {
        public string Result { get; set; } = "PASSED"; // PASSED, HELD, FAILED
        public string At { get; set; } = string.Empty;
        public string Ref { get; set; } = string.Empty;
        public string By { get; set; } = string.Empty;
    }

    public class DocsReadyDto
    {
        public string At { get; set; } = string.Empty;
        public string By { get; set; } = string.Empty;
    }

    public class ReqSetSnapshotDto
    {
        public string PkgId { get; set; } = string.Empty;
        public int PkgV { get; set; } = 1;
        public string Name { get; set; } = string.Empty;
        public string At { get; set; } = string.Empty;
        public string By { get; set; } = string.Empty;
        public List<ReqRuleDto> Rules { get; set; } = new();
    }

    public class ReqRuleDto
    {
        public string Country { get; set; } = "VN";
        public string Direction { get; set; } = "DOMESTIC";
        public string? RegId { get; set; }
        public int? RegV { get; set; }
        public List<RequirementLineDto> Lines { get; set; } = new();
    }

    public class SpecTripDto
    {
        public string Id { get; set; } = string.Empty;
        public string RequestId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string Origin { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public string OriginCountry { get; set; } = "VN";
        public string DestCountry { get; set; } = "VN";
        public string Mode { get; set; } = "ROAD"; // ROAD, AIR
        public string Status { get; set; } = "PLANNING";
        public string Deployment { get; set; } = "CONFIRMED";
        public string PlannedDepart { get; set; } = string.Empty;
        public string Eta { get; set; } = string.Empty;
        public List<SpecHorseDto> Horses { get; set; } = new();
        public ReqSetSnapshotDto? ReqSet { get; set; }
        public DocsReadyDto? DocsReady { get; set; }
        public InsuranceDto? Insurance { get; set; }
        public List<RouteCheckpointDto> Checkpoints { get; set; } = new();
    }

    public class CustomerDocDto
    {
        public string TripId { get; set; } = string.Empty;
        public string Key { get; set; } = string.Empty; // passport, ownership, flu, health...
        public string Scope { get; set; } = string.Empty; // horseId
        public string Status { get; set; } = "SUBMITTED"; // SUBMITTED, APPROVED, ACTION_REQUIRED, MISSING, OPTIONAL
        public bool Optional { get; set; }
        public string? File { get; set; }
        public string Note { get; set; } = string.Empty;
        public string? Issue { get; set; }
        public string? Expiry { get; set; }
        public string? ReviewedAt { get; set; }
        public string? ReviewedBy { get; set; }
    }

    public class DocRequestDto
    {
        public string Id { get; set; } = string.Empty;
        public string TripId { get; set; } = string.Empty;
        public string Key { get; set; } = string.Empty;
        public string Scope { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string? DueAt { get; set; }
        public string Status { get; set; } = "OPEN"; // OPEN, SUBMITTED, FULFILLED
        public string CreatedAt { get; set; } = string.Empty;
        public List<string[]> History { get; set; } = new();
    }

    public class DocVersionDto
    {
        public int V { get; set; } = 1;
        public string File { get; set; } = string.Empty;
        public string At { get; set; } = string.Empty;
        public string By { get; set; } = string.Empty;
    }

    public class DocReviewDto
    {
        public int V { get; set; } = 1;
        public string Decision { get; set; } = "APPROVED"; // APPROVED, REJECTED
        public string At { get; set; } = string.Empty;
        public string By { get; set; } = string.Empty;
        public string Remark { get; set; } = string.Empty;
    }

    public class TripDocumentDto
    {
        public string Id { get; set; } = string.Empty;
        public string TripId { get; set; } = string.Empty;
        public string TypeId { get; set; } = string.Empty;
        public string? HorseId { get; set; }
        public string Status { get; set; } = "APPROVED"; // SUBMITTED, APPROVED, REJECTED
        public string Number { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public string IssuedAt { get; set; } = string.Empty;
        public string Expiry { get; set; } = string.Empty;
        public List<DocVersionDto> Versions { get; set; } = new();
        public List<DocReviewDto> Reviews { get; set; } = new();
        public string? RejectReason { get; set; }
        public bool PhysicalCopy { get; set; }
    }

    public class QuarantineBookingDto
    {
        public string Id { get; set; } = string.Empty;
        public string TripId { get; set; } = string.Empty;
        public string Station { get; set; } = string.Empty;
        public string Slot { get; set; } = string.Empty;
        public string Ref { get; set; } = string.Empty;
        public string Status { get; set; } = "BOOKED"; // REQUESTED, BOOKED
        public string Notes { get; set; } = string.Empty;
        public string? ConfirmedAt { get; set; }
    }

    public class AuditEntryDto
    {
        public string At { get; set; } = string.Empty;
        public string Actor { get; set; } = string.Empty;
        public string Role { get; set; } = "TRANSPORT_SPECIALIST";
        public string Action { get; set; } = string.Empty;
        public string Entity { get; set; } = string.Empty;
        public string? Detail { get; set; }
    }

    public class DocTypeDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Group { get; set; } = "IDENTITY"; // IDENTITY, MEDICAL, QUARANTINE, CUSTOMS, OTHER
        public string Scope { get; set; } = "PER_HORSE"; // PER_HORSE, PER_TRIP
        public string Provider { get; set; } = "CUSTOMER"; // CUSTOMER, CBN
        public int? ValidityDays { get; set; }
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, RETIRED
    }

    public class RequirementLineDto
    {
        public string TypeId { get; set; } = string.Empty;
        public string Provider { get; set; } = "CUSTOMER";
        public string Scope { get; set; } = "PER_HORSE";
        public string Level { get; set; } = "REQUIRED"; // REQUIRED, CONDITIONAL, OPTIONAL
        public string Stage { get; set; } = "BEFORE_DEPART"; // BEFORE_SUBMIT, BEFORE_DEPART, AT_CHECKPOINT
        public string Condition { get; set; } = string.Empty;
    }

    public class RegulationDto
    {
        public string Id { get; set; } = string.Empty;
        public string Country { get; set; } = "VN";
        public string Direction { get; set; } = "DOMESTIC"; // DOMESTIC, EXPORT, IMPORT
        public List<RequirementLineDto> Lines { get; set; } = new();
        public string Note { get; set; } = string.Empty;
        public int V { get; set; } = 1;
        public string EffectiveFrom { get; set; } = string.Empty;
        public string Status { get; set; } = "ACTIVE";
    }

    public class RegPackageDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public List<string[]> Items { get; set; } = new();
        public string Origin { get; set; } = "VN";
        public string Dest { get; set; } = "VN";
        public List<string> Modes { get; set; } = new();
        public string Note { get; set; } = string.Empty;
        public int V { get; set; } = 1;
        public string EffectiveFrom { get; set; } = string.Empty;
        public string Status { get; set; } = "ACTIVE";
    }

    // =========================================================================
    // INPUT DTOs
    // =========================================================================

    public class ReviewCustomerDocInputDto
    {
        public string Key { get; set; } = string.Empty;
        public string Scope { get; set; } = string.Empty;
        public string Decision { get; set; } = "APPROVED"; // APPROVED, REJECTED
        public string? Reason { get; set; }
    }

    public class CreateDocRequestInputDto
    {
        public string TripId { get; set; } = string.Empty;
        public string Key { get; set; } = string.Empty;
        public string Scope { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string? DueAt { get; set; }
    }

    public class RecordDocInputDto
    {
        public string TripId { get; set; } = string.Empty;
        public string TypeId { get; set; } = string.Empty;
        public string? HorseId { get; set; }
        public string Number { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public string IssuedAt { get; set; } = string.Empty;
        public string Expiry { get; set; } = string.Empty;
        public string File { get; set; } = string.Empty;
    }

    public class ReviewDocInputDto
    {
        public string Decision { get; set; } = "APPROVED"; // APPROVED, REJECTED
        public string Remark { get; set; } = string.Empty;
    }

    public class SaveInsuranceInputDto
    {
        public string Insurer { get; set; } = string.Empty;
        public string Policy { get; set; } = string.Empty;
        public string ValidFrom { get; set; } = string.Empty;
        public string ValidTo { get; set; } = string.Empty;
        public decimal Coverage { get; set; }
    }

    public class ApplyRequirementSetInputDto
    {
        public string PkgId { get; set; } = string.Empty;
    }

    public class SaveBookingInputDto
    {
        public string TripId { get; set; } = string.Empty;
        public string Station { get; set; } = string.Empty;
        public string Slot { get; set; } = string.Empty;
        public string Ref { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }

    public class RecordClearanceInputDto
    {
        public int CheckpointIndex { get; set; }
        public string Result { get; set; } = "PASSED";
        public string? Ref { get; set; }
        public string? By { get; set; }
    }
}

