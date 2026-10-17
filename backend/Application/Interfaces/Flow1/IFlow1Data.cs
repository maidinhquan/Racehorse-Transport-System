using System.Linq.Expressions;
using Application.DTOs.Flow1;

namespace Application.Interfaces.Flow1;

public interface IFlow1Data
{
    Task<T?> FindAsync<T>(string id, CancellationToken ct) where T : class;
    Task<List<T>> QueryAsync<T>(Expression<Func<T, bool>> predicate, CancellationToken ct) where T : class;
    void Add(object row);
    void Remove(object row);
    Task SaveAsync(CancellationToken ct);
    Task<T> RunAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct);
}

public interface IFlow1CurrentFiles
{
    Task<string> PutAsync(UploadedFile file, bool photo, CancellationToken ct);
    Task<(byte[] Bytes, string ContentType)> ReadAsync(string key, CancellationToken ct);
}
