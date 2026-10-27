using System.Text.Json;
namespace Application.Flow1.Interfaces;

public interface IFileArchive
{
    Task<Application.DTOs.Flow1.PrivateFileReference> PutAsync(Application.DTOs.Flow1.UploadedFile file,
        bool photo, CancellationToken ct);
    Task<byte[]> ReadAsync(Application.DTOs.Flow1.PrivateFileReference file, CancellationToken ct);
}
