using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class ContractClauseMapping : IEntityTypeConfiguration<ContractClause>
{
    public void Configure(EntityTypeBuilder<ContractClause> entity)
    {
        entity.ToTable("CONTRACT_TEMPLATE", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.TemplateID);
        entity.Property(row => row.TemplateID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.TemplateName).HasColumnType("nvarchar(255)").IsRequired();
        entity.Property(row => row.LanguageCode).HasColumnType("varchar(10)").IsRequired();
        entity.Property(row => row.BodyContent).HasColumnType("nvarchar(max)").IsRequired();
        entity.Property(row => row.IsActive).HasColumnType("bit").IsRequired();
        entity.Property(row => row.CreatedAt).HasColumnType("datetime").IsRequired();
        entity.Property(row => row.UpdatedAt).HasColumnType("datetime");
        entity.Property(row => row.TemplateID).HasDefaultValueSql("'CONTRACT_TEMPLATE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_CONTRACT_TEMPLATE_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
