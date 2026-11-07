using System.ComponentModel.DataAnnotations;
namespace WebApi.Controllers.Flow1;
public sealed class MedicalDocumentForm
{
    [Required] public IFormFile File { get; set; } = null!;
    [Required] public string DocumentType { get; set; } = null!;
    public string? ExpiryDate { get; set; }
}
