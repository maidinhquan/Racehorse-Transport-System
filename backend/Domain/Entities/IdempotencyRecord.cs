using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    [Table("IDEMPOTENCY_RECORD")]
    public class IdempotencyRecord
    {
        [Key]
        [Column("IdempotencyKey")]
        [StringLength(64)]
        public string IdempotencyKey { get; set; } = null!;

        [Column("ActorID")]
        [StringLength(50)]
        public string ActorId { get; set; } = null!;

        [Column("HttpMethod")]
        [StringLength(10)]
        public string HttpMethod { get; set; } = null!;

        [Column("RequestPath")]
        [StringLength(255)]
        public string RequestPath { get; set; } = null!;

        [Column("RequestBodyHash")]
        [StringLength(64)]
        public string RequestBodyHash { get; set; } = null!;

        [Column("ResponseStatusCode")]
        public int ResponseStatusCode { get; set; }

        [Column("ResponseBody")]
        public string ResponseBody { get; set; } = string.Empty;

        [Column("CreatedAtUtc")]
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        [Column("ExpiresAtUtc")]
        public DateTime ExpiresAtUtc { get; set; } = DateTime.UtcNow.AddHours(24);
    }
}

