using Application.DTOs.Flow1;
using Application.Common.Flow1;
using Domain.Enums;
using Domain.Flow1;

namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service
{
    public Task<IReadOnlyList<CostRateCard>> CostRatesAsync(string actor,CancellationToken ct)=>db.RunAsync<IReadOnlyList<CostRateCard>>(async t=>{
        await Actor(actor,UserRoles.LogisticsManager,t);
        return (await db.QueryAsync<FlowCostRate>(_=>true,t)).OrderBy(x=>x.Code).Select(RateCard).ToArray();
    },ct);
    private static CostRateCard RateCard(FlowCostRate r)=>new(r.CostRateID,r.Code,r.CostGroup,r.CalculationUnit,r.Rate,r.CurrencyCode,r.IsActive,Token(r.RowVersion));
    public Task<CostRateCard> UpdateCostRateAsync(string id,string actor,CostRateUpdate input,CancellationToken ct)=>db.RunAsync(async t=>{
        await Actor(actor,UserRoles.LogisticsManager,t);
        var rate=await db.FindAsync<FlowCostRate>(id,t)??throw Flow1PricingPolicy.Error("Rate not found.","NOT_FOUND",404);
        Check(rate.RowVersion,input.Version);
        Require(input.IsActive && input.Rate>0 && input.Rate<=9999999999m && (rate.Code!="INSURANCE_RATE" || input.Rate<=1) && decimal.Round(input.Rate,6)==input.Rate,"VALIDATION_ERROR","Required rates must stay active; use a positive rate with at most six decimal places. Insurance ratio is between 0 and 1.");
        rate.Rate=input.Rate;await db.SaveAsync(t);return RateCard(rate);
    },ct);
    public async Task<CostPlan> RequestCostsAsync(string id,string actor,CostPlanningInput input,CancellationToken ct)
    {
        var r=await db.RunAsync(async t=>await Request(id,actor,true,t),ct);
        var p=await PlanContract(r,input,null,ct);
        var horses=await db.RunAsync(async t=>(await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==id,t)).Count,ct);
        var days=Math.Max(1,(int)Math.Ceiling((p.Delivery-p.Departure).TotalDays));
        return await estimates.PlanAsync(p.Mode,horses,p.Km??0,days,input with {InsuredValueVnd=input.InsuredValueVnd??r.DeclaredValueVnd},ct);
    }
    public Task<CostAmounts?> ContractCostsAsync(string id,string actor,CancellationToken ct)=>db.RunAsync(async t=>{
        await Contract(id,actor,true,t);return await StoredCosts(id,t);
    },ct);
    private async Task<CostPlan> CalculateCosts(FlowRequest r,CostPlanningInput input,CancellationToken ct)
    {
        Require(RequestReady(r),"DATA_REVIEW_REQUIRED","Request needs complete schedule and route data.");
        var horses=(await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==r.RequestID,ct)).Count;
        var days=Math.Max(1,(int)Math.Ceiling((r.CommittedDeadline!.Value-r.ExpectedDate!.Value).TotalDays));
        return await estimates.PlanAsync(r.TransportType!,horses,r.DistanceKm??0,days,input with { InsuredValueVnd=input.InsuredValueVnd??r.DeclaredValueVnd },ct);
    }
    private async Task<CostAmounts?> StoredCosts(string contract,CancellationToken ct)
    {
        var rows=await db.QueryAsync<FlowCostItem>(x=>x.ContractID==contract && x.SubcodeName!=null && x.SubcodeName.StartsWith("PLANNED_"),ct);
        var selected=rows.Where(x=>Flow1CostCalculator.Groups.Any(g=>x.SubcodeName=="PLANNED_"+g)).ToArray();
        if(selected.Length==0)return null;
        Require(selected.Length==5 && Flow1CostCalculator.Groups.All(g=>selected.Count(x=>x.SubcodeName=="PLANNED_"+g && x.CategoryName==g && x.CurrencyCode=="VND" && x.TotalMoney>=0)==1),"DATA_REVIEW_REQUIRED","Review the five planned cost rows.");
        decimal Amount(string g)=>selected.Single(x=>x.SubcodeName=="PLANNED_"+g).TotalMoney!.Value;
        return new(Amount("TRANSPORT"),Amount("CREW"),Amount("PERMIT"),Amount("VET"),Amount("INSURANCE"));
    }
    private async Task SaveCosts(string contract,CostAmounts costs,CancellationToken ct)
    {
        var values=new[]{costs.Transport,costs.Crew,costs.Permit,costs.Vet,costs.Insurance};
        Require(values.All(v=>v>=0 && v<=9999999999m && v==decimal.Truncate(v)) && costs.Vet>0 && costs.Insurance>0 && costs.Total<=9999999999m,"VALIDATION_ERROR","Supply integral VND costs, with positive veterinary care and insurance, within the VND limit.");
        for(var n=0;n<values.Length;n++){
            var group=Flow1CostCalculator.Groups[n];var id=Id("cost",contract,group);
            var row=await db.FindAsync<FlowCostItem>(id,ct);
            if(row is null){row=new(){CostItemID=id,ContractID=contract,CategoryName=group,SubcodeName="PLANNED_"+group,Bearer="CT",CurrencyCode="VND"};db.Add(row);}
            Require(row.ContractID==contract && row.SubcodeName=="PLANNED_"+group && row.CategoryName==group && row.CurrencyCode=="VND","DATA_REVIEW_REQUIRED","Planned cost identity differs.");
            row.TotalMoney=values[n];
        }
    }
}
