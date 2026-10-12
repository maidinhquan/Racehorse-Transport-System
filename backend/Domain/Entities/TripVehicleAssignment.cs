using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("TRIP_VEHICLE_ASSIGNMENT")]
    public class TripVehicleAssignment
    {
        [Key]
        [Column("AssignmentID")]
        [StringLength(50)]
        public string AssignmentId { get; set; } = null!;

        [Column("TripID")]
        [StringLength(50)]
        public string TripId { get; set; } = null!;

        [Column("VehicleID")]
        [StringLength(50)]
        public string VehicleId { get; set; } = null!;

        [Column("DriverID")]
        [StringLength(50)]
        public string DriverId { get; set; } = null!;

        [Column("EscortID")]
        [StringLength(50)]
        public string EscortId { get; set; } = null!;

        // Navigation properties
        [ForeignKey(nameof(TripId))]
        [InverseProperty(nameof(TripPlan.VehicleAssignments))]
        public virtual TripPlan? Trip { get; set; }

        [ForeignKey(nameof(VehicleId))]
        [InverseProperty(nameof(Entities.Vehicle.VehicleAssignments))]
        public virtual Vehicle? Vehicle { get; set; }

        [ForeignKey(nameof(DriverId))]
        [InverseProperty(nameof(Entities.User.DriverAssignments))]
        public virtual User? Driver { get; set; }

        [ForeignKey(nameof(EscortId))]
        [InverseProperty(nameof(Entities.User.EscortAssignments))]
        public virtual User? Escort { get; set; }
    }
}

