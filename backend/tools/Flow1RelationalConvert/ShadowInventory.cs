using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Infrastructure.Data.Context;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
namespace Flow1RelationalConvert;

// Business connection is SELECT-only. All DDL/bulk writes target a fresh, guarded local test name.
public static class ShadowInventory
{
    private static string Quote(string x)=>"["+x.Replace("]","]]")+"]";
    public static async Task<object> RunAsync(string connection,string sourceRoot,string privateRoot,IReadOnlySet<string>? retainUnverifiedHistory=null)
    {
        var source=new SqlConnectionStringBuilder(connection);var host=source.DataSource.Split('\\')[0];
        if(!new[]{".","localhost",Environment.MachineName,"(localdb)"}.Contains(host,StringComparer.OrdinalIgnoreCase))throw new InvalidDataException("SHADOW_REQUIRES_LOCAL_SERVER");
        var name="RaceHorseFlow1Test_"+Guid.NewGuid().ToString("N");var master=new SqlConnectionStringBuilder(connection){InitialCatalog="master"}.ConnectionString;
        var shadow=new SqlConnectionStringBuilder(connection){InitialCatalog=name}.ConnectionString;var created=false;
        try
        {
            // Read a consistent source snapshot into RAM; do not export row payloads to disk/logs.
            var data=new Dictionary<string,DataTable>();
            await using(var original=new SqlConnection(connection))
            {
                await original.OpenAsync();await using var tx=(SqlTransaction)await original.BeginTransactionAsync(IsolationLevel.Serializable);
                var tables=new List<string>();await using(var list=new SqlCommand("SELECT name FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo') ORDER BY name;",original,tx))await using(var r=await list.ExecuteReaderAsync()){while(await r.ReadAsync())tables.Add(r.GetString(0));}
                foreach(var table in tables)
                {
                    var names=new List<string>();await using(var columns=new SqlCommand("SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t)) AND TYPE_NAME(user_type_id) NOT IN('timestamp','rowversion') ORDER BY column_id;",original,tx))
                    {columns.Parameters.AddWithValue("@t",table);await using var r=await columns.ExecuteReaderAsync();while(await r.ReadAsync())names.Add(r.GetString(0));}
                    await using var rows=new SqlCommand($"SELECT TOP (10001) {string.Join(',',names.Select(Quote))} FROM dbo.{Quote(table)};",original,tx){CommandTimeout=60};
                    await using var reader=await rows.ExecuteReaderAsync();var dt=new DataTable(table);dt.Load(reader);if(dt.Rows.Count>10000)throw new InvalidDataException("SHADOW_DATASET_LIMIT");data.Add(table,dt);
                }
                await tx.CommitAsync();
            }
            var sourceFingerprint=Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(string.Join('\n',data.Select(x=>x.Key+":"+string.Join(',',x.Value.Columns.Cast<DataColumn>().Select(c=>c.ColumnName))+":"+string.Join(',',x.Value.Rows.Cast<DataRow>().Select(r=>Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(r.ItemArray.Select(v=>v is DBNull?null:v).ToArray())))).Order(StringComparer.Ordinal)))))));
            await Exec(master,$"CREATE DATABASE {Quote(name)};");created=true;
            foreach(var file in new[]{"000_legacy_schema.sql","003_flow1_minimal_schema.sql","004_flow1_sql_state.sql","006_flow1_simple_relational_foundation.sql","007_flow1_request_baseline.sql"})await Exec(shadow,await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory,"Sql",file)));
            await using(var target=new SqlConnection(shadow))
            {
                await target.OpenAsync();var tables=new List<string>();await using(var c=new SqlCommand("SELECT name FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo') ORDER BY name;",target))await using(var r=await c.ExecuteReaderAsync()){while(await r.ReadAsync())tables.Add(r.GetString(0));}
                if(!tables.Order().SequenceEqual(data.Keys.Order()))throw new InvalidDataException("SHADOW_SCHEMA_TABLE_REVIEW_REQUIRED");
                foreach(var table in tables)await Exec(shadow,$"ALTER TABLE dbo.{Quote(table)} NOCHECK CONSTRAINT ALL;");
                foreach(var(table,dt)in data)
                {
                    var columns=new HashSet<string>(StringComparer.OrdinalIgnoreCase);await using(var c=new SqlCommand("SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.'+QUOTENAME(@t));",target)){c.Parameters.AddWithValue("@t",table);await using var r=await c.ExecuteReaderAsync();while(await r.ReadAsync())columns.Add(r.GetString(0));}
                    if(dt.Columns.Cast<DataColumn>().Any(c=>!columns.Contains(c.ColumnName)))throw new InvalidDataException("SHADOW_SCHEMA_COLUMN_REVIEW_REQUIRED");
                    using var bulk=new SqlBulkCopy(target,SqlBulkCopyOptions.KeepIdentity|SqlBulkCopyOptions.KeepNulls,null){DestinationTableName="dbo."+Quote(table),BulkCopyTimeout=60};
                    foreach(DataColumn column in dt.Columns)bulk.ColumnMappings.Add(column.ColumnName,column.ColumnName);await bulk.WriteToServerAsync(dt);
                }
                foreach(var table in tables)await Exec(shadow,$"ALTER TABLE dbo.{Quote(table)} WITH CHECK CHECK CONSTRAINT ALL;");
            }
            await using var db=new Flow1RelationalContext(new DbContextOptionsBuilder<Flow1RelationalContext>().UseSqlServer(shadow).Options);
            var preview=await new RelationalConverter(db,sourceRoot,privateRoot,retainUnverifiedHistory).RunAsync();
            return new{Mode="READ_ONLY_SOURCE_SHADOW_DRY_RUN",SourceSnapshotFingerprint=sourceFingerprint,SourceRows=data.ToDictionary(x=>x.Key,x=>x.Value.Rows.Count),Preview=preview,Notice="Preview fingerprints belong to a disposable shadow; never use them as an apply token for the business database."};
        }
        finally
        {
            if(created){if(!Regex.IsMatch(name,@"\ARaceHorseFlow1Test_[a-f0-9]{32}\z"))throw new InvalidDataException("UNSAFE_SHADOW_TARGET");SqlConnection.ClearAllPools();await Exec(master,$"ALTER DATABASE {Quote(name)} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;DROP DATABASE {Quote(name)};");}
        }
    }
    private static async Task Exec(string connection,string sql){await using var c=new SqlConnection(connection);await c.OpenAsync();await using var command=new SqlCommand(sql,c){CommandTimeout=60};await command.ExecuteNonQueryAsync();}
}
