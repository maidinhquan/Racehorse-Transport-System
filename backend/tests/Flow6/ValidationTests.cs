using System.Text.Json.Nodes;
using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
using Xunit;
namespace Flow6.Tests;
public sealed class ValidationTests
{
    [Theory]
    [InlineData("FeedbackInput","{\"rating\":0,\"comment\":null}")]
    [InlineData("FeedbackInput","{\"rating\":6,\"comment\":null}")]
    [InlineData("FeedbackInput","{\"rating\":1.5,\"comment\":null}")]
    [InlineData("FeedbackInput","{\"rating\":\"5\",\"comment\":null}")]
    [InlineData("FeedbackInput","{\"rating\":5,\"comment\":null,\"actor\":\"USER_001\"}")]
    [InlineData("OtpInput","{\"otp\":\"12345\"}")]
    [InlineData("OtpInput","{\"otp\":123456}")]
    [InlineData("OtpInput","{\"otp\":\"123456\",\"status\":\"CONFIRMED\"}")]
    [InlineData("CaseInput","{\"type\":\"DISPUTE\",\"subject\":\"X\",\"description\":\"Details\"}")]
    [InlineData("InvoiceInput","{\"dueAtUtc\":\"2026-02-30T12:00:00Z\"}")]
    [InlineData("InvoiceInput","{\"dueAtUtc\":\"2026-11-01 12:00\"}")]
    [InlineData("InvoiceInput","{\"dueAtUtc\":\"2026-11-01T12:00:00Z\",\"amount\":10}")]
    [InlineData("ReasonInput","{\"reason\":\"   \"}")]
    [InlineData("RefundInput","{\"reference\":\"\",\"refundedAtUtc\":\"2026-11-01T12:00:00Z\"}")]
    public void Invalid_body_cannot_cross_the_boundary(string schema,string input)
        =>Assert.Throws<AftercareException>(()=>ApiContract.Validate(JsonNode.Parse(input),ApiContract.Schemas[schema]!));
    [Theory]
    [InlineData(-1)] [InlineData(10000000000)] [InlineData(1.5)]
    public void Money_cannot_exceed_sql_precision_or_use_fractional_dong(decimal value)=>Assert.Throws<AftercareException>(()=>Application.Flow6.Rules.BusinessRules.Money(value));
    [Fact]
    public void Closing_requires_settlement_elapsed_window_and_no_obligations()
    {
        var now=DateTime.UtcNow;
        Assert.False(Application.Flow6.Rules.BusinessRules.CanClose("AWAITING_PAYMENT",now.AddHours(-1),now,false));
        Assert.False(Application.Flow6.Rules.BusinessRules.CanClose("SETTLED",now.AddHours(1),now,false));
        Assert.False(Application.Flow6.Rules.BusinessRules.CanClose("SETTLED",now.AddHours(-1),now,true));
        Assert.False(Application.Flow6.Rules.BusinessRules.CanClose("SETTLED",null,now,false));
        Assert.True(Application.Flow6.Rules.BusinessRules.CanClose("SETTLED",now,now,false));
    }
}
