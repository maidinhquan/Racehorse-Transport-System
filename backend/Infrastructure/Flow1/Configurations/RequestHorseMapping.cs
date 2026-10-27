using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class RequestHorseMapping : IEntityTypeConfiguration<RequestHorse>
{
    public void Configure(EntityTypeBuilder<RequestHorse> entity)
    {
        entity.ToTable("REQUEST_HORSE_MAPPING", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => new { row.RequestID, row.HorseID });
        entity.Property(row => row.CareInstructions).HasColumnType("nvarchar(2000)");
        entity.Property(row => row.RequestID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.HorseID).HasColumnType("varchar(50)").IsRequired();
    }
}
