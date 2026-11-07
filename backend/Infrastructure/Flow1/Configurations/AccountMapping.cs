using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Flow1.Configurations;

public sealed class AccountMapping : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> entity)
    {
        entity.ToTable("USER", table => table.UseSqlOutputClause(false));
        entity.HasKey(row => row.UserID);
        entity.Property(row => row.UserID).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.Username).HasColumnType("varchar(50)");
        entity.Property(row => row.PasswordHash).HasColumnType("varchar(255)").IsRequired();
        entity.Property(row => row.Role).HasColumnType("varchar(50)").IsRequired();
        entity.Property(row => row.FullName).HasColumnType("nvarchar(100)").IsRequired();
        entity.Property(row => row.Email).HasColumnType("varchar(100)");
        entity.Property(row => row.Phone).HasColumnType("varchar(20)");
        entity.Property(row => row.ForgotPasswordRequest).HasColumnType("nvarchar(500)");
        entity.Property(row => row.ResetPasswordRequest).HasColumnType("nvarchar(500)");
        entity.Property(row => row.ResetOtpCode).HasColumnType("varchar(10)");
        entity.Property(row => row.ResetOtpExpiry).HasColumnType("datetime2");
        entity.Property(row => row.IsActive).HasColumnType("bit").IsRequired();
        entity.Property(row => row.UserID).HasDefaultValueSql("'USER_' + FORMAT(NEXT VALUE FOR dbo.[SEQ_USER_ID], '000', 'en-US')").ValueGeneratedOnAdd();
    }
}
