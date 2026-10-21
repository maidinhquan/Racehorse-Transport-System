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

        [Column("LegNumber")]
        public int LegNumber { get; set; } = 1;

        [Column("LegType")]
        [StringLength(20)]
        public string LegType { get; set; } = "OUTBOUND";

        [Column("VehicleID")]
        [StringLength(50)]
        public string VehicleId { get; set; } = null!;

        [Column("DriverID")]
        [StringLength(50)]
        public string DriverId { get; set; } = null!;

        [Column("CoDriverID")]
        [StringLength(50)]
        public string? CoDriverId { get; set; }

        [Column("VeterinarianID")]
        [StringLength(50)]
        public string? VeterinarianId { get; set; }

        [Column("EscortID")]
        [StringLength(50)]
        public string? EscortId { get; set; }

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

        [ForeignKey(nameof(CoDriverId))]
        public virtual User? CoDriver { get; set; }

        [ForeignKey(nameof(VeterinarianId))]
        public virtual User? Veterinarian { get; set; }

        [ForeignKey(nameof(EscortId))]
        [InverseProperty(nameof(Entities.User.EscortAssignments))]
        public virtual User? Escort { get; set; }
    }
}

