using Domain.Entities.Flow4;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow4;

public sealed class ExecutionAttachmentConfiguration : IEntityTypeConfiguration<ExecutionAttachment>
{
    public void Configure(EntityTypeBuilder<ExecutionAttachment> builder)
    {
        builder.ToTable("EXECUTION_ATTACHMENT");
        builder.HasKey(a => a.FileId).HasName("PK_ExecutionAttachment");

        builder.Property(a => a.FileId).HasColumnName("FileID").HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(a => a.TripId).HasColumnName("TripID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(a => a.HorseId).HasColumnName("HorseID").HasColumnType("varchar(50)");
        builder.Property(a => a.FileName).HasColumnType("nvarchar(255)").IsRequired();
        builder.Property(a => a.ContentType).HasColumnType("varchar(100)").IsRequired();
        builder.Property(a => a.FileSize).IsRequired();
        builder.Property(a => a.Purpose).HasColumnType("varchar(30)").IsRequired();
        builder.Property(a => a.StoragePath).HasColumnType("nvarchar(500)").IsRequired();
        builder.Property(a => a.UploadedBy).HasColumnType("varchar(50)").IsRequired();
        builder.Property(a => a.UploadedAtUtc).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(a => a.Trip)
            .WithMany()
            .HasForeignKey(a => a.TripId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_ExecutionAttachment_Trip");

        builder.HasOne(a => a.Horse)
            .WithMany()
            .HasForeignKey(a => a.HorseId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_ExecutionAttachment_Horse");

        builder.HasOne(a => a.UploadedByUser)
            .WithMany()
            .HasForeignKey(a => a.UploadedBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_ExecutionAttachment_User");
    }
}

