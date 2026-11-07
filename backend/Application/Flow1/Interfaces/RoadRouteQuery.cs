using System.Text.Json;
namespace Application.Flow1.Interfaces;

public sealed record RoadRouteQuery(IReadOnlyList<MapPoint> Points, string Profile = "driving");
