using Domain.Entities.Flow4;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow4;

public sealed class ExecutionContactLogConfiguration : IEntityTypeConfiguration<ExecutionContactLog>
{
    public void Configure(EntityTypeBuilder<ExecutionContactLog> builder)
    {
        builder.ToTable("EXECUTION_CONTACT_LOG");
        builder.HasKey(c => c.ContactLogId).HasName("PK_ContactLog");

        builder.Property(c => c.ContactLogId).HasColumnName("ContactLogID").HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(c => c.TripId).HasColumnName("TripID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(c => c.ContactedUserId).HasColumnName("ContactedUserID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(c => c.RecordedBy).HasColumnType("varchar(50)").IsRequired();
        builder.Property(c => c.ContactedAt).HasColumnType("datetime2").IsRequired();
        builder.Property(c => c.Channel).HasColumnType("varchar(30)").HasDefaultValue("PHONE");
        builder.Property(c => c.Result).HasColumnType("nvarchar(2000)").IsRequired();
        builder.Property(c => c.RecordedAt).HasColumnType("datetime2").HasDefaultValueSql("GETDATE()");

        builder.HasOne(c => c.Trip)
            .WithMany()
            .HasForeignKey(c => c.TripId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_ContactLog_Trip");

        builder.HasOne(c => c.ContactedUser)
            .WithMany()
            .HasForeignKey(c => c.ContactedUserId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_ContactLog_ContactedUser");

        builder.HasOne(c => c.RecordedByUser)
            .WithMany()
            .HasForeignKey(c => c.RecordedBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_ContactLog_RecordedBy");
    }
}

