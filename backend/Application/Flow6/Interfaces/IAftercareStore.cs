using System.Text.Json.Nodes;
namespace Application.Flow6.Interfaces;
public interface IAftercareStore
{
    Task<T> Transaction<T>(Func<Task<T>> action, CancellationToken ct);
    Task<List<JsonObject>> Query(string sql, CancellationToken ct, params (string Name, object? Value)[] args);
    Task Execute(string sql, CancellationToken ct, params (string Name, object? Value)[] args);
}
