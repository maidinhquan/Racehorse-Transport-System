using System.Text.Json;
namespace Application.Flow1.Interfaces;

public interface IPaymentGateway
{
    bool IsConfigured { get; }
    Task<GatewaySessionResult> CreateSessionAsync(GatewaySessionRequest request, CancellationToken ct = default);
    Task<VerifiedGatewayResult> VerifyAsync(IReadOnlyDictionary<string, string> payload, CancellationToken ct = default);
}
