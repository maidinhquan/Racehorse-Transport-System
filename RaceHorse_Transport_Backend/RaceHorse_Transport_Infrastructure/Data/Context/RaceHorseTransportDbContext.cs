using RaceHorse_Transport_Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace RaceHorse_Transport_Infrastructure.Data.Context
{
    public class HorseTransportDbContext : DbContext
    {
        public HorseTransportDbContext(DbContextOptions<HorseTransportDbContext> options)
            : base(options)
        {
        }

        // Bảng đại diện (sẽ bổ sung tiếp các DbSet khi tạo thêm các Entity khác)
        public DbSet<User> Users { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(HorseTransportDbContext).Assembly);
        }
    }
}