using Domain.Entities.Flow4;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow4;

public sealed class ExecutionAlertConfiguration : IEntityTypeConfiguration<ExecutionAlert>
{
    public void Configure(EntityTypeBuilder<ExecutionAlert> builder)
    {
        builder.ToTable("EXECUTION_ALERT");
        builder.HasKey(a => a.AlertId).HasName("PK_ExecutionAlert");

        builder.Property(a => a.AlertId).HasColumnName("AlertID").HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(a => a.TripId).HasColumnName("TripID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(a => a.MilestoneId).HasColumnName("MilestoneID").HasColumnType("varchar(50)");
        builder.Property(a => a.AlertKind).HasColumnType("varchar(50)").IsRequired();
        builder.Property(a => a.Status).HasColumnType("varchar(20)").HasDefaultValue("OPEN");
        builder.Property(a => a.Message).HasColumnType("nvarchar(1000)").IsRequired();
        builder.Property(a => a.AssigneeUserIds).HasColumnType("nvarchar(500)");
        builder.Property(a => a.AcknowledgedBy).HasColumnType("varchar(50)");
        builder.Property(a => a.AcknowledgedAt).HasColumnType("datetime2");
        builder.Property(a => a.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETDATE()");

        builder.HasOne(a => a.Trip)
            .WithMany()
            .HasForeignKey(a => a.TripId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_ExecutionAlert_Trip");

        builder.HasOne(a => a.Milestone)
            .WithMany()
            .HasForeignKey(a => a.MilestoneId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_ExecutionAlert_Milestone");

        builder.HasOne(a => a.AcknowledgedByUser)
            .WithMany()
            .HasForeignKey(a => a.AcknowledgedBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_ExecutionAlert_User");
    }
}

