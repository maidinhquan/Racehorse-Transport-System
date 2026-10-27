using System.Text.Json;
using Application.Common.Exceptions;
using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Application.Flow1.Services;
using Application.Flow1.Settings;
using Domain.Flow1.Entities;
using Infrastructure.Flow1.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;
namespace Flow1.Rebuild.Tests;
public sealed class CostTests(SqlFixture database) : IClassFixture<SqlFixture>
{
    [Fact] public async Task Manager_cost_uses_changed_database_rate_and_requires_explicit_planning_settings()
    {
        await using var db=database.Context(); var session=new SqlSession(db); var access=new AccessService(session);
        var catalogs=new CatalogService(session,new PolicyService(session));
        var input=new CostInput("2026-12-04 08:00","2026-12-02 08:00","AIR");
        var settings=new CostSettings { StandardVehicleCapacityStalls=4,DefaultCrewCount=2,DefaultDoctorCount=1 };
        var service=new CostService(session,access,catalogs,new NoRoad(),settings);
        var before=JsonSerializer.SerializeToElement(await service.CalculateAsync("USER_004","REQUEST_001",input,default));
        var rate=await db.Set<CostRate>().SingleAsync(x=>x.Code=="AIR_HORSE"); rate.Rate*=2; await db.SaveChangesAsync();
        var after=JsonSerializer.SerializeToElement(await service.CalculateAsync("USER_004","REQUEST_001",input,default));
        Assert.NotEqual(before.GetProperty("costs").GetRawText(),after.GetProperty("costs").GetRawText());
        Assert.Equal("VND",after.GetProperty("currency").GetString());
        var missing=new CostService(session,access,catalogs,new NoRoad(),new CostSettings());
        var error=await Assert.ThrowsAsync<BusinessRuleException>(()=>missing.CalculateAsync("USER_004","REQUEST_001",input,default));
        Assert.Equal("COST_ASSUMPTIONS_NOT_CONFIGURED",error.ErrorCode);
    }
    private sealed class NoRoad : IRoadRouter
    {
        public Task<RoadRouteResult> CalculateAsync(RoadRouteQuery query,CancellationToken ct=default) => throw new InvalidOperationException("AIR must not use road routing.");
    }
}
