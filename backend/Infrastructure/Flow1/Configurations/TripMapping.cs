using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class TripMapping : IEntityTypeConfiguration<Trip>
{
    public void Configure(EntityTypeBuilder<Trip> entity)
    {
        entity.ToTable("TRIP_PLAN", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.TripID);
        entity.Property(row => row.TripID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.RequestID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.TotalDistance_km).HasColumnType("decimal(10, 2)");
        entity.Property(row => row.T_Total_Hours).HasColumnType("decimal(10, 2)");
        entity.Property(row => row.TotalCost).HasColumnType("decimal(12, 2)");
        entity.Property(row => row.Status).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.DeploymentStatus).HasColumnType("varchar(12)");
        entity.Property(row => row.DeploymentReason).HasColumnType("nvarchar(1000)");
        entity.Property(row => row.DeploymentBy).HasColumnType("varchar(50)");
        entity.Property(row => row.DeploymentAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.HandoffEventId).HasColumnType("varchar(50)");
        entity.Property(row => row.AssignedSpecialistId).HasColumnType("varchar(50)");
        entity.Property(row => row.AssignedCoordinatorId).HasColumnType("varchar(50)");
        entity.Property(row => row.TripID).HasDefaultValueSql("'TRIP_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_TRIP_PLAN_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
