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
        b.Entity<FlowMedicalRecord>().HasOne<FlowRequest>().WithMany().HasForeignKey(x=>x.RequestID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowMedicalRecord>().HasOne<FlowHorse>().WithMany().HasForeignKey(x=>x.HorseID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowMedicalRecord>().HasOne<FlowUser>().WithMany().HasForeignKey(x=>x.VerifiedBy).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowTrip>().HasOne<FlowRequest>().WithMany().HasForeignKey(x=>x.RequestID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowContract>().HasOne<FlowTrip>().WithMany().HasForeignKey(x=>x.TripID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowContract>().HasOne<FlowRequest>().WithMany().HasForeignKey(x=>x.RequestID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowContract>().HasOne<FlowUser>().WithMany().HasForeignKey(x=>x.CustomerID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowInvoice>().HasOne<FlowContract>().WithMany().HasForeignKey(x=>x.ContractID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowPayment>().HasOne<FlowInvoice>().WithMany().HasForeignKey(x=>x.InvoiceID).OnDelete(DeleteBehavior.Restrict);
        b.Entity<FlowNotice>().HasOne<FlowUser>().WithMany().HasForeignKey(x=>x.UserID).OnDelete(DeleteBehavior.Restrict);
        foreach (var type in new[] { typeof(FlowHorse), typeof(FlowRequest), typeof(FlowContract), typeof(FlowPayment),
            typeof(FlowTrip), typeof(FlowInvoice), typeof(FlowRequestHorse), typeof(FlowNotice), typeof(FlowUser), typeof(FlowMedicalRecord) })
        {
            var e = b.Entity(type);
            foreach (var p in type.GetProperties().Where(p => p.PropertyType == typeof(DateTime) || p.PropertyType == typeof(DateTime?)))
                e.Property(p.Name).HasConversion(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
                    x => x, x => DateTime.SpecifyKind(x, DateTimeKind.Utc)));
        }
    }
}

public sealed class Flow1Data(Flow1RelationalContext db,string? retainedRoot=null) : IFlow1Data
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
            if(!await Flow1RelationalSchema.IsReadyAsync(db,ct))throw Error("Flow1 requires reviewed schema006/007/008 and their trusted guards. No migration runs automatically.","FLOW1_SQL_SCHEMA_REQUIRED",503);
            // A complete source switch requires reviewed conversion, not per-row JSON fallback.
            // Empty retained004 columns are harmless; nonempty legacy state closes the typed API.
            foreach(var table in new[]{"HORSE","TRANSPORT_REQUEST","CONTRACT","USER"})
            {
                var retained=await db.Database.SqlQueryRaw<int>("""
                    DECLARE @count int=0,@sql nvarchar(max);
                    IF COL_LENGTH(N'dbo.'+QUOTENAME(@table),N'Flow1StateJson') IS NOT NULL
                    BEGIN
                      SET @sql=N'SELECT @n=COUNT(*) FROM dbo.'+QUOTENAME(@table)+N' WHERE (Flow1StateJson IS NOT NULL AND DATALENGTH(Flow1StateJson)>0) OR Flow1StateVersion<>0';
                      EXEC sys.sp_executesql @sql,N'@n int OUTPUT',@n=@count OUTPUT;
                    END;
                    SELECT @count AS Value;
                    """,new Microsoft.Data.SqlClient.SqlParameter("@table",table)).ToListAsync(ct);
                if(retained[0]!=0)throw Error("Retained Flow1 state requires offline conversion/parity and operator cutover.","FLOW1_STATE_IMPORT_REQUIRED",503);
            }
            string? retainedFiles;
            try{retainedFiles=Infrastructure.Storage.Flow1RetainedSources.Fingerprint(retainedRoot);}
            catch(Exception e)when(e is IOException or UnauthorizedAccessException){throw Error("Retained source inventory needs operator review.","FLOW1_STATE_IMPORT_REQUIRED",503);}
            if(retainedFiles is not null)
            {
                var approved=await db.Database.SqlQueryRaw<string>("SELECT CONVERT(nvarchar(64),value) AS Value FROM sys.extended_properties WHERE class=0 AND name=N'Flow1.RelationalRetainedSourceFingerprint'").ToListAsync(ct);
                if(approved.Count!=1||approved[0]!=retainedFiles)throw Error("Retained source files require reviewed conversion/parity; no payload fallback was attempted.","FLOW1_STATE_IMPORT_REQUIRED",503);
            }
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
