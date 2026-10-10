using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("USER")]
    public class User
    {
        [Key]
        [Column("UserID")]
        [StringLength(50)]
        public string UserId { get; set; } = null!;

        [Column("Username")]
        [StringLength(50)]
        public string? Username { get; set; }

        [Column("PasswordHash")]
        [StringLength(255)]
        public string PasswordHash { get; set; } = null!;

        [Column("Role")]
        [StringLength(50)]
        public string Role { get; set; } = null!;

        [Column("FullName")]
        [StringLength(100)]
        public string FullName { get; set; } = null!;

        [Column("Email")]
        [StringLength(100)]
        public string? Email { get; set; }

        [Column("Phone")]
        [StringLength(20)]
        public string? Phone { get; set; }

        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        // Navigation properties
        [InverseProperty(nameof(Horse.Owner))]
        public virtual ICollection<Horse> Horses { get; set; } = new List<Horse>();

        [InverseProperty(nameof(StaffDocument.User))]
        public virtual ICollection<StaffDocument> StaffDocuments { get; set; } = new List<StaffDocument>();

        [InverseProperty(nameof(Notification.User))]
        public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

        [InverseProperty(nameof(PolicyAndTerm.Creator))]
        public virtual ICollection<PolicyAndTerm> CreatedPolicies { get; set; } = new List<PolicyAndTerm>();

        [InverseProperty(nameof(TransportRequest.Customer))]
        public virtual ICollection<TransportRequest> TransportRequests { get; set; } = new List<TransportRequest>();

        [InverseProperty(nameof(LegalMedicalRecord.Verifier))]
        public virtual ICollection<LegalMedicalRecord> VerifiedMedicalRecords { get; set; } = new List<LegalMedicalRecord>();

        [InverseProperty(nameof(TripVehicleAssignment.Driver))]
        public virtual ICollection<TripVehicleAssignment> DriverAssignments { get; set; } = new List<TripVehicleAssignment>();

        [InverseProperty(nameof(TripVehicleAssignment.Escort))]
        public virtual ICollection<TripVehicleAssignment> EscortAssignments { get; set; } = new List<TripVehicleAssignment>();

        [InverseProperty(nameof(HealthLog.Escort))]
        public virtual ICollection<HealthLog> HealthLogs { get; set; } = new List<HealthLog>();

        [InverseProperty(nameof(Incident.Approver))]
        public virtual ICollection<Incident> ApprovedIncidents { get; set; } = new List<Incident>();

        [InverseProperty(nameof(Handover.HandedByUser))]
        public virtual ICollection<Handover> HandedOverRecords { get; set; } = new List<Handover>();

        [InverseProperty(nameof(Contract.Customer))]
        public virtual ICollection<Contract> CustomerContracts { get; set; } = new List<Contract>();

        [InverseProperty(nameof(Payment.ConfirmedByUser))]
        public virtual ICollection<Payment> ConfirmedPayments { get; set; } = new List<Payment>();
    }
}
