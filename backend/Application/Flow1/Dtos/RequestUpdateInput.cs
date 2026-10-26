using System.Text.Json.Serialization;
namespace Application.Flow1.Dtos;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RequestUpdateInput(string Origin, string Destination, string OriginCountry,
    string DestinationCountry, string Mode, string Date, string CareInstructions, ContactInput Pickup,
    ContactInput Delivery, IReadOnlyList<string> Horses, IReadOnlyDictionary<string, string> HorseNotes);
