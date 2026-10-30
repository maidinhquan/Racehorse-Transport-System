using System.Linq.Expressions;
using Application.DTOs.Flow1;
namespace Application.Flow1.Interfaces;

public interface IPrivateFiles
{
    Task<string> PutAsync(UploadedFile file, bool photo, CancellationToken ct);
    Task<(byte[] Bytes, string ContentType)> ReadAsync(string key, CancellationToken ct);
}
