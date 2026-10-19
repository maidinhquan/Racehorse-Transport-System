using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Infrastructure.Data.Context;
using Xunit;

namespace Flow1.Tests;
public sealed class ReadableRequestCodeTests
{
    [LocalSqlFact]
    public async Task Distinct_simultaneous_submissions_get_distinct_numbers_and_a_new_year_restarts_the_sequence()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();
        var first=await f.Request("numbering-seed-key");
        await f.Db.ExecuteAsync($"UPDATE TRANSPORT_REQUEST SET Status='CANCELLED' WHERE RequestID='{first.RequestId}';");
        var horse=await f.Service.HorseAsync("owner","numbering-second-horse",new("Second","123456789012346","FEI-2","Breed","GELDING",450,new(2020,1,1)),
            new(System.Text.Encoding.UTF8.GetBytes("fixture photo bytes"),"p.png"),new(System.Text.Encoding.UTF8.GetBytes("fixture passport bytes"),"p.pdf"),null,null,default);
        var other=first.Input! with {Horses=[new(horse.HorseId,horse.Version)]};
        var rows=await Task.WhenAll(f.NewService().SubmitAsync("owner","numbering-distinct-one",first.Input!,null,null,default),
            f.NewService().SubmitAsync("owner","numbering-distinct-two",other,null,null,default));
        Assert.Equal(new[]{"REQ_2026_002","REQ_2026_003"},rows.Select(x=>x.RequestId).Order().ToArray());
        f.Time.Value=f.Time.Value.AddYears(1);
        var next=first.Input! with {Trip=first.Input!.Trip with{DesiredDepartureDate=first.Input.Trip.DesiredDepartureDate.AddYears(1)},DepartureAt=first.Input.DepartureAt.AddYears(1),DeliveryAt=first.Input.DeliveryAt.AddYears(1)};
        Assert.Equal("REQ_2027_001",(await f.Service.SubmitAsync("owner","numbering-next-year",next,null,null,default)).RequestId);
    }
    [LocalSqlFact]
    public async Task Sequential_ids_follow_legacy_numbers_and_retries_keep_the_same_request()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();
        await f.Db.ExecuteAsync("INSERT TRANSPORT_REQUEST(RequestID,CustomerID,Departure,Destination,Status) VALUES('REQ_2026_003','owner','Legacy','Legacy','CANCELLED');");
        var first=await f.Request("readable-request-key-one");
        Assert.Equal("REQ_2026_004",first.RequestId);
        Assert.Equal(3_500_000m,first.EstimatedTransportCost);
        var replays=await Task.WhenAll(f.NewService().SubmitAsync("owner","readable-request-key-one",first.Input!,null,null,default),
            f.NewService().SubmitAsync("owner","readable-request-key-one",first.Input!,null,null,default));
        Assert.All(replays,r=>Assert.Equal(first.RequestId,r.RequestId));
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRANSPORT_REQUEST WHERE SubmissionKeyHash IS NOT NULL;"));
        var changed=first.Input! with {Purpose="Different purpose"};
        Assert.Equal("IDEMPOTENCY_KEY_REUSED",(await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SubmitAsync("owner","readable-request-key-one",changed,null,null,default))).ErrorCode);
        await f.Db.ExecuteAsync("UPDATE TRANSPORT_REQUEST SET Status='CANCELLED' WHERE RequestID='REQ_2026_004';");
        Assert.Equal("REQ_2026_005",(await f.Request("readable-request-key-two")).RequestId);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRANSPORT_REQUEST WHERE RequestID='REQ_2026_003' AND SubmissionKeyHash IS NULL;"));
    }

    [LocalSqlFact]
    public async Task Replays_of_pre008_hash_ids_still_resolve_without_renaming_or_duplicates()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();
        var r=await f.Request("legacy-replay-key-one");
        var hash=Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes("owner\nlegacy-replay-key-one"))).ToLowerInvariant();
        var old="r"+hash[..40];
        // Only fixture links exist; preserve the linked horse while simulating an older ID.
        await f.Db.ExecuteAsync($"DELETE REQUEST_HORSE_MAPPING WHERE RequestID='{r.RequestId}'; UPDATE TRANSPORT_REQUEST SET RequestID='{old}',SubmissionKeyHash=NULL WHERE RequestID='{r.RequestId}';INSERT REQUEST_HORSE_MAPPING(RequestHorseID,RequestID,HorseID) SELECT 'legacy-replay-mapping','{old}',HorseID FROM HORSE WHERE OwnerID='owner' AND Microchip_ISO='123456789012345';");
        var replay=await f.Service.SubmitAsync("owner","legacy-replay-key-one",r.Input!,null,null,default);
        Assert.Equal(old,replay.RequestId);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRANSPORT_REQUEST WHERE SubmissionKeyHash IS NOT NULL;"));
    }

    [LocalSqlFact]
    public async Task Migration_is_repeatable_and_missing_or_disabled_unique_index_closes_runtime()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();
        var count=await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;");
        var fks=await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.foreign_keys;");
        await f.Db.ScriptAsync("002_flow1.sql");
        Assert.Equal(count,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;"));
        Assert.Equal(fks,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.foreign_keys;"));
        await f.Db.ExecuteAsync("ALTER INDEX UX_F1N_RequestSubmission ON TRANSPORT_REQUEST DISABLE;");
        Assert.Equal("FLOW1_SQL_SCHEMA_REQUIRED",(await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ListAsync("owner",false,default))).ErrorCode);
        await Assert.ThrowsAsync<Microsoft.Data.SqlClient.SqlException>(()=>f.Db.ScriptAsync("002_flow1.sql"));
    }

    [LocalSqlFact]
    public async Task Demo_transport_price_does_not_change_when_manager_quotes_a_different_price()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();
        var r=await f.Request();
        r=await f.Service.ReviewAsync(r.RequestId,"manager","accept",new(r.Version,"Accepted"),default);
        await f.Service.DraftAsync(r.RequestId,"manager","demo-quote-key",new(r.Version,Price:1_000_000,PreparationDays:2,Deadline:f.Time.Value.AddDays(2)),default);
        var detail=await f.Service.DetailAsync(r.RequestId,"owner",false,default);
        Assert.Equal(3_500_000m,detail.EstimatedTransportCost);
        Assert.Equal(1_000_000m,Assert.Single(detail.Contracts).TotalPrice);
    }

    [Theory]
    [InlineData("ROAD",100,2,7000000)]
    [InlineData("ROAD",1575.68,2,110297600)]
    [InlineData("AIR",0,2,140000000)]
    public void Demo_price_uses_transport_only_and_air_does_not_invent_road_kilometres(string mode,decimal km,int horses,decimal expected)
        =>Assert.Equal(expected,Flow1PricingPolicy.DemoTransportPrice(mode,km,horses));
}
