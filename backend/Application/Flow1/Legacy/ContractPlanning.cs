using Application.DTOs.Flow1;
using Application.Common.Flow1;
using Domain.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1.Relational;

public sealed partial class RelationalFlow1Service
{
    private sealed record ContractPlan(string Mode, DateTime Departure, DateTime Delivery, decimal? Km, int PreparationDays, CostAmounts Costs);
    private async Task<ContractPlan> PlanContract(FlowRequest r, CostPlanningInput input, int? preparationDays, CancellationToken ct)
    {
        Require(RequestReady(r),"DATA_REVIEW_REQUIRED","Request needs complete route and schedule data.");
        var mode=input.TransportMode??r.TransportType!;
        var departure=input.DepartureAt is null?r.ExpectedDate!.Value:Utc(input.DepartureAt.Value);
        var delivery=input.DeliveryAt is null?r.CommittedDeadline!.Value:Utc(input.DeliveryAt.Value);
        var trip=new EstimateInput(new(r.Departure,(double)r.PickupLatitude!.Value,(double)r.PickupLongitude!.Value,r.OriginCountry!),
            new(r.Destination,(double)r.DeliveryLatitude!.Value,(double)r.DeliveryLongitude!.Value,r.DestinationCountry!),mode,1,
            DateOnly.FromDateTime(new DateTimeOffset(departure,TimeSpan.Zero).ToOffset(TimeSpan.FromHours(7)).DateTime));
        Route(trip);
        Require(departure>Now && delivery>departure && delivery<=Utc(clock.GetUtcNow().AddYears(2)),"INVALID_DATE_RANGE","Provide a valid future transport interval within two years.");
        decimal? km=mode=="AIR"?null:r.DistanceKm;
        if(mode=="ROAD" && km is null)km=(await estimates.CalculateAsync(trip,ct)).Customer.RoadDistanceKm;
        var floor=mode=="AIR"?7:km>500?3:2;
        var preparation=preparationDays??(mode==r.TransportType?Math.Max(floor,r.PreparationDays??floor):floor);
        Require(preparation>=floor && preparation<=730,"INVALID_PREPARATION","Preparation must meet the transport mode's minimum.");
        Require(Now.AddHours(24)<=departure.AddDays(-preparation),"INVALID_DEADLINE","Leave preparation time and a full shared 24-hour completion window.");
        var count=await db.RunAsync(async t=>(await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==r.RequestID,t)).Count,ct);
        Require(count>0,"HORSE_DOCUMENTS_REQUIRED","Select at least one horse.");
        var days=Math.Max(1,(int)Math.Ceiling((delivery-departure).TotalDays));
        var costs=await estimates.PlanAsync(mode,count,km??0,days,input with {InsuredValueVnd=input.InsuredValueVnd??r.DeclaredValueVnd},ct);
        return new(mode,departure,delivery,km,preparation,costs.Costs);
    }
    private static decimal QuoteTotal(decimal? price,CostAmounts costs)
    {
        Require(costs.Total is >=3 and <=9999999999m && costs.Total==decimal.Truncate(costs.Total),"INVALID_PRICE","The five quoted VND amounts must total between 3 and 9,999,999,999.");
        Require(price is null || price==costs.Total,"PRICE_TOTAL_MISMATCH","price must equal the total of the five costs; edit the five amounts to change the price.");
        return costs.Total;
    }
    private async Task ApplyContractPlan(FlowRequest r,ContractPlan p,CancellationToken ct)
    {
        foreach(var link in await db.QueryAsync<FlowRequestHorse>(x=>x.RequestID==r.RequestID,ct))
            Require(!await Busy(link.HorseID,p.Departure,p.Delivery,r.RequestID,ct),"HORSE_BOOKED","A selected horse is unavailable on the proposed dates.");
        r.TransportType=p.Mode;r.ExpectedDate=p.Departure;r.CommittedDeadline=p.Delivery;r.DistanceKm=p.Km;r.PreparationDays=p.PreparationDays;
    }
    public async Task<FlowContractCard> UpdateDraftAsync(string id,string actor,FlowAction input,CancellationToken ct)
    {
        Require(input.AdditionalClauses is null or {Count:0},"VALIDATION_ERROR","Send additionalClauses on publication; draft terms are not persisted.");
        var snapshot=await db.RunAsync(async t=>{
            var(c,r)=await Contract(id,actor,true,t);Check(c.RowVersion,input.Version);
            Require(c.ContractStatus=="DRAFT" && c.PublishedAtUtc is null && c.SignedAt is null,"DRAFT_CLOSED","Only an unpublished draft can be edited here; use reissue for issued terms.");
            await RequireNoMoneyOrAttempts(c,t);return (R:r,Version:Token(r.RowVersion));
        },ct);
        var plan=await PlanContract(snapshot.R,new(TransportMode:input.TransportMode,DepartureAt:input.DepartureAt,DeliveryAt:input.DeliveryAt),input.PreparationDays,ct);
        return await db.RunAsync(async t=>{
            var(c,r)=await Contract(id,actor,true,t);Check(c.RowVersion,input.Version);Check(r.RowVersion,snapshot.Version);
            Require(c.ContractStatus=="DRAFT" && c.PublishedAtUtc is null && c.SignedAt is null,"DRAFT_CLOSED","Draft is no longer editable.");
            await RequireNoMoneyOrAttempts(c,t);
            var costs=input.Costs??(await StoredCosts(id,t)??plan.Costs);
            if(input.Costs is null && (r.TransportType!=plan.Mode || r.ExpectedDate!=plan.Departure || r.CommittedDeadline!=plan.Delivery))costs=plan.Costs;
            var total=QuoteTotal(input.Price,costs);var rate=input.DepositRate??c.DepositRateStandard??Flow1ContractFactory.DepositPercent;
            var deposit=ContractDeposit(total,rate);await ApplyContractPlan(r,plan,t);await SaveCosts(id,costs,t);
            c.TotalQuotedPrice=total;c.DepositRateStandard=rate;c.DepositAmount=deposit;
            if(input.CommercialNotes is not null)c.CommercialNotes=OptionalText(input.CommercialNotes,2000);
            await db.SaveAsync(t);return await Card(c,t);
        },ct);
    }
}
