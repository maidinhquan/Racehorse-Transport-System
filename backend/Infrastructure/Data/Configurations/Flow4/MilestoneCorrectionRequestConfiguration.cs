using Domain.Entities.Flow4;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow4;

public sealed class MilestoneCorrectionRequestConfiguration : IEntityTypeConfiguration<MilestoneCorrectionRequest>
{
    public void Configure(EntityTypeBuilder<MilestoneCorrectionRequest> builder)
    {
        builder.ToTable("MILESTONE_CORRECTION_REQUEST");
        builder.HasKey(c => c.CorrectionId).HasName("PK_MilestoneCorrection");

        builder.Property(c => c.CorrectionId).HasColumnName("CorrectionID").HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(c => c.MilestoneId).HasColumnName("MilestoneID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(c => c.TripId).HasColumnName("TripID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(c => c.RequestedBy).HasColumnType("varchar(50)").IsRequired();
        builder.Property(c => c.RequestedAt).HasColumnType("datetime2").HasDefaultValueSql("GETDATE()");
        builder.Property(c => c.ProposedOccurredAt).HasColumnType("datetime2").IsRequired();
        builder.Property(c => c.ProposedNote).HasColumnType("nvarchar(max)");
        builder.Property(c => c.ProposedEvidenceFileIds).HasColumnType("nvarchar(max)");
        builder.Property(c => c.OriginalOccurredAt).HasColumnType("datetime2");
        builder.Property(c => c.OriginalNote).HasColumnType("nvarchar(max)");
        builder.Property(c => c.OriginalEvidenceFileIds).HasColumnType("nvarchar(max)");
        builder.Property(c => c.Reason).HasColumnType("nvarchar(2000)").IsRequired();
        builder.Property(c => c.Status).HasColumnType("varchar(30)").HasDefaultValue("PENDING");
        builder.Property(c => c.Version).HasDefaultValue(1);
        builder.Property(c => c.DecidedBy).HasColumnType("varchar(50)");
        builder.Property(c => c.DecidedAt).HasColumnType("datetime2");
        builder.Property(c => c.DecisionReason).HasColumnType("nvarchar(2000)");

        builder.HasOne(c => c.Milestone)
            .WithMany(m => m.CorrectionRequests)
            .HasForeignKey(c => c.MilestoneId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_MilestoneCorrection_Milestone");

        builder.HasOne(c => c.Trip)
            .WithMany()
            .HasForeignKey(c => c.TripId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_MilestoneCorrection_Trip");

        builder.HasOne(c => c.RequestedByUser)
            .WithMany()
            .HasForeignKey(c => c.RequestedBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_MilestoneCorrection_RequestedBy");

        builder.HasOne(c => c.DecidedByUser)
            .WithMany()
            .HasForeignKey(c => c.DecidedBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_MilestoneCorrection_DecidedBy");
    }
}

