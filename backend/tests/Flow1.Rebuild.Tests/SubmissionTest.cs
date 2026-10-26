using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Application.Flow1.Dtos;
using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;

namespace Flow1.Rebuild.Tests;

internal static class SubmissionTest
{
    internal static readonly byte[] Pdf = Encoding.UTF8.GetBytes("%PDF-1.7 request submission fixture");
    internal static RequestUpdateInput Input(string start, string end, string horse = "HORSE_001") => new(
        "Hanoi", "Tokyo", "VN", "JP", "AIR", start, end, "Care",
        new("Pickup", "Hanoi", "100000", "Customer", "0901234567", "", 21.02m, 105.8m, "fixture-hanoi"),
        new("Receiver", "Tokyo", "1000000", "Receiver", "0907654321", "", 35.6m, 139.7m, "fixture-tokyo"),
        [horse], new Dictionary<string, string>());

    internal static MultipartFormDataContent Body(object input, params (string Name, byte[] Bytes)[] uploads)
    {
        var node = JsonSerializer.SerializeToNode(input, new JsonSerializerOptions(JsonSerializerDefaults.Web))!.AsObject();
        // Complete old fixture inputs with valid contacts; explicit supplied fields always win.
        var defaults = JsonSerializer.SerializeToNode(Input("2027-12-25", "2027-12-27"), new JsonSerializerOptions(JsonSerializerDefaults.Web))!.AsObject();
        foreach (var field in new[] { "pickup", "delivery", "horses", "horseNotes" })
            if (!node.ContainsKey(field)) node[field] = defaults[field]!.DeepClone();
        var form = new MultipartFormDataContent();
        form.Add(new StringContent(node.ToJsonString()), "data");
        foreach (var file in uploads) form.Add(new ByteArrayContent(file.Bytes), "files", file.Name);
        return form;
    }

    internal static async Task ReadyHorseAsync(SqlFixture database, string id = "HORSE_001")
    {
        await using var db = database.Context();
        var horse = await db.Set<Horse>().SingleAsync(h => h.HorseID == id);
        horse.PhotoUrl = "private/" + new string('a', 64) + ".png";
        horse.PassportScanUrl = "private/" + new string('b', 64) + ".pdf";
        horse.OwnershipCertificateFileUrl = "private/" + new string('c', 64) + ".pdf";
        horse.PassportExpiryDate = new DateTime(2099, 1, 1);
        horse.DeclaredValueVnd = 100000000;
        await db.SaveChangesAsync();
    }

    internal static async Task<string> NewHorseAsync(SqlFixture database)
    {
        await using var db = database.Context();
        var horse = new Horse { OwnerID = "USER_001", Name = "Test horse", Microchip_ISO = "981" + DateTime.UtcNow.Ticks.ToString()[^12..],
            Sex = "MARE", Breed = "Arabian", DOB = new DateTime(2020, 1, 1), FEI_Passport_No = Guid.NewGuid().ToString("N"),
            PhotoUrl = "private/" + new string('a', 64) + ".png", PassportScanUrl = "private/" + new string('b', 64) + ".pdf",
            OwnershipCertificateFileUrl = "private/" + new string('c', 64) + ".pdf", PassportExpiryDate = new DateTime(2099,1,1), DeclaredValueVnd = 100000000 };
        db.Add(horse); await db.SaveChangesAsync(); return horse.HorseID;
    }
}
