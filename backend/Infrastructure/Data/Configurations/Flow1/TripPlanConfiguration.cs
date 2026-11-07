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
    }
}
