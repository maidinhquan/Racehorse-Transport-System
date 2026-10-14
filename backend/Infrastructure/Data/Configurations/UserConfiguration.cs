using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("USER");
        builder.HasKey(u => u.UserId).HasName("PK_User");
        builder.Property(u => u.UserId).HasColumnName("UserID").HasColumnType("varchar(50)").ValueGeneratedNever();
        builder.Property(u => u.Username).HasColumnType("varchar(50)");
        builder.Property(u => u.PasswordHash).HasColumnType("varchar(255)").IsRequired();
        builder.Property(u => u.Role).HasColumnType("varchar(50)").IsRequired();
        builder.Property(u => u.FullName).HasColumnType("nvarchar(100)").IsRequired();
        builder.Property(u => u.Email).HasColumnType("varchar(100)");
        builder.Property(u => u.Phone).HasColumnType("varchar(20)");
        builder.Property(u => u.IsActive).HasDefaultValue(true);
        builder.HasIndex(u => u.Email).IsUnique().HasFilter("[Email] IS NOT NULL").HasDatabaseName("UX_USER_Email");
        builder.HasIndex(u => u.Phone).IsUnique().HasFilter("[Phone] IS NOT NULL").HasDatabaseName("UX_USER_Phone");
    }
}
