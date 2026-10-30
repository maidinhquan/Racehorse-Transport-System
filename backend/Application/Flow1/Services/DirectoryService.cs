using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using Domain.Enums;
namespace Application.Flow1.Services;
public sealed class DirectoryService(IDataSession data, AccessService access)
{
    public async Task<object> ProfileAsync(string actor, CancellationToken ct)
    {
        var account = await access.AccountAsync(actor, null, ct); return Profile(account);
    }
    public async Task<object> CustomersAsync(string actor, CancellationToken ct)
    {
        await access.AccountAsync(actor, UserRoles.LogisticsManager, ct);
        return (await data.ListAsync<Account>(a => true, ct)).Where(a => a.Role.Trim().ToUpperInvariant() == "CUSTOMER" || a.Role.Trim().ToUpperInvariant() == "CUST").Select(Profile).ToArray();
    }
    public async Task<object> StaffAsync(string actor, CancellationToken ct)
    {
        await access.AccountAsync(actor, UserRoles.LogisticsManager, ct);
        return (await data.ListAsync<Account>(a => a.IsActive, ct)).Where(a => UserRoles.NormalizeRole(a.Role) is UserRoles.TransportSpecialist or UserRoles.FleetRouteCoordinator)
            .Select(a => new { id = a.UserID, name = a.FullName, role = UserRoles.NormalizeRole(a.Role), isActive = a.IsActive }).ToArray();
    }
    private static object Profile(Account account) => new { id = account.UserID, username = account.Username, fullName = account.FullName,
        email = account.Email, phone = account.Phone, role = UserRoles.NormalizeRole(account.Role) };
}
