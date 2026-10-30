using System.Globalization;
using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Application.Flow1.Mapping;
using Domain.Flow1.Entities;
using Domain.Enums;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class HorseService(IDataSession data, AccessService access, TimeProvider clock)
{
    public async Task<IReadOnlyList<object>> ListAsync(string actor, bool manager, CancellationToken ct)
    {
        await access.AccountAsync(actor, manager ? UserRoles.LogisticsManager : UserRoles.Customer, ct);
        return (await data.ListAsync<Horse>(h => manager || h.OwnerID == actor, ct)).Select(HorseMapper.View).ToArray();
    }
    public async Task<object> GetAsync(string actor, string id, CancellationToken ct) => HorseMapper.View(await access.HorseAsync(id, actor, ct));
    public Task<object> SaveAsync(string actor, string? id, HorseInput input, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        await access.AccountAsync(actor, UserRoles.Customer, token);
        Require(input.ReproductiveStatus is null or "INTACT" or "NOT_PREGNANT" or "PREGNANT" or "GELDED",
            "VALIDATION_ERROR", "reproductiveStatus must be INTACT, NOT_PREGNANT, PREGNANT or GELDED.", 400);
        Require(input.Weight is null || input.Weight > 0 && input.Weight <= 99999999.99m && decimal.Round(input.Weight.Value, 2) == input.Weight,
            "VALIDATION_ERROR", "weight must be a positive number in kg with at most two decimal places (maximum 99999999.99).", 400);
        var horse = id is null ? new Horse { OwnerID = actor } : await access.HorseAsync(id, actor, token);
        if (id is not null) await EditableAsync(id, token);
        Require(DateTime.TryParseExact(input.Dob, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dob)
            && dob.Date <= clock.GetUtcNow().UtcDateTime.Date, "VALIDATION_ERROR", "Invalid date of birth.", 400);
        Require(DateTime.TryParseExact(input.Passport.IssueDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var issue)
            && DateTime.TryParseExact(input.Passport.ExpiryDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _), "VALIDATION_ERROR", "Invalid passport dates.", 400);
        var expiry = DateTime.ParseExact(input.Passport.ExpiryDate, "yyyy-MM-dd", CultureInfo.InvariantCulture);
        Require(issue >= dob && issue <= clock.GetUtcNow().UtcDateTime.Date && expiry > clock.GetUtcNow().UtcDateTime.Date && expiry > issue,
            "VALIDATION_ERROR", "Passport must be valid.", 400);
        Require(decimal.TryParse(input.Value, NumberStyles.None, CultureInfo.InvariantCulture, out var value) && value > 0 && value <= 9999999999m,
            "VALIDATION_ERROR", "Declared value must be whole VND.", 400);
        Require(!(await data.ListAsync<Horse>(h => h.Microchip_ISO == input.Microchip && h.HorseID != id, token)).Any(),
            "VALIDATION_ERROR", "Microchip is already registered.", 400);
        horse.Name = Required(input.Name, 100); horse.Breed = Required(input.Breed, 100); horse.Sex = input.Sex;
        horse.ReproductiveStatus = input.ReproductiveStatus; horse.Weight = input.Weight;
        horse.DOB = dob; horse.Microchip_ISO = input.Microchip; horse.DeclaredValueVnd = value;
        horse.FEI_Passport_No = Required(input.Passport.Number, 50); horse.PassportIssuedBy = Required(input.Passport.Authority, 200);
        horse.PassportIssuedDate = issue; horse.PassportExpiryDate = expiry; horse.SpecialHealthNotes = input.EffectiveHealthNotes;
        if (id is null) data.Add(horse);
        await data.SaveAsync(token);
        return HorseMapper.View(horse);
    }, ct);
    public async Task EditableAsync(string id, CancellationToken ct)
    {
        // Returned requests reserve the horse, while allowing customers to correct its profile.
        var states = await HorseBookingRules.CheckAsync(data, new[] { id }, null, ct, ignoreReturnedRequests: true);
        Require(states[id].Status != "IN_TRANSPORT_REQUEST",
            "HORSE_NOT_EDITABLE", "Horse belongs to an active submitted request.");
    }
}
