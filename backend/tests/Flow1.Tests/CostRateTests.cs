using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Application.Services.Flow1;
using Domain.Flow1;
using Xunit;

namespace Flow1.Tests;

public sealed class CostRateTests
{
    internal static IReadOnlyList<FlowCostRate> Rates()=>new[]{
        ("ROAD_KM","TRANSPORT","KM_VEHICLE",200000m),("AIR_HORSE","TRANSPORT","HORSE",3000000m),
        ("STABLE_NIGHT","TRANSPORT","HORSE_NIGHT",250000m),("CREW_DAY","CREW","PERSON_DAY",300000m),
        ("PERMIT_TRIP","PERMIT","TRIP",1000000m),("PERMIT_HORSE","PERMIT","HORSE",5000000m),
        ("VET_DAY","VET","PERSON_DAY",500000m),("CARE_DAY","VET","HORSE_DAY",300000m),
        ("INSURANCE_MIN","INSURANCE","TRIP",2000000m),("INSURANCE_RATE","INSURANCE","VALUE_RATIO",.005m)
    }.Select(x=>new FlowCostRate{CostRateID="rate-"+x.Item1,Code=x.Item1,CostGroup=x.Item2,CalculationUnit=x.Item3,Rate=x.Item4,CurrencyCode="VND",IsActive=true}).ToArray();
    internal sealed class RateSource : IFlow1CostRates
    { public Task<IReadOnlyList<FlowCostRate>> ReadAsync(CancellationToken ct)=>Task.FromResult(Rates()); }

    [Fact]
    public void Road_costs_include_five_groups_without_margin_or_TNDS()
    {
        var p=Flow1CostCalculator.Calculate(Rates(),"ROAD",2,2,1,2,3,1,100,1000000000);
        Assert.Equal(new CostAmounts(40500000,1800000,11000000,2200000,5000000),p.Costs);
        Assert.Equal(60500000,p.Costs.Total);Assert.False(p.MinimumInsuranceAssumed);
    }
    [Fact]
    public void Air_includes_per_horse_slot_and_optional_ground_legs()
    {
        var p=Flow1CostCalculator.Calculate(Rates(),"AIR",2,1,0,0,2,1,0,null);
        Assert.Equal(6000000,p.Costs.Transport);Assert.Equal(2000000,p.Costs.Insurance);Assert.True(p.MinimumInsuranceAssumed);
        var ground=Flow1CostCalculator.Calculate(Rates(),"AIR",2,1,0,1,2,1,10,null);
        Assert.Equal(p.Costs.Transport+2000000,ground.Costs.Transport);
    }
    [Fact]
    public void Missing_or_inactive_rate_fails_closed_and_changed_rate_changes_quote()
    {
        var rates=Rates();rates[0].IsActive=false;
        Assert.Equal("COST_RATE_NOT_CONFIGURED",Assert.Throws<BusinessRuleException>(()=>Flow1CostCalculator.Calculate(rates,"ROAD",1,1,0,1,2,1,100,null)).ErrorCode);
        rates[0].IsActive=true;rates[0].Rate=100000;
        Assert.Equal(10000000,Flow1CostCalculator.Calculate(rates,"ROAD",1,1,0,1,2,1,100,null).Costs.Transport);
    }
    [Fact]
    public void Invalid_quantities_or_non_VND_rate_are_rejected()
    {
        Assert.Throws<BusinessRuleException>(()=>Flow1CostCalculator.Calculate(Rates(),"ROAD",1,0,0,1,2,1,100,null));
        Assert.Throws<BusinessRuleException>(()=>Flow1CostCalculator.Calculate(Rates(),"ROAD",1,1,0,1,2,0,100,null));
        var rates=Rates();rates[0].CurrencyCode="USD";
        Assert.Throws<BusinessRuleException>(()=>Flow1CostCalculator.Calculate(rates,"ROAD",1,1,0,1,2,1,100,null));
    }
    [Fact]
    public async Task Landing_uses_configured_city_centres_without_any_map_calls()
    {
        var maps=new NoMaps();var options=new Flow1EstimateOptions{StandardVehicleCapacityStalls=1,DemoCities=[new("A","VN",10,106),new("B","VN",11,107),new("Tokyo","JP",35,139)]};
        var service=new TransportEstimateService(maps,maps,options,TimeProvider.System,new RateSource());
        var quote=await service.DemoAsync(new("A","B",1),default);
        Assert.True(quote.AverageRoadKm>0);Assert.Equal(Flow1PricingPolicy.Round(quote.EstimatedPrice*.4m),quote.EstimatedDeposit);
        Assert.DoesNotContain("costs",System.Text.Json.JsonSerializer.Serialize(quote).ToLowerInvariant());
        var air=await service.DemoAsync(new("A","Tokyo",1),default);Assert.Equal(0,air.AverageRoadKm);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>service.DemoAsync(new("A","A",1),default));
    }
    private sealed class NoMaps : IFlow1RoadRoutingProvider,IFlow1LocationVerifier
    {
        public string Attribution=>"unused";
        public Task VerifyAsync(MapPoint point,CancellationToken ct)=>throw new InvalidOperationException("Demo must not call maps");
        public Task<RoadRouteResult> CalculateAsync(RoadRouteQuery query,CancellationToken ct=default)=>throw new InvalidOperationException("Demo must not call maps");
    }

    [LocalSqlFact]
    public async Task Migration_adds_only_one_table_and_keeps_eight_cost_item_columns_and_operator_rates()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();
        Assert.Equal(8,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('COST_ITEM')"));
        Assert.Equal(10,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM COST_RATE"));
        var rate=Assert.Single(await f.Service.CostRatesAsync("manager",default),x=>x.Code=="ROAD_KM");
        await f.Service.UpdateCostRateAsync(rate.CostRateId,"manager",new(rate.Version,210000),default);
        await f.Db.ScriptAsync("002_flow1.sql");Assert.Equal(210000,await f.Db.ScalarAsync<decimal>("SELECT Rate FROM COST_RATE WHERE Code='ROAD_KM'"));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.UpdateCostRateAsync(rate.CostRateId,"manager",new(rate.Version,220000),default));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.CostRatesAsync("owner",default));
    }
    [LocalSqlFact]
    public async Task Draft_defaults_to_five_group_total_and_rate_edits_do_not_change_saved_costs()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var r=await f.Request();
        var plan=await f.Service.RequestCostsAsync(r.RequestId,"manager",new(InsuredValueVnd:1000000000),default);
        Assert.Equal(5000000,plan.Costs.Insurance);
        r=await f.Service.ReviewAsync(r.RequestId,"manager","accept",new(r.Version,"accept"),default);
        var c=await f.Service.DraftAsync(r.RequestId,"manager","cost-plan-draft",new(r.Version,PreparationDays:2,Costs:plan.Costs),default);
        Assert.Equal(plan.Costs.Total,c.TotalPrice);Assert.Equal(plan.Costs,await f.Service.ContractCostsAsync(c.ContractId,"manager",default));
        Assert.Equal(5,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM COST_ITEM"));
        await f.Db.ExecuteAsync("UPDATE COST_RATE SET Rate=999999 WHERE Code='ROAD_KM'");
        Assert.Equal(plan.Costs,await f.Service.ContractCostsAsync(c.ContractId,"manager",default));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ContractCostsAsync(c.ContractId,"owner",default));
    }
    [LocalSqlFact]
    public async Task Manager_override_is_saved_and_signed_costs_cannot_be_reissued()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var c=await f.Signed();
        var before=await f.Service.ContractCostsAsync(c.ContractId,"manager",default);
        Assert.NotNull(before);Assert.Equal(before.Total,c.TotalPrice);
        var request=(await f.Service.ListAsync("manager",true,default)).Single(x=>x.Contracts.Any(contract=>contract.ContractId==c.ContractId));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReissueAsync(c.ContractId,"manager",new(c.Version,90000000,2,new(request.DepartureAt!.Value),new(request.DeliveryAt!.Value),[],"blocked",Costs:new(1,1,1,1,1)),default));
        Assert.Equal(before,await f.Service.ContractCostsAsync(c.ContractId,"manager",default));
    }
    [LocalSqlFact]
    public async Task Http_cost_endpoints_use_real_tariffs_and_keep_breakdown_manager_only()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var r=await f.Request();
        using var app=new RelationalHttpFactory(f);using var manager=app.Client("manager","LOGISTICS_MANAGER");using var customer=app.Client();
        var estimate=await manager.PostAsync($"/api/manager/requests/{r.RequestId}/cost-estimate",System.Net.Http.Json.JsonContent.Create(new CostPlanningInput()));
        Assert.Equal(System.Net.HttpStatusCode.OK,estimate.StatusCode);
        using var body=System.Text.Json.JsonDocument.Parse(await estimate.Content.ReadAsStringAsync());
        Assert.True(body.RootElement.GetProperty("success").GetBoolean());Assert.Equal(29400000,body.RootElement.GetProperty("data").GetProperty("costs").GetProperty("total").GetDecimal());
        Assert.Equal(System.Net.HttpStatusCode.Forbidden,(await customer.GetAsync("/api/manager/cost-rates")).StatusCode);
        Assert.Equal(System.Net.HttpStatusCode.Forbidden,(await customer.PostAsync($"/api/manager/requests/{r.RequestId}/cost-estimate",System.Net.Http.Json.JsonContent.Create(new{}))).StatusCode);
        var swagger=await manager.GetStringAsync("/swagger/v1/swagger.json");
        Assert.Contains("/api/public/estimates/demo",swagger);Assert.Contains("/api/manager/requests/{id}/cost-estimate",swagger);
        var publicEstimate=await customer.PostAsync("/api/public/estimates",System.Net.Http.Json.JsonContent.Create(r.Input!.Trip));
        Assert.Equal(System.Net.HttpStatusCode.OK,publicEstimate.StatusCode);
        var text=await publicEstimate.Content.ReadAsStringAsync();Assert.DoesNotContain("\"costs\"",text);Assert.DoesNotContain("\"floor\"",text);
    }
}
