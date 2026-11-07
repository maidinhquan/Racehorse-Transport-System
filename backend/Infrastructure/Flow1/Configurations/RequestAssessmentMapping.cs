using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class RequestAssessmentMapping : IEntityTypeConfiguration<RequestAssessment>
{
    public void Configure(EntityTypeBuilder<RequestAssessment> entity)
    {
        entity.ToTable("REQUEST_REVIEW");
        entity.HasKey(row => row.ReviewID);
        entity.Property(row => row.ReviewID).HasColumnType("varchar(50)")
            .HasDefaultValueSql("'REQUEST_REVIEW_' + FORMAT(NEXT VALUE FOR dbo.SEQ_REQUEST_REVIEW_ID, '000', 'en-US')");
        entity.Property(row => row.RequestID).HasColumnType("varchar(50)");
        entity.Property(row => row.CoordinatorID).HasColumnType("varchar(50)");
        entity.Property(row => row.SpecialistID).HasColumnType("varchar(50)");
        entity.Property(row => row.Status).HasColumnType("varchar(40)");
        entity.Property(row => row.SelectedOptionID).HasColumnType("varchar(50)");
    }
}

public sealed class RequestScheduleOptionMapping : IEntityTypeConfiguration<RequestScheduleOption>
{
    public void Configure(EntityTypeBuilder<RequestScheduleOption> entity)
    {
        entity.ToTable("REQUEST_SCHEDULE_OPTION");
        entity.HasKey(row => row.OptionID);
        entity.Property(row => row.OptionID).HasColumnType("varchar(50)")
            .HasDefaultValueSql("'REQUEST_SCHEDULE_OPTION_' + FORMAT(NEXT VALUE FOR dbo.SEQ_REQUEST_SCHEDULE_OPTION_ID, '000', 'en-US')");
        entity.Property(row => row.ReviewID).HasColumnType("varchar(50)");
        entity.Property(row => row.PickupDate).HasColumnType("date");
        entity.Property(row => row.DeliveryDate).HasColumnType("date");
    }
}
