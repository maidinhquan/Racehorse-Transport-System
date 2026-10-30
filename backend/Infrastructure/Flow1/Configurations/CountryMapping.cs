using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class CountryMapping : IEntityTypeConfiguration<Country>
{
    public void Configure(EntityTypeBuilder<Country> entity)
    {
        entity.ToTable("COUNTRY", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.CountryCode);
        entity.Property(row => row.CountryCode).HasColumnType("varchar(2)").IsRequired();
        entity.Property(row => row.CountryName).HasColumnType("nvarchar(100)").IsRequired();
        entity.Property(row => row.IsActive).HasColumnType("bit").IsRequired();
    }
}
