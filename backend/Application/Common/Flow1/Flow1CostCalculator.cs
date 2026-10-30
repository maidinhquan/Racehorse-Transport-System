using Application.DTOs.Flow1;
using Domain.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Common.Flow1;

public static class Flow1CostCalculator
{
    public static readonly string[] Groups = ["TRANSPORT", "CREW", "PERMIT", "VET", "INSURANCE"];
    public static CostPlan Calculate(IReadOnlyList<FlowCostRate> rates, string mode, int horses,
        int days, int nights, int vehicles, int crew, int doctors, decimal km, decimal? insuredValueVnd)
    {
        if (mode is not ("ROAD" or "AIR") || horses is < 1 or > 100 || days is < 1 or > 730 ||
            nights < 0 || nights > days || vehicles is < 0 or > 100 || crew is < 0 or > 200 ||
            doctors is < 1 or > 100 || km < 0 || km > 100000 || mode == "ROAD" && (km <= 0 || vehicles < 1 || crew < 1) ||
            km > 0 && (vehicles < 1 || crew < 1) || insuredValueVnd is <= 0 or >999999999999m)
            throw Error("Invalid cost quantities; veterinary care is mandatory. Use VND for insured value.", "VALIDATION_ERROR");
        decimal Rate(string code, string group, string unit)
        {
            var rows = rates.Where(x => x.Code == code && x.IsActive).ToArray();
            if (rows.Length != 1 || rows[0].CurrencyCode != "VND" || rows[0].Rate <= 0 || rows[0].CostGroup != group ||
                rows[0].CalculationUnit != unit || code == "INSURANCE_RATE" && rows[0].Rate > 1)
                throw Error("Restore the active VND cost rate: " + code, "COST_RATE_NOT_CONFIGURED", 503);
            return rows[0].Rate;
        }
        // Read/validate the entire tariff so a missing rate never silently becomes zero.
        var road = Rate("ROAD_KM", "TRANSPORT", "KM_VEHICLE");
        var air = Rate("AIR_HORSE", "TRANSPORT", "HORSE");
        var stable = Rate("STABLE_NIGHT", "TRANSPORT", "HORSE_NIGHT");
        var staff = Rate("CREW_DAY", "CREW", "PERSON_DAY");
        var common = Rate("PERMIT_TRIP", "PERMIT", "TRIP");
        var horse = Rate("PERMIT_HORSE", "PERMIT", "HORSE");
        var vet = Rate("VET_DAY", "VET", "PERSON_DAY");
        var care = Rate("CARE_DAY", "VET", "HORSE_DAY");
        var min = Rate("INSURANCE_MIN", "INSURANCE", "TRIP");
        var ratio = Rate("INSURANCE_RATE", "INSURANCE", "VALUE_RATIO");
        var costs = new CostAmounts(Round(km * vehicles * road + (mode == "AIR" ? horses * air : 0) + horses * nights * stable),
            Round(crew * days * staff), Round(common + horses * horse), Round(doctors * days * vet + horses * days * care),
            Round(Math.Max(min, (insuredValueVnd ?? 0) * ratio)));
        if (costs.Total > 9_999_999_999m) throw Error("Cost exceeds supported VND limit.", "AMOUNT_OUT_OF_RANGE");
        return new(costs, days, nights, crew, doctors, vehicles, km, insuredValueVnd, insuredValueVnd is null);
    }
}
