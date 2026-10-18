using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.Storage;

public sealed class Flow1CurrentFiles(string root, IFlow1PrivateFileStore files) : IFlow1CurrentFiles
{
    public async Task<string> PutAsync(UploadedFile file, bool photo, CancellationToken ct)
    {
        var saved = await files.PutAsync(file, photo, ct);
        return "private/" + saved.FileId + (saved.ContentType == "application/pdf" ? ".pdf" : saved.ContentType == "image/png" ? ".png" : ".jpg");
    }
    public async Task<(byte[] Bytes, string ContentType)> ReadAsync(string key, CancellationToken ct)
    {
        var m = Regex.Match(key, @"\Aprivate/([a-f0-9]{64})\.(pdf|png|jpg)\z");
        if (!m.Success) throw Error("Invalid private document reference.", "FILE_UNAVAILABLE", 409);
        var path = Path.Combine(root, m.Groups[1].Value + ".bin");
        if (!File.Exists(path)) throw Error("Private document unavailable.", "FILE_UNAVAILABLE", 409);
        var length = new FileInfo(path).Length;
        if (length is < 16 or > LocalFlow1PrivateFileStore.MaxBytes) throw Error("Private document integrity failure.", "FILE_INTEGRITY_ERROR", 409);
        var bytes = await File.ReadAllBytesAsync(path, ct);
        if (Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant() != m.Groups[1].Value)
            throw Error("Private document integrity failure.", "FILE_INTEGRITY_ERROR", 409);
        var mime = m.Groups[2].Value switch { "pdf" => "application/pdf", "png" => "image/png", _ => "image/jpeg" };
        var valid = mime == "application/pdf" ? bytes.AsSpan().StartsWith("%PDF-"u8) : mime == "image/png" ?
            bytes.AsSpan().StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }) : bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255;
        if (!valid) throw Error("Private document type mismatch.", "FILE_INTEGRITY_ERROR", 409);
        return (bytes, mime);
    }
}
