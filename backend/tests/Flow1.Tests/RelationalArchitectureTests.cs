using Microsoft.EntityFrameworkCore;
using Application.Services.Flow1.Relational;
using Infrastructure.Data.Context;
using Xunit;

namespace Flow1.Tests;
public sealed class RelationalArchitectureTests
{
    [Fact]
    public void Active_assemblies_do_not_include_the_retained_state_store_or_reference_the_legacy_support_library()
    {
        var application=typeof(RelationalFlow1Service).Assembly;var infrastructure=typeof(Flow1RelationalContext).Assembly;var web=typeof(Program).Assembly;
        Assert.Null(application.GetType("Application.Flow1.Interfaces.IFlow1StateStore"));
        Assert.Null(infrastructure.GetType("Infrastructure.Storage.SqlFlow1StateStore"));
        Assert.Null(web.GetType("WebApi.Controllers.Flow1.CustomerTransportController"));
        foreach(var assembly in new[]{application,infrastructure,web}) Assert.DoesNotContain(assembly.GetReferencedAssemblies(),a=>a.Name=="Flow1LegacySupport");
    }
    [LegacySqlFact]
    public async Task Retained_files_need_matching_operator_fingerprint_and_never_supply_runtime_payloads()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();var root=Path.Combine(Path.GetTempPath(),"flow1-retained-"+Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);var file=Path.Combine(root,"retained.json");await File.WriteAllTextAsync(file,"{\"fixture\":true}");
        try{
            using var context=new Infrastructure.Data.Context.Flow1RelationalContext(new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<Infrastructure.Data.Context.Flow1RelationalContext>().UseSqlServer(f.Db.ConnectionString).Options);
            var data=new Infrastructure.Data.Context.Flow1Data(context,root);
            await Assert.ThrowsAsync<Application.Common.Exceptions.BusinessRuleException>(()=>data.RunAsync(_=>Task.FromResult(1),default));
            var hash=Infrastructure.Storage.Flow1RetainedSources.Fingerprint(root)!;
            await f.Db.ExecuteAsync("EXEC sys.sp_addextendedproperty @name=N'Flow1.RelationalRetainedSourceFingerprint',@value=N'"+hash+"';");
            Assert.Equal(1,await data.RunAsync(_=>Task.FromResult(1),default));
            await File.WriteAllTextAsync(file,"{\"fixture\":false}");
            await Assert.ThrowsAsync<Application.Common.Exceptions.BusinessRuleException>(()=>data.RunAsync(_=>Task.FromResult(1),default));
        }finally{File.Delete(file);Directory.Delete(root);}
    }

    [LegacySqlFact]
    public async Task Disabled_checks_or_missing_unique_indexes_close_the_api_before_business_writes()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();using var app=new RelationalHttpFactory(f);using var c=app.Client();
        await f.Db.ExecuteAsync("ALTER TABLE HORSE NOCHECK CONSTRAINT CK_F1S_HORSE_PhotoUrl;");
        Assert.Equal(System.Net.HttpStatusCode.ServiceUnavailable,(await c.GetAsync("/api/customer/requests")).StatusCode);
        await f.Db.ExecuteAsync("ALTER TABLE HORSE WITH CHECK CHECK CONSTRAINT CK_F1S_HORSE_PhotoUrl;DROP INDEX UX_TRIP_PLAN_RequestID ON TRIP_PLAN;");
        Assert.Equal(System.Net.HttpStatusCode.ServiceUnavailable,(await c.GetAsync("/api/customer/requests")).StatusCode);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM PAYMENT;"));
    }

}
