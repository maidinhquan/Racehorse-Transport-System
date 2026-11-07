using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class ContractVersionMapping : IEntityTypeConfiguration<ContractVersion>
{
    public void Configure(EntityTypeBuilder<ContractVersion> entity)
    {
        entity.ToTable("CONTRACT_VERSION", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => new { row.ContractID, row.VersionNo });
        entity.Property(row => row.ContractID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.VersionNo).HasColumnType("int").IsRequired();
        entity.Property(row => row.VersionStatus).HasColumnType("varchar(20)").IsRequired();
        entity.Property(row => row.ContentSnapshot).HasColumnType("nvarchar(max)").IsRequired();
        entity.Property(row => row.PdfUrl).HasColumnType("nvarchar(500)");
        entity.Property(row => row.CreatedBy).HasColumnType("varchar(50)");
        entity.Property(row => row.CreatedAtUtc).HasColumnType("datetime2(7)").IsRequired();
        entity.Property(row => row.PublishedBy).HasColumnType("varchar(50)");
        entity.Property(row => row.PublishedAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.TermsAcceptedAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.SignedAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.SignerEmail).HasColumnType("varchar(255)");
    }
}
