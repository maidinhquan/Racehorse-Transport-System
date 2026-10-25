using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
namespace Application.Flow1.Dtos;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ContactInput([MaxLength(100)] string Name, [MaxLength(255)] string Address,
    [MaxLength(20)] string Postal, [MaxLength(100)] string Contact, [MaxLength(20)] string Phone,
    [MaxLength(1000)] string Notes, decimal? Latitude = null, decimal? Longitude = null);
