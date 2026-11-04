using Domain.Entities.Flow4;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow4;

public sealed class VetAssessmentConfiguration : IEntityTypeConfiguration<VetAssessment>
{
    public void Configure(EntityTypeBuilder<VetAssessment> builder)
    {
        builder.ToTable("VET_ASSESSMENT");
        builder.HasKey(v => v.AssessmentId).HasName("PK_VetAssessment");

        builder.Property(v => v.AssessmentId).HasColumnName("AssessmentID").HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(v => v.TripId).HasColumnName("TripID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(v => v.HorseId).HasColumnName("HorseID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(v => v.VetId).HasColumnName("VetID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(v => v.HealthLogId).HasColumnName("HealthLogID").HasColumnType("varchar(50)");
        builder.Property(v => v.TransportFitness).HasColumnType("varchar(20)").HasDefaultValue("FIT");
        builder.Property(v => v.Conclusion).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(v => v.CareInstructions).HasColumnType("nvarchar(max)");
        builder.Property(v => v.EvidenceFileIds).HasColumnType("nvarchar(max)");
        builder.Property(v => v.IncidentId).HasColumnName("IncidentID").HasColumnType("varchar(50)");
        builder.Property(v => v.AssessedAt).HasColumnType("datetime2").IsRequired();
        builder.Property(v => v.RecordedAt).HasColumnType("datetime2").HasDefaultValueSql("GETDATE()");

        builder.HasOne(v => v.Trip)
            .WithMany()
            .HasForeignKey(v => v.TripId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_VetAssessment_Trip");

        builder.HasOne(v => v.Horse)
            .WithMany()
            .HasForeignKey(v => v.HorseId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_VetAssessment_Horse");

        builder.HasOne(v => v.VetUser)
            .WithMany()
            .HasForeignKey(v => v.VetId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_VetAssessment_Vet");

        builder.HasOne(v => v.HealthLog)
            .WithMany()
            .HasForeignKey(v => v.HealthLogId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_VetAssessment_HealthLog");
    }
}

