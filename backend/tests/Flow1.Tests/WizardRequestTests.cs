using System.Text;
using Application.Common.Exceptions;
using Application.DTOs.Flow1;
using Xunit;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Application.DTOs;

namespace Flow1.Tests;

public sealed class WizardRequestTests
{
    private static UploadedFile Document(string text) => new(Encoding.UTF8.GetBytes("%PDF-1.4 fixture " + text), "document.pdf");
    private static async Task<FlowHorseCard> Horse(RelationalFlow1Tests.Fixture f, string key = "wizard-horse-one", HorseInput? input = null) =>
        await f.Service.HorseAsync("owner", key, input ?? CustomerTransportTests.Horse(),
            new(CustomerTransportTests.Png,"photo.png"),Document("passport"),null,null,default,Document("ownership"),Document("valuation"));
    private static FlowRequestInput Input(FlowHorseCard h) => new(
        new(new("A",10,106,"VN"),new("B",11,107,"VN"),"ROAD",1,new(2026,11,20)),
        new(2026,11,20,3,0,0,TimeSpan.Zero),new(2026,11,22,3,0,0,TimeSpan.Zero),"Race",
        new("Sender","0900000000","Pickup stable","700000","Use north gate"),
        new("Receiver","0900000001","Delivery stable","100000","Call before arrival"),
        [new(h.HorseId,h.Version,"Feed at 8 AM")],CareInstructions:"Quiet transport");

    [LegacySqlFact]
    public async Task Horse_profile_roundtrips_and_missing_trip_documents_do_not_block_request()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var h=await Horse(f);
        Assert.Equal("Sensitive to loud noise",h.SpecialHealthNotes);Assert.Equal(100000000m,h.DeclaredValueVnd);
        Assert.Equal("Fixture issuer",h.PassportIssuedBy);Assert.Equal(4,h.Documents!.Count);
        Assert.All(h.Documents,d=>Assert.Equal("UPLOADED",d.Status));
        Assert.Equal(Document("ownership").Bytes,(await f.Service.HorseFileAsync("owner",h.HorseId,"ownership",null,default)).Bytes);
        Assert.Equal("FORBIDDEN",(await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.HorseFileAsync("other",h.HorseId,"valuation",null,default))).ErrorCode);
        var r=await f.Service.SubmitAsync("owner","wizard-submit-one",Input(h),null,null,default);
        Assert.Equal("PENDING",r.Status);Assert.Equal(100000000m,r.DeclaredValueVnd);
        Assert.Equal("Pickup stable",r.Input!.PickupContact.StableName);Assert.Equal("100000",r.Input.Receiver.PostalCode);
        Assert.Equal("Use north gate",r.Input.PickupContact.Instructions);Assert.Equal("Quiet transport",r.Input.CareInstructions);
        Assert.Equal("Feed at 8 AM",r.Horses.Single().CareInstructions);Assert.Equal(h.SpecialHealthNotes,r.Horses.Single().SpecialHealthNotes);
        Assert.Empty(r.Documents!);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM LEGAL_MEDICAL_RECORD;"));
        Assert.Equal("Pickup stable",(await f.Service.DetailAsync(r.RequestId,"manager",true,default)).Input!.PickupContact.StableName);
        Assert.Equal("HORSE_IN_USE",(await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.HorseAsync("owner","wizard-edit-horse",CustomerTransportTests.Horse(),new(CustomerTransportTests.Png,"p.png"),Document("passport"),h.HorseId,h.Version,default,Document("ownership")))).ErrorCode);
        Assert.Equal("IDEMPOTENCY_KEY_REUSED",(await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SubmitAsync("owner","wizard-submit-one",Input(h) with { PickupContact=Input(h).PickupContact with { PostalCode="999" } },null,null,default))).ErrorCode);
    }

    [LegacySqlFact]
    public async Task Invalid_profile_dates_value_missing_ownership_and_oversized_notes_are_rejected()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var input=CustomerTransportTests.Horse();
        foreach(var bad in new[]{input with { PassportIssuedBy=null },input with { PassportExpiryDate=new(2020,1,1) },input with { DeclaredValueVnd=0 },input with { DeclaredValueVnd=1.5m },input with { SpecialHealthNotes=new string('x',2001) }})
            Assert.Equal("VALIDATION_ERROR",(await Assert.ThrowsAsync<BusinessRuleException>(()=>Horse(f,input:bad))).ErrorCode);
        Assert.Equal("VALIDATION_ERROR",(await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.HorseAsync("owner","wizard-no-ownership",input,new(CustomerTransportTests.Png,"p.png"),Document("passport"),null,null,default)) ).ErrorCode);
        var h=await Horse(f);var request=Input(h) with { Receiver=Input(h).Receiver with { Instructions=new string('x',1001) } };
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SubmitAsync("owner","wizard-long-instructions",request,null,null,default));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRANSPORT_REQUEST WHERE SubmissionKeyHash IS NOT NULL;"));
    }

    [LegacySqlFact]
    public async Task Insurance_uses_server_horse_values_instead_of_the_client_estimate_value()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var h=await Horse(f,input:CustomerTransportTests.Horse() with { DeclaredValueVnd=1000000000m });
        var input=Input(h);input=input with { Trip=input.Trip with { InsuredValueVnd=1 } };
        var r=await f.Service.SubmitAsync("owner","wizard-insurance",input,null,null,default);
        var plan=await f.Service.RequestCostsAsync(r.RequestId,"manager",new(),default);
        Assert.Equal(1000000000m,r.DeclaredValueVnd);Assert.Equal(5000000m,plan.Costs.Insurance);
    }

}
