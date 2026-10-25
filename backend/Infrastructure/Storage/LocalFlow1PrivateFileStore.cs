using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Application.DTOs.Flow1;
using Application.Flow1.Interfaces;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.Storage;

public sealed class LocalFlow1PrivateFileStore(string root) : IFileArchive
{
    public const int MaxBytes = 5 * 1024 * 1024;
    public async Task<PrivateFileReference> PutAsync(UploadedFile file, bool photo, CancellationToken ct)
    {
        if (file.Bytes.Length is < 16 or > MaxBytes) throw Error("Each file must be 16 bytes to 5 MB.", "INVALID_FILE_SIZE");
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var png = file.Bytes.AsSpan().StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        var jpeg = file.Bytes[0] == 255 && file.Bytes[1] == 216 && file.Bytes[2] == 255;
        var pdf = file.Bytes.AsSpan().StartsWith("%PDF-"u8);
        var mime = (extension, png, jpeg, pdf) switch {
            (".png", true, _, _) => "image/png", (".jpg" or ".jpeg", _, true, _) => "image/jpeg",
            (".pdf", _, _, true) when !photo => "application/pdf",
            _ => throw Error("Photo must be PNG/JPEG; passport must be PNG/JPEG/PDF with matching file signature.", "INVALID_FILE_TYPE") };
        var hash = Convert.ToHexString(SHA256.HashData(file.Bytes)).ToLowerInvariant();
        var path = FilePath(hash);
        Directory.CreateDirectory(root);
        if (!File.Exists(path))
        {
            var temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try
            {
                await using (var stream = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None,
                    8192, FileOptions.Asynchronous | FileOptions.WriteThrough))
                { await stream.WriteAsync(file.Bytes, ct); stream.Flush(true); }
                try { File.Move(temp, path); }
                catch (IOException) when (File.Exists(path)) { /* Concurrent identical content: verify below. */ }
            }
            finally { if (File.Exists(temp)) File.Delete(temp); }
        }
        var reference = new PrivateFileReference(hash, hash, mime, file.Bytes.Length);
        await ReadAsync(reference, ct);
        return reference;
    }
    public async Task<byte[]> ReadAsync(PrivateFileReference file, CancellationToken ct)
    {
        var path = FilePath(file.FileId);
        if (!File.Exists(path)) throw Error("Private document is unavailable.", "FILE_UNAVAILABLE", 409);
        var length = new FileInfo(path).Length;
        if (length != file.SizeBytes || length > MaxBytes) throw Error("Private document integrity check failed.", "FILE_INTEGRITY_ERROR", 409);
        var bytes = await File.ReadAllBytesAsync(path, ct);
        if (!string.Equals(Convert.ToHexString(SHA256.HashData(bytes)), file.Sha256, StringComparison.OrdinalIgnoreCase))
            throw Error("Private document integrity check failed.", "FILE_INTEGRITY_ERROR", 409);
        return bytes;
    }
    private string FilePath(string id)
    {
        if (!Regex.IsMatch(id, @"\A[a-f0-9]{64}\z")) throw new InvalidDataException("Invalid private file reference.");
        return Path.Combine(root, id + ".bin");
    }
}
