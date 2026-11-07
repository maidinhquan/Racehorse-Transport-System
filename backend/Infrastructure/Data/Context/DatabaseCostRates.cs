using Application.Flow1.Interfaces;
using Domain.Flow1;
using Microsoft.EntityFrameworkCore;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.Data.Context;

public sealed class DatabaseCostRates(Flow1RelationalContext db) : ICostRates
{
    public async Task<IReadOnlyList<FlowCostRate>> ReadAsync(CancellationToken ct)
    {
        if (!await Flow1RelationalSchema.IsReadyAsync(db, ct))
            throw Error("Apply reviewed SQL 002 including COST_RATE before estimating.", "FLOW1_SQL_SCHEMA_REQUIRED", 503);
        return await db.Set<FlowCostRate>().AsNoTracking().Where(x => x.IsActive).ToListAsync(ct);
    }
}
