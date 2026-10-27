using Microsoft.EntityFrameworkCore;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data.Context;
using System.Text.Json;

namespace Infrastructure.Services
{
    public partial class CoordinatorService
    {
        // =========================================================================
        // 11. TRIP MONITORING (MAP DATA STREAM)
        // =========================================================================
        public async Task<TripMonitoringDto?> GetTripMonitoringAsync(string tripId)
        {
            var trip = await _context.TripPlans
                .Include(t => t.Request)
                .Include(t => t.RouteSegments)
                .FirstOrDefaultAsync(t => t.TripId == tripId);

            var defaultCoords = new List<double[]>
            {
                new double[] { 10.8231, 106.6297 },
                new double[] { 11.0650, 106.1720 },
                new double[] { 11.5560, 104.9280 },
                new double[] { 13.6560, 102.5620 },
                new double[] { 13.7563, 100.5018 }
            };

            var markers = new List<FixedMarkerDto>
            {
                new() { Name = "HCMC (Origin)", Type = "ORIGIN", Lat = 10.8231, Lng = 106.6297, Color = "#10B981", Icon = "📍", Status = "PASSED" },
                new() { Name = "Mộc Bài (Rest Stop)", Type = "REST_STOP", Lat = 11.0650, Lng = 106.1720, Color = "#3B82F6", Icon = "🅿️", Status = "PASSED" },
                new() { Name = "Bavet (Customs Gate)", Type = "CUSTOMS", Lat = 11.0850, Lng = 106.1450, Color = "#F59E0B", Icon = "🛂", Status = "PASSED" },
                new() { Name = "Phnom Penh (Vet Facility)", Type = "REST_STOP", Lat = 11.5560, Lng = 104.9280, Color = "#8B5CF6", Icon = "🏥", Status = "CURRENT" },
                new() { Name = "Poipet (Cambodia-Thai Border)", Type = "CUSTOMS", Lat = 13.6560, Lng = 102.5620, Color = "#F59E0B", Icon = "🛂", Status = "PLANNED" },
                new() { Name = "Bangkok (Royal Turf Club)", Type = "DESTINATION", Lat = 13.7563, Lng = 100.5018, Color = "#EF4444", Icon = "🏁", Status = "PLANNED" }
            };

            var currentLat = 11.5560;
            var currentLng = 104.9280;

            if (trip != null && trip.RouteSegments.Any())
            {
                var segList = trip.RouteSegments.ToList();
                markers = segList.Select((s, index) => new FixedMarkerDto
                {
                    Name = s.LocationName,
                    Type = s.SegmentType ?? (index == 0 ? "ORIGIN" : index == segList.Count - 1 ? "DESTINATION" : "REST_STOP"),
                    Lat = index < defaultCoords.Count ? defaultCoords[index][0] : 10.8231 + index * 0.5,
                    Lng = index < defaultCoords.Count ? defaultCoords[index][1] : 106.6297 + index * 0.5,
                    Color = index == 0 ? "#10B981" : index == segList.Count - 1 ? "#EF4444" : "#3B82F6",
                    Icon = index == 0 ? "📍" : index == segList.Count - 1 ? "🏁" : "🅿️",
                    Status = s.Status ?? "PLANNED"
                }).ToList();
            }

            return new TripMonitoringDto
            {
                TripId = trip?.TripId ?? tripId,
                TripCode = (trip?.TripId ?? tripId).Replace("TRIP_", "TRP-"),
                Status = trip?.Status ?? "IN_TRANSIT",
                VehiclePosition = new VehiclePositionDto
                {
                    Latitude = currentLat,
                    Longitude = currentLng,
                    LastUpdated = DateTime.UtcNow.ToString("HH:mm:ss dd/MM/yyyy"),
                    CurrentStatus = "Di chuyển đều (48 km/h) - Sinh hiệu ngựa ổn định"
                },
                FixedMarkers = markers,
                RoutePolyline = defaultCoords,
                CurrentLocationName = "Phnom Penh Waypoint (Km 240 / 1250)",
                EtaDestination = DateTime.UtcNow.AddHours(18)
            };
        }

    }
}