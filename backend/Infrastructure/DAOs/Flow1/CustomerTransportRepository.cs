using Application.Interfaces.Flow1;
using Domain.Entities;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs.Flow1;

public sealed class CustomerTransportRepository(HorseTransportDbContext db) : ICustomerTransportRepository
{
    public Task<Horse?> HorseAsync(string id, string owner, CancellationToken ct) =>
        db.Horses.AsNoTracking().SingleOrDefaultAsync(x => x.HorseId == id && x.OwnerId == owner, ct);
    public async Task<IReadOnlyList<Horse>> HorsesAsync(string owner, CancellationToken ct) =>
        await db.Horses.AsNoTracking().Where(x => x.OwnerId == owner).OrderBy(x => x.HorseId).ToListAsync(ct);
    public Task<bool> MicrochipExistsAsync(string chip, CancellationToken ct) => db.Horses.AnyAsync(x => x.MicrochipIso == chip, ct);
    public Task<bool> OverlapsAsync(string horse, DateTime from, DateTime to, CancellationToken ct) =>
        db.RequestHorseMappings.AnyAsync(m => m.HorseId == horse && m.Request != null &&
            m.Request.Status != "REJECTED" && m.Request.Status != "CANCELLED" && m.Request.Status != "COMPLETED" &&
            m.Request.Status != "CLOSED" &&
            (m.Request.ExpectedDate == null || m.Request.CommittedDeadline == null ||
             (m.Request.ExpectedDate < to.Date.AddDays(1) && m.Request.CommittedDeadline >= from)), ct);
    public Task<TransportRequest?> RequestAsync(string id, string owner, CancellationToken ct) =>
        db.TransportRequests.AsNoTracking().SingleOrDefaultAsync(x => x.RequestId == id && x.CustomerId == owner, ct);
    public async Task<(IReadOnlyList<TransportRequest> Items, int Count)> RequestsAsync(string owner, int page, int size, CancellationToken ct)
    {
        var q = db.TransportRequests.AsNoTracking().Where(x => x.CustomerId == owner);
        var count = await q.CountAsync(ct);
        return (await q.OrderByDescending(x => x.RequestId).Skip((page - 1) * size).Take(size).ToListAsync(ct), count);
    }
    public void AddHorse(Horse horse) => Stage(horse);
    public void UpdateHorse(Horse horse)
    {
        if (db.Database.CurrentTransaction is null) throw new InvalidOperationException("Writes require Flow 1 UoW.");
        db.Horses.Update(horse);
    }
    public void AddRequest(TransportRequest request) => Stage(request);
    private void Stage<T>(T value) where T : class
    {
        if (db.Database.CurrentTransaction is null) throw new InvalidOperationException("Writes require Flow 1 UoW.");
        db.Set<T>().Add(value);
    }
}
