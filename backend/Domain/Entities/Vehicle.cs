using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("VEHICLE")]
    public class Vehicle
    {
        [Key]
        [Column("VehicleID")]
        [StringLength(50)]
        public string VehicleId { get; set; } = null!;

        [Column("Type")]
        [StringLength(50)]
        public string? Type { get; set; }

        [Column("CapacityStalls")]
        public int? CapacityStalls { get; set; }

        [Column("MaxRange_km", TypeName = "decimal(10, 2)")]
        public decimal? MaxRangeKm { get; set; }

        [Column("FuelCost_Per_Km", TypeName = "decimal(12, 2)")]
        public decimal? FuelCostPerKm { get; set; }

        [Column("OperatingCountry")]
        [StringLength(10)]
        public string OperatingCountry { get; set; } = "VN";

        [Column("PlateNumber")]
        [StringLength(20)]
        public string? PlateNumber { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string? Status { get; set; }

        // Navigation properties
        [InverseProperty(nameof(TripVehicleAssignment.Vehicle))]
        public virtual ICollection<TripVehicleAssignment> VehicleAssignments { get; set; } = new List<TripVehicleAssignment>();
    }
}

