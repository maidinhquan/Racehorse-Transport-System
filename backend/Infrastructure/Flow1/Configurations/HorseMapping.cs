using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class HorseMapping : IEntityTypeConfiguration<Horse>
{
    public void Configure(EntityTypeBuilder<Horse> entity)
    {
        entity.ToTable("HORSE", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.HorseID);
        entity.Property(row => row.PassportIssuedBy).HasColumnType("nvarchar(200)");
        entity.Property(row => row.PassportIssuedDate).HasColumnType("date");
        entity.Property(row => row.PassportExpiryDate).HasColumnType("date");
        entity.Property(row => row.OwnershipCertificateFileUrl).HasColumnType("nvarchar(500)");
        entity.Property(row => row.ValuationDocumentFileUrl).HasColumnType("nvarchar(500)");
        entity.Property(row => row.DeclaredValueVnd).HasColumnType("decimal(18,2)");
        entity.Property(row => row.SpecialHealthNotes).HasColumnType("nvarchar(2000)");
        entity.Property(row => row.HorseID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.OwnerID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.Microchip_ISO).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.FEI_Passport_No).HasColumnType("varchar(50)");
        entity.Property(row => row.Name).HasColumnType("nvarchar(100)").IsRequired();
        entity.Property(row => row.Breed).HasColumnType("nvarchar(100)");
        entity.Property(row => row.Sex).HasColumnType("varchar(20)");
        entity.Property(row => row.ReproductiveStatus).HasColumnType("varchar(50)");
        entity.Property(row => row.Weight).HasColumnType("decimal(10, 2)");
        entity.Property(row => row.DOB).HasColumnType("date");
        entity.Property(row => row.PhotoUrl).HasColumnType("nvarchar(500)");
        entity.Property(row => row.PassportScanUrl).HasColumnType("nvarchar(500)");
        entity.Property(row => row.HorseID).HasDefaultValueSql("'HORSE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_HORSE_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
