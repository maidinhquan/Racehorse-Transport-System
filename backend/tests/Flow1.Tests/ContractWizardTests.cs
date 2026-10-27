using System.Text.Json;
using System.Net;
using System.Net.Http.Json;
using Application.Common.Exceptions;
using Application.DTOs;
using Application.DTOs.Flow1;
using Xunit;
using Fixture=Flow1.Tests.RelationalFlow1Tests.Fixture;

namespace Flow1.Tests;

public sealed class ContractWizardTests
{
    private static async Task<FlowRequestCard> Accepted(Fixture f)
    {var r=await f.Request();return await f.Service.ReviewAsync(r.RequestId,"manager","accept",new(r.Version),default);}
    [LegacySqlFact]
    public async Task Draft_can_change_domestic_mode_schedule_prices_and_notes_then_reopen_and_publish()
    {
        await using var f=await Fixture.Create();var r=await Accepted(f);
        var from=new DateTimeOffset(r.DepartureAt!.Value).AddDays(2);var to=new DateTimeOffset(r.DeliveryAt!.Value).AddDays(2);
        var plan=await f.Service.RequestCostsAsync(r.RequestId,"manager",new(TransportMode:"AIR",DepartureAt:from,DeliveryAt:to),default);
        var unchanged=await f.Service.DetailAsync(r.RequestId,"manager",true,default);
        Assert.Equal("ROAD",unchanged.Input!.Trip.PreferredTransportMode);Assert.Equal(r.DepartureAt,unchanged.DepartureAt);
        var c=await f.Service.DraftAsync(r.RequestId,"manager","contract-wizard-draft",new(r.Version,TransportMode:"AIR",DepartureAt:from,DeliveryAt:to,Costs:plan.Costs,CommercialNotes:"Includes stated services"),default);
        Assert.Equal(plan.Costs.Total,c.TotalPrice);Assert.Null(c.PublishedAtUtc);Assert.Null(c.SignDeadline);Assert.NotEmpty(c.ContractCode!);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        var request=await f.Service.DetailAsync(r.RequestId,"manager",true,default);Assert.Equal("AIR",request.Input!.Trip.PreferredTransportMode);Assert.Null(request.DistanceKm);Assert.Equal(7,request.PreparationDays);
        Assert.Empty((await f.Service.DetailAsync(r.RequestId,"owner",false,default)).Contracts);
        Assert.Equal("NOT_FOUND",(await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ContractAsync(c.ContractId,"owner",false,default))).ErrorCode);
        var edited=new CostAmounts(4000000,600000,6000000,800000,2000000);
        c=await f.Service.UpdateDraftAsync(c.ContractId,"manager",new(c.Version,Costs:edited,DepositRate:30,CommercialNotes:"Updated quote"),default);
        var reopened=await f.Service.ContractAsync(c.ContractId,"manager",true,default);
        Assert.Equal(edited,reopened.Costs);Assert.Equal(edited.Total,reopened.TotalPrice);Assert.Equal(edited.Total*.3m,reopened.DepositAmount);Assert.Equal("Updated quote",reopened.CommercialNotes);
        f.Time.Value=f.Time.Value.AddHours(2);c=await f.Service.PublishAsync(c.ContractId,"manager",new(c.Version,AdditionalClauses:["Quiet handling"]),default);
        Assert.Equal(f.Time.Value.UtcDateTime.AddHours(24),c.SignDeadline);Assert.Equal("AWAITING_DEPOSIT",c.Status);Assert.Equal(f.Time.Value.UtcDateTime,c.PublishedAtUtc);
        var model=f.Renderer.Last!.FrozenSnapshot.Deserialize<ContractPdfModel>(CustomerTransportTests.Json)!;
        Assert.Equal(edited,model.Costs);Assert.Equal("Updated quote",model.Values["COMMERCIAL_NOTES"]);Assert.Contains("VN → VN",model.Values["TRANSPORT_SCOPE"]);
        Assert.Equal("Quiet handling",Assert.Single(model.AdditionalClauses!));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('CONTRACT') AND name='DraftTermsJson';"));
    }
    [LegacySqlFact]
    public async Task Invalid_prices_dates_modes_and_stale_updates_leave_the_draft_unchanged()
    {
        await using var f=await Fixture.Create();var r=await Accepted(f);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DraftAsync(r.RequestId,"manager","bad-sum-quote",new(r.Version,Price:12345,Costs:new(1,2,3,4,5)),default));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));
        var c=await f.Service.DraftAsync(r.RequestId,"manager","valid-sum-quote",new(r.Version),default);
        foreach(var input in new[]{new FlowAction(c.Version,TransportMode:"SEA"),new(c.Version,DeliveryAt:new DateTimeOffset(r.DepartureAt!.Value).AddDays(-1)),new(c.Version,CommercialNotes:new string('x',2001)),new(c.Version,AdditionalClauses:["Not saved in DB"])})
            await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.UpdateDraftAsync(c.ContractId,"manager",input,default));
        var old=c.Version;c=await f.Service.UpdateDraftAsync(c.ContractId,"manager",new(c.Version,CommercialNotes:"A"),default);
        Assert.Equal("STALE_VERSION",(await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.UpdateDraftAsync(c.ContractId,"manager",new(old,CommercialNotes:"B"),default))).ErrorCode);
        Assert.Equal("A",(await f.Service.ContractAsync(c.ContractId,"manager",true,default)).CommercialNotes);
    }
    [LegacySqlFact]
    public async Task Domestic_air_can_switch_back_to_road_and_invalid_Japan_road_is_rejected()
    {
        await using var f=await Fixture.Create();var r=await Accepted(f);
        var c=await f.Service.DraftAsync(r.RequestId,"manager","domestic-air-plan",new(r.Version,TransportMode:"AIR"),default);
        c=await f.Service.UpdateDraftAsync(c.ContractId,"manager",new(c.Version,TransportMode:"ROAD"),default);
        var road=await f.Service.DetailAsync(r.RequestId,"manager",true,default);Assert.Equal("ROAD",road.Input!.Trip.PreferredTransportMode);Assert.True(road.DistanceKm>0);Assert.Equal(2,road.PreparationDays);
        await f.Db.ExecuteAsync($"UPDATE TRANSPORT_REQUEST SET DestinationCountry='JP',TransportType='AIR',DistanceKm=NULL,PreparationDays=7 WHERE RequestID='{r.RequestId}';");
        var error=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.RequestCostsAsync(r.RequestId,"manager",new(TransportMode:"ROAD"),default));
        Assert.Equal("UNSUPPORTED_TRANSPORT_MODE",error.ErrorCode);
    }
    [LegacySqlFact]
    public async Task Published_unpaid_terms_can_be_reissued_but_payment_and_signature_lock_all_edits()
    {
        await using var f=await Fixture.Create();var(r,c)=await f.Published();
        var quote=new CostAmounts(4000000,600000,6000000,800000,2000000);
        c=await f.Service.ReissueAsync(c.ContractId,"manager",new(c.Version,quote.Total,7,new(r.DepartureAt!.Value),new(r.DeliveryAt!.Value),null,"Air chosen",Costs:quote,TransportMode:"AIR",CommercialNotes:"Air services"),default);
        Assert.Equal("Air services",c.CommercialNotes);Assert.Equal(quote.Total,c.TotalPrice);
        await f.Session(c);c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);
        var input=new ContractReissueInput(c.Version,quote.Total,7,new(r.DepartureAt!.Value),new(r.DeliveryAt!.Value),null,"Blocked",Costs:quote);
        Assert.Equal("PAYMENT_STARTED",(await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReissueAsync(c.ContractId,"manager",input,default))).ErrorCode);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.UpdateDraftAsync(c.ContractId,"manager",new(c.Version,CommercialNotes:"Blocked"),default));
    }
    [LegacySqlFact]
    public async Task Rendering_failure_keeps_draft_without_invoice_or_publication_notice()
    {
        await using var f=await Fixture.Create();var r=await Accepted(f);var c=await f.Service.DraftAsync(r.RequestId,"manager","failed-pdf-draft",new(r.Version),default);
        f.Renderer.DuringRender=()=>throw new InvalidOperationException("PDF failure fixture");
        await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Service.PublishAsync(c.ContractId,"manager",new(c.Version),default));
        c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);Assert.Equal("DRAFT",c.Status);Assert.Null(c.PdfSha256);Assert.Null(c.PublishedAtUtc);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='FLOW1_CONTRACT_READY';"));
    }
    [LegacySqlFact]
    public async Task Draft_update_and_customer_get_use_the_same_five_lines_and_contract_code()
    {
        await using var f=await Fixture.Create();var r=await Accepted(f);using var app=new RelationalHttpFactory(f);using var manager=app.Client("manager","LOGISTICS_MANAGER");
        var c=await f.Service.DraftAsync(r.RequestId,"manager","http-contract-draft",new(r.Version),default);
        using var response=await manager.PutAsJsonAsync($"/api/manager/contracts/{c.ContractId}/draft",new FlowAction(c.Version,CommercialNotes:"HTTP note",DepositRate:30));
        Assert.True(response.IsSuccessStatusCode,await response.Content.ReadAsStringAsync());c=(await response.Content.ReadFromJsonAsync<ApiResponse<FlowContractCard>>())!.Data!;
        Assert.Equal("HTTP note",c.CommercialNotes);c=await f.Service.PublishAsync(c.ContractId,"manager",new(c.Version),default);
        using var customer=app.Client();var value=(await customer.GetFromJsonAsync<ApiResponse<FlowContractCard>>($"/api/customer/contracts/{c.ContractId}"))!.Data!;
        Assert.Equal(c.ContractCode,value.ContractCode);Assert.Equal(c.TotalPrice,value.Costs!.Total);Assert.Equal("HTTP note",value.CommercialNotes);
        using var other=app.Client("other");Assert.Equal(HttpStatusCode.Forbidden,(await other.PutAsJsonAsync($"/api/manager/contracts/{c.ContractId}/draft",new{})).StatusCode);
    }
    [LegacySqlFact]
    public async Task Legacy_internal_costs_are_not_exposed_as_customer_selling_lines_or_rewrite_published_pdf()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();var hash=c.PdfSha256;
        await f.Db.ExecuteAsync("UPDATE COST_ITEM SET TotalMoney=1 WHERE SubcodeName='PLANNED_TRANSPORT';");
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        Assert.Null(c.Costs);Assert.Equal(100000000m,c.TotalPrice);Assert.Equal(hash,c.PdfSha256);
    }
}
