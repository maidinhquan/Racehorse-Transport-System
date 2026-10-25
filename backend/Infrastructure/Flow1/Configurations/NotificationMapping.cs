using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class NotificationMapping : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> entity)
    {
        entity.ToTable("NOTIFICATION", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.NotificationID);
        entity.Property(row => row.NotificationID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.UserID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.ReferenceID).HasColumnType("varchar(50)");
        entity.Property(row => row.Type).HasColumnType("varchar(50)");
        entity.Property(row => row.Channel).HasColumnType("varchar(50)");
        entity.Property(row => row.Title).HasColumnType("nvarchar(200)");
        entity.Property(row => row.Message).HasColumnType("nvarchar(max)");
        entity.Property(row => row.IsRead).HasColumnType("bit").IsRequired();
        entity.Property(row => row.SentAt).HasColumnType("datetime").IsRequired();
        entity.Property(row => row.NotificationID).HasDefaultValueSql("'NOTIFICATION_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_NOTIFICATION_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
