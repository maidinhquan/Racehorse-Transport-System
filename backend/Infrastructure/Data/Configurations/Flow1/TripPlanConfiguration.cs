using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow1;

public sealed class TripPlanConfiguration : IEntityTypeConfiguration<TripPlan>
{
    public void Configure(EntityTypeBuilder<TripPlan> builder)
    {
        builder.Property(t => t.TripId).HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(t => t.RequestId).HasColumnType("varchar(50)");
        builder.HasIndex(t => t.RequestId).IsUnique().HasDatabaseName("UX_TRIP_PLAN_RequestID");

        // Cấu hình Fluent API cho ngoại lệ tiếp cận điểm đón & xe trung chuyển (Flow 5)
        builder.Property(t => t.PickupAccessStatus)
            .HasColumnType("varchar(30)")
            .HasMaxLength(30)
            .HasDefaultValue("NORMAL")
            .IsRequired();

        builder.Property(t => t.RelocationMeetingPointName)
            .HasColumnType("nvarchar(255)")
            .HasMaxLength(255)
            .IsRequired(false);

        builder.Property(t => t.RelocationLatitude)
            .HasColumnType("decimal(9, 6)")
            .HasPrecision(9, 6)
            .IsRequired(false);

        builder.Property(t => t.RelocationLongitude)
            .HasColumnType("decimal(9, 6)")
            .HasPrecision(9, 6)
            .IsRequired(false);

        builder.Property(t => t.RelocationDistanceMeters)
            .HasColumnType("int")
            .IsRequired(false);

        builder.Property(t => t.ShuttleVehicleId)
            .HasColumnType("varchar(50)")
            .HasMaxLength(50)
            .IsRequired(false);

        builder.Property(t => t.ShuttleDriverId)
            .HasColumnType("varchar(50)")
            .HasMaxLength(50)
            .IsRequired(false);

        builder.Property(t => t.ShuttleCostVnd)
            .HasColumnType("decimal(12, 2)")
            .HasPrecision(12, 2)
            .HasDefaultValue(0m)
            .IsRequired(false);

        builder.Property(t => t.CustomerApprovalStatus)
            .HasColumnType("varchar(20)")
            .HasMaxLength(20)
            .IsRequired(false);

        builder.Property(t => t.CustomerApprovalAt)
            .HasColumnType("datetime2(7)")
            .IsRequired(false);

        builder.HasOne(t => t.ShuttleVehicle)
            .WithMany()
            .HasForeignKey(t => t.ShuttleVehicleId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_TripPlan_ShuttleVehicle");

        builder.HasOne(t => t.ShuttleDriver)
            .WithMany()
            .HasForeignKey(t => t.ShuttleDriverId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_TripPlan_ShuttleDriver");
    }
}
