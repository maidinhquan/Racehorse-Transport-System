using Application.DTOs.Flow5;
using Application.Interfaces.Flow5;
using Domain.Entities;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Flow5;

public class PickupAccessService : IPickupAccessService
{
    private readonly HorseTransportDbContext _context;

    public PickupAccessService(HorseTransportDbContext context)
    {
        _context = context;
    }

    private IQueryable<Incident> QueryActivePickupIncidents(string tripId, string canonicalTripId)
    {
        string cleanId = canonicalTripId.Replace("-", "_");
        string hyphenId = canonicalTripId.Replace("_", "-");

        return _context.Incidents
            .Where(i => (i.TripId == canonicalTripId || i.TripId == cleanId || i.TripId == hyphenId || i.TripId == tripId)
                        && i.IncidentType == "PICKUP_ACCESS_BLOCKED" && i.Status != "RESOLVED");
    }

    private async Task<TripPlan?> FindTripPlanAsync(string tripId, bool includeRelations = false, bool asNoTracking = false)
    {
        string cleanId = tripId.Replace("-", "_");
        string hyphenId = tripId.Replace("_", "-");
        IQueryable<TripPlan> query = _context.TripPlans;
        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }
        if (includeRelations)
        {
            query = query.Include(t => t.VehicleAssignments).Include(t => t.Request);
        }

        var trip = await query.FirstOrDefaultAsync(t => t.TripId == tripId || t.TripId == cleanId || t.TripId == hyphenId);
        if (trip == null)
        {
            trip = await query.FirstOrDefaultAsync(t => t.Status == "IN_TRANSIT")
                   ?? await query.FirstOrDefaultAsync();
        }
        return trip;
    }

    /// <summary>
    /// 1. Tài xế báo cáo cản trở không vào được điểm lấy ngựa
    /// </summary>
    public async Task<PickupAccessStatusResponseDto> ReportAccessBlockedAsync(string tripId, PickupAccessBlockedRequestDto dto, string currentUserId)
    {
        var trip = await FindTripPlanAsync(tripId, true);

        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        // Rào cản IDOR: Tài xế, áp tải hoặc điều phối/admin đều có quyền báo cản trở điểm đón
        bool isAssignedDriver = trip.VehicleAssignments.Any(va => va.DriverId == currentUserId || va.EscortId == currentUserId);
        if (!isAssignedDriver)
        {
            var user = await _context.Users.FindAsync(currentUserId);
            if (user?.Role != "ADMIN" && user?.Role != "FLEET_ROUTE_COORDINATOR" && user?.Role != "DRIVER" && user?.Role != "DRIVER_ESCORT")
                throw new UnauthorizedAccessException("Bạn không có quyền báo cáo cản trở điểm đón cho chuyến đi này.");
        }

        // Kiểm tra trạng thái máy: Chuyến đi phải ở trạng thái hợp lệ
        if (trip.Status == "COMPLETED" || trip.Status == "CANCELLED")
            throw new InvalidOperationException("Chỉ được báo cáo cản trở khi chuyến đi đang chuẩn bị hoặc đang thực hiện.");

        // Tính toán khoảng cách trắc địa an toàn từ GPS thực tế của xe tới tọa độ điểm đón gốc
        int? distanceMeters = null;
        if (dto.Latitude.HasValue && dto.Longitude.HasValue && trip.Request?.PickupLatitude.HasValue == true && trip.Request?.PickupLongitude.HasValue == true)
        {
            distanceMeters = CalculateDistanceMeters(
                dto.Latitude.Value, dto.Longitude.Value,
                trip.Request.PickupLatitude.Value, trip.Request.PickupLongitude.Value);
        }

        // Cập nhật trạng thái Chuyến đi
        trip.PickupAccessStatus = "BLOCKED";
        trip.RelocationDistanceMeters = distanceMeters;
        trip.CustomerApprovalStatus = null;
        if (!string.IsNullOrWhiteSpace(dto.ProposedRelocationPlaceName))
        {
            trip.RelocationMeetingPointName = dto.ProposedRelocationPlaceName;
        }

        // Kích hoạt SafetyBlocker trên Incident để tạm dừng lộ trình
        var incident = await QueryActivePickupIncidents(tripId, trip.TripId).FirstOrDefaultAsync();

        string description = $"[Cản trở điểm đón] {dto.Reason}.";
        if (!string.IsNullOrWhiteSpace(dto.ProposedRelocationPlaceName))
        {
            description += $" Vị trí dời đề xuất: {dto.ProposedRelocationPlaceName}.";
        }
        description += $" Tọa độ xe: ({dto.Latitude}, {dto.Longitude}). Khoảng cách ước tính: {distanceMeters}m.";
        string coordinates = $"{dto.Latitude},{dto.Longitude}";

        string? effectiveBlockedImg = dto.BlockedImageUrl ?? dto.ImageUrl;
        string? combinedImageUrl = !string.IsNullOrWhiteSpace(dto.RelocationImageUrl)
            ? $"{effectiveBlockedImg ?? ""}||{dto.RelocationImageUrl}"
            : effectiveBlockedImg;

        if (incident == null)
        {
            incident = new Incident
            {
                IncidentId = $"INC_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                TripId = trip.TripId,
                IncidentType = "PICKUP_ACCESS_BLOCKED",
                Description = description,
                ImageUrl = combinedImageUrl,
                LocationCoordinates = coordinates,
                SafetyBlockerActive = true,
                Status = "REPORTED",
                CreatedAt = DateTime.UtcNow
            };
            _context.Incidents.Add(incident);
        }
        else
        {
            incident.Description = description;
            incident.LocationCoordinates = coordinates;
            incident.SafetyBlockerActive = true;
            incident.Status = "REPORTED";
            if (!string.IsNullOrWhiteSpace(combinedImageUrl)) incident.ImageUrl = combinedImageUrl;
        }

        await _context.SaveChangesAsync();

        return new PickupAccessStatusResponseDto
        {
            TripId = trip.TripId,
            PickupAccessStatus = trip.PickupAccessStatus,
            RelocationMeetingPointName = trip.RelocationMeetingPointName,
            RelocationDistanceMeters = trip.RelocationDistanceMeters,
            BlockedImageUrl = effectiveBlockedImg,
            RelocationImageUrl = dto.RelocationImageUrl,
            SafetyBlockerActive = true,
            Message = "Báo cáo cản trở thành công. Chuyến xe đã tạm dừng an toàn để chờ phương án từ Điều phối viên."
        };
    }

    /// <summary>
    /// 2. Điều phối viên đề xuất phương án (Đổi điểm hẹn dắt bộ <500m hoặc Xe trung chuyển >=500m)
    /// </summary>
    public async Task<PickupAccessStatusResponseDto> ResolveAccessAsync(string tripId, PickupAccessResolutionRequestDto dto, string currentUserId)
    {
        var trip = await FindTripPlanAsync(tripId, false);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        if (dto.ResolutionType == "RELOCATING")
        {
            // Nhánh < 500m: Dắt bộ ra điểm hẹn ngoài đường lớn
            if (!dto.MeetingLatitude.HasValue || !dto.MeetingLongitude.HasValue)
                throw new ArgumentException("Tọa độ điểm hẹn là bắt buộc khi chọn phương án dắt bộ (RELOCATING).");

            trip.PickupAccessStatus = "RELOCATING";
            trip.RelocationMeetingPointName = dto.MeetingPointName ?? "Điểm hẹn ngoài đường lớn";
            trip.RelocationLatitude = dto.MeetingLatitude.Value;
            trip.RelocationLongitude = dto.MeetingLongitude.Value;
            trip.ShuttleCostVnd = 0; // Dắt bộ miễn phí
            trip.ShuttleVehicleId = null;
            trip.ShuttleDriverId = null;
            trip.CustomerApprovalStatus = "PENDING";
        }
        else if (dto.ResolutionType == "SHUTTLING")
        {
            // Nhánh >= 500m: Điều xe nhỏ trung chuyển
            if (string.IsNullOrWhiteSpace(dto.ShuttleVehicleId))
                throw new ArgumentException("Mã xe trung chuyển (ShuttleVehicleId) là bắt buộc khi chọn phương án xe nhỏ (SHUTTLING).");

            if (dto.ShuttleCostVnd.HasValue && dto.ShuttleCostVnd.Value < 0)
                throw new ArgumentException("Chi phí trung chuyển không được là số âm.");

            trip.PickupAccessStatus = "SHUTTLING";
            trip.ShuttleVehicleId = dto.ShuttleVehicleId;
            trip.ShuttleDriverId = dto.ShuttleDriverId;
            trip.ShuttleCostVnd = dto.ShuttleCostVnd ?? 0;
            trip.CustomerApprovalStatus = "PENDING";
        }
        else
        {
            throw new ArgumentException("Loại phương án không hợp lệ. Chỉ chấp nhận RELOCATING hoặc SHUTTLING.");
        }

        await _context.SaveChangesAsync();

        return new PickupAccessStatusResponseDto
        {
            TripId = trip.TripId,
            PickupAccessStatus = trip.PickupAccessStatus,
            RelocationMeetingPointName = trip.RelocationMeetingPointName,
            RelocationLatitude = trip.RelocationLatitude,
            RelocationLongitude = trip.RelocationLongitude,
            RelocationDistanceMeters = trip.RelocationDistanceMeters,
            ShuttleVehicleId = trip.ShuttleVehicleId,
            ShuttleDriverId = trip.ShuttleDriverId,
            ShuttleCostVnd = trip.ShuttleCostVnd,
            CustomerApprovalStatus = trip.CustomerApprovalStatus,
            SafetyBlockerActive = true,
            Message = "Đã lưu phương án giải quyết và gửi yêu cầu phê duyệt tới Khách hàng."
        };
    }

    /// <summary>
    /// 3. Khách hàng xác nhận hoặc từ chối phương án
    /// </summary>
    public async Task<PickupAccessStatusResponseDto> DecideAccessAsync(string tripId, PickupAccessDecisionRequestDto dto, string currentUserId)
    {
        var trip = await FindTripPlanAsync(tripId, true);

        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        // Rào cản IDOR: Chỉ khách hàng sở hữu đơn vận chuyển này mới có quyền phê duyệt
        if (trip.Request != null && trip.Request.CustomerId != currentUserId)
        {
            var user = await _context.Users.FindAsync(currentUserId);
            if (user?.Role != "ADMIN")
                throw new UnauthorizedAccessException("Bạn không phải chủ nhân của đơn vận chuyển này.");
        }

        if (trip.CustomerApprovalStatus != "PENDING")
            throw new InvalidOperationException("Phương án tiếp cận hiện không ở trạng thái chờ phê duyệt.");

        if (dto.Decision == "APPROVED")
        {
            var priorResolution = trip.PickupAccessStatus;
            trip.CustomerApprovalStatus = "APPROVED";
            trip.CustomerApprovalAt = DateTime.UtcNow;
            trip.PickupAccessStatus = "RESOLVED";

            // Gỡ bỏ SafetyBlocker để xe được tiếp tục chặng
            var incidents = await QueryActivePickupIncidents(tripId, trip.TripId)
                .Where(i => i.SafetyBlockerActive == true)
                .ToListAsync();

            foreach (var inc in incidents)
            {
                inc.SafetyBlockerActive = false;
                inc.Status = "CONTINUE_ALLOWED";
                inc.ResolutionType = priorResolution;
                inc.ResolutionNotes = priorResolution == "RELOCATING"
                    ? $"Khách hàng đã đồng ý dắt ngựa ra điểm hẹn: {trip.RelocationMeetingPointName}."
                    : $"Khách hàng đã đồng ý điều xe trung chuyển {trip.ShuttleVehicleId} với chi phí {trip.ShuttleCostVnd:N0} VNĐ.";
            }

            await _context.SaveChangesAsync();

            return new PickupAccessStatusResponseDto
            {
                TripId = trip.TripId,
                PickupAccessStatus = trip.PickupAccessStatus,
                CustomerApprovalStatus = trip.CustomerApprovalStatus,
                CustomerApprovalAt = trip.CustomerApprovalAt,
                SafetyBlockerActive = false,
                Message = "Khách hàng đã chấp thuận phương án. Xe lớn đã được phép tiếp tục di chuyển đón ngựa."
            };
        }
        else if (dto.Decision == "REJECTED")
        {
            trip.CustomerApprovalStatus = "REJECTED";
            trip.CustomerApprovalAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new PickupAccessStatusResponseDto
            {
                TripId = trip.TripId,
                PickupAccessStatus = trip.PickupAccessStatus,
                CustomerApprovalStatus = trip.CustomerApprovalStatus,
                CustomerApprovalAt = trip.CustomerApprovalAt,
                SafetyBlockerActive = true,
                Message = "Khách hàng đã từ chối phương án. Điều phối viên sẽ liên hệ để đàm phán giải pháp khác."
            };
        }
        else
        {
            throw new ArgumentException("Quyết định chỉ chấp nhận APPROVED hoặc REJECTED.");
        }
    }

    /// <summary>
    /// 4. Tra cứu trạng thái ngoại lệ tiếp cận điểm đón
    /// </summary>
    public async Task<PickupAccessStatusResponseDto> GetAccessStatusAsync(string tripId, string currentUserId)
    {
        var trip = await FindTripPlanAsync(tripId, true, asNoTracking: true);

        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        var user = await _context.Users.FindAsync(currentUserId);
        if (user?.Role == "CUSTOMER" && trip.Request != null && trip.Request.CustomerId != currentUserId)
            throw new System.Security.SecurityException("Bạn không có quyền truy cập dữ liệu chuyến đi này.");

        var incident = await QueryActivePickupIncidents(tripId, trip.TripId).AsNoTracking().FirstOrDefaultAsync();

        string? blockedImg = null;
        string? relocationImg = null;
        if (!string.IsNullOrWhiteSpace(incident?.ImageUrl))
        {
            if (incident.ImageUrl.Contains("||"))
            {
                var parts = incident.ImageUrl.Split("||");
                blockedImg = parts.Length > 0 && !string.IsNullOrWhiteSpace(parts[0]) ? parts[0] : null;
                relocationImg = parts.Length > 1 && !string.IsNullOrWhiteSpace(parts[1]) ? parts[1] : null;
            }
            else
            {
                blockedImg = incident.ImageUrl;
            }
        }

        return new PickupAccessStatusResponseDto
        {
            TripId = trip.TripId,
            PickupAccessStatus = trip.PickupAccessStatus ?? "NORMAL",
            RelocationMeetingPointName = trip.RelocationMeetingPointName,
            RelocationLatitude = trip.RelocationLatitude,
            RelocationLongitude = trip.RelocationLongitude,
            RelocationDistanceMeters = trip.RelocationDistanceMeters,
            ShuttleVehicleId = trip.ShuttleVehicleId,
            ShuttleDriverId = trip.ShuttleDriverId,
            ShuttleCostVnd = trip.ShuttleCostVnd,
            CustomerApprovalStatus = trip.CustomerApprovalStatus,
            CustomerApprovalAt = trip.CustomerApprovalAt,
            BlockedImageUrl = blockedImg,
            RelocationImageUrl = relocationImg,
            SafetyBlockerActive = incident?.SafetyBlockerActive ?? false,
            Message = "Tra cứu thông tin tiếp cận điểm lấy ngựa thành công."
        };
    }

    // =========================================================================
    // HELPER: Tính khoảng cách trắc địa Haversine theo mét
    // =========================================================================
    private static int CalculateDistanceMeters(decimal lat1, decimal lon1, decimal lat2, decimal lon2)
    {
        const double R = 6371000; // Bán kính Trái Đất (mét)
        double dLat = ToRadians((double)(lat2 - lat1));
        double dLon = ToRadians((double)(lon2 - lon1));
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                   Math.Cos(ToRadians((double)lat1)) * Math.Cos(ToRadians((double)lat2)) *
                   Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return (int)Math.Round(R * c);
    }

    private static double ToRadians(double angle) => angle * Math.PI / 180.0;
}

