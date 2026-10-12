using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("CONTRACT_TEMPLATE")]
    public class ContractTemplate
    {
        [Key]
        [Column("TemplateID")]
        [StringLength(50)]
        public string TemplateId { get; set; } = null!;

        [Column("TemplateName")]
        [StringLength(255)]
        public string TemplateName { get; set; } = null!;

        [Column("LanguageCode")]
        [StringLength(10)]
        public string LanguageCode { get; set; } = "VI";

        [Column("BodyContent")]
        public string BodyContent { get; set; } = null!;

        [Column("Version")]
        [StringLength(20)]
        public string Version { get; set; } = null!;

        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("UpdatedAt")]
        public DateTime? UpdatedAt { get; set; }
    }
}

