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
        // Navigation properties
        [ForeignKey(nameof(RequestId))]
        [InverseProperty(nameof(TransportRequest.TripPlans))]
        public virtual TransportRequest? Request { get; set; }

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
    }
}

