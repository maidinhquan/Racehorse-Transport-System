using System.Globalization;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Domain.Entities;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

public static class ContractPdfModelBuilder
{
    private static readonly CultureInfo Vn = CultureInfo.GetCultureInfo("vi-VN");
    private static string Money(decimal x) => x.ToString("N0", Vn);
    public static ContractPdfModel Build(Contract c, User u, RequestSnapshot r, DraftSnapshot d,
        DateTimeOffset deadline, DateTimeOffset issuedAt, Flow1ContractOptions options)
    {
        var values = new Dictionary<string, string>();
        foreach (var key in new[] { "COMPANY_NAME", "COMPANY_ADDRESS", "COMPANY_EMAIL", "COMPANY_HOTLINE",
            "COMPANY_TAX_CODE", "COMPANY_BANK_ACCOUNT", "COMPANY_BANK_NAME", "COMPANY_REPRESENTATIVE", "COMPANY_REP_POSITION" })
        {
            if (!options.Issuer.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value) || value.Length > 255)
                throw Error("Configure the contract issuer profile before issuing a PDF.", "CONTRACT_ISSUER_NOT_CONFIGURED", 503);
            values[key] = value;
        }
        string Display(DateTimeOffset x) => TimeZoneInfo.ConvertTimeBySystemTimeZoneId(x, "Asia/Ho_Chi_Minh").ToString("dd/MM/yyyy HH:mm 'UTC+07'", Vn);
        void Put(string key, string? text) => values[key] = string.IsNullOrWhiteSpace(text) ? "Chưa cung cấp / Not supplied" : text;
        Put("CONTRACT_CODE", c.ContractCode); Put("REQUEST_ID", c.RequestId); Put("PLAN_VERSION", d.PlanVersion.ToString());
        Put("CREATED_DATE", Display(issuedAt)); Put("COMPLETION_DEADLINE", Display(deadline));
        Put("CUSTOMER_FULL_NAME", u.FullName); Put("CUSTOMER_USER_ID", u.UserId); Put("CUSTOMER_EMAIL", u.Email);
        Put("CUSTOMER_PHONE", u.Phone); Put("CUSTOMER_ADDRESS", null); Put("CUSTOMER_ID_NUMBER", null);
        Put("DEPARTURE_LOCATION", r.Input.Trip.Pickup.Address); Put("DESTINATION_LOCATION", r.Input.Trip.Delivery.Address);
        Put("TRANSPORT_MODE", r.Input.Trip.PreferredTransportMode); Put("TRANSPORT_PURPOSE", r.Input.Purpose);
        Put("TRANSPORT_SCOPE", r.Input.Trip.PreferredTransportMode == "AIR" ? $"{d.Plan.Input.DepartureGateway} → {d.Plan.Input.ArrivalGateway}; airport-to-airport; ground legs excluded" : "ROAD");
        Put("TOTAL_DISTANCE_KM", d.Plan.RoadDistanceKm?.ToString("N3", Vn) ?? "Không áp dụng / Not applicable");
        Put("EXPECTED_DEPARTURE_DATETIME", Display(d.Plan.Input.PlannedDepartureAt!.Value));
        Put("COMMITTED_DEADLINE_DATETIME", r.Input.DeliveryDeadline.ToString("dd/MM/yyyy", Vn));
        Put("DESIGNATED_RECEIVER_NAME", r.Input.Receiver.Name); Put("DESIGNATED_RECEIVER_PHONE", r.Input.Receiver.Phone);
        Put("CURRENCY_CODE", "VND"); Put("EXCHANGE_RATE", "1"); Put("BASE_PRICE_P", Money(d.Total)); Put("TOTAL_PRICE_VND", Money(d.Total));
        // No invented number-to-words conversion: the exact numeric VND amount is authoritative.
        Put("BASE_PRICE_IN_WORDS", "Theo số tiền VND nêu trên / As the numeric VND amount above"); Put("TOTAL_PRICE_VND_IN_WORDS", values["BASE_PRICE_IN_WORDS"]);
        foreach (var key in new[] { "DEPOSIT_AMOUNT_40", "DEPOSIT_AMOUNT_40_VND" }) Put(key, Money(d.Deposit));
        var middle = decimal.Round(d.Total * .30m, 0, MidpointRounding.AwayFromZero); var final = d.Total - d.Deposit - middle;
        foreach (var key in new[] { "MIDWAY_AMOUNT_30", "MIDWAY_AMOUNT_30_VND" }) Put(key, Money(middle));
        foreach (var key in new[] { "FINAL_AMOUNT_30", "FINAL_AMOUNT_30_VND" }) Put(key, Money(final));
        Put("SELLING_LINES", string.Join("; ", d.Lines.Select(l => $"{l.Description}: {l.Quantity} × {Money(l.UnitPrice)} = {Money(decimal.Round(l.Quantity * l.UnitPrice, 0, MidpointRounding.AwayFromZero))} VND")));
        foreach (var key in new[] { "SAFETY_GATE_LOCATION", "SAFETY_GATE_ETA" }) Put(key, "Chưa chốt / Not scheduled");
        foreach (var key in new[] { "HANDOVER_ID", "ACTUAL_HANDOVER_TIMESTAMP", "ACTUAL_DELIVERY_LOCATION", "HANDED_BY_STAFF_NAME", "HANDED_BY_STAFF_ID", "RECEIVED_BY_NAME", "RECEIVED_BY_PHONE" }) Put(key, "Chưa phát sinh / Not performed");
        foreach (var key in new[] { "LIEN_DAILY_RATE", "LIEN_DAILY_RATE_VND" }) Put(key, "Chưa thỏa thuận / Not agreed");
        var issuedDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeBySystemTimeZoneId(issuedAt, "Asia/Ho_Chi_Minh").DateTime);
        int Age(DateOnly dob) { var age = issuedDate.Year - dob.Year; return Math.Max(0, dob.AddYears(age) > issuedDate ? age - 1 : age); }
        var horses = r.HorseSnapshots.Select((h, i) => new Dictionary<string, string> {
            ["HORSE_1_ID"] = r.Input.Horses[i].HorseId, ["HORSE_1_NAME"] = h.Identity.Name,
            ["HORSE_1_MICROCHIP"] = h.Identity.MicrochipIso, ["HORSE_1_FEI_NO"] = h.Identity.FeiPassportNo,
            ["HORSE_1_BREED"] = h.Identity.Breed, ["HORSE_1_SEX"] = h.Identity.Sex,
            ["HORSE_1_AGE"] = Age(h.Identity.Dob).ToString() }).ToArray();
        return new(values, horses);
    }
}
