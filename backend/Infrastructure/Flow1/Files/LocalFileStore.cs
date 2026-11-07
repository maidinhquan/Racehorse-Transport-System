using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Application.DTOs.Flow1;
using Application.Flow1.Interfaces;
using static Application.Flow1.Rules.BusinessRules;
namespace Infrastructure.Flow1.Files;
public sealed class LocalFileStore(string root) : IPrivateFiles
{
    private const int Maximum = 10 * 1024 * 1024;
    public async Task<string> PutAsync(UploadedFile file, bool photo, CancellationToken ct)
    {
        Require(file.Bytes.Length is >= 16 and <= Maximum, "INVALID_FILE_SIZE", "File must contain 16 bytes to 10 MiB.", 400);
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        // Some cameras/export tools use .jpg for PNG bytes (and vice versa).
        // Only normalize between allowed image types; never trust ContentType.
        var suffix = extension switch
        {
            ".jpeg" or ".jpg" or ".png" => Valid(file.Bytes, "png") ? "png" : Valid(file.Bytes, "jpg") ? "jpg" : "",
            ".pdf" when !photo => "pdf",
            _ => ""
        };
        Require(Valid(file.Bytes, suffix), "INVALID_FILE_TYPE", "File signature must match an allowed image or PDF.", 400);
        var hash = Convert.ToHexString(SHA256.HashData(file.Bytes)).ToLowerInvariant();
        Directory.CreateDirectory(root);
        var path = Path.Combine(root, hash + ".bin");
        if (!File.Exists(path))
        {
            var temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try
            {
                await File.WriteAllBytesAsync(temporary, file.Bytes, ct);
                try { File.Move(temporary, path, false); }
                catch (IOException) when (File.Exists(path)) { }
            }
            finally { if (File.Exists(temporary)) File.Delete(temporary); }
        }
        return $"private/{hash}.{suffix}";
    }
    public async Task<(byte[] Bytes, string ContentType)> ReadAsync(string key, CancellationToken ct)
    {
        var match = Regex.Match(key, @"\Aprivate/([a-f0-9]{64})\.(pdf|png|jpg)\z");
        Require(match.Success, "FILE_UNAVAILABLE", "Private file reference is invalid.");
        var path = Path.Combine(root, match.Groups[1].Value + ".bin");
        Require(File.Exists(path), "FILE_UNAVAILABLE", "Private file is not present.");
        Require(new FileInfo(path).Length is >= 16 and <= Maximum, "FILE_UNAVAILABLE", "Invalid file size.");
        var bytes = await File.ReadAllBytesAsync(path, ct);
        Require(Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant() == match.Groups[1].Value && Valid(bytes, match.Groups[2].Value),
            "FILE_INTEGRITY_ERROR", "Private file integrity check failed.");
        return (bytes, match.Groups[2].Value switch { "pdf" => "application/pdf", "png" => "image/png", _ => "image/jpeg" });
    }
    private static bool Valid(byte[] bytes, string suffix) => suffix switch
    {
        "pdf" => bytes.AsSpan().StartsWith("%PDF-"u8),
        "png" => bytes.AsSpan().StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
        "jpg" => bytes.Length >= 3 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255,
        _ => false
    };
}
