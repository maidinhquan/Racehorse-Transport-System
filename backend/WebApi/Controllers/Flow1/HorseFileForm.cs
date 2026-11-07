using System.ComponentModel.DataAnnotations;
namespace WebApi.Controllers.Flow1;
public sealed class HorseFileForm
{
    [Required] public IFormFile File { get; set; } = null!;
}
