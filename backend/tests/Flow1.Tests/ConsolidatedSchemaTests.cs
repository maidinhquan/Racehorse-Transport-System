using Infrastructure.Data.Context;
using Microsoft.Data.SqlClient;
using Xunit;

namespace Flow1.Tests;

public sealed class ConsolidatedSchemaTests
{
    [LegacySqlFact]
    public async Task Upgrade_removes_retired_ack_columns_and_checks_without_changing_trip_identity()
    {
        await using var db=await Flow1TestDatabase.CreateAsync(migrate:false);
        await db.ScriptAsync("002_flow1.sql");
        await db.ExecuteAsync("""
            INSERT [USER](UserID,PasswordHash,Role,FullName) VALUES
              ('ack-spec','fixture','TRANSPORT_SPECIALIST','Specialist'),
              ('ack-route','fixture','FLEET_ROUTE_COORDINATOR','Coordinator'),
              ('ack-manager','fixture','LOGISTICS_MANAGER','Manager');
            INSERT TRIP_PLAN(TripID,RequestID,Status,DeploymentStatus,DeploymentReason,DeploymentBy,DeploymentAtUtc,HandoffEventId,AssignedSpecialistId,AssignedCoordinatorId)
            VALUES('ack-trip','req-1','PLANNING','CONFIRMED','Assigned','ack-manager','2026-10-20','ack-event','ack-spec','ack-route');
            """);
        await db.ExecuteAsync("""
            ALTER TABLE TRIP_PLAN ADD RoutingAcknowledgedBy varchar(50) NULL,RoutingAcknowledgedAtUtc datetime2(7) NULL,
                DocumentsAcknowledgedBy varchar(50) NULL,DocumentsAcknowledgedAtUtc datetime2(7) NULL;
            """);
        await db.ExecuteAsync("""
            UPDATE TRIP_PLAN SET RoutingAcknowledgedBy='ack-route',RoutingAcknowledgedAtUtc='2026-10-20',DocumentsAcknowledgedBy='ack-spec',DocumentsAcknowledgedAtUtc='2026-10-20';
            ALTER TABLE TRIP_PLAN ADD CONSTRAINT CK_F1S_TRIP_PLAN_RoutingAck CHECK(RoutingAcknowledgedBy IS NULL OR RoutingAcknowledgedAtUtc IS NOT NULL);
            ALTER TABLE TRIP_PLAN ADD CONSTRAINT CK_F1S_TRIP_PLAN_DocumentsAck CHECK(DocumentsAcknowledgedBy IS NULL OR DocumentsAcknowledgedAtUtc IS NOT NULL);
            """);
        const string projection="SELECT TripID,RequestID,Status,DeploymentStatus,AssignedSpecialistId,AssignedCoordinatorId,HandoffEventId,RowVersion FROM TRIP_PLAN ORDER BY TripID FOR JSON PATH,INCLUDE_NULL_VALUES;";
        var before=await db.ScalarAsync<string>(projection);
        Assert.Equal(0,await Ready(db));
        await db.ScriptAsync("002_flow1.sql");
        Assert.Equal(1,await Ready(db));
        Assert.Equal(before,await db.ScalarAsync<string>(projection));
        Assert.Equal(0,await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('TRIP_PLAN') AND name LIKE '%Acknowledged%';"));
    }
    private const string Script="002_flow1.sql";
    private static Task<int> Ready(Flow1TestDatabase db)=>db.ScalarAsync<int>(Flow1RelationalSchema.ValidationSql);
    private static async Task<string> Definition(Flow1TestDatabase db)
    {
        var columns=await db.ScalarAsync<string>("""
            SELECT (SELECT OBJECT_NAME(c.object_id) AS [table],c.name,TYPE_NAME(c.user_type_id) AS type,c.max_length,c.precision,c.scale,c.is_nullable
            FROM sys.columns c JOIN sys.tables t ON t.object_id=c.object_id ORDER BY t.name,c.name FOR JSON PATH);
            """);
        var checks=await db.ScalarAsync<string>("""
            SELECT (SELECT OBJECT_NAME(parent_object_id) AS [table],name,definition,is_disabled,is_not_trusted
            FROM sys.check_constraints ORDER BY name FOR JSON PATH);
            """);
        var links=await db.ScalarAsync<string>("""
            SELECT (SELECT f.name,OBJECT_NAME(f.parent_object_id) AS [table],COL_NAME(c.parent_object_id,c.parent_column_id) AS [column],
            OBJECT_NAME(f.referenced_object_id) AS target,COL_NAME(c.referenced_object_id,c.referenced_column_id) AS targetColumn,
            f.is_disabled,f.is_not_trusted,f.delete_referential_action,f.update_referential_action
            FROM sys.foreign_keys f JOIN sys.foreign_key_columns c ON c.constraint_object_id=f.object_id
            ORDER BY f.name,c.constraint_column_id FOR JSON PATH);
            """);
        return columns+checks+links;
    }

    [LegacySqlFact]
    public async Task Current_schema_is_complete_and_reapply_preserves_its_definition()
    {
        await using var current=await Flow1TestDatabase.CreateAsync(migrate:false);
        var tables=await current.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;");
        await current.ScriptAsync(Script);var before=await Definition(current);
        await current.ScriptAsync(Script);
        Assert.Equal(1,await Ready(current));Assert.Equal(tables+1,await current.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;"));
        Assert.Equal(before,await Definition(current));
        Assert.Equal("ACCEPTED",await current.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
    }

    [LegacySqlFact]
    public async Task Already_upgraded_database_keeps_paid_contract_request_and_invoice_values_on_reapply()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();await f.Paid();
        const string values="""
            SELECT CONCAT((SELECT * FROM CONTRACT ORDER BY ContractID FOR JSON PATH),
              (SELECT * FROM TRANSPORT_REQUEST ORDER BY RequestID FOR JSON PATH),
              (SELECT * FROM INVOICE ORDER BY InvoiceID FOR JSON PATH),
              (SELECT * FROM PAYMENT ORDER BY PaymentID FOR JSON PATH));
            """;
        var before=await f.Db.ScalarAsync<string>(values);
        await f.Db.ScriptAsync(Script);
        Assert.Equal(before,await f.Db.ScalarAsync<string>(values));Assert.Equal(1,await Ready(f.Db));
    }

    [LegacySqlFact]
    public async Task Partial_active_installation_upgrades_without_resetting_legacy_values()
    {
        await using var db=await Flow1TestDatabase.CreateAsync(migrate:false);
        await db.ExecuteAsync("ALTER TABLE TRANSPORT_REQUEST ADD ManagerNotes nvarchar(1000) NULL;");
        await db.ExecuteAsync("UPDATE TRANSPORT_REQUEST SET ManagerNotes=N'Keep this decision' WHERE RequestID='req-1';");
        await db.ScriptAsync(Script);
        Assert.Equal(1,await Ready(db));
        Assert.Equal("Keep this decision",await db.ScalarAsync<string>("SELECT ManagerNotes FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
    }

    [LegacySqlFact]
    public async Task A_late_incompatible_column_rolls_back_every_prior_stage()
    {
        await using var db=await Flow1TestDatabase.CreateAsync(migrate:false);
        await db.ExecuteAsync("ALTER TABLE CONTRACT ADD RefundAmount varchar(20) NULL;");
        var columns=await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;");
        Assert.Equal(51703,(await Assert.ThrowsAsync<SqlException>(()=>db.ScriptAsync(Script))).Number);
        Assert.Equal(columns,await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;"));
        Assert.Equal(0,await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('CONTRACT') AND name='CompletionDeadline';"));
    }
}
