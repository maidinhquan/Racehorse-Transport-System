using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Application.DTOs.Flow1;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Fixture = Flow1.Tests.RelationalFlow1Tests.Fixture;

namespace Flow1.Tests;

public sealed class ObsoleteColumnRemovalTests
{
    private const string RemovedColumnsSql = """
        SELECT COUNT(*) FROM sys.columns WHERE
          object_id=OBJECT_ID('dbo.CONTRACT_TEMPLATE') AND name='Version'
          OR object_id=OBJECT_ID('dbo.CONTRACT') AND name IN
          ('LastExtensionTarget','BaseContractPrice_P','ExchangeRateToLocal','ActualGrossProfit_AGP');
        """;

    [LocalSqlFact]
    public async Task Clean_schema_keeps_teammate_reset_OTP_and_supports_clauses_extension_and_both_EF_models()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();
        Assert.Equal(0,await f.Db.ScalarAsync<int>(RemovedColumnsSql));
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USER') AND name='ResetOtpCode';"));
        var clause=await f.Service.SaveClauseAsync(null,"manager",new("New clause","Clause without a template version"),default);
        Assert.Contains(await f.Service.ClausesAsync("manager",false,default),x=>x.ClauseId==clause.ClauseId);
        c=await f.Service.LifecycleAsync(c.ContractId,"manager",true,"extend",
            new(c.Version,"Extend shared deadline",Deadline:new DateTimeOffset(c.SignDeadline!.Value,TimeSpan.Zero).AddHours(24)),default);
        Assert.Equal(c.SignDeadline,c.DepositDeadline);Assert.Equal("Extend shared deadline",c.ExtensionReason);
        using var app=new RelationalHttpFactory(f);using var manager=app.Client("manager","LOGISTICS_MANAGER");
        var response=await manager.GetAsync($"/api/manager/contracts/{c.ContractId}");Assert.Equal(HttpStatusCode.OK,response.StatusCode);
        using var json=JsonDocument.Parse(await response.Content.ReadAsStringAsync());var data=json.RootElement.GetProperty("data");
        Assert.False(data.TryGetProperty("extensionTarget",out _));Assert.True(data.TryGetProperty("version",out _));
        await using var context=f.Db.Context();
        Assert.NotEmpty(await context.Users.ToListAsync());
        Assert.NotEmpty(await context.ContractTemplates.ToListAsync());
        Assert.NotEmpty(await context.Contracts.ToListAsync());
    }

    [LocalSqlFact]
    public async Task Populated_upgrade_preserves_deadlines_money_reset_OTP_and_is_repeatable()
    {
        await using var f=await Fixture.Create();var c=await f.Signed();
        await f.Db.ExecuteAsync("""
            ALTER TABLE CONTRACT ADD LastExtensionTarget varchar(10) NULL,
              BaseContractPrice_P decimal(12,2) NULL,ExchangeRateToLocal decimal(10,4) NULL,
              ActualGrossProfit_AGP decimal(12,2) NULL;
            ALTER TABLE CONTRACT_TEMPLATE ADD Version varchar(20) NOT NULL CONSTRAINT DF_Test_TemplateVersion DEFAULT('legacy') WITH VALUES;
            EXEC(N'UPDATE CONTRACT SET LastExtensionTarget=''SIGN'',LastExtensionReason=N''Legacy extension'',LastExtensionBy=''manager'',LastExtensionAtUtc=''2026-10-17'',BaseContractPrice_P=99000000,ExchangeRateToLocal=25450,ActualGrossProfit_AGP=1234;');
            UPDATE [USER] SET ResetOtpCode='123456',ResetOtpExpiry='2026-11-01',ForgotPasswordRequest='fixture-link-token' WHERE UserID='owner';
            ALTER TABLE CONTRACT DROP CONSTRAINT CK_F1S_CONTRACT_Extension;
            EXEC(N'ALTER TABLE CONTRACT WITH CHECK ADD CONSTRAINT CK_F1S_CONTRACT_Extension CHECK
              ((LastExtensionTarget IS NULL AND LastExtensionReason IS NULL AND LastExtensionBy IS NULL AND LastExtensionAtUtc IS NULL)
              OR (LastExtensionTarget IS NOT NULL AND LastExtensionTarget IN (''SIGN'',''DEPOSIT'') AND LastExtensionReason IS NOT NULL AND LastExtensionBy IS NOT NULL AND LastExtensionAtUtc IS NOT NULL));');
            DECLARE @fingerprint nvarchar(129);
            SELECT @fingerprint=N'679C019F94417986B8C8209702F2D5709E808ED3F9B90AC4F125D9D082AACFD8:'+CONVERT(nvarchar(64),HASHBYTES('SHA2_256',definition),2)
              FROM sys.check_constraints WHERE name='CK_F1S_CONTRACT_Extension';
            EXEC sys.sp_addextendedproperty @name=N'Flow1SimpleGuardFingerprint',@value=@fingerprint,
              @level0type=N'SCHEMA',@level0name=N'dbo',@level1type=N'TABLE',@level1name=N'CONTRACT',
              @level2type=N'CONSTRAINT',@level2name=N'CK_F1S_CONTRACT_Extension';
            """);
        const string evidenceSql="""
            SELECT (SELECT CompletionDeadline,
              SignedAt,PdfSha256,DepositAmount,TotalQuotedPrice,ContractStatus,
              LastExtensionReason,LastExtensionBy,LastExtensionAtUtc FROM CONTRACT FOR JSON PATH,INCLUDE_NULL_VALUES);
            """;
        var evidence=await f.Db.ScalarAsync<string>(evidenceSql);
        Assert.Equal(0,await f.Db.ScalarAsync<int>(Flow1RelationalSchema.ValidationSql));
        await f.Db.ScriptAsync("002_flow1.sql");await f.Db.ScriptAsync("002_flow1.sql");
        Assert.Equal(0,await f.Db.ScalarAsync<int>(RemovedColumnsSql));
        Assert.Equal(1,await f.Db.ScalarAsync<int>(Flow1RelationalSchema.ValidationSql));
        Assert.Equal(evidence,await f.Db.ScalarAsync<string>(evidenceSql));
        Assert.Equal("123456",await f.Db.ScalarAsync<string>("SELECT ResetOtpCode FROM [USER] WHERE UserID='owner';"));
        Assert.Equal("fixture-link-token",await f.Db.ScalarAsync<string>("SELECT ForgotPasswordRequest FROM [USER] WHERE UserID='owner';"));
        var after=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        Assert.Equal(c.PaidAmount,after.PaidAmount);Assert.Equal(c.PdfSha256,after.PdfSha256);Assert.Equal(c.Trip!.TripId,after.Trip!.TripId);
    }
}
