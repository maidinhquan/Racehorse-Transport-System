using Application.Interfaces.Flow1;
using Domain.Flow1;
using Microsoft.EntityFrameworkCore;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.Data.Context;

// Existing tables only. This independent scalar model does not alter teammate mappings.
public sealed class Flow1RelationalContext(DbContextOptions<Flow1RelationalContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder b)
    {
        // Mirror existing SQL foreign keys so EF orders inserts/updates correctly.
        // These are mappings only; this context never creates/migrates the database.
        b.Entity<FlowHorse>().HasOne<FlowUser>().WithMany().HasForeignKey(x=>x.OwnerID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowRequest>().HasOne<FlowUser>().WithMany().HasForeignKey(x=>x.CustomerID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowRequestHorse>().HasOne<FlowRequest>().WithMany().HasForeignKey(x=>x.RequestID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowRequestHorse>().HasOne<FlowHorse>().WithMany().HasForeignKey(x=>x.HorseID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowTrip>().HasOne<FlowRequest>().WithMany().HasForeignKey(x=>x.RequestID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowContract>().HasOne<FlowTrip>().WithMany().HasForeignKey(x=>x.TripID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowContract>().HasOne<FlowRequest>().WithMany().HasForeignKey(x=>x.RequestID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowContract>().HasOne<FlowUser>().WithMany().HasForeignKey(x=>x.CustomerID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowInvoice>().HasOne<FlowContract>().WithMany().HasForeignKey(x=>x.ContractID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowPayment>().HasOne<FlowInvoice>().WithMany().HasForeignKey(x=>x.InvoiceID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowNotice>().HasOne<FlowUser>().WithMany().HasForeignKey(x=>x.UserID).OnDelete(DeleteBehavior.Restrict);
        foreach (var type in new[] { typeof(FlowHorse), typeof(FlowRequest), typeof(FlowContract), typeof(FlowPayment),
            typeof(FlowTrip), typeof(FlowInvoice), typeof(FlowRequestHorse), typeof(FlowNotice), typeof(FlowUser) })
        {
            var e = b.Entity(type);
            foreach (var p in type.GetProperties().Where(p => p.PropertyType == typeof(DateTime) || p.PropertyType == typeof(DateTime?)))
                e.Property(p.Name).HasConversion(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
                    x => x, x => DateTime.SpecifyKind(x, DateTimeKind.Utc)));
        }
    }
}

public sealed class Flow1Data(Flow1RelationalContext db) : IFlow1Data
{
    public async Task<T?> FindAsync<T>(string id, CancellationToken ct) where T : class =>
        await db.Set<T>().FindAsync([id], ct);
    public Task<List<T>> QueryAsync<T>(System.Linq.Expressions.Expression<Func<T, bool>> predicate, CancellationToken ct) where T : class =>
        db.Set<T>().Where(predicate).ToListAsync(ct);
    public void Add(object row) => db.Add(row);
    public void Remove(object row) => db.Remove(row);
    public Task SaveAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
    public async Task<T> RunAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct)
    {
        db.ChangeTracker.Clear();
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            // MVP serializes Flow1 writes across instances. Provider I/O and PDF conversion stay outside.
            await db.Database.ExecuteSqlRawAsync("""
                DECLARE @result int;
                EXEC @result=sys.sp_getapplock @Resource=N'RaceHorse.Flow1.Relational',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
                IF @result<0 THROW 51300,'Flow1 transaction busy.',1;
                """, ct);
            var result = await action(ct); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return result;
        }
        catch (DbUpdateConcurrencyException) { await tx.RollbackAsync(ct); db.ChangeTracker.Clear(); throw Error("Data changed; reload before retrying.", "STALE_VERSION", 409); }
        catch { await tx.RollbackAsync(ct); db.ChangeTracker.Clear(); throw; }
    }
}
