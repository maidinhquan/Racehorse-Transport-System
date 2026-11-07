namespace Domain.Flow1.Entities;

public sealed class ContractClause
{
    public string TemplateID { get; set; } = null!;
    public string TemplateName { get; set; } = null!;
    public string LanguageCode { get; set; } = null!;
    public string BodyContent { get; set; } = null!;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
