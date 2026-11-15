using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("TRIP_PLAN")]
    public class TripPlan
    {
        [Key]
        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("RequestID")]
        [StringLength(50)]
        public string RequestId { get; set; } = null!;

        [Column("TotalDistance_km", TypeName = "decimal(10, 2)")]
        public decimal? TotalDistanceKm { get; set; }

        [Column("T_Total_Hours", TypeName = "decimal(10, 2)")]
        public decimal? TTotalHours { get; set; }

        [Column("TotalCost", TypeName = "decimal(12, 2)")]
        public decimal? TotalCost { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string Status { get; set; } = null!;

        // Quản lý Phiên bản & Khóa lạc quan (Flow 3 v2 Optimistic Concurrency & Binding)
        [Column("Version")]
        public int Version { get; set; } = 1;

        [Column("PlanVersion")]
        public int PlanVersion { get; set; } = 1;

        [Column("ContextVersion")]
        public int ContextVersion { get; set; } = 1;

        [Column("ReadinessVersion")]
        public int ReadinessVersion { get; set; } = 1;

        [Column("DraftPlanJson")]
        public string? DraftPlanJson { get; set; }

        [Column("ApprovedPlanJson")]
        public string? ApprovedPlanJson { get; set; }

        [Column("OpenChange")]
        public bool OpenChange { get; set; } = false;

        [Column("EffectiveOriginPlaceId")]
        [StringLength(50)]
        public string? EffectiveOriginPlaceId { get; set; }

        // Bàn giao triển khai từ Flow 1 (Deployment)
        [Column("DeploymentStatus")]
        [StringLength(12)]
        public string? DeploymentStatus { get; set; }

        [Column("DeploymentReason")]
        [StringLength(1000)]
        public string? DeploymentReason { get; set; }

        [Column("DeploymentBy")]
        [StringLength(50)]
        public string? DeploymentBy { get; set; }

        [Column("DeploymentAtUtc")]
        public DateTime? DeploymentAtUtc { get; set; }

        [Column("HandoffEventId")]
        [StringLength(50)]
        public string? HandoffEventId { get; set; }

        [Column("AssignedSpecialistId")]
        [StringLength(50)]
        public string? AssignedSpecialistId { get; set; }

        [Column("AssignedCoordinatorId")]
        [StringLength(50)]
        public string? AssignedCoordinatorId { get; set; }

        // Xác nhận Điều phối viên (Coordinator / Operations READY - Flow 3)
        [Column("OperationsStatus")]
        [StringLength(20)]
        public string OperationsStatus { get; set; } = "NOT_READY";

        [Column("ResourcesConfirmedAt")]
        public DateTime? ResourcesConfirmedAt { get; set; }

        [Column("ResourcesConfirmedBy")]
        [StringLength(100)]
        public string? ResourcesConfirmedBy { get; set; }

        // Xác nhận Chuyên viên pháp lý (Specialist / Documents READY - Flow 2)
        [Column("DocumentsStatus")]
        [StringLength(20)]
        public string DocumentsStatus { get; set; } = "NOT_READY";

        [Column("EarliestDepartureDate")]
        public DateTime? EarliestDepartureDate { get; set; }

        [Column("DocumentExpiryDate")]
        public DateTime? DocumentExpiryDate { get; set; }

        [Column("SpecialistLegalNote")]
        [StringLength(1000)]
        public string? SpecialistLegalNote { get; set; }

        [Column("DocumentsConfirmedAt")]
        public DateTime? DocumentsConfirmedAt { get; set; }

        [Column("DocumentsConfirmedBy")]
        [StringLength(100)]
        public string? DocumentsConfirmedBy { get; set; }

        // Thẩm định & Phê duyệt Lộ trình (Manager Route Review / Gate 1)
        [Column("CurrentRouteVersion")]
        public int CurrentRouteVersion { get; set; } = 1;

        [Column("RouteStatus")]
        [StringLength(30)]
        public string RouteStatus { get; set; } = "DRAFT";

        [Column("RouteApprovedAt")]
        public DateTime? RouteApprovedAt { get; set; }

        [Column("RouteApprovedBy")]
        [StringLength(50)]
        public string? RouteApprovedBy { get; set; }

        [Column("RouteReturnReason")]
        [StringLength(500)]
        public string? RouteReturnReason { get; set; }

        // Phê duyệt Khởi hành (Manager Gate 2 -> READY_TO_DEPART)
        [Column("DepartureApprovedAt")]
        public DateTime? DepartureApprovedAt { get; set; }

        [Column("DepartureApprovedBy")]
        [StringLength(100)]
        public string? DepartureApprovedBy { get; set; }

        [Column("RejectionReason")]
        [StringLength(500)]
        public string? RejectionReason { get; set; }

        // Flow 4: In-Transit & Execution Tracking
        [Column("ExecutionVersion")]
        public int ExecutionVersion { get; set; } = 1;

        [Column("ExecutionPhase")]
        [StringLength(30)]
        public string? ExecutionPhase { get; set; } = "AWAITING_DEPARTURE";

        [Column("CurrentEta")]
        public DateTime? CurrentEta { get; set; }

        [Column("PendingEtaProposalId")]
        [StringLength(50)]
        public string? PendingEtaProposalId { get; set; }

        // =========================================================================
        // FLOW 5: XỬ LÝ NGOẠI LỆ TIẾP CẬN ĐIỂM ĐÓN (PICKUP ACCESS FAILURE & SHUTTLING)
        // =========================================================================

        /// <summary>
        /// Trạng thái tiếp cận điểm đón: NORMAL, BLOCKED, RELOCATING, SHUTTLING, RESOLVED
        /// </summary>
        [Column("PickupAccessStatus")]
        [StringLength(30)]
        public string PickupAccessStatus { get; set; } = "NORMAL";

        /// <summary>
        /// Tên địa điểm hẹn đón ngựa ngoài đường lớn (Áp dụng khi dắt bộ < 500m)
        /// </summary>
        [Column("RelocationMeetingPointName")]
        [StringLength(255)]
        public string? RelocationMeetingPointName { get; set; }

        /// <summary>
        /// Tọa độ vĩ độ điểm hẹn đón ngựa (Precision 9, Scale 6)
        /// </summary>
        [Column("RelocationLatitude", TypeName = "decimal(9, 6)")]
        public decimal? RelocationLatitude { get; set; }

        /// <summary>
        /// Tọa độ kinh độ điểm hẹn đón ngựa (Precision 9, Scale 6)
        /// </summary>
        [Column("RelocationLongitude", TypeName = "decimal(9, 6)")]
        public decimal? RelocationLongitude { get; set; }

        /// <summary>
        /// Khoảng cách thực tế đo được từ xe lớn đến điểm đón gốc (mét)
        /// </summary>
        [Column("RelocationDistanceMeters")]
        public int? RelocationDistanceMeters { get; set; }

        /// <summary>
        /// Mã xe trung chuyển nhỏ 2 chỗ được điều động (Áp dụng khi >= 500m)
        /// </summary>
        [Column("ShuttleVehicleId")]
        [StringLength(50)]
        public string? ShuttleVehicleId { get; set; }

        /// <summary>
        /// Mã tài xế phụ trách xe trung chuyển nhỏ
        /// </summary>
        [Column("ShuttleDriverId")]
        [StringLength(50)]
        public string? ShuttleDriverId { get; set; }

        /// <summary>
        /// Chi phí phát sinh thuê xe trung chuyển (VND)
        /// </summary>
        [Column("ShuttleCostVnd", TypeName = "decimal(12, 2)")]
        public decimal? ShuttleCostVnd { get; set; } = 0;

        /// <summary>
        /// Trạng thái phê duyệt của Khách hàng: PENDING, APPROVED, REJECTED
        /// </summary>
        [Column("CustomerApprovalStatus")]
        [StringLength(20)]
        public string? CustomerApprovalStatus { get; set; }

        /// <summary>
        /// Thời điểm Khách hàng xác nhận phê duyệt phương án (UTC)
        /// </summary>
        [Column("CustomerApprovalAt")]
        public DateTime? CustomerApprovalAt { get; set; }

        // Navigation Properties cho Xe và Tài xế trung chuyển
        [ForeignKey(nameof(ShuttleVehicleId))]
        public virtual Vehicle? ShuttleVehicle { get; set; }

        [ForeignKey(nameof(ShuttleDriverId))]
        public virtual User? ShuttleDriver { get; set; }

        // Navigation properties
        [ForeignKey(nameof(RequestId))]
        [InverseProperty(nameof(TransportRequest.TripPlans))]
        public virtual TransportRequest? Request { get; set; }

        [ForeignKey(nameof(EffectiveOriginPlaceId))]
        public virtual PartnerFacility? EffectiveOriginPlace { get; set; }

        [Column("DocsReadyAtUtc")]
        public DateTime? DocsReadyAtUtc { get; set; }

        [Column("DocsReadyBy")]
        [StringLength(50)]
        public string? DocsReadyBy { get; set; }

        [ForeignKey(nameof(DocsReadyBy))]
        public virtual User? DocsReadyByUser { get; set; }

        [InverseProperty(nameof(TripVehicleAssignment.Trip))]
        public virtual ICollection<TripVehicleAssignment> VehicleAssignments { get; set; } = new List<TripVehicleAssignment>();

        [InverseProperty(nameof(RouteSegment.Trip))]
        public virtual ICollection<RouteSegment> RouteSegments { get; set; } = new List<RouteSegment>();

        [InverseProperty(nameof(CustomsClearance.Trip))]
        public virtual ICollection<CustomsClearance> CustomsClearances { get; set; } = new List<CustomsClearance>();

        [InverseProperty(nameof(HealthLog.Trip))]
        public virtual ICollection<HealthLog> HealthLogs { get; set; } = new List<HealthLog>();

        [InverseProperty(nameof(Incident.Trip))]
        public virtual ICollection<Incident> Incidents { get; set; } = new List<Incident>();

        [InverseProperty(nameof(Handover.Trip))]
        public virtual ICollection<Handover> Handovers { get; set; } = new List<Handover>();

        [InverseProperty(nameof(Contract.Trip))]
        public virtual ICollection<Contract> Contracts { get; set; } = new List<Contract>();

        [InverseProperty(nameof(FlightBooking.Trip))]
        public virtual ICollection<FlightBooking> FlightBookings { get; set; } = new List<FlightBooking>();

        [InverseProperty(nameof(PickupRelocationProposal.Trip))]
        public virtual ICollection<PickupRelocationProposal> PickupRelocations { get; set; } = new List<PickupRelocationProposal>();

        [InverseProperty(nameof(TripPlanningHistory.Trip))]
        public virtual ICollection<TripPlanningHistory> PlanningHistories { get; set; } = new List<TripPlanningHistory>();

        [InverseProperty(nameof(PlanningAttachment.Trip))]
        public virtual ICollection<PlanningAttachment> PlanningAttachments { get; set; } = new List<PlanningAttachment>();
        public virtual ICollection<TripInsurance> Insurances { get; set; } = new List<TripInsurance>();
        public virtual ICollection<DocumentRequest> DocumentRequests { get; set; } = new List<DocumentRequest>();
        public virtual ICollection<TripRequirementSet> RequirementSets { get; set; } = new List<TripRequirementSet>();
        public virtual ICollection<TripCheckpointClearance> CheckpointClearances { get; set; } = new List<TripCheckpointClearance>();
    }
}
