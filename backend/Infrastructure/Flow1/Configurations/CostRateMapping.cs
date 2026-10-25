using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class CostRateMapping : IEntityTypeConfiguration<CostRate>
{
    public void Configure(EntityTypeBuilder<CostRate> entity)
    {
        entity.ToTable("COST_RATE", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.CostRateID);
        entity.Property(row => row.CostRateID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.Code).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.CostGroup).HasColumnType("varchar(20)").IsRequired();
        entity.Property(row => row.CalculationUnit).HasColumnType("varchar(40)").IsRequired();
        entity.Property(row => row.Rate).HasColumnType("decimal(18,6)").IsRequired();
        entity.Property(row => row.CurrencyCode).HasColumnType("varchar(3)").IsRequired();
        entity.Property(row => row.IsActive).HasColumnType("bit").IsRequired();
        entity.Property(row => row.CostRateID).HasDefaultValueSql("'COST_RATE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_COST_RATE_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
