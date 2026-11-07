using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class BusinessPolicyMapping : IEntityTypeConfiguration<BusinessPolicy>
{
    public void Configure(EntityTypeBuilder<BusinessPolicy> entity)
    {
        entity.ToTable("BUSINESS_POLICY", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.PolicyID);
        entity.Property(row => row.PolicyID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.Code).HasColumnType("varchar(100)").IsRequired();
        entity.Property(row => row.ValueType).HasColumnType("varchar(10)").IsRequired();
        entity.Property(row => row.NumberValue).HasColumnType("decimal(18,6)");
        entity.Property(row => row.TextValue).HasColumnType("nvarchar(2000)");
        entity.Property(row => row.BoolValue).HasColumnType("bit");
        entity.Property(row => row.Unit).HasColumnType("varchar(30)");
        entity.Property(row => row.ScopeType).HasColumnType("varchar(20)").IsRequired();
        entity.Property(row => row.ScopeID).HasColumnType("varchar(50)");
        entity.Property(row => row.Description).HasColumnType("nvarchar(1000)").IsRequired();
        entity.Property(row => row.UpdatedBy).HasColumnType("varchar(50)");
        entity.Property(row => row.UpdatedAt).HasColumnType("datetime2(7)").IsRequired();
        entity.Property(row => row.PolicyID).HasDefaultValueSql("'BUSINESS_POLICY_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_BUSINESS_POLICY_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
