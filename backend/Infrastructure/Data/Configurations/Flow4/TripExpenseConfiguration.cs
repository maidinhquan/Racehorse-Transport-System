using Domain.Entities.Flow4;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow4;

public sealed class TripExpenseConfiguration : IEntityTypeConfiguration<TripExpense>
{
    public void Configure(EntityTypeBuilder<TripExpense> builder)
    {
        builder.ToTable("TRIP_EXPENSE");
        builder.HasKey(e => e.ExpenseId).HasName("PK_TripExpense");

        builder.Property(e => e.ExpenseId).HasColumnName("ExpenseID").HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(e => e.TripId).HasColumnName("TripID").HasColumnType("varchar(50)").IsRequired();
        builder.Property(e => e.RecordedBy).HasColumnType("varchar(50)").IsRequired();
        builder.Property(e => e.MilestoneId).HasColumnName("MilestoneID").HasColumnType("varchar(50)");
        builder.Property(e => e.Category).HasColumnType("varchar(50)").IsRequired();
        builder.Property(e => e.AmountVnd).HasPrecision(14, 2).IsRequired();
        builder.Property(e => e.OccurredAt).HasColumnType("datetime2").IsRequired();
        builder.Property(e => e.Reason).HasColumnType("nvarchar(2000)").IsRequired();
        builder.Property(e => e.ReceiptPhotoUrl).HasColumnType("nvarchar(500)");
        builder.Property(e => e.ReceiptFileIds).HasColumnType("nvarchar(max)");
        builder.Property(e => e.Status).HasColumnType("varchar(30)").HasDefaultValue("RECORDED");
        builder.Property(e => e.RecordedAt).HasColumnType("datetime2").HasDefaultValueSql("GETDATE()");

        builder.HasOne(e => e.Trip)
            .WithMany()
            .HasForeignKey(e => e.TripId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_TripExpense_Trip");

        builder.HasOne(e => e.RecordedByUser)
            .WithMany()
            .HasForeignKey(e => e.RecordedBy)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_TripExpense_RecordedBy");

        builder.HasOne(e => e.Milestone)
            .WithMany(m => m.Expenses)
            .HasForeignKey(e => e.MilestoneId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_TripExpense_Milestone");
    }
}

