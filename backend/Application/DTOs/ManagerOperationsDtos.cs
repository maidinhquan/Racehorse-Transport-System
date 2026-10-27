using System.ComponentModel.DataAnnotations;

namespace Application.DTOs
{
    public class ManagerTripAssignmentDto
    {
        [Required]
        public string SpecialistId { get; set; } = string.Empty;
        [Required]
        public string CoordinatorId { get; set; } = string.Empty;
    }

    public class ResponsePlanDto
    {
        public string Id { get; set; } = string.Empty;
        public string Kind { get; set; } = string.Empty;
        public string Desc { get; set; } = string.Empty;
        public decimal Cost { get; set; }
        public string Payer { get; set; } = "COMPANY";
        public string Status { get; set; } = "PENDING_APPROVAL";
        public string At { get; set; } = string.Empty;
        public string? DecisionNote { get; set; }
    }

    public class IncidentDto
    {
        public string Id { get; set; } = string.Empty;
        public string TripId { get; set; } = string.Empty;
        public string Type { get; set; } = "VEHICLE";
        public string Severity { get; set; } = "HIGH";
        public string Status { get; set; } = "NEW";
        public string At { get; set; } = string.Empty;
        public string By { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string? HorseId { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Safety { get; set; } = string.Empty;
        public List<string> Photos { get; set; } = new();
        public List<ResponsePlanDto> Plans { get; set; } = new();
        public List<string[]> Log { get; set; } = new();
    }

    public class IncidentStatusUpdateDto
    {
        [Required]
        public string Status { get; set; } = "IN_PROGRESS";
    }

    public class IncidentPlanDecisionDto
    {
        public bool Approve { get; set; }
        public string? Note { get; set; }
    }

    public class ExtraCostDto
    {
        public string Label { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Payer { get; set; } = "COMPANY";
    }

    public class ActualCostDto
    {
        public string TripId { get; set; } = string.Empty;
        public Dictionary<string, decimal> Costs { get; set; } = new();
        public List<ExtraCostDto> Extra { get; set; } = new();
        public string EnteredAt { get; set; } = string.Empty;
    }

    public class SaveActualCostDto
    {
        public Dictionary<string, decimal> Costs { get; set; } = new();
        public List<ExtraCostDto> Extra { get; set; } = new();
    }

    public class ComplaintMessageDto
    {
        public string From { get; set; } = "CUSTOMER";
        public string Name { get; set; } = string.Empty;
        public string At { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public List<string>? Files { get; set; }
    }

    public class ComplaintResolutionDto
    {
        public string Proposal { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }

    public class ComplaintDto
    {
        public string Id { get; set; } = string.Empty;
        public string RequestId { get; set; } = string.Empty;
        public string Type { get; set; } = "SERVICE";
        public string Title { get; set; } = string.Empty;
        public string? HorseId { get; set; }
        public string Status { get; set; } = "NEW";
        public string CreatedAt { get; set; } = string.Empty;
        public List<ComplaintMessageDto> Messages { get; set; } = new();
        public ComplaintResolutionDto? Resolution { get; set; }
        public string? ResolvedAt { get; set; }
    }

    public class ComplaintReplyDto
    {
        [Required, MinLength(10)]
        public string Text { get; set; } = string.Empty;
        public bool Propose { get; set; }
        public decimal Amount { get; set; }
    }

    public class ComplaintResolveDto
    {
        [Required]
        public string? Text { get; set; }
    }

    public class ManagerRouteDecisionDto
    {
        public bool Approve { get; set; }
        public string? Reason { get; set; }
    }

    public class ManagerFlightDecisionDto
    {
        public bool Approve { get; set; }
        public string? Note { get; set; }
    }

    public class HandoverResolutionDto
    {
        [Required, MinLength(10)]
        public string Resolution { get; set; } = string.Empty;
    }

    public class ManagerTripCostReportItemDto
    {
        public string TripId { get; set; } = string.Empty;
        public string RequestId { get; set; } = string.Empty;
        public string TripStatus { get; set; } = "PLANNING";
        public decimal Revenue { get; set; }
        public decimal Budget { get; set; }
        public decimal Actual { get; set; }
        public decimal Variance { get; set; }
        public bool Entered { get; set; }
        public List<ExtraCostDto> Extra { get; set; } = new();
    }

    public class ManagerReportsOverviewDto
    {
        public int TotalTrips { get; set; }
        public int CompletedTrips { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalBudget { get; set; }
        public decimal TotalActualCost { get; set; }
        public decimal TotalVariance { get; set; }
        public decimal GrossProfitMargin { get; set; }
        public decimal OnTimeDeliveryRate { get; set; }
        public List<ManagerTripCostReportItemDto> Rows { get; set; } = new();
    }
}
