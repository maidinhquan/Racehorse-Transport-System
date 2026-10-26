using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Registration.Tests;

public sealed class RegistrationModelTests
{
    [Fact]
    public void SqlServerModelKeepsFlow1EntitiesInTheirOwnContext()
    {
        using var context = new HorseTransportDbContext(
            new DbContextOptionsBuilder<HorseTransportDbContext>()
                .UseSqlServer("Server=localhost;Database=ModelValidation;Integrated Security=True;TrustServerCertificate=True")
                .Options);

        // Access validates the real SQL Server model without opening a connection.
        var model = context.Model;
        Assert.NotNull(model.FindEntityType(typeof(Domain.Entities.User)));
        Assert.NotNull(model.FindEntityType(typeof(Domain.Entities.Contract)));
        Assert.DoesNotContain(model.GetEntityTypes(), entity =>
            entity.ClrType.Namespace == "Domain.Flow1.Entities");
    }
}
