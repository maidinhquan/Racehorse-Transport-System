using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class TransportRequestMapping : IEntityTypeConfiguration<TransportRequest>
{
    public void Configure(EntityTypeBuilder<TransportRequest> entity)
    {
        entity.ToTable("TRANSPORT_REQUEST", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.RequestID);
        entity.Property(row => row.PickupCityId).HasColumnType("varchar(1024)");
        entity.Property(row => row.DeliveryCityId).HasColumnType("varchar(1024)");
        entity.Property(row => row.PickupCityName).HasColumnType("nvarchar(255)");
        entity.Property(row => row.DeliveryCityName).HasColumnType("nvarchar(255)");
        entity.Property(row => row.PickupStableName).HasColumnType("nvarchar(200)");
        entity.Property(row => row.PickupPostalCode).HasColumnType("nvarchar(20)");
        entity.Property(row => row.PickupInstructions).HasColumnType("nvarchar(1000)");
        entity.Property(row => row.DeliveryStableName).HasColumnType("nvarchar(200)");
        entity.Property(row => row.DeliveryPostalCode).HasColumnType("nvarchar(20)");
        entity.Property(row => row.DeliveryInstructions).HasColumnType("nvarchar(1000)");
        entity.Property(row => row.InvitationLetterFileUrl).HasColumnType("nvarchar(500)");
        entity.Property(row => row.CompetitionRegistrationFileUrl).HasColumnType("nvarchar(500)");
        entity.Property(row => row.AtaCarnetFileUrl).HasColumnType("nvarchar(500)");
        entity.Property(row => row.CareInstructions).HasColumnType("nvarchar(2000)");
        entity.Property(row => row.DeclaredValueVnd).HasColumnType("decimal(18,2)");
        entity.Property(row => row.RequestID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.CustomerID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.Departure).HasColumnType("nvarchar(255)").IsRequired();
        entity.Property(row => row.Destination).HasColumnType("nvarchar(255)").IsRequired();
        entity.Property(row => row.Purpose).HasColumnType("nvarchar(100)");
        entity.Property(row => row.TransportType).HasColumnType("varchar(50)");
        entity.Property(row => row.CreatedAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.ExpectedDate).HasColumnType("datetime");
        entity.Property(row => row.CommittedDeadline).HasColumnType("datetime");
        entity.Property(row => row.DesignatedReceiverName).HasColumnType("nvarchar(100)");
        entity.Property(row => row.DesignatedReceiverPhone).HasColumnType("varchar(20)");
        entity.Property(row => row.BaseCost).HasColumnType("decimal(12, 2)");
        entity.Property(row => row.Status).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.PickupLatitude).HasColumnType("decimal(9,6)");
        entity.Property(row => row.PickupLongitude).HasColumnType("decimal(9,6)");
        entity.Property(row => row.DeliveryLatitude).HasColumnType("decimal(9,6)");
        entity.Property(row => row.DeliveryLongitude).HasColumnType("decimal(9,6)");
        entity.Property(row => row.DistanceKm).HasColumnType("decimal(10,2)");
        entity.Property(row => row.PickupContactName).HasColumnType("nvarchar(100)");
        entity.Property(row => row.PickupContactPhone).HasColumnType("varchar(20)");
        entity.Property(row => row.ManagerNotes).HasColumnType("nvarchar(1000)");
        entity.Property(row => row.OriginCountry).HasColumnType("varchar(2)");
        entity.Property(row => row.DestinationCountry).HasColumnType("varchar(2)");
        entity.Property(row => row.PreparationDays).HasColumnType("int");
        entity.Property(row => row.SubmissionKeyHash).HasColumnType("varchar(64)");
        entity.Property(row => row.SubmissionContentHash).HasColumnType("varchar(64)");
        entity.Property(row => row.RevisionFeedback).HasColumnType("nvarchar(2000)");
        entity.Property(row => row.CancellationPreviousStatus).HasColumnType("varchar(50)");
        entity.Property(row => row.CancellationReason).HasColumnType("nvarchar(1000)");
        entity.Property(row => row.CancellationRequestedBy).HasColumnType("varchar(50)");
        entity.Property(row => row.CancellationRequestedAtUtc).HasColumnType("datetime2(7)");
        entity.Property(row => row.RequestID).HasDefaultValueSql("'REQUEST_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_TRANSPORT_REQUEST_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
