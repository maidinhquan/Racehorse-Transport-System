using Domain.Entities.Flow4;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow4;

public sealed class CheckpointDecisionConfiguration : IEntityTypeConfiguration<CheckpointDecision>
{
    public void Configure(EntityTypeBuilder<CheckpointDecision> builder)
    {
        builder.ToTable("LEGAL_CHECKPOINT_DECISION");
        builder.HasKey(d => d.DecisionId).HasName("PK_CheckpointDecision");

        builder.Property(d => d.DecisionId).HasColumnName("DecisionID").HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(d => d.CheckpointId).HasColumnName("CheckpointID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(d => d.MilestoneId).HasColumnName("MilestoneID").HasColumnType("varchar(50)");
        builder.Property(d => d.TripId).HasColumnName("TripID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(d => d.SpecialistId).HasColumnName("SpecialistID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(d => d.Decision).HasColumnType("varchar(30)").IsRequired();
        builder.Property(d => d.OccurredAt).HasColumnType("datetime2").IsRequired();
        builder.Property(d => d.Reason).HasColumnType("nvarchar(2000)").IsRequired();
        builder.Property(d => d.EvidenceFileIds).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(d => d.RecordedAt).HasColumnType("datetime2").HasDefaultValueSql("GETDATE()");
        builder.Property(d => d.Version).HasDefaultValue(1);

        builder.HasOne(d => d.Trip)
            .WithMany()
            .HasForeignKey(d => d.TripId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_CheckpointDecision_Trip");

        builder.HasOne(d => d.SpecialistUser)
            .WithMany()
            .HasForeignKey(d => d.SpecialistId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_CheckpointDecision_Specialist");

        builder.HasOne(d => d.Milestone)
            .WithMany()
            .HasForeignKey(d => d.MilestoneId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_CheckpointDecision_Milestone");
    }
}

