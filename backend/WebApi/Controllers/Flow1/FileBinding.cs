using Application.DTOs.Flow1;
using static Application.Flow1.Rules.BusinessRules;
namespace WebApi.Controllers.Flow1;
internal static class FileBinding
{
    internal static async Task<UploadedFile> ReadAsync(IFormFile file, CancellationToken ct)
    {
        Require(file.Length is >= 16 and <= 10485760, "INVALID_FILE_SIZE", "Each file must contain 16 bytes to 10 MiB.", 400);
        using var stream = new MemoryStream(); await file.CopyToAsync(stream, ct);
        return new UploadedFile(stream.ToArray(), Path.GetFileName(file.FileName));
    }
}
