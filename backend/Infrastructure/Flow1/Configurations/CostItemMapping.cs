using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class CostItemMapping : IEntityTypeConfiguration<CostItem>
{
    public void Configure(EntityTypeBuilder<CostItem> entity)
    {
        entity.ToTable("COST_ITEM", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.CostItemID);
        entity.Property(row => row.CostItemID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.ContractID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.CategoryName).HasColumnType("nvarchar(100)");
        entity.Property(row => row.SubcodeName).HasColumnType("nvarchar(100)");
        entity.Property(row => row.Bearer).HasColumnType("varchar(50)");
        entity.Property(row => row.CurrencyCode).HasColumnType("varchar(3)").IsRequired();
        entity.Property(row => row.TotalMoney).HasColumnType("decimal(12, 2)");
        entity.Property(row => row.EvidenceUrl).HasColumnType("varchar(500)");
        entity.Property(row => row.CostItemID).HasDefaultValueSql("'COST_ITEM_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_COST_ITEM_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
