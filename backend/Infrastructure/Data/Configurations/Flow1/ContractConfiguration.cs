using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow1;

public sealed class ContractConfiguration : IEntityTypeConfiguration<Contract>
{
    public void Configure(EntityTypeBuilder<Contract> builder)
    {
        builder.Property(c => c.ContractId).HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(c => c.RequestId).HasColumnType("varchar(50)").IsRequired();
        builder.Property(c => c.TripId).HasColumnType("varchar(50)").IsRequired(false);
        builder.Property(c => c.CustomerId).HasColumnType("varchar(50)");
        builder.Property(c => c.ContractCode).HasColumnType("varchar(50)");
        builder.Property(c => c.CurrencyCode).HasColumnType("varchar(3)");
        builder.Property(c => c.ContractStatus).HasColumnType("varchar(50)");
        builder.Property(c => c.SignedAt).HasColumnType("datetime");
        builder.Property(c => c.CompletionDeadline).HasColumnType("datetime2")
            .HasConversion(value => value.HasValue ? RequireUtc(value.Value) : (DateTime?)null,
                value => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : (DateTime?)null);
        builder.HasOne(c => c.Request).WithMany().HasForeignKey(c => c.RequestId)
            .OnDelete(DeleteBehavior.Restrict).HasConstraintName("FK_Contract_Request");
        builder.HasIndex(c => c.RequestId).HasDatabaseName("IX_CONTRACT_RequestID");
    }

    private static DateTime RequireUtc(DateTime value) => value.Kind == DateTimeKind.Utc
        ? value : throw new ArgumentException("CompletionDeadline must be normalized to UTC before persistence.");
}
