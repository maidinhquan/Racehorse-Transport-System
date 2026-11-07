namespace Domain.Flow1.Entities;

public sealed class Country
{
    public string CountryCode { get; set; } = null!;
    public string CountryName { get; set; } = null!;
    public bool IsActive { get; set; }
}
