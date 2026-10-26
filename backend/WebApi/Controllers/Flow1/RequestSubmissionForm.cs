using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Application.Flow1.Dtos;
using Application.DTOs.Flow1;
using static Application.Flow1.Rules.BusinessRules;
namespace WebApi.Controllers.Flow1;

public sealed class RequestSubmissionForm
{
    [Required] public string Data { get; set; } = "";
    public List<IFormFile> Files { get; set; } = [];

    internal async Task<(RequestUpdateInput Input, IReadOnlyList<UploadedFile> Files)> ReadAsync(CancellationToken ct)
    {
        RequestUpdateInput? input;
        try { input = JsonSerializer.Deserialize<RequestUpdateInput>(Data, new JsonSerializerOptions(JsonSerializerDefaults.Web)); }
        catch (JsonException) { throw Failure("VALIDATION_ERROR", "data must contain valid request JSON without unknown fields.", 400); }
        Require(input is not null, "VALIDATION_ERROR", "data must contain the complete request.", 400);
        Require(Files.Count <= 3 && Files.Sum(f => f.Length) <= 30L * 1024 * 1024,
            "INVALID_FILE_SIZE", "At most three shared files and 30 MiB of file bytes are allowed.", 400);
        var uploads = new List<UploadedFile>();
        foreach (var file in Files) uploads.Add(await FileBinding.ReadAsync(file, ct));
        return (input!, uploads);
    }
}
