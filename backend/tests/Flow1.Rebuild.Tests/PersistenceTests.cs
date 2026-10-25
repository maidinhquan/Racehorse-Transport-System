using System.Reflection;
using Application.Common.Exceptions;
using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Domain.Flow1.Entities;
using Infrastructure.Flow1.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;
namespace Flow1.Rebuild.Tests;
public sealed class PersistenceTests(SqlFixture fixture) : IClassFixture<SqlFixture>
{
    private static Task Read<T>(RequestContext context) where T : class => context.Set<T>().Take(1).ToListAsync();
    [Fact] public async Task Every_mapped_entity_reads_the_reviewed_schema()
    {
        await using var db = fixture.Context();
        foreach (var entity in db.Model.GetEntityTypes())
            await (Task)typeof(PersistenceTests).GetMethod(nameof(Read), BindingFlags.Static | BindingFlags.NonPublic)!.MakeGenericMethod(entity.ClrType).Invoke(null, [db])!;
    }
    [Fact] public async Task Sequence_default_assigns_readable_key_and_never_reuses_deleted_key()
    {
        await using var db = fixture.Context();
        var first = new Notification { UserID = "USER_001", Message = "Test", SentAt = DateTime.UtcNow };
        db.Add(first); await db.SaveChangesAsync();
        Assert.Matches(@"^NOTIFICATION_\d{3,}$", first.NotificationID);
        var old = first.NotificationID; db.Remove(first); await db.SaveChangesAsync();
        var second = new Notification { UserID = "USER_001", Message = "Test", SentAt = DateTime.UtcNow };
        db.Add(second); await db.SaveChangesAsync();
        Assert.NotEqual(old, second.NotificationID);
    }
    [Fact] public async Task Request_create_retry_is_idempotent_and_different_input_conflicts()
    {
        await using var db = fixture.Context(); var session = new SqlSession(db);
        var access = new AccessService(session); var policies = new PolicyService(session);
        var service = new RequestService(session, access, new CatalogService(session, policies), policies, TimeProvider.System);
        var key = Guid.NewGuid().ToString();
        var input = new RequestDraftInput("Pickup", "Delivery", "VN", "JP", "AIR", DateTime.UtcNow.AddDays(30).ToString("yyyy-MM-dd"), "Care");
        var result = await service.CreateAsync("USER_001", key, input, default);
        var retry = await service.CreateAsync("USER_001", key, input, default);
        Assert.Equal(System.Text.Json.JsonSerializer.Serialize(result), System.Text.Json.JsonSerializer.Serialize(retry));
        await Assert.ThrowsAsync<BusinessRuleException>(() => service.CreateAsync("USER_001", key, input with { Destination = "Other" }, default));
    }
    [Fact] public async Task Schema_has_composite_request_horse_key_without_rowversion()
    {
        await using var db = fixture.Context();
        Assert.Equal(new[] { "RequestID", "HorseID" }, db.Model.FindEntityType(typeof(RequestHorse))!.FindPrimaryKey()!.Properties.Select(p => p.Name));
        Assert.DoesNotContain(db.Model.GetEntityTypes().SelectMany(e => e.GetProperties()), p => p.Name == "RowVersion");
    }
}
