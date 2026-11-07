using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class InvoiceMapping : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> entity)
    {
        entity.ToTable("INVOICE", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.InvoiceID);
        entity.Property(row => row.InvoiceID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.ContractID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.ContractVersionNo).HasColumnType("int").IsRequired();
        entity.Property(row => row.InvoiceType).HasColumnType("varchar(50)");
        entity.Property(row => row.CurrencyCode).HasColumnType("varchar(3)").IsRequired();
        entity.Property(row => row.TotalPayableAmount).HasColumnType("decimal(12, 2)").IsRequired();
        entity.Property(row => row.PaidAmount).HasColumnType("decimal(12, 2)").IsRequired();
        entity.Property(row => row.DueDate).HasColumnType("datetime");
        entity.Property(row => row.PaymentStatus).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.InvoiceID).HasDefaultValueSql("'INVOICE_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_INVOICE_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
