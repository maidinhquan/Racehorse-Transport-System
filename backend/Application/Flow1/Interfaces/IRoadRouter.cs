using System.Text.Json;
namespace Application.Flow1.Interfaces;

public interface IRoadRouter
{
    Task<RoadRouteResult> CalculateAsync(RoadRouteQuery query, CancellationToken ct = default);
}
