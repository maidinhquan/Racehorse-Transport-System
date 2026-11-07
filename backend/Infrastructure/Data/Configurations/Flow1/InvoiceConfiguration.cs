using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations.Flow1;

public sealed class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.Property(i => i.InvoiceId).HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(i => i.ContractId).HasColumnType("varchar(50)");
        builder.Property(i => i.InvoiceType).HasColumnType("varchar(50)");
        builder.HasIndex(i => i.ContractId).IsUnique().HasFilter("[InvoiceType] = 'DEPOSIT'")
            .HasDatabaseName("UX_INVOICE_ContractID_Deposit");
    }
}
