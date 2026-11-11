using System.Text.Json;
using Application.DTOs.Flow4;
using Domain.Entities;
using Domain.Entities.Flow4;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Flow4;

public static class Flow4Helper
{
    public static Flow4BindingDto BuildBinding(TripPlan trip)
    {
        return new Flow4BindingDto
        {
            ExecutionVersion = trip.ExecutionVersion,
            ApprovedPlanVersion = trip.PlanVersion,
            AssignmentVersion = trip.ContextVersion
        };
    }

    public static Flow4TripSummaryDto BuildTripSummary(TripPlan trip, HorseTransportDbContext context)
    {
        var lastCompletedMilestone = context.TripMilestones
            .Where(m => m.TripId == trip.TripId && m.Status == "COMPLETED")
            .OrderByDescending(m => m.SequenceOrder)
            .FirstOrDefault();

        var pendingProposal = !string.IsNullOrEmpty(trip.PendingEtaProposalId)
            ? context.EtaProposals.FirstOrDefault(p => p.ProposalId == trip.PendingEtaProposalId)
            : null;

        var mode = "ROAD";
        if (!string.IsNullOrEmpty(trip.ApprovedPlanJson) && trip.ApprovedPlanJson.Contains("\"AIR\"", StringComparison.OrdinalIgnoreCase))
        {
            mode = "AIR";
        }

        return new Flow4TripSummaryDto
        {
            TripId = trip.TripId,
            RequestId = trip.RequestId,
            Mode = mode,
            TripStatus = trip.Status,
            RequestStatus = trip.Request?.Status ?? "IN_PROGRESS",
            Phase = trip.ExecutionPhase ?? "AWAITING_DEPARTURE",
            LastMilestoneId = lastCompletedMilestone?.MilestoneId,
            Eta = new Flow4EtaSummaryDto
            {
                CurrentEta = trip.CurrentEta?.ToString("yyyy-MM-dd HH:mm") ?? trip.EarliestDepartureDate?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                DeliveryDeadline = trip.DocumentExpiryDate?.ToString("yyyy-MM-dd HH:mm") ?? trip.EarliestDepartureDate?.AddDays(2).ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd HH:mm"),
                PendingProposalId = trip.PendingEtaProposalId,
                ProposedEta = pendingProposal?.ProposedEta.ToString("yyyy-MM-dd HH:mm"),
                Version = 1
            }
        };
    }

    /// <summary>Xuất phát và rời điểm dừng đều phải kiểm tra sức khỏe ngựa trước (chỉ theo loại mốc, bỏ qua cờ lưu sẵn của chuyến cũ; đến điểm dừng không bị chặn).</summary>
    public static bool NeedsHealthCheck(TripMilestone m) =>
        m.MilestoneKind == "DEPARTED" || m.MilestoneKind == "STOP_DEPARTED";

    /// <summary>Các ngựa của chuyến chưa có nhật ký sức khỏe gắn với mốc này.</summary>
    public static async Task<List<string>> HorsesMissingHealthLogAsync(HorseTransportDbContext context, string tripId, string milestoneId)
    {
        var requestId = await context.TripPlans.Where(t => t.TripId == tripId).Select(t => t.RequestId).FirstOrDefaultAsync();
        var horseIds = await context.RequestHorseMappings.Where(m => m.RequestId == requestId).Select(m => m.HorseId).ToListAsync();
        var logged = await context.HealthLogs.Where(h => h.TripId == tripId && h.MilestoneId == milestoneId).Select(h => h.HorseId).Distinct().ToListAsync();
        return horseIds.Where(id => !logged.Contains(id)).ToList();
    }

    public static Flow4MilestoneDto BuildMilestoneDto(TripMilestone m, string? role, HorseTransportDbContext context)
    {
        var actions = new Flow4MilestoneActionsDto
        {
            CanComplete = m.Status == "PENDING",
            CanRequestCorrection = m.Status == "COMPLETED",
            Blockers = new List<Flow4BlockerDto>()
        };

        // Nếu mốc yêu cầu kiểm tra sức khỏe
        if (NeedsHealthCheck(m) && m.Status == "PENDING")
        {
            var requestId = context.TripPlans.Where(t => t.TripId == m.TripId).Select(t => t.RequestId).FirstOrDefault();
            var horseIds = context.RequestHorseMappings.Where(x => x.RequestId == requestId).Select(x => x.HorseId).ToList();
            var logged = context.HealthLogs.Where(h => h.TripId == m.TripId && h.MilestoneId == m.MilestoneId).Select(h => h.HorseId).Distinct().ToList();
            var missing = horseIds.Count == 0 ? (logged.Count == 0 ? 1 : 0) : horseIds.Count(id => !logged.Contains(id));
            if (missing > 0)
            {
                actions.Blockers.Add(new Flow4BlockerDto
                {
                    Code = "HEALTH_CHECK_REQUIRED",
                    Field = "health",
                    Message = m.MilestoneKind == "DEPARTED"
                        ? "Cần kiểm tra sức khỏe cho toàn bộ ngựa trước khi xuất phát."
                        : "Cần kiểm tra sức khỏe cho toàn bộ ngựa trước khi rời điểm dừng này."
                });
            }
        }

        List<string> evidenceIds = new();
        if (!string.IsNullOrEmpty(m.EvidenceFileIds))
        {
            try { evidenceIds = JsonSerializer.Deserialize<List<string>>(m.EvidenceFileIds) ?? new(); } catch { }
        }

        return new Flow4MilestoneDto
        {
            Id = m.MilestoneId,
            Leg = m.Leg,
            Kind = m.MilestoneKind,
            Sequence = m.SequenceOrder,
            Label = m.Label,
            Status = m.Status,
            PlannedAt = m.PlannedTime.ToString("yyyy-MM-dd HH:mm"),
            OccurredAt = m.OccurredAt?.ToString("yyyy-MM-dd HH:mm"),
            Revision = m.Revision,
            RequiresHealthCheck = NeedsHealthCheck(m),
            EvidenceFileIds = evidenceIds,
            Note = m.Note ?? "",
            Geo = m.Latitude is decimal lat && m.Longitude is decimal lng ? new Flow4GeoDto { Lat = lat, Lng = lng } : null,
            Actions = actions
        };
    }

    public static Flow4MutationResultDto BuildMutationResult(TripPlan trip, string recordId, HorseTransportDbContext context)
    {
        return new Flow4MutationResultDto
        {
            Binding = BuildBinding(trip),
            RecordId = recordId,
            Trip = BuildTripSummary(trip, context),
            Blockers = new List<Flow4BlockerDto>()
        };
    }

    public static Flow4TrackingDto BuildTrackingDto(TripPlan trip, string userId, string role, HorseTransportDbContext context)
    {
        var horses = context.RequestHorseMappings
            .Where(rhm => rhm.RequestId == trip.RequestId)
            .Include(rhm => rhm.Horse)
            .Select(rhm => new Flow4HorseSnapshotDto
            {
                HorseId = rhm.HorseId,
                Name = rhm.Horse != null ? rhm.Horse.Name : rhm.HorseId,
                Microchip = rhm.Horse != null ? rhm.Horse.MicrochipIso : "",
                CareInstructions = ""
            })
            .ToList();

        var assignment = context.TripVehicleAssignments
            .Where(tva => tva.TripId == trip.TripId)
            .Include(tva => tva.Vehicle)
            .Include(tva => tva.Driver)
            .Include(tva => tva.CoDriver)
            .Include(tva => tva.Veterinarian)
            .Include(tva => tva.Escort)
            .FirstOrDefault();

        Flow4VehicleSummaryDto? vehicleSummary = assignment?.Vehicle != null ? new Flow4VehicleSummaryDto
        {
            VehicleId = assignment.Vehicle.VehicleId,
            PlateNumber = assignment.Vehicle.PlateNumber ?? "CHƯA_GÁN",
            Type = assignment.Vehicle.Type ?? "TRUCK",
            CapacityStalls = assignment.Vehicle.CapacityStalls ?? 4,
            HeightM = assignment.Vehicle.HeightM,
            GrossWeightTons = assignment.Vehicle.GrossWeightTons
        } : null;

        var crewList = new List<Flow4CrewAssignmentDto>();
        var crewUserIds = new List<string>();
        void AddCrew(string? userId, string? name, string fallbackName, string duty)
        {
            if (string.IsNullOrEmpty(userId) || crewUserIds.Contains(userId)) return;
            crewUserIds.Add(userId);
            crewList.Add(new Flow4CrewAssignmentDto { UserId = userId, Name = name ?? fallbackName, Duty = duty });
        }
        if (assignment != null)
        {
            AddCrew(assignment.DriverId, assignment.Driver?.FullName, "Tài xế chính", "MAIN_DRIVER");
            AddCrew(assignment.CoDriverId, assignment.CoDriver?.FullName, "Phụ lái", "CO_DRIVER");
            AddCrew(assignment.VeterinarianId, assignment.Veterinarian?.FullName, "Bác sĩ thú y", "VETERINARIAN");
            AddCrew(assignment.EscortId, assignment.Escort?.FullName, "Nhân viên áp tải", "VETERINARIAN");
        }

        var milestones = context.TripMilestones
            .Where(m => m.TripId == trip.TripId)
            .OrderBy(m => m.SequenceOrder)
            .ToList()
            .Select(m => BuildMilestoneDto(m, role, context))
            .ToList();

        var legDto = new Flow4LegDto
        {
            Key = "road",
            Mode = "ROAD",
            Status = trip.Status == "READY_TO_DEPART" ? "PENDING" : trip.Status == "IN_TRANSIT" ? "ACTIVE" : "FINISHED",
            AssignedUserIds = crewUserIds,
            Crew = crewList,
            VehicleId = assignment?.VehicleId,
            Vehicle = vehicleSummary,
            From = "Điểm đón",
            To = "Điểm giao",
            MilestoneIds = milestones.Select(m => m.Id).ToList()
        };

        var blockers = new List<Flow4BlockerDto>();
        // Check health blockers: Abnormal horse health
        var abnormalHorses = context.HealthLogs
            .Where(h => h.TripId == trip.TripId && h.Condition == "ABNORMAL")
            .Select(h => h.HorseId)
            .Distinct()
            .ToList();

        foreach (var horseId in abnormalHorses)
        {
            var isCleared = context.VetAssessments
                .Any(v => v.TripId == trip.TripId && v.HorseId == horseId && v.TransportFitness == "FIT");

            if (!isCleared)
            {
                blockers.Add(new Flow4BlockerDto
                {
                    Code = "VET_CLEARANCE_REQUIRED",
                    Field = $"horses[{horseId}]",
                    Message = $"Ngựa {horseId} có chỉ số bất thường, đang chờ bác sĩ thú y đánh giá thể trạng FIT."
                });
            }
        }

        return new Flow4TrackingDto
        {
            Binding = BuildBinding(trip),
            ServerTime = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
            Trip = BuildTripSummary(trip, context),
            Horses = horses,
            Pickup = new Flow4EndpointDto { Name = "Điểm đón", Address = "Trang trại xuất phát", Country = "VN" },
            Delivery = new Flow4EndpointDto { Name = "Điểm đến", Address = "Trang trại đích", Country = "VN" },
            Flight = null,
            Legs = new List<Flow4LegDto> { legDto },
            Milestones = milestones,
            Map = new Flow4MapDto
            {
                RouteSource = "APPROVED_PLAN",
                LocationSource = "CONFIRMED_MILESTONE",
                LastConfirmedMilestoneId = milestones.LastOrDefault(m => m.Status == "COMPLETED")?.Id,
                MarkerGeo = milestones.LastOrDefault(m => m.Status == "COMPLETED" && m.Geo != null)?.Geo ?? milestones.FirstOrDefault(m => m.Geo != null)?.Geo,
                IsGps = false,
                RoutePoints = milestones.Where(m => m.Geo != null).Select(m => m.Geo!).ToList()
            },
            Policy = new Flow4PolicyDto
            {
                Version = 1,
                Configured = false,
                Note = "Chưa chốt ngưỡng; không tự gán mặc định"
            },
            Blockers = blockers,
            HandoverAvailable = false
        };
    }
}
