using Domain.Entities.Flow4;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow4;

public sealed class TripMilestoneConfiguration : IEntityTypeConfiguration<TripMilestone>
{
    public void Configure(EntityTypeBuilder<TripMilestone> builder)
    {
        builder.ToTable("TRIP_MILESTONE");
        builder.HasKey(m => m.MilestoneId).HasName("PK_TripMilestone");

        builder.Property(m => m.MilestoneId).HasColumnName("MilestoneID").HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(m => m.TripId).HasColumnName("TripID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(m => m.Leg).HasColumnType("varchar(20)").HasDefaultValue("road");
        builder.Property(m => m.MilestoneKind).HasColumnType("varchar(50)").IsRequired();
        builder.Property(m => m.SequenceOrder).IsRequired();
        builder.Property(m => m.Label).HasColumnType("nvarchar(255)").IsRequired();
        builder.Property(m => m.Status).HasColumnType("varchar(20)").HasDefaultValue("PENDING");
        builder.Property(m => m.PlannedTime).HasColumnType("datetime2").IsRequired();
        builder.Property(m => m.OccurredAt).HasColumnType("datetime2");
        builder.Property(m => m.RecordedAt).HasColumnType("datetime2");
        builder.Property(m => m.RecordedBy).HasColumnType("varchar(50)");
        builder.Property(m => m.Revision).HasDefaultValue(1);
        builder.Property(m => m.RequiresHealthCheck).HasDefaultValue(false);
        builder.Property(m => m.LocationCoordinates).HasColumnType("varchar(100)");
        builder.Property(m => m.Latitude).HasPrecision(9, 6);
        builder.Property(m => m.Longitude).HasPrecision(9, 6);
        builder.Property(m => m.Note).HasColumnType("nvarchar(max)");
        builder.Property(m => m.EvidenceFileIds).HasColumnType("nvarchar(max)");
        builder.Property(m => m.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETDATE()");
        builder.Property(m => m.UpdatedAt).HasColumnType("datetime2");

        builder.HasOne(m => m.Trip)
            .WithMany()
            .HasForeignKey(m => m.TripId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_TripMilestone_Trip");

        builder.HasOne(m => m.RecordedByUser)
            .WithMany()
            .HasForeignKey(m => m.RecordedBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_TripMilestone_RecordedBy");
    }
}

