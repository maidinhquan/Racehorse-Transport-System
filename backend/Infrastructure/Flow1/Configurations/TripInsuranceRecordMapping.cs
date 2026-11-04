using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class TripInsuranceRecordMapping : IEntityTypeConfiguration<TripInsuranceRecord>
{
    public void Configure(EntityTypeBuilder<TripInsuranceRecord> entity)
    {
        entity.ToTable("TRIP_INSURANCE", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.InsuranceID);
        entity.Property(row => row.InsuranceID).HasColumnName("InsuranceID").HasColumnType("varchar(50)");
        entity.Property(row => row.TripID).HasColumnName("TripID").HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.Status).HasColumnName("Status").HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.CreatedAtUtc).HasColumnName("CreatedAtUtc").HasColumnType("datetime2(7)");
    }
}
