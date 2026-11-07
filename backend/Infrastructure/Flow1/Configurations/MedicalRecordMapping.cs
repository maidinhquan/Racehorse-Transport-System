using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class MedicalRecordMapping : IEntityTypeConfiguration<MedicalRecord>
{
    public void Configure(EntityTypeBuilder<MedicalRecord> entity)
    {
        entity.ToTable("LEGAL_MEDICAL_RECORD", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.RecordID);
        entity.Property(row => row.RecordID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.HorseID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.RequestID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.VerifiedBy).HasColumnType("varchar(50)");
        entity.Property(row => row.DocumentType).HasColumnType("varchar(50)");
        entity.Property(row => row.RequirementStatus).HasColumnType("varchar(50)");
        entity.Property(row => row.DocumentStatus).HasColumnType("varchar(50)");
        entity.Property(row => row.UploadedFileUrl).HasColumnType("varchar(500)");
        entity.Property(row => row.ExpiryDate).HasColumnType("date");
        entity.Property(row => row.RecordID).HasDefaultValueSql("'LEGAL_MEDICAL_RECORD_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_LEGAL_MEDICAL_RECORD_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
