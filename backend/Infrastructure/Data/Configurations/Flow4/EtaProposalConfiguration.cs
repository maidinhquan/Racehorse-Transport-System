using Domain.Entities.Flow4;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow4;

public sealed class EtaProposalConfiguration : IEntityTypeConfiguration<EtaProposal>
{
    public void Configure(EntityTypeBuilder<EtaProposal> builder)
    {
        builder.ToTable("ETA_PROPOSAL");
        builder.HasKey(e => e.ProposalId).HasName("PK_EtaProposal");

        builder.Property(e => e.ProposalId).HasColumnName("ProposalID").HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(e => e.TripId).HasColumnName("TripID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(e => e.MilestoneId).HasColumnName("MilestoneID").HasColumnType("varchar(50)");
        builder.Property(e => e.CurrentEtaSnapshot).HasColumnType("datetime2").IsRequired();
        builder.Property(e => e.ProposedEta).HasColumnType("datetime2").IsRequired();
        builder.Property(e => e.Reason).HasColumnType("nvarchar(2000)").IsRequired();
        builder.Property(e => e.LinkedIncidentId).HasColumnType("varchar(50)");
        builder.Property(e => e.Status).HasColumnType("varchar(30)").HasDefaultValue("PENDING_COORDINATOR");
        builder.Property(e => e.RequiresManager).HasDefaultValue(false);
        builder.Property(e => e.EscalationReason).HasColumnType("nvarchar(1000)");
        builder.Property(e => e.ProposedBy).HasColumnType("varchar(50)").IsRequired();
        builder.Property(e => e.ProposedAt).HasColumnType("datetime2").HasDefaultValueSql("GETDATE()");
        builder.Property(e => e.CoordinatorDecisionBy).HasColumnType("varchar(50)");
        builder.Property(e => e.CoordinatorDecisionAt).HasColumnType("datetime2");
        builder.Property(e => e.CoordinatorDecisionReason).HasColumnType("nvarchar(2000)");
        builder.Property(e => e.ManagerDecisionBy).HasColumnType("varchar(50)");
        builder.Property(e => e.ManagerDecisionAt).HasColumnType("datetime2");
        builder.Property(e => e.ManagerDecisionReason).HasColumnType("nvarchar(2000)");
        builder.Property(e => e.Version).HasDefaultValue(1);

        builder.HasOne(e => e.Trip)
            .WithMany()
            .HasForeignKey(e => e.TripId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_EtaProposal_Trip");

        builder.HasOne(e => e.Milestone)
            .WithMany()
            .HasForeignKey(e => e.MilestoneId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_EtaProposal_Milestone");

        builder.HasOne(e => e.ProposedByUser)
            .WithMany()
            .HasForeignKey(e => e.ProposedBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_EtaProposal_ProposedBy");

        builder.HasOne(e => e.CoordinatorDecisionByUser)
            .WithMany()
            .HasForeignKey(e => e.CoordinatorDecisionBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_EtaProposal_CoordDecisionBy");

        builder.HasOne(e => e.ManagerDecisionByUser)
            .WithMany()
            .HasForeignKey(e => e.ManagerDecisionBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_EtaProposal_ManagerDecisionBy");
    }
}

