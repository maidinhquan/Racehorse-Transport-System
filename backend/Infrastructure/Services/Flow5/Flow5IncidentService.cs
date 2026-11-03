using Application.DTOs.Flow5;
using Application.Interfaces.Flow5;
using Domain.Entities;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Flow5;

public class Flow5IncidentService : IFlow5IncidentService
{
    private readonly HorseTransportDbContext _context;

    public Flow5IncidentService(HorseTransportDbContext context)
    {
        _context = context;
    }

    public async Task<IncidentResponseDto> ReportIncidentAsync(ReportIncidentInputDto dto, string reporterUserId)
    {
        if (string.IsNullOrWhiteSpace(dto.TripId))
        {
            throw new ArgumentException("Mã chuyến đi (TripId) là bắt buộc.");
        }

        var trip = await _context.TripPlans
            .Include(t => t.Request)
            .FirstOrDefaultAsync(t => t.TripId == dto.TripId);

        if (trip == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã '{dto.TripId}'.");
        }

        // Chuẩn hóa lý do sự cố theo tiếng Việt
        string reasonLabel = dto.Category switch
        {
            "VEHICLE_RESOURCE" or "VEHICLE_BREAKDOWN" => "Hỏng xe",
            "DELAY_AIR" or "ROAD_CLOSURE" or "TRAFFIC_ACCIDENT" => "Kẹt xe kéo dài",
            "HORSE_HEALTH" => "Sự cố y tế của ngựa",
            "OTHER" => "Khác",
            _ => dto.Category
        };

        // Nếu là lý do "Khác", mô tả là bắt buộc
        if (dto.Category == "OTHER" && string.IsNullOrWhiteSpace(dto.Description))
        {
            throw new ArgumentException("Khi chọn lý do 'Khác', nhân viên cần nhập mô tả chi tiết sự cố.");
        }

        string finalDescription = string.IsNullOrWhiteSpace(dto.Description) 
            ? reasonLabel 
            : dto.Description.Trim();

        var reporter = await _context.Users.FirstOrDefaultAsync(u => u.UserId == reporterUserId);
        string reporterName = reporter?.FullName ?? reporterUserId;

        // Sinh mã IncidentID theo chuẩn ID_NAME_RULE
        string incidentId = $"INC_{DateTime.UtcNow:yyyyMMdd}_{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

        var incident = new Incident
        {
            IncidentId = incidentId,
            TripId = dto.TripId,
            IncidentType = dto.Category,
            Description = finalDescription,
            LocationCoordinates = dto.LocationCoordinates,
            ImageUrl = dto.ImageUrl,
            Status = "REPORTED",
            SafetyBlockerActive = true,
            CoordinatorId = trip.AssignedCoordinatorId
        };

        _context.Incidents.Add(incident);

        // 1. Tìm điều phối viên phụ trách chuyến (hoặc bất kỳ điều phối viên nào trong hệ thống nếu chuyến chưa phân công)
        string? coordinatorToNotify = trip.AssignedCoordinatorId;
        if (string.IsNullOrWhiteSpace(coordinatorToNotify))
        {
            var defaultCoord = await _context.Users
                .FirstOrDefaultAsync(u => u.Role == "FLEET_ROUTE_COORDINATOR" || u.Role == "COORDINATOR");
            coordinatorToNotify = defaultCoord?.UserId;
        }

        // 2. Tự động gửi thông báo khẩn cấp tới Điều phối viên
        if (!string.IsNullOrWhiteSpace(coordinatorToNotify))
        {
            var notification = new Notification
            {
                NotificationId = $"NOTI_{Guid.NewGuid().ToString("N")[..10]}",
                UserId = coordinatorToNotify,
                ReferenceId = incidentId,
                Type = "INCIDENT_REPORTED",
                Channel = "IN_APP",
                Title = $"🚨 Báo cáo sự cố khẩn cấp - Chuyến {dto.TripId}",
                Message = $"Nhân viên {reporterName} vừa báo cáo sự cố [{reasonLabel}]: {finalDescription}. Vui lòng tiếp nhận ngay!",
                IsRead = false,
                SentAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);
        }

        await _context.SaveChangesAsync();

        return new IncidentResponseDto
        {
            IncidentId = incident.IncidentId,
            TripId = incident.TripId,
            Category = incident.IncidentType ?? "OTHER",
            Status = incident.Status ?? "REPORTED",
            Description = incident.Description,
            LocationCoordinates = incident.LocationCoordinates,
            ImageUrl = incident.ImageUrl,
            CoordinatorId = incident.CoordinatorId,
            ReportedByUserId = reporterUserId,
            ReportedByUserName = reporterName,
            ReportedAt = DateTime.UtcNow,
            SafetyBlockerActive = true
        };
    }

    public async Task<List<IncidentResponseDto>> GetIncidentsAsync(string? tripId, string? status)
    {
        var query = _context.Incidents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(tripId))
        {
            query = query.Where(i => i.TripId == tripId);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(i => i.Status == status);
        }

        var incidents = await query.ToListAsync();

        return incidents.Select(i => new IncidentResponseDto
        {
            IncidentId = i.IncidentId,
            TripId = i.TripId,
            Category = i.IncidentType ?? "OTHER",
            Status = i.Status ?? "REPORTED",
            Description = i.Description,
            LocationCoordinates = i.LocationCoordinates,
            ImageUrl = i.ImageUrl,
            CoordinatorId = i.CoordinatorId,
            ReportedAt = DateTime.UtcNow,
            SafetyBlockerActive = i.SafetyBlockerActive ?? true
        }).ToList();
    }

    public async Task<IncidentResponseDto> GetIncidentByIdAsync(string incidentId)
    {
        var incident = await _context.Incidents.AsNoTracking().FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy sự cố '{incidentId}'.");
        }

        return new IncidentResponseDto
        {
            IncidentId = incident.IncidentId,
            TripId = incident.TripId,
            Category = incident.IncidentType ?? "OTHER",
            Status = incident.Status ?? "REPORTED",
            Description = incident.Description,
            LocationCoordinates = incident.LocationCoordinates,
            ImageUrl = incident.ImageUrl,
            CoordinatorId = incident.CoordinatorId,
            ReportedAt = DateTime.UtcNow,
            SafetyBlockerActive = incident.SafetyBlockerActive ?? true
        };
    }

    public async Task<IncidentResponseDto> AcceptIncidentAsync(string incidentId, string coordinatorUserId)
    {
        var incident = await _context.Incidents.FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy sự cố '{incidentId}'.");
        }

        incident.Status = "IN_PROGRESS";
        incident.CoordinatorId = coordinatorUserId;

        await _context.SaveChangesAsync();

        return new IncidentResponseDto
        {
            IncidentId = incident.IncidentId,
            TripId = incident.TripId,
            Category = incident.IncidentType ?? "OTHER",
            Status = incident.Status,
            Description = incident.Description,
            LocationCoordinates = incident.LocationCoordinates,
            ImageUrl = incident.ImageUrl,
            CoordinatorId = incident.CoordinatorId,
            ReportedAt = DateTime.UtcNow,
            SafetyBlockerActive = incident.SafetyBlockerActive ?? true
        };
    }
}

