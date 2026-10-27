using System.ComponentModel.DataAnnotations;

namespace Application.DTOs
{
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
        public string Status { get; set; } = "PENDING";
        public string? CheckedBy { get; set; }
        public string? CheckedAt { get; set; }
    }

    public class CheckpointClearanceDto
    {
        public string Result { get; set; } = "PASSED";
        public string At { get; set; } = string.Empty;
        public string Ref { get; set; } = string.Empty;
        public string By { get; set; } = string.Empty;
    }

    public class RouteCheckpointDto
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "LAND_BORDER";
        public string Country { get; set; } = "VN";
        public string PlannedAt { get; set; } = string.Empty;
        public string? ArrivedAt { get; set; }
        public CheckpointClearanceDto? Clearance { get; set; }
    }

    public class RequirementLineDto
    {
        public string TypeId { get; set; } = string.Empty;
        public string Provider { get; set; } = "CUSTOMER";
        public string Scope { get; set; } = "PER_HORSE";
        public string Level { get; set; } = "REQUIRED";
        public string Stage { get; set; } = "BEFORE_DEPART";
        public string Condition { get; set; } = string.Empty;
    }

    public class ReqSetRuleDto
    {
        public string Country { get; set; } = "VN";
        public string Direction { get; set; } = "DOMESTIC";
        public string? RegId { get; set; }
        public int? RegV { get; set; }
        public List<RequirementLineDto> Lines { get; set; } = new();
    }

    public class ReqSetSnapshotDto
    {
        public string PkgId { get; set; } = string.Empty;
        public int PkgV { get; set; } = 1;
        public string Name { get; set; } = string.Empty;
        public string At { get; set; } = string.Empty;
        public string By { get; set; } = string.Empty;
        public List<ReqSetRuleDto> Rules { get; set; } = new();
    }

    public class DocsReadyStampDto
    {
        public string At { get; set; } = string.Empty;
        public string By { get; set; } = string.Empty;
    }

    public class SpecialistTripDto
    {
        public string Id { get; set; } = string.Empty;
        public string RequestId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string Origin { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public string OriginCountry { get; set; } = "VN";
        public string DestCountry { get; set; } = "VN";
        public string Mode { get; set; } = "ROAD";
        public string Status { get; set; } = "PLANNING";
        public string Deployment { get; set; } = "CONFIRMED";
        public string PlannedDepart { get; set; } = string.Empty;
        public string Eta { get; set; } = string.Empty;
        public List<SpecHorseDto> Horses { get; set; } = new();
        public ReqSetSnapshotDto? ReqSet { get; set; }
        public DocsReadyStampDto? DocsReady { get; set; }
        public InsuranceDto? Insurance { get; set; }
        public List<RouteCheckpointDto> Checkpoints { get; set; } = new();
    }

    public class CustomerDocDto
    {
        public string TripId { get; set; } = string.Empty;
        public string Key { get; set; } = string.Empty;
        public string Scope { get; set; } = "request";
        public string Status { get; set; } = "MISSING";
        public bool Optional { get; set; }
        public string? File { get; set; }
        public string Note { get; set; } = string.Empty;
        public string? Issue { get; set; }
        public string? Expiry { get; set; }
        public string? ReviewedAt { get; set; }
        public string? ReviewedBy { get; set; }
    }

    public class ReviewCustomerDocDto
    {
        public string? DocId { get; set; }
        public string? Key { get; set; }
        public string? Scope { get; set; }
        [Required]
        public string Decision { get; set; } = "APPROVED";
        public string? Reason { get; set; }
    }

    public class DocRequestDto
    {
        public string Id { get; set; } = string.Empty;
        public string TripId { get; set; } = string.Empty;
        public string Key { get; set; } = string.Empty;
        public string Scope { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string? DueAt { get; set; }
        public string Status { get; set; } = "OPEN";
        public string CreatedAt { get; set; } = string.Empty;
        public List<string[]> History { get; set; } = new();
    }

    public class CreateDocRequestDto
    {
        [Required]
        public string RequestId { get; set; } = string.Empty;
        public string? HorseId { get; set; }
        [Required]
        public string DocType { get; set; } = string.Empty;
        [Required, MinLength(10)]
        public string Description { get; set; } = string.Empty;
    }

    public class QuarantineBookingDto
    {
        public string Id { get; set; } = string.Empty;
        public string TripId { get; set; } = string.Empty;
        public string Station { get; set; } = string.Empty;
        public string Slot { get; set; } = string.Empty;
        public string Ref { get; set; } = string.Empty;
        public string Status { get; set; } = "BOOKED";
        public string Notes { get; set; } = string.Empty;
        public string? ConfirmedAt { get; set; }
    }

    public class SaveBookingDto
    {
        public string? TripId { get; set; }
        public string? FacilityName { get; set; }
        public string? Station { get; set; }
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
        public int HorseCount { get; set; } = 1;
        public string? BookingRef { get; set; }
        public string? Ref { get; set; }
        public string? Notes { get; set; }
    }

    public class RecordClearanceDto
    {
        [Required]
        public string CertNumber { get; set; } = string.Empty;
        [Required]
        public string Authority { get; set; } = string.Empty;
        [Required]
        public string IssueDate { get; set; } = string.Empty;
        [Required]
        public string ExpiryDate { get; set; } = string.Empty;
        public string? DocumentType { get; set; } = "EXPORT";
        public string? BorderCrossingName { get; set; }
    }

    public class DocTypeDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Group { get; set; } = "IDENTITY";
        public string Scope { get; set; } = "PER_HORSE";
        public string Provider { get; set; } = "CUSTOMER";
        public int? ValidityDays { get; set; }
        public string Status { get; set; } = "ACTIVE";
    }

    public class RegulationDto
    {
        public string Id { get; set; } = string.Empty;
        public string Country { get; set; } = "VN";
        public string Direction { get; set; } = "DOMESTIC";
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

    public class ApplyRequirementSetDto
    {
        [Required]
        public string PkgId { get; set; } = string.Empty;
    }

    public class InsuranceSaveDto
    {
        public string? Provider { get; set; }
        public string? Insurer { get; set; }
        public string? PolicyNumber { get; set; }
        public string? Policy { get; set; }
        public decimal CoverageAmount { get; set; }
        public decimal? Coverage { get; set; }
        public string? ValidFrom { get; set; }
        public string? ValidTo { get; set; }
    }

    public class TripDocumentDto
    {
        public string Id { get; set; } = string.Empty;
        public string TripId { get; set; } = string.Empty;
        public string TypeId { get; set; } = string.Empty;
        public string? HorseId { get; set; }
        public string Status { get; set; } = "APPROVED";
        public string Number { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public string IssuedAt { get; set; } = string.Empty;
        public string Expiry { get; set; } = string.Empty;
        public bool PhysicalCopy { get; set; }
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
}
