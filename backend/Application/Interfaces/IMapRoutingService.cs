using Application.DTOs;

namespace Application.Interfaces
{
    public interface IMapRoutingService
    {
        Task<(decimal distanceKm, int durationMinutes, List<double[]> path, string source, string trafficCondition)> CalculateLegRoutingAsync(
            double fromLat, double fromLng, double toLat, double toLng,
            decimal weightTons = 10.0m, decimal heightMeters = 3.8m,
            CancellationToken ct = default);

        Task<List<CheckpointDto>> GeocodeAddressAsync(string address, string? country = "VN");

        double CalculateDistance(double lat1, double lon1, double lat2, double lon2);

        List<double[]> GenerateInterpolatedPoints(double lat1, double lon1, double lat2, double lon2, int count);
    }
}

