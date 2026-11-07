using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class SupportedRouteMapping : IEntityTypeConfiguration<SupportedRoute>
{
    public void Configure(EntityTypeBuilder<SupportedRoute> entity)
    {
        entity.ToTable("SUPPORTED_ROUTE", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.RouteID);
        entity.Property(row => row.RouteID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.OriginCountry).HasColumnType("varchar(2)").IsRequired();
        entity.Property(row => row.DestinationCountry).HasColumnType("varchar(2)").IsRequired();
        entity.Property(row => row.TransportMode).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.IsActive).HasColumnType("bit").IsRequired();
        entity.Property(row => row.RouteID).HasDefaultValueSql("'ROUTE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_SUPPORTED_ROUTE_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
