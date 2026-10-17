using System.Security.Cryptography;
using System.Text.Json;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Flow1RelationalConvert;
using Infrastructure.Data.Context;
using Infrastructure.Storage;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Flow1.Tests;
public sealed class RelationalConversionTests
{
    private sealed class Inputs:IAsyncDisposable
    {
        public Flow1TestDatabase Db=null!;public string Root=Path.Combine(Path.GetTempPath(),"flow1-conversion-"+Guid.NewGuid().ToString("N"));
        public string Source=>Path.Combine(Root,"source");public string Bytes=>Path.Combine(Root,"bytes");public Flow1RelationalContext Context=null!;public string Document="";public string FileId="";
        public RelationalConverter Tool()=>new(Context,Source,Bytes);
        public static async Task<Inputs> Create(bool sql=true,bool foundation=true)
        {
            var f=new Inputs{Db=await Flow1TestDatabase.CreateAsync(sqlState:sql)};if(foundation)await f.Db.ScriptAsync("006_flow1_simple_relational_foundation.sql");
            f.Context=new(new DbContextOptionsBuilder<Flow1RelationalContext>().UseSqlServer(f.Db.ConnectionString).Options);
            Directory.CreateDirectory(Path.Combine(f.Source,"horse"));Directory.CreateDirectory(f.Bytes);
            var png=Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=");
            var file=await new LocalFlow1PrivateFileStore(f.Bytes).PutAsync(new(png,"horse.png"),true,default);f.FileId=file.FileId;
            var horse=new HorseInput("Legacy","123456789012345","FEI","Thoroughbred","STALLION",450,new(2020,1,1));
            var json=new JsonSerializerOptions(JsonSerializerDefaults.Web);var payload=JsonSerializer.SerializeToElement(new HorseSnapshot("ACTIVE",horse,file,file,"fixture"),json);
            var doc=new Flow1StateDocument(1,"horse","legacy-horse",[new(1,"fixture-horse-operation",Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(payload.GetRawText()))),"owner","HORSE_CREATED",new DateTime(2026,10,1,0,0,0,DateTimeKind.Utc),payload)]);
            f.Document=JsonSerializer.Serialize(doc,json);await File.WriteAllTextAsync(Path.Combine(f.Source,"horse/legacy-horse.json"),f.Document);
            await f.Db.ExecuteAsync("INSERT HORSE(HorseID,OwnerID,Name,Microchip_ISO,FEI_Passport_No,Breed,Sex,Weight,DOB) VALUES('legacy-horse','owner','Legacy','123456789012345','FEI','Thoroughbred','STALLION',450,'20200101');");
            if(sql){await using var cn=new SqlConnection(f.Db.ConnectionString);await cn.OpenAsync();await using var cmd=new SqlCommand("UPDATE HORSE SET Flow1StateJson=@j,Flow1StateVersion=1 WHERE HorseID='legacy-horse';",cn);cmd.Parameters.AddWithValue("@j",JsonSerializer.Serialize(new{schemaVersion=1,documents=new Dictionary<string,Flow1StateDocument>{{"horse",doc}}},json));await cmd.ExecuteNonQueryAsync();}
            return f;
        }
        public async ValueTask DisposeAsync()
        {
            await Context.DisposeAsync();await Db.DisposeAsync();
            foreach(var file in Directory.GetFiles(Path.Combine(Source,"horse")))System.IO.File.Delete(file);
            foreach(var file in Directory.GetFiles(Bytes))System.IO.File.Delete(file);
            Directory.Delete(Path.Combine(Source,"horse"));Directory.Delete(Source);Directory.Delete(Bytes);Directory.Delete(Root);
        }
    }
    [LocalSqlFact]
    public async Task Offline_dry_run_apply_retry_drop_preserves_sources_bytes_and_existing_relations()
    {
        await using var f=await Inputs.Create();var dry=await f.Tool().RunAsync();Assert.Empty(dry.Blockers);Assert.False(dry.Applied);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM HORSE WHERE PhotoUrl IS NOT NULL;"));
        await Assert.ThrowsAsync<InvalidDataException>(()=>f.Tool().RunAsync(true,false,dry.Fingerprint));
        await Assert.ThrowsAsync<InvalidDataException>(()=>f.Tool().RunAsync(true,true,"wrong-fingerprint"));
        var applied=await f.Tool().RunAsync(true,true,dry.Fingerprint);Assert.True(applied.Applied);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM HORSE WHERE PhotoUrl=PassportScanUrl AND PhotoUrl LIKE 'private/%.png';"));
        var second=await f.Tool().RunAsync();Assert.Empty(second.Blockers);var dropped=await f.Tool().RunAsync(true,true,second.Fingerprint,true);Assert.True(dropped.RetainedColumnsDropped);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE name IN('Flow1StateJson','Flow1StateVersion');"));
        Assert.Equal(f.Document,await File.ReadAllTextAsync(Path.Combine(f.Source,"horse/legacy-horse.json")));
        Assert.True(File.Exists(Path.Combine(f.Bytes,f.FileId+".bin")));
        var data=new Flow1Data(f.Context,f.Source);Assert.Equal(1,await data.RunAsync(_=>Task.FromResult(1),default));
        await using(var shared=f.Db.Context()){var owner=await shared.Users.SingleAsync(x=>x.UserId=="owner");Assert.Equal("Owner",owner.FullName);Assert.DoesNotContain(shared.Model.GetEntityTypes().SelectMany(x=>x.GetProperties()),p=>p.Name.StartsWith("Flow1State",StringComparison.Ordinal));}
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRANSPORT_REQUEST WHERE RequestID='req-1' AND Status='ACCEPTED';"));
    }
    [LocalSqlFact]
    public async Task Source_tamper_stale_fingerprint_missing_bytes_and_sql_file_conflict_fail_closed()
    {
        await using var f=await Inputs.Create();var dry=await f.Tool().RunAsync();
        await f.Db.ExecuteAsync("UPDATE [USER] SET FullName='Changed' WHERE UserID='owner';");
        await Assert.ThrowsAsync<InvalidDataException>(()=>f.Tool().RunAsync(true,true,dry.Fingerprint));
        await File.WriteAllBytesAsync(Path.Combine(f.Bytes,f.FileId+".bin"),new byte[68]);var broken=await f.Tool().RunAsync();Assert.Contains(broken.Blockers,x=>x.Contains("FILE_OR_IDENTITY_REVIEW"));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM HORSE WHERE PhotoUrl IS NOT NULL;"));
        await File.WriteAllTextAsync(Path.Combine(f.Source,"horse/legacy-horse.json"),f.Document.Replace("HORSE_CREATED","DIFFERENT_ACTION"));
        await Assert.ThrowsAsync<InvalidDataException>(()=>f.Tool().RunAsync());
    }
    [LocalSqlFact]
    public async Task File_only_source_converts_without_004_and_does_not_create_any_table()
    {
        await using var f=await Inputs.Create(false);var tables=await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;");var dry=await f.Tool().RunAsync();Assert.Empty(dry.Blockers);
        await f.Tool().RunAsync(true,true,dry.Fingerprint,true);Assert.Equal(tables,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;"));
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM HORSE WHERE PassportScanUrl IS NOT NULL;"));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Business_like_schema_without_006_can_be_previewed_in_shadow_without_migrating_or_changing_source()
    {
        await using var f=await Inputs.Create(foundation:false);
        var result=JsonSerializer.SerializeToElement(await ShadowInventory.RunAsync(f.Db.ConnectionString,f.Source,f.Bytes));
        Assert.Equal("READ_ONLY_SOURCE_SHADOW_DRY_RUN",result.GetProperty("Mode").GetString());Assert.Equal(0,result.GetProperty("Preview").GetProperty("Blockers").GetArrayLength());
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('HORSE') AND name='PhotoUrl';"));
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM HORSE WHERE Flow1StateJson IS NOT NULL;"));
        Assert.Equal(f.Document,await File.ReadAllTextAsync(Path.Combine(f.Source,"horse/legacy-horse.json")));
    }

    [LocalSqlFact]
    public async Task Explicit_history_policy_is_exact_fingerprint_bound_and_does_not_invent_receipts_or_change_legacy_money()
    {
        await using var f=await Inputs.Create();await f.Db.ExecuteAsync("INSERT CONTRACT(ContractID,RequestID,CustomerID,ContractCode,CurrencyCode,TotalQuotedPrice,ContractStatus,SignedAt) VALUES('legacy-contract','req-1','owner','LEGACY','USD',100,'SIGNED','20261001');INSERT INVOICE(InvoiceID,ContractID,InvoiceType,CurrencyCode,TotalPayableAmount,PaidAmount,PaymentStatus) VALUES('legacy-invoice','legacy-contract','DEPOSIT','USD',40,20,'PARTIALLY_PAID');INSERT PAYMENT(PaymentID,InvoiceID,CurrencyCode,Amount,Method,Status,TransactionCode) VALUES('legacy-payment','legacy-invoice','USD',20,'BANK_TRANSFER','SUCCESS','old-reference');");
        var defaultPreview=await f.Tool().RunAsync();Assert.Contains(defaultPreview.Blockers,x=>x.Contains("CONTRACT_EVIDENCE_MISSING"));
        var approved=new RelationalConverter(f.Context,f.Source,f.Bytes,new HashSet<string>{"legacy-contract"});var preview=await approved.RunAsync();Assert.Empty(preview.Blockers);Assert.NotEqual(defaultPreview.Fingerprint,preview.Fingerprint);
        await Assert.ThrowsAsync<InvalidDataException>(()=>approved.RunAsync(true,true,defaultPreview.Fingerprint));
        await approved.RunAsync(true,true,preview.Fingerprint,true);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE ContractID='legacy-contract' AND SignedAt='20261001' AND CurrencyCode='USD' AND TotalQuotedPrice=100 AND PdfUrl IS NULL AND PdfSha256 IS NULL AND PublishedAtUtc IS NULL AND DepositAmount IS NULL AND IsCurrent=0;"));
        Assert.Equal(20m,await f.Db.ScalarAsync<decimal>("SELECT PaidAmount FROM INVOICE WHERE InvoiceID='legacy-invoice';"));Assert.Equal("old-reference",await f.Db.ScalarAsync<string>("SELECT TransactionCode FROM PAYMENT WHERE PaymentID='legacy-payment';"));
        await f.Db.ExecuteAsync("UPDATE CONTRACT SET CurrencyCode='VND',DepositAmount=40,DepositRateStandard=40,CompletionDeadline='20261101',IsCurrent=1 WHERE ContractID='legacy-contract';");
        await Assert.ThrowsAsync<InvalidDataException>(()=>approved.RunAsync());
    }

    [LocalSqlFact]
    public async Task Unknown_owner_payload_cannot_be_silently_discarded_by_conversion_or_drop()
    {
        await using var f=await Inputs.Create();await f.Db.ExecuteAsync("UPDATE HORSE SET Flow1StateJson=JSON_MODIFY(Flow1StateJson,'$.unmappedBusinessFlag',CAST(1 AS bit));");
        var e=await Assert.ThrowsAsync<InvalidDataException>(()=>f.Tool().RunAsync());Assert.Equal("UNSUPPORTED_ENVELOPE_OR_EMPTY_DOCUMENTS",e.Message);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM HORSE WHERE Flow1StateJson IS NOT NULL AND PhotoUrl IS NULL;"));
        await f.Db.ExecuteAsync("UPDATE HORSE SET Flow1StateJson=NULL WHERE HorseID='legacy-horse';");
        var missing=await Assert.ThrowsAsync<InvalidDataException>(()=>f.Tool().RunAsync());Assert.Equal("MISSING_OWNER_STATE",missing.Message);
    }

}
