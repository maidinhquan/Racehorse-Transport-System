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

        [Column("DeploymentStatus")]
        [StringLength(50)]
        public string? DeploymentStatus { get; set; }

        [Column("DeploymentReason")]
        [StringLength(500)]
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

        [Column("DocsReadyAtUtc")]
        public DateTime? DocsReadyAtUtc { get; set; }

        [Column("DocsReadyBy")]
        [StringLength(50)]
        public string? DocsReadyBy { get; set; }

        // Navigation properties
        [ForeignKey(nameof(RequestId))]
        [InverseProperty(nameof(TransportRequest.TripPlans))]
        public virtual TransportRequest? Request { get; set; }

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

        public virtual ICollection<TripInsurance> Insurances { get; set; } = new List<TripInsurance>();
        public virtual ICollection<DocumentRequest> DocumentRequests { get; set; } = new List<DocumentRequest>();
        public virtual ICollection<TripRequirementSet> RequirementSets { get; set; } = new List<TripRequirementSet>();
        public virtual ICollection<TripCheckpointClearance> CheckpointClearances { get; set; } = new List<TripCheckpointClearance>();
    }
}
