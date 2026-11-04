using Domain.Entities.Flow4;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow4;

public sealed class AirNoticeConfiguration : IEntityTypeConfiguration<AirNotice>
{
    public void Configure(EntityTypeBuilder<AirNotice> builder)
    {
        builder.ToTable("AIR_NOTICE");
        builder.HasKey(a => a.NoticeId).HasName("PK_AirNotice");

        builder.Property(a => a.NoticeId).HasColumnName("NoticeID").HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(a => a.TripId).HasColumnName("TripID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(a => a.BookingId).HasColumnName("BookingID").HasColumnType("varchar(50)");
        builder.Property(a => a.NoticeKind).HasColumnType("varchar(50)").IsRequired();
        builder.Property(a => a.DepartureAt).HasColumnType("datetime2");
        builder.Property(a => a.ArrivalAt).HasColumnType("datetime2");
        builder.Property(a => a.ReceivedAt).HasColumnType("datetime2").IsRequired();
        builder.Property(a => a.SourceReference).HasColumnType("nvarchar(255)").IsRequired();
        builder.Property(a => a.Reason).HasColumnType("nvarchar(2000)").IsRequired();
        builder.Property(a => a.EvidenceFileIds).HasColumnType("nvarchar(max)");
        builder.Property(a => a.IncidentId).HasColumnName("IncidentID").HasColumnType("varchar(50)");
        builder.Property(a => a.RequiresPlanChange).HasDefaultValue(false);
        builder.Property(a => a.MilestoneApplied).HasDefaultValue(false);
        builder.Property(a => a.RecordedBy).HasColumnType("varchar(50)").IsRequired();
        builder.Property(a => a.RecordedAt).HasColumnType("datetime2").HasDefaultValueSql("GETDATE()");

        builder.HasOne(a => a.Trip)
            .WithMany()
            .HasForeignKey(a => a.TripId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_AirNotice_Trip");

        builder.HasOne(a => a.RecordedByUser)
            .WithMany()
            .HasForeignKey(a => a.RecordedBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_AirNotice_RecordedBy");
    }
}

