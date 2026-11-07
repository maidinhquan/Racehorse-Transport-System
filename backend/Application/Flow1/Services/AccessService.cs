using Application.Flow1.Interfaces;
using Domain.Enums;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;

namespace Application.Flow1.Services;

public sealed class AccessService(IDataSession data)
{
    public async Task<Account> AccountAsync(string actor, string? role, CancellationToken ct)
    {
        var account = await data.FindAsync<Account>(ct, actor);
        Require(account is { IsActive: true }, "FORBIDDEN_ROLE", "Account is not active.", 403);
        var knownRoles = new[]
        {
            "CUSTOMER",
            "CUST",
            "MANAGER",
            "LOGISTICS_MANAGER",
            "SPECIALIST",
            "TRANSPORT_SPECIALIST",
            "COORDINATOR",
            "FLEET_ROUTE_COORDINATOR",
            "DRIVER",
            "ESCORT",
            "DRIVER_ESCORT",
            "ADMIN",
        };
        Require(
            knownRoles.Contains(account!.Role.Trim().ToUpperInvariant()),
            "FORBIDDEN_ROLE",
            "Unknown account role.",
            403
        );
        Require(
            role is null || UserRoles.NormalizeRole(account!.Role) == role,
            "FORBIDDEN_ROLE",
            "Role is not permitted.",
            403
        );
        return account!;
    }

    public async Task<TransportRequest> RequestAsync(
        string id,
        string actor,
        bool manager,
        CancellationToken ct
    )
    {
        await AccountAsync(actor, manager ? UserRoles.LogisticsManager : UserRoles.Customer, ct);
        var request = await data.FindAsync<TransportRequest>(ct, id);
        Require(
            request is not null && (manager || request.CustomerID == actor),
            "NOT_FOUND",
            "Request not found.",
            404
        );
        return request!;
    }

    public async Task<Horse> HorseAsync(string id, string actor, CancellationToken ct)
    {
        await AccountAsync(actor, UserRoles.Customer, ct);
        var horse = await data.FindAsync<Horse>(ct, id);
        Require(horse is not null && horse.OwnerID == actor, "NOT_FOUND", "Horse not found.", 404);
        return horse!;
    }

    public async Task<Contract> ContractAsync(
        string id,
        string actor,
        bool manager,
        CancellationToken ct
    )
    {
        var contract = await data.FindAsync<Contract>(ct, id);
        Require(contract is not null, "NOT_FOUND", "Contract not found.", 404);
        await RequestAsync(contract!.RequestID, actor, manager, ct);
        return contract;
    }
}
