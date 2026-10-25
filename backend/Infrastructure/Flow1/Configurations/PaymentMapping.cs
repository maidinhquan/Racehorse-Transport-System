using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class PaymentMapping : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> entity)
    {
        entity.ToTable("PAYMENT", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.PaymentID);
        entity.Property(row => row.PaymentID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.InvoiceID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.ConfirmedByUserID).HasColumnType("varchar(50)");
        entity.Property(row => row.CurrencyCode).HasColumnType("varchar(3)").IsRequired();
        entity.Property(row => row.Amount).HasColumnType("decimal(12, 2)").IsRequired();
        entity.Property(row => row.Method).HasColumnType("varchar(50)");
        entity.Property(row => row.TransactionCode).HasColumnType("varchar(100)");
        entity.Property(row => row.Status).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.PaymentDate).HasColumnType("datetime").IsRequired();
        entity.Property(row => row.VnpayBankCode).HasColumnType("varchar(50)");
        entity.Property(row => row.VnpayResponseCode).HasColumnType("varchar(10)");
        entity.Property(row => row.VnpayTransactionStatus).HasColumnType("varchar(10)");
        entity.Property(row => row.VnpayTmnCode).HasColumnType("varchar(8)");
        entity.Property(row => row.VnpayCreatedAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.VnpayExpiresAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.VnpayReceivedAmount).HasColumnType("decimal(12,2)");
        entity.Property(row => row.FinancialReviewRequired).HasColumnType("bit").IsRequired();
        entity.Property(row => row.FinancialReviewReason).HasColumnType("nvarchar(1000)");
        entity.Property(row => row.FinancialReviewedBy).HasColumnType("varchar(50)");
        entity.Property(row => row.FinancialReviewedAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.PaymentID).HasDefaultValueSql("'PAYMENT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_PAYMENT_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
