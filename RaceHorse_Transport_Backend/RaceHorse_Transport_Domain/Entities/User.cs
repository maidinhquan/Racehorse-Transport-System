using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RaceHorse_Transport_Domain.Entities
{
    [Table("USER")]
    public class User
    {
        [Key]
        [Column("UserID")]
        public string UserId { get; set; } = null!;

        public string? Username { get; set; }
        public string PasswordHash { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public bool IsActive { get; set; } = true;
    }
}