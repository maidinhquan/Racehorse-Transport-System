using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("POLICY_AND_TERM")]
    public class PolicyAndTerm
    {
        [Key]
        [Column("PolicyID")]
        [StringLength(50)]
        public string PolicyId { get; set; } = null!;

        [Column("PolicyType")]
        [StringLength(50)]
        public string PolicyType { get; set; } = null!;

        [Column("Title")]
        [StringLength(255)]
        public string Title { get; set; } = null!;

        [Column("Content")]
        public string Content { get; set; } = null!;

        [Column("Version")]
        [StringLength(20)]
        public string Version { get; set; } = null!;

        [Column("EffectiveDate", TypeName = "date")]
        public DateTime EffectiveDate { get; set; }

        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        [Column("CreatedBy")]
        [StringLength(50)]
        public string? CreatedBy { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("UpdatedAt")]
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        [ForeignKey(nameof(CreatedBy))]
        [InverseProperty(nameof(Entities.User.CreatedPolicies))]
        public virtual User? Creator { get; set; }
    }
}

