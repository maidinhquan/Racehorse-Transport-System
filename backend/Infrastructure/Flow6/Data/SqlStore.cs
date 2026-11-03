using System.Data;
using System.Text.Json.Nodes;
using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
using Microsoft.Data.SqlClient;
namespace Infrastructure.Flow6.Data;
public sealed class SqlStore(string connectionString) : IAftercareStore
{
    private SqlConnection? connection;
    private SqlTransaction? transaction;
    public async Task<T> Transaction<T>(Func<Task<T>> action, CancellationToken ct)
    {
        if (transaction is not null) return await action();
        await using var cn = new SqlConnection(connectionString); await cn.OpenAsync(ct);
        connection = cn; transaction = (SqlTransaction)await cn.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        try
        {
            // Same lock as Flow 1: callbacks and settlement cannot race invoice writes.
            await Execute("DECLARE @r int; EXEC @r=sys.sp_getapplock @Resource=N'RaceHorse.Flow1.Write', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000; IF @r<0 THROW 51300,'Flow 6 busy',1;", ct);
            var result = await action(); await transaction.CommitAsync(ct); return result;
        }
        catch { await transaction.RollbackAsync(CancellationToken.None); throw; }
        finally { transaction.Dispose(); transaction = null; connection = null; }
    }
    public async Task<List<JsonObject>> Query(string sql, CancellationToken ct, params (string Name, object? Value)[] args)
    {
        if (connection is null) return await Transaction(() => Query(sql, ct, args), ct);
        await using var cmd = new SqlCommand(sql, connection, transaction);
        foreach (var (name,value) in args) cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
        await using var reader = await cmd.ExecuteReaderAsync(ct); var rows = new List<JsonObject>();
        while(await reader.ReadAsync(ct))
        {
            var row = new JsonObject();
            for(var i=0;i<reader.FieldCount;i++)
            {
                var value = reader.GetValue(i);
                row[reader.GetName(i)] = value is DBNull ? null : value is DateTime d
                    ? JsonValue.Create(DateTime.SpecifyKind(d,DateTimeKind.Utc).ToString("yyyy-MM-ddTHH:mm:ss.fffffffZ"))
                    : System.Text.Json.JsonSerializer.SerializeToNode(value);
            }
            rows.Add(row);
        }
        return rows;
    }
    public async Task Execute(string sql, CancellationToken ct, params (string Name, object? Value)[] args)
    {
        if(connection is null) { await Transaction(async () => { await Execute(sql,ct,args); return true; },ct); return; }
        await using var cmd = new SqlCommand(sql,connection,transaction);
        foreach(var (name,value) in args) cmd.Parameters.AddWithValue(name,value ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
