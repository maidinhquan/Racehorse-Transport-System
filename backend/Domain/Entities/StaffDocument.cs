using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("STAFF_DOCUMENT")]
    public class StaffDocument
    {
        [Key]
        [Column("DocumentID")]
        [StringLength(50)]
        public string DocumentId { get; set; } = null!;

        [Column("UserID")]
        [StringLength(50)]
        public string UserId { get; set; } = null!;

        [Column("DocType")]
        [StringLength(50)]
        public string DocType { get; set; } = null!;

        [Column("CountryOfIssue")]
        [StringLength(3)]
        public string? CountryOfIssue { get; set; }

        [Column("ValidForCountries")]
        [StringLength(500)]
        public string? ValidForCountries { get; set; }

        [Column("IssueDate", TypeName = "date")]
        public DateTime? IssueDate { get; set; }

        [Column("ExpiryDate", TypeName = "date")]
        public DateTime ExpiryDate { get; set; }

        [Column("DocumentUrl")]
        [StringLength(500)]
        public string? DocumentUrl { get; set; }

        [Column("Status")]
        [StringLength(50)]
        public string Status { get; set; } = null!;

        // Navigation properties
        [ForeignKey(nameof(UserId))]
        [InverseProperty(nameof(Entities.User.StaffDocuments))]
        public virtual User? User { get; set; }
    }
}

