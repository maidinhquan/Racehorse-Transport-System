using System.Text.Json;
using Application.DTOs.Flow4;
using Application.Interfaces.Flow4;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Flow4;

public class Flow4CustomerTrackingService : IFlow4CustomerTrackingService
{
    private readonly HorseTransportDbContext _context;

    public Flow4CustomerTrackingService(HorseTransportDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// F4-J32: Khách hàng theo dõi tiến độ hành trình đơn vận chuyển của mình (dữ liệu công khai, ẩn chi phí nội bộ).
    /// </summary>
    public async Task<Flow4PublicTrackingDto> GetCustomerTrackingAsync(string requestId, string customerId)
    {
        var request = await _context.TransportRequests
            .FirstOrDefaultAsync(r => r.RequestId == requestId);

        if (request == null)
            throw new KeyNotFoundException($"Không tìm thấy yêu cầu vận chuyển có mã {requestId}.");

        // Kiểm tra quyền sở hữu đơn của khách hàng
        if (request.CustomerId != customerId)
            throw new UnauthorizedAccessException("Bạn không có quyền truy cập thông tin hành trình của đơn vận chuyển này.");

        var trip = await _context.TripPlans
            .Include(t => t.Request)
            .FirstOrDefaultAsync(t => t.RequestId == requestId);

        if (trip == null)
            throw new KeyNotFoundException($"Chuyến xe vận chuyển cho đơn hàng {requestId} chưa được khởi tạo.");

        var horses = await _context.RequestHorseMappings
            .Where(rhm => rhm.RequestId == requestId)
            .Include(rhm => rhm.Horse)
            .Select(rhm => new Flow4HorseSnapshotDto
            {
                HorseId = rhm.HorseId,
                Name = rhm.Horse != null ? rhm.Horse.Name : rhm.HorseId,
                Microchip = rhm.Horse != null ? rhm.Horse.MicrochipIso : "",
                CareInstructions = null
            })
            .ToListAsync();

        var milestones = await _context.TripMilestones
            .Where(m => m.TripId == trip.TripId)
            .OrderBy(m => m.SequenceOrder)
            .ToListAsync();

        var publicMilestones = milestones.Select(m => new Flow4PublicMilestoneDto
        {
            Id = m.MilestoneId,
            Leg = m.Leg,
            Kind = m.MilestoneKind,
            Label = m.Label,
            Status = m.Status,
            PlannedAt = m.PlannedTime.ToString("yyyy-MM-dd HH:mm"),
            OccurredAt = m.OccurredAt?.ToString("yyyy-MM-dd HH:mm"),
            RecordedAt = m.RecordedAt?.ToString("yyyy-MM-dd HH:mm"),
            Note = m.Note,
            Revision = m.Revision
        }).ToList();

        var publicHealthLogs = await GetCustomerHealthLogsAsync(requestId, customerId);

        return new Flow4PublicTrackingDto
        {
            ServerTime = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
            Trip = Flow4Helper.BuildTripSummary(trip, _context),
            Milestones = publicMilestones,
            Horses = horses,
            Pickup = new Flow4EndpointDto { Name = "Điểm đón", Address = "Trang trại xuất phát", Country = "VN" },
            Delivery = new Flow4EndpointDto { Name = "Điểm giao", Address = "Trang trại đến", Country = "VN" },
            Map = new Flow4MapDto
            {
                RouteSource = "APPROVED_PLAN",
                LocationSource = "CONFIRMED_MILESTONE",
                LastConfirmedMilestoneId = publicMilestones.LastOrDefault(m => m.Status == "COMPLETED")?.Id,
                MarkerGeo = new Flow4GeoDto { Lat = 10.762622m, Lng = 106.660172m },
                IsGps = false,
                RoutePoints = new List<Flow4GeoDto>()
            },
            Health = publicHealthLogs,
            CustomerNotice = null
        };
    }

    /// <summary>
    /// F4-J33: Khách hàng tra cứu nhật ký sức khỏe, sinh hiệu và ảnh chăm sóc cá thể ngựa của mình.
    /// </summary>
    public async Task<List<Flow4PublicHealthDto>> GetCustomerHealthLogsAsync(string requestId, string customerId)
    {
        var request = await _context.TransportRequests.FirstOrDefaultAsync(r => r.RequestId == requestId);
        if (request == null)
            throw new KeyNotFoundException($"Không tìm thấy yêu cầu vận chuyển có mã {requestId}.");

        if (request.CustomerId != customerId)
            throw new UnauthorizedAccessException("Bạn không có quyền xem nhật ký sức khỏe của đơn này.");

        var horseIds = await _context.RequestHorseMappings
            .Where(rhm => rhm.RequestId == requestId)
            .Select(rhm => rhm.HorseId)
            .ToListAsync();

        var logs = await _context.HealthLogs
            .Where(h => horseIds.Contains(h.HorseId))
            .OrderByDescending(h => h.RecordedAt)
            .ToListAsync();

        return logs.Select(h => new Flow4PublicHealthDto
        {
            Id = h.LogId,
            HorseId = h.HorseId,
            ObservedAt = h.LogTime.ToString("yyyy-MM-dd HH:mm"),
            Condition = h.Condition ?? "NORMAL",
            Observation = h.Description ?? "",
            Feeding = h.Feeding,
            Water = h.Water,
            Rest = h.RestStatus,
            TemperatureC = h.Temperature,
            HeartRateBpm = h.HeartRate,
            PhotoFileIds = !string.IsNullOrEmpty(h.PhotoFileIds)
                ? JsonSerializer.Deserialize<List<string>>(h.PhotoFileIds) ?? new()
                : new()
        }).ToList();
    }

    /// <summary>
    /// F4-J34: Khách hàng tải ảnh/chứng từ hành trình đã được phân quyền chia sẻ cho đơn hàng của mình.
    /// </summary>
    public async Task<(string fileName, string contentType, byte[] fileBytes)?> GetCustomerTrackingFileAsync(string requestId, string fileId, string customerId)
    {
        var request = await _context.TransportRequests.FirstOrDefaultAsync(r => r.RequestId == requestId);
        if (request == null || request.CustomerId != customerId)
            throw new UnauthorizedAccessException("Bạn không có quyền truy cập chứng từ của đơn này.");

        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.RequestId == requestId);
        if (trip == null)
            return null;

        var attachment = await _context.ExecutionAttachments
            .FirstOrDefaultAsync(a => a.TripId == trip.TripId && a.FileId == fileId);

        if (attachment == null || !File.Exists(attachment.StoragePath))
            return null;

        var bytes = await File.ReadAllBytesAsync(attachment.StoragePath);
        return (attachment.FileName, attachment.ContentType, bytes);
    }
}
