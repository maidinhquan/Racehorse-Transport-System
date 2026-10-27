using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class ContractMapping : IEntityTypeConfiguration<Contract>
{
    public void Configure(EntityTypeBuilder<Contract> entity)
    {
        entity.ToTable("CONTRACT", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.ContractID);
        entity.Property(row => row.CommercialNotes).HasColumnType("nvarchar(2000)");
        entity.Property(row => row.ContractID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.CurrentVersionNo).HasColumnType("int");
        entity.Property(row => row.TripID).HasColumnType("varchar(50)");
        entity.Property(row => row.CustomerID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.CurrencyCode).HasColumnType("varchar(3)").IsRequired();
        entity.Property(row => row.TotalQuotedPrice).HasColumnType("decimal(12, 2)");
        entity.Property(row => row.DepositRateStandard).HasColumnType("decimal(5, 2)");
        entity.Property(row => row.SignedAt).HasColumnType("datetime");
        entity.Property(row => row.ContractStatus).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.RequestID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.CompletionDeadline).HasColumnType("datetime2(7)");
        entity.Property(row => row.PdfUrl).HasColumnType("varchar(500)");
        entity.Property(row => row.SignOtpHash).HasColumnType("varchar(255)");
        entity.Property(row => row.SignOtpExpiry).HasColumnType("datetime2(7)");
        entity.Property(row => row.SignOtpFailedAttempts).HasColumnType("int").IsRequired();
        entity.Property(row => row.DepositAmount).HasColumnType("decimal(12,2)");
        entity.Property(row => row.SignOtpSentAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.SignerEmail).HasColumnType("varchar(255)");
        entity.Property(row => row.PublishedAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.PublishedBy).HasColumnType("varchar(50)");
        entity.Property(row => row.LastExtensionReason).HasColumnType("nvarchar(1000)");
        entity.Property(row => row.LastExtensionBy).HasColumnType("varchar(50)");
        entity.Property(row => row.LastExtensionAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.CancellationId).HasColumnType("varchar(50)");
        entity.Property(row => row.CancellationStatus).HasColumnType("varchar(12)");
        entity.Property(row => row.CancellationReason).HasColumnType("nvarchar(1000)");
        entity.Property(row => row.CancellationRequestedAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.CancellationDecisionReason).HasColumnType("nvarchar(1000)");
        entity.Property(row => row.CancellationDecidedBy).HasColumnType("varchar(50)");
        entity.Property(row => row.CancellationDecidedAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.CustomerFeedback).HasColumnType("nvarchar(2000)");
        entity.Property(row => row.FeedbackStatus).HasColumnType("varchar(20)");
        entity.Property(row => row.FeedbackAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.ManagerFeedback).HasColumnType("nvarchar(2000)");
        entity.Property(row => row.FeedbackHandledAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.RefundAmount).HasColumnType("decimal(12,2)");
        entity.Property(row => row.RefundStatus).HasColumnType("varchar(20)");
        entity.Property(row => row.RefundReference).HasColumnType("varchar(100)");
        entity.Property(row => row.ContractID).HasDefaultValueSql("'CONTRACT_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_CONTRACT_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
