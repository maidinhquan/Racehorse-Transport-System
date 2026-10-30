using System.Net;
using System.Net.Http.Json;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Xunit;
using Fixture = Flow1.Tests.RelationalFlow1Tests.Fixture;

namespace Flow1.Tests;

public sealed class RequiredContractClauseTests
{
    private static async Task<(FlowRequestCard Request,FlowContractCard Contract)> Draft(Fixture f)
    {
        var r=await f.Request();r=await f.Service.ReviewAsync(r.RequestId,"manager","accept",new(r.Version,"Ready"),default);
        var c=await f.Service.DraftAsync(r.RequestId,"manager","required-clauses-draft",new(r.Version,Price:100000000,Costs:CustomerTransportTests.Quote(100000000),PreparationDays:2),default);
        return(r,c);
    }
    [LegacySqlFact]
    public async Task Migration_seeds_A_through_L_once_and_preserves_operator_edits()
    {
        await using var db=await Flow1TestDatabase.CreateAsync();
        Assert.Equal(12,await db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT_TEMPLATE WHERE TemplateID LIKE 'flow1-required-clause-%';"));
        Assert.Equal(0,await db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT_TEMPLATE WHERE TemplateID LIKE 'flow1-required-clause-%' AND LEN(BodyContent)=1;"));
        Assert.Equal("Điều 1. Thông tin và tư cách các bên",await db.ScalarAsync<string>("SELECT TemplateName FROM CONTRACT_TEMPLATE WHERE TemplateID='flow1-required-clause-01';"));
        await db.ExecuteAsync("UPDATE CONTRACT_TEMPLATE SET BodyContent=N'Operator revision' WHERE TemplateID='flow1-required-clause-01';");
        await db.ScriptAsync("002_flow1.sql");
        Assert.Equal("Operator revision",await db.ScalarAsync<string>("SELECT BodyContent FROM CONTRACT_TEMPLATE WHERE TemplateID='flow1-required-clause-01';"));
        Assert.Equal(12,await db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT_TEMPLATE WHERE TemplateID LIKE 'flow1-required-clause-%';"));
    }
    [LegacySqlFact]
    public async Task Publication_automatically_adds_all_required_clauses_and_crud_cannot_deactivate_them()
    {
        await using var f=await Fixture.Create();var(_,c)=await Draft(f);
        var catalogue=await f.Service.ClausesAsync("manager",false,default);
        Assert.Equal(RequiredContractClauses.Ids,catalogue.Where(x=>x.IsRequired).Select(x=>x.ClauseId));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SaveClauseAsync(f.ClauseId,"manager",new("Required","Cannot disable","VI",false),default));
        var optional=await f.Service.SaveClauseAsync(null,"manager",new("Optional","Extra catalogue text"),default);
        c=await f.Service.PublishAsync(c.ContractId,"manager",new(c.Version,ClauseIds:[optional.ClauseId]),default);
        var terms=await f.Service.ContractTermsAsync(c.ContractId,"owner",false,default);
        Assert.Equal(13,terms.Clauses.Count);Assert.Equal(12,terms.Clauses.Count(x=>x.IsRequired));
        Assert.Equal(RequiredContractClauses.Ids,terms.Clauses.Take(12).Select(x=>x.ClauseId));
        await f.Service.SaveClauseAsync(optional.ClauseId,"manager",new("Optional","Extra catalogue text","VI",false),default);
        Assert.Equal(13,(await f.Service.ContractTermsAsync(c.ContractId,"owner",false,default)).Clauses.Count);
    }
    [LegacySqlFact]
    public async Task Missing_required_clause_blocks_publication_without_creating_invoice_or_published_pdf()
    {
        await using var f=await Fixture.Create();var(_,c)=await Draft(f);
        await f.Db.ExecuteAsync("DELETE CONTRACT_TEMPLATE WHERE TemplateID='flow1-required-clause-12';");
        var error=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PublishAsync(c.ContractId,"manager",new(c.Version,ClauseIds:[]),default));
        Assert.Equal("REQUIRED_CLAUSES_MISSING",error.ErrorCode);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        Assert.Null((await f.Service.ContractAsync(c.ContractId,"manager",true,default)).PdfSha256);
    }
    [LegacySqlFact]
    public async Task Additional_terms_are_only_in_pdf_and_reissue_keeps_then_explicitly_replaces_them()
    {
        const string additional="PDF_ONLY_SENTINEL_20261020: Chăm sóc theo thỏa thuận riêng.";
        await using var f=await Fixture.Create();var(r,c)=await Draft(f);
        c=await f.Service.PublishAsync(c.ContractId,"manager",new(c.Version,AdditionalClauses:[additional]),default);
        var originalPdf=(await f.Service.PdfAsync(c.ContractId,"owner",false,default)).Bytes;
        var terms=await f.Service.ContractTermsAsync(c.ContractId,"owner",false,default);
        Assert.Equal(12,terms.Clauses.Count);Assert.Equal(additional,Assert.Single(terms.AdditionalClauses));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT_TEMPLATE WHERE BodyContent LIKE '%PDF_ONLY_SENTINEL_20261020%';"));
        Assert.DoesNotContain("PDF_ONLY_SENTINEL_20261020",await f.Db.ScalarAsync<string>("SELECT * FROM CONTRACT FOR JSON PATH;"));
        Assert.DoesNotContain("PDF_ONLY_SENTINEL_20261020",await f.Db.ScalarAsync<string>("SELECT * FROM TRANSPORT_REQUEST FOR JSON PATH;"));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('CONTRACT') AND name LIKE '%AdditionalClause%';"));
        var reissue=new ContractReissueInput(c.Version,c.TotalPrice,2,new(r.DepartureAt!.Value),new(r.DeliveryAt!.Value),[],"Reissue price");
        c=await f.Service.ReissueAsync(c.ContractId,"manager",reissue with {Price=95000000,Costs=CustomerTransportTests.Quote(95000000)},default);
        Assert.Equal(additional,Assert.Single((await f.Service.ContractTermsAsync(c.ContractId,"owner",false,default)).AdditionalClauses));
        Assert.Equal(additional,Assert.Single(PublishedClauseSelection.ReadAdditional(originalPdf)));
        c=await f.Service.ReissueAsync(c.ContractId,"manager",reissue with {Version=c.Version,Price=c.TotalPrice,AdditionalClauses=[]},default);
        Assert.Empty((await f.Service.ContractTermsAsync(c.ContractId,"owner",false,default)).AdditionalClauses);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));
    }
    [LegacySqlFact]
    public async Task Price_only_feedback_cannot_silently_replace_additional_terms()
    {
        await using var f=await Fixture.Create();var(r,c)=await Draft(f);
        c=await f.Service.PublishAsync(c.ContractId,"manager",new(c.Version,AdditionalClauses:["Original additional clause"]),default);
        c=await f.Service.FeedbackAsync(c.ContractId,"owner",new(c.Version,"Giảm giá",["PRICE"]),default);
        var input=new ContractReissueInput(c.Version,95000000,2,new(r.DepartureAt!.Value),new(r.DeliveryAt!.Value),[],"Adjusted price",["Changed clause"],Costs:CustomerTransportTests.Quote(95000000));
        var error=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReissueAsync(c.ContractId,"manager",input,default));
        Assert.Equal("FIELD_LOCKED",error.ErrorCode);
        c=await f.Service.ReissueAsync(c.ContractId,"manager",input with {AdditionalClauses=null},default);
        Assert.Equal("Original additional clause",Assert.Single((await f.Service.ContractTermsAsync(c.ContractId,"owner",false,default)).AdditionalClauses));
    }
    [LegacySqlFact]
    public async Task Terms_http_uses_standard_envelope_and_does_not_expose_another_customers_pdf()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();
        using var app=new RelationalHttpFactory(f);using var owner=app.Client();using var other=app.Client("other");using var anonymous=app.Client(null);
        var response=await owner.GetAsync($"/api/customer/contracts/{c.ContractId}/terms");
        Assert.Equal(HttpStatusCode.OK,response.StatusCode);
        var json=await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());Assert.True(json.TryGetProperty("message",out _));
        Assert.Equal(12,json.GetProperty("data").GetProperty("clauses").GetArrayLength());
        Assert.Equal(HttpStatusCode.NotFound,(await other.GetAsync($"/api/customer/contracts/{c.ContractId}/terms")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,(await anonymous.GetAsync($"/api/customer/contracts/{c.ContractId}/terms")).StatusCode);
    }
    [LegacySqlFact]
    public async Task Invalid_additional_clauses_are_rejected_before_pdf_publication()
    {
        await using var f=await Fixture.Create();var(_,c)=await Draft(f);
        foreach(var input in new IReadOnlyList<string>[] { [" "], [new string('x',2001)], Enumerable.Repeat("x",21).ToArray() })
            await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PublishAsync(c.ContractId,"manager",new(c.Version,AdditionalClauses:input),default));
        Assert.Null((await f.Service.ContractAsync(c.ContractId,"manager",true,default)).PdfSha256);
    }
    [LegacySqlFact]
    public async Task Signed_pdf_and_its_terms_cannot_be_reissued_or_changed_by_later_catalogue_edits()
    {
        await using var f=await Fixture.Create();var c=await f.Signed();
        var original=(await f.Service.PdfAsync(c.ContractId,"owner",false,default)).Bytes;
        var r=(await f.Service.ListAsync("owner",false,default)).Single(x=>x.Contracts.Any(k=>k.ContractId==c.ContractId));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReissueAsync(c.ContractId,"manager",new(c.Version,c.TotalPrice,2,new(r.DepartureAt!.Value),new(r.DeliveryAt!.Value),[],"Cannot change signed terms",["New text"]),default));
        await f.Service.SaveClauseAsync(f.ClauseId,"manager",new("New catalogue title","Tomorrow's content"),default);
        Assert.Equal(original,(await f.Service.PdfAsync(c.ContractId,"owner",false,default)).Bytes);
        Assert.DoesNotContain((await f.Service.ContractTermsAsync(c.ContractId,"owner",false,default)).Clauses,x=>x.Content=="Tomorrow's content");
    }
}
