using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class DocumentSupplementMapping : IEntityTypeConfiguration<DocumentSupplement>
{
    public void Configure(EntityTypeBuilder<DocumentSupplement> entity)
    {
        entity.ToTable("DOCUMENT_REQUEST", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.RequestDocID);
        entity.Property(row => row.RequestDocID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.RequestID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.KeyName).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.Scope).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.Reason).HasColumnType("nvarchar(1000)").IsRequired();
        entity.Property(row => row.Status).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.CreatedBy).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.CreatedAtUtc).HasColumnType("datetime2");
        entity.Property(row => row.FulfilledAtUtc).HasColumnType("datetime2");
    }
}
