using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Flow1.Data;

public sealed class RequestContext(DbContextOptions<RequestContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder model)
    {
        model.ApplyConfigurationsFromAssembly(typeof(RequestContext).Assembly,
            type => type.Namespace == "Infrastructure.Flow1.Configurations");
        model.Entity<RequestHorse>().HasOne<TransportRequest>().WithMany().HasForeignKey(x => x.RequestID);
        model.Entity<RequestHorse>().HasOne<Horse>().WithMany().HasForeignKey(x => x.HorseID);
        model.Entity<ContractVersion>().HasOne<Contract>().WithMany().HasForeignKey(x => x.ContractID);
        model.Entity<Invoice>().HasOne<ContractVersion>().WithMany().HasForeignKey(x => new { x.ContractID, VersionNo = x.ContractVersionNo });
        model.Entity<Payment>().HasOne<Invoice>().WithMany().HasForeignKey(x => x.InvoiceID);
        model.Entity<Contract>().HasOne<TransportRequest>().WithMany().HasForeignKey(x => x.RequestID);
        model.Entity<TransportRequest>().HasIndex(x => new { x.CustomerID, x.SubmissionKeyHash }).IsUnique().HasFilter("[SubmissionKeyHash] IS NOT NULL");
        model.Entity<Contract>().HasIndex(x => x.RequestID).IsUnique();
        model.Entity<Trip>().HasIndex(x => x.RequestID).IsUnique();
    }
}
