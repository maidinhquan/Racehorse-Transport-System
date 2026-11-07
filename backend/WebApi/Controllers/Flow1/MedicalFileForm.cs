using System.ComponentModel.DataAnnotations;
namespace WebApi.Controllers.Flow1;
public sealed class MedicalFileForm
{
    [Required] public IFormFile File { get; set; } = null!;
    [Required] public string DocumentType { get; set; } = "";
    public DateTime? ExpiryDate { get; set; }
}
