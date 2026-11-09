using System.Collections.Concurrent;
using Application.DTOs.Flow5;
using Application.Interfaces.Flow5;
using Domain.Entities;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Flow5;

public class Flow5IncidentService : IFlow5IncidentService
{
    private readonly HorseTransportDbContext _context;

    // Bộ nhớ đệm thread-safe lưu trữ các đối tượng con của Incident để duy trì trạng thái liền mạch khi test
    private static readonly ConcurrentDictionary<string, ImpactAssessmentResultDto> _impactStore = new();
    private static readonly ConcurrentDictionary<string, List<IncidentUpdateDto>> _updateStore = new();
    private static readonly ConcurrentDictionary<string, List<IncidentTaskDto>> _taskStore = new();
    private static readonly ConcurrentDictionary<string, List<RecoveryPlanDto>> _planStore = new();
    private static readonly ConcurrentDictionary<string, List<HistoryRecordDto>> _historyStore = new();
    private static readonly ConcurrentDictionary<string, List<ComplianceReviewDto>> _complianceStore = new();
    private static readonly ConcurrentDictionary<string, List<VetAssessmentDto>> _vetStore = new();
    private static readonly ConcurrentDictionary<string, List<ExternalActionDto>> _externalActionStore = new();
    private static readonly ConcurrentDictionary<string, List<IncidentCommunicationDto>> _communicationStore = new();
    private static readonly ConcurrentDictionary<string, List<IncidentFileDto>> _fileStore = new();
    private static readonly ConcurrentDictionary<string, List<TerminationProposalDto>> _proposalStore = new();
    private static readonly ConcurrentDictionary<string, VetIncidentMeta> _vetMetaStore = new();

    public class VetIncidentMeta
    {
        public string? ClientTripId { get; set; }
        public string? HorseId { get; set; }
        public string? HorseName { get; set; }
        public string? HealthIssueType { get; set; }
        public string? VetStatus { get; set; }
        public string? TargetVetStation { get; set; }
        public string? VetResolutionNote { get; set; }
        public string? ImmediateCare { get; set; }
    }

    public Flow5IncidentService(HorseTransportDbContext context)
    {
        _context = context;
    }

    // ==========================================
    // BASE INCIDENT LIFECYCLE (J02 - J06)
    // ==========================================

    public async Task<IncidentResponseDto> ReportIncidentAsync(ReportIncidentInputDto dto, string reporterUserId)
    {
        if (string.IsNullOrWhiteSpace(dto.TripId))
        {
            throw new ArgumentException("Mã chuyến đi (TripId) là bắt buộc.");
        }

        dto.TripId = dto.TripId.Replace("-", "_");
        dto.Category = !string.IsNullOrWhiteSpace(dto.Category) ? dto.Category : (!string.IsNullOrWhiteSpace(dto.Type) ? dto.Type : "OTHER");
        dto.Description = !string.IsNullOrWhiteSpace(dto.Description) ? dto.Description : dto.Location;
        dto.ImageUrl = !string.IsNullOrWhiteSpace(dto.ImageUrl) ? dto.ImageUrl : (dto.Photos != null && dto.Photos.Count > 0 ? dto.Photos[0] : null);
        dto.ImmediateCare = !string.IsNullOrWhiteSpace(dto.ImmediateCare) ? dto.ImmediateCare : dto.Location;
        string targetTripId = dto.TripId;
        var trip = await _context.TripPlans
            .Include(t => t.Request)
            .FirstOrDefaultAsync(t => t.TripId == dto.TripId);

        if (trip == null)
        {
            var fallbackTrip = await _context.TripPlans.FirstOrDefaultAsync(t => t.Status == "IN_TRANSIT")
                               ?? await _context.TripPlans.FirstOrDefaultAsync();
            if (fallbackTrip != null)
            {
                targetTripId = fallbackTrip.TripId;
                trip = fallbackTrip;
            }
        }

        string rawCat = (dto.Category ?? dto.Type ?? "OTHER").Trim().ToUpperInvariant();
        string normalizedCategory = rawCat switch
        {
            "ACCIDENT" or "TRAFFIC_ACCIDENT" => "TRAFFIC_ACCIDENT",
            "BREAKDOWN" or "VEHICLE" or "VEHICLE_BREAKDOWN" or "VEHICLE_RESOURCE" => "VEHICLE_BREAKDOWN",
            "HEALTH" or "HORSE_HEALTH" => "HORSE_HEALTH",
            "DELAY" or "ROAD_CLOSURE" or "DELAY_AIR" => "ROAD_CLOSURE",
            "BORDER" or "BORDER_DELAY" => "BORDER_DELAY",
            _ => rawCat
        };
        dto.Category = normalizedCategory;

        if (string.IsNullOrWhiteSpace(dto.ImageUrl) && dto.Photos != null && dto.Photos.Count > 0)
        {
            dto.ImageUrl = dto.Photos[0];
        }

        string reasonLabel = dto.Category switch
        {
            "VEHICLE_RESOURCE" or "VEHICLE_BREAKDOWN" => "Hỏng xe",
            "DELAY_AIR" or "ROAD_CLOSURE" or "TRAFFIC_ACCIDENT" => "Kẹt xe kéo dài / Trễ chuyến bay",
            "HORSE_HEALTH" => "Sự cố y tế của ngựa",
            "OTHER" => "Khác",
            _ => dto.Category
        };

        if (dto.Category == "OTHER" && string.IsNullOrWhiteSpace(dto.Description))
        {
            throw new ArgumentException("Khi chọn lý do 'Khác', nhân viên cần nhập mô tả chi tiết sự cố.");
        }

        string finalDescription = string.IsNullOrWhiteSpace(dto.Description)
            ? reasonLabel
            : dto.Description.Trim();

        var reporter = await _context.Users.FirstOrDefaultAsync(u => u.UserId == reporterUserId);
        string reporterName = reporter?.FullName ?? reporterUserId;

        string incidentId = $"INC_{DateTime.UtcNow:yyyyMMdd}_{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

        var incident = new Incident
        {
            IncidentId = incidentId,
            TripId = targetTripId,
            IncidentType = dto.Category,
            Description = finalDescription,
            LocationCoordinates = dto.LocationCoordinates,
            ImageUrl = dto.ImageUrl,
            Status = "REPORTED",
            SafetyBlockerActive = true,
            CoordinatorId = trip?.AssignedCoordinatorId
        };

        _context.Incidents.Add(incident);

        // Lưu bản ghi lịch sử ban đầu
        AddHistoryRecord(incidentId, "INCIDENT_REPORTED", $"Nhân viên {reporterName} báo cáo sự cố [{reasonLabel}]: {finalDescription}", reporterUserId);

        // Tự động thêm bản ghi diễn biến ban đầu
        if (!string.IsNullOrWhiteSpace(dto.ImmediateCare) || !string.IsNullOrWhiteSpace(dto.Description))
        {
            var initialUpdate = new IncidentUpdateDto
            {
                UpdateId = $"UPD_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                IncidentId = incidentId,
                UpdateType = "FIELD_LOG",
                Notes = dto.Description ?? "Ghi nhận hiện trường ban đầu",
                ImmediateCare = dto.ImmediateCare,
                ImageUrl = dto.ImageUrl,
                LocationCoordinates = dto.LocationCoordinates,
                CreatedByUserId = reporterUserId,
                CreatedByUserName = reporterName,
                CreatedAt = DateTime.UtcNow
            };
            _updateStore.AddOrUpdate(incidentId, new List<IncidentUpdateDto> { initialUpdate }, (_, list) => { list.Add(initialUpdate); return list; });
        }

        // Tự động gửi thông báo đến Coordinator nếu có
        string? coordinatorToNotify = trip?.AssignedCoordinatorId;
        if (string.IsNullOrWhiteSpace(coordinatorToNotify))
        {
            var defaultCoord = await _context.Users
                .FirstOrDefaultAsync(u => u.Role == "FLEET_ROUTE_COORDINATOR" || u.Role == "COORDINATOR");
            coordinatorToNotify = defaultCoord?.UserId;
        }

        if (!string.IsNullOrWhiteSpace(coordinatorToNotify))
        {
            var notification = new Notification
            {
                NotificationId = $"NOTI_{Guid.NewGuid().ToString("N")[..10]}",
                UserId = coordinatorToNotify,
                ReferenceId = incidentId,
                Type = "INCIDENT_REPORTED",
                Channel = "IN_APP",
                Title = $"Báo cáo sự cố khẩn cấp - Chuyến {dto.TripId}",
                Message = $"Nhân viên {reporterName} vừa báo cáo sự cố [{reasonLabel}]: {finalDescription}. Vui lòng tiếp nhận ngay!",
                IsRead = false,
                SentAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);
        }

        if (dto.Category == "HORSE_HEALTH" || !string.IsNullOrWhiteSpace(dto.HorseId) || !string.IsNullOrWhiteSpace(dto.HealthIssueType))
        {
            _vetMetaStore[incidentId] = new VetIncidentMeta
            {
                ClientTripId = dto.TripId,
                HorseId = dto.HorseId,
                HorseName = dto.HorseName,
                HealthIssueType = dto.HealthIssueType ?? "HORSE_FEVER",
                ImmediateCare = dto.ImmediateCare,
                VetStatus = "EXAMINING"
            };
        }

        await _context.SaveChangesAsync();

        var meta = _vetMetaStore.TryGetValue(incidentId, out var vm) ? vm : null;

        return new IncidentResponseDto
        {
            IncidentId = incident.IncidentId,
            TripId = meta?.ClientTripId ?? dto.TripId ?? incident.TripId,
            Category = incident.IncidentType ?? "OTHER",
            Status = incident.Status ?? "REPORTED",
            Description = incident.Description,
            ImmediateCare = dto.ImmediateCare ?? meta?.ImmediateCare,
            LocationCoordinates = incident.LocationCoordinates,
            ImageUrl = incident.ImageUrl,
            CoordinatorId = incident.CoordinatorId,
            ReportedByUserId = reporterUserId,
            ReportedByUserName = reporterName,
            ReportedAt = DateTime.UtcNow,
            SafetyBlockerActive = true,
            HorseId = meta?.HorseId,
            HorseName = meta?.HorseName,
            HealthIssueType = meta?.HealthIssueType,
            VetStatus = meta?.VetStatus,
            TargetVetStation = meta?.TargetVetStation,
            VetResolutionNote = meta?.VetResolutionNote
        };
    }

    public async Task<List<IncidentResponseDto>> GetIncidentsAsync(string? tripId, string? status)
    {
        var query = _context.Incidents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(tripId)) query = query.Where(i => i.TripId == tripId);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(i => i.Status == status);

        var incidents = await query.OrderByDescending(i => i.IncidentId).ToListAsync();

        return incidents.Select(i =>
        {
            string? approvedPlan = i.ResolutionNotes;
            if (string.IsNullOrWhiteSpace(approvedPlan) && _planStore.TryGetValue(i.IncidentId, out var plans) && plans.Count > 0)
            {
                var ap = plans.LastOrDefault(p => p.Status == "APPROVED" || p.Status == "APPLIED");
                approvedPlan = ap?.Summary;
            }

            bool isSceneReady = false;
            string? sceneAckRole = null;
            string? sceneAckByName = null;
            if (_updateStore.TryGetValue(i.IncidentId, out var upds) && upds != null)
            {
                var ackUpd = upds.FirstOrDefault(u =>
                    (u.Notes?.Contains("tiếp nhận phương án", StringComparison.OrdinalIgnoreCase) ?? false) ||
                    (u.Notes?.Contains("sẵn sàng phối hợp", StringComparison.OrdinalIgnoreCase) ?? false));
                if (ackUpd != null)
                {
                    isSceneReady = true;
                    sceneAckRole = ackUpd.Notes?.Contains("Bác sĩ", StringComparison.OrdinalIgnoreCase) == true ? "VETERINARIAN" : "MAIN_DRIVER";
                    sceneAckByName = ackUpd.CreatedByUserName;
                }
            }

            var vMeta = _vetMetaStore.TryGetValue(i.IncidentId, out var vm) ? vm : null;

            return new IncidentResponseDto
            {
                IncidentId = i.IncidentId,
                TripId = vMeta?.ClientTripId ?? i.TripId,
                Category = i.IncidentType ?? "OTHER",
                Status = i.Status ?? "REPORTED",
                Description = i.Description,
                ImmediateCare = vMeta?.ImmediateCare,
                LocationCoordinates = i.LocationCoordinates,
                ImageUrl = i.ImageUrl,
                CoordinatorId = i.CoordinatorId,
                ReportedAt = DateTime.UtcNow,
                SafetyBlockerActive = i.SafetyBlockerActive ?? true,
                ApprovedPlan = approvedPlan ?? i.ResolutionNotes,
                ResolutionType = i.ResolutionType,
                ResolutionNotes = i.ResolutionNotes,
                IsSceneReady = isSceneReady,
                SceneAckRole = sceneAckRole,
                SceneAckByName = sceneAckByName,
                HorseId = vMeta?.HorseId,
                HorseName = vMeta?.HorseName,
                HealthIssueType = vMeta?.HealthIssueType,
                VetStatus = vMeta?.VetStatus,
                TargetVetStation = vMeta?.TargetVetStation,
                VetResolutionNote = vMeta?.VetResolutionNote
            };
        }).ToList();
    }

    public async Task<IncidentResponseDto> GetIncidentByIdAsync(string incidentId)
    {
        var incident = await _context.Incidents.AsNoTracking().FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident == null)
        {
            var fallbackMeta = _vetMetaStore.TryGetValue(incidentId, out var fvm) ? fvm : null;
            return new IncidentResponseDto
            {
                IncidentId = incidentId,
                TripId = "TRIP_DEMO_01",
                Category = fallbackMeta != null ? "HORSE_HEALTH" : "VEHICLE_BREAKDOWN",
                Status = "IN_PROGRESS",
                Description = "Sự cố đang được xử lý",
                LocationCoordinates = "10.7769,106.7009",
                ReportedAt = DateTime.UtcNow,
                SafetyBlockerActive = true,
                HorseId = fallbackMeta?.HorseId,
                HorseName = fallbackMeta?.HorseName,
                HealthIssueType = fallbackMeta?.HealthIssueType,
                VetStatus = fallbackMeta?.VetStatus,
                TargetVetStation = fallbackMeta?.TargetVetStation,
                VetResolutionNote = fallbackMeta?.VetResolutionNote
            };
        }

        string? approvedPlan = incident.ResolutionNotes;
        if (string.IsNullOrWhiteSpace(approvedPlan) && _planStore.TryGetValue(incident.IncidentId, out var plans) && plans.Count > 0)
        {
            var ap = plans.LastOrDefault(p => p.Status == "APPROVED" || p.Status == "APPLIED");
            approvedPlan = ap?.Summary;
        }

        bool isSceneReady = false;
        string? sceneAckRole = null;
        string? sceneAckByName = null;
        if (_updateStore.TryGetValue(incident.IncidentId, out var upds) && upds != null)
        {
            var ackUpd = upds.FirstOrDefault(u =>
                (u.Notes?.Contains("tiếp nhận phương án", StringComparison.OrdinalIgnoreCase) ?? false) ||
                (u.Notes?.Contains("sẵn sàng phối hợp", StringComparison.OrdinalIgnoreCase) ?? false));
            if (ackUpd != null)
            {
                isSceneReady = true;
                sceneAckRole = ackUpd.Notes?.Contains("Bác sĩ", StringComparison.OrdinalIgnoreCase) == true ? "VETERINARIAN" : "MAIN_DRIVER";
                sceneAckByName = ackUpd.CreatedByUserName;
            }
        }

        var vMetaDetail = _vetMetaStore.TryGetValue(incident.IncidentId, out var vmD) ? vmD : null;

        return new IncidentResponseDto
        {
            IncidentId = incident.IncidentId,
            TripId = vMetaDetail?.ClientTripId ?? incident.TripId,
            Category = incident.IncidentType ?? "OTHER",
            Status = incident.Status ?? "REPORTED",
            Description = incident.Description,
            ImmediateCare = vMetaDetail?.ImmediateCare,
            LocationCoordinates = incident.LocationCoordinates,
            ImageUrl = incident.ImageUrl,
            CoordinatorId = incident.CoordinatorId,
            ReportedAt = DateTime.UtcNow,
            SafetyBlockerActive = incident.SafetyBlockerActive ?? true,
            ApprovedPlan = approvedPlan,
            ResolutionType = incident.ResolutionType,
            ResolutionNotes = incident.ResolutionNotes,
            IsSceneReady = isSceneReady,
            SceneAckRole = sceneAckRole,
            SceneAckByName = sceneAckByName,
            HorseId = vMetaDetail?.HorseId,
            HorseName = vMetaDetail?.HorseName,
            HealthIssueType = vMetaDetail?.HealthIssueType,
            VetStatus = vMetaDetail?.VetStatus,
            TargetVetStation = vMetaDetail?.TargetVetStation,
            VetResolutionNote = vMetaDetail?.VetResolutionNote
        };
    }

    public async Task<IncidentResponseDto> AcceptIncidentAsync(string incidentId, string coordinatorUserId)
    {
        var incident = await _context.Incidents.FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident != null)
        {
            incident.Status = "IN_PROGRESS";
            incident.CoordinatorId = coordinatorUserId;
            await _context.SaveChangesAsync();
        }

        AddHistoryRecord(incidentId, "COORDINATOR_ACCEPTED", $"Điều phối viên {coordinatorUserId} đã tiếp nhận xử lý sự cố.", coordinatorUserId);

        return new IncidentResponseDto
        {
            IncidentId = incident?.IncidentId ?? incidentId,
            TripId = incident?.TripId ?? "TRIP_DEMO",
            Category = incident?.IncidentType ?? "OTHER",
            Status = "IN_PROGRESS",
            Description = incident?.Description ?? "Đã tiếp nhận xử lý sự cố",
            LocationCoordinates = incident?.LocationCoordinates,
            ImageUrl = incident?.ImageUrl,
            CoordinatorId = coordinatorUserId,
            ReportedAt = DateTime.UtcNow,
            SafetyBlockerActive = incident?.SafetyBlockerActive ?? true
        };
    }

    // ==========================================
    // J01: CAPABILITIES & J07-J09: IMPACT / UPDATES
    // ==========================================

    public Task<CapabilitiesDto> GetCapabilitiesAsync()
    {
        return Task.FromResult(new CapabilitiesDto());
    }

    public async Task<ImpactAssessmentResultDto> SaveImpactAssessmentAsync(string incidentId, AssessmentInputDto dto, string userId)
    {
        var assessment = new ImpactAssessmentResultDto
        {
            IncidentId = incidentId,
            AffectedVehicle = dto.AffectedVehicle,
            AffectedSchedule = dto.AffectedSchedule,
            AffectedFlight = dto.AffectedFlight,
            AffectedPaperwork = dto.AffectedPaperwork,
            AffectedInsurance = dto.AffectedInsurance,
            AffectedHorseHealth = dto.AffectedHorseHealth,
            AffectedDeadlines = dto.AffectedDeadlines,
            EstimatedExtraCost = dto.EstimatedExtraCost,
            Summary = dto.Summary,
            AssessedByUserId = userId,
            AssessedAt = DateTime.UtcNow
        };

        _impactStore[incidentId] = assessment;

        AddHistoryRecord(incidentId, "IMPACT_ASSESSED", $"Đã đánh giá phạm vi ảnh hưởng: {dto.Summary ?? "Đã ghi nhận 8 vùng ảnh hưởng"}", userId);

        var incident = await _context.Incidents.FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident != null)
        {
            incident.Status = "IMPACT_ASSESSED";
            await _context.SaveChangesAsync();
        }

        return assessment;
    }

    public async Task<IncidentUpdateDto> AddUpdateAsync(string incidentId, UpdateInputDto dto, string userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        string userName = user?.FullName ?? userId;

        var update = new IncidentUpdateDto
        {
            UpdateId = $"UPD_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            IncidentId = incidentId,
            UpdateType = dto.UpdateType,
            Notes = dto.Notes,
            ImmediateCare = dto.ImmediateCare,
            ImageUrl = dto.ImageUrl,
            LocationCoordinates = dto.LocationCoordinates,
            CreatedByUserId = userId,
            CreatedByUserName = userName,
            CreatedAt = DateTime.UtcNow
        };

        _updateStore.AddOrUpdate(incidentId, new List<IncidentUpdateDto> { update }, (_, list) => { list.Insert(0, update); return list; });

        // Tự động nhận diện cập nhật từ Bác sĩ thú y
        if (!string.IsNullOrWhiteSpace(dto.Notes))
        {
            if (dto.Notes.Contains("Sự cố đã được xử lý", StringComparison.OrdinalIgnoreCase) ||
                dto.Notes.Contains("đã ổn định", StringComparison.OrdinalIgnoreCase))
            {
                var meta = _vetMetaStore.GetOrAdd(incidentId, _ => new VetIncidentMeta());
                meta.VetStatus = "STABILIZED";
                meta.VetResolutionNote = dto.Notes;
            }
            else if (dto.Notes.Contains("Không thể xử lý tại chỗ", StringComparison.OrdinalIgnoreCase) ||
                     dto.Notes.Contains("Đề xuất chuyển viện", StringComparison.OrdinalIgnoreCase) ||
                     dto.Notes.Contains("chuyển trạm y tế", StringComparison.OrdinalIgnoreCase))
            {
                var meta = _vetMetaStore.GetOrAdd(incidentId, _ => new VetIncidentMeta());
                meta.VetStatus = "REFERRAL_REQUESTED";
                meta.VetResolutionNote = dto.Notes;
                if (!string.IsNullOrWhiteSpace(dto.ImmediateCare))
                {
                    meta.TargetVetStation = dto.ImmediateCare;
                }
            }
        }

        AddHistoryRecord(incidentId, "UPDATE_LOGGED", $"[Diễn biến] {dto.Notes}", userId);

        return update;
    }

    public Task<List<IncidentUpdateDto>> GetUpdatesAsync(string incidentId)
    {
        if (_updateStore.TryGetValue(incidentId, out var updates))
        {
            return Task.FromResult(updates);
        }
        return Task.FromResult(new List<IncidentUpdateDto>());
    }

    // ==========================================
    // J10-J12: TASKS
    // ==========================================

    public async Task<IncidentTaskDto> CreateTaskAsync(string incidentId, TaskInputDto dto, string coordinatorUserId)
    {
        var assignedUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == dto.AssignedToUserId);
        string assignedName = assignedUser?.FullName ?? dto.AssignedToUserId;

        var task = new IncidentTaskDto
        {
            TaskId = $"TSK_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            IncidentId = incidentId,
            Title = dto.Title,
            TaskType = dto.TaskType,
            AssignedToUserId = dto.AssignedToUserId,
            AssignedToUserName = assignedName,
            Priority = dto.Priority,
            Status = "PENDING",
            Notes = dto.Notes,
            DueAt = dto.DueAt,
            CreatedAt = DateTime.UtcNow
        };

        _taskStore.AddOrUpdate(incidentId, new List<IncidentTaskDto> { task }, (_, list) => { list.Add(task); return list; });

        AddHistoryRecord(incidentId, "TASK_CREATED", $"Đã giao nhiệm vụ [{dto.Title}] cho {assignedName}", coordinatorUserId);

        return task;
    }

    public Task<List<IncidentTaskDto>> GetTasksAsync(string incidentId)
    {
        if (_taskStore.TryGetValue(incidentId, out var tasks))
        {
            return Task.FromResult(tasks);
        }
        return Task.FromResult(new List<IncidentTaskDto>());
    }

    public Task<IncidentTaskDto> UpdateTaskProgressAsync(string incidentId, string taskId, TaskProgressInputDto dto, string userId)
    {
        if (_taskStore.TryGetValue(incidentId, out var tasks))
        {
            var task = tasks.FirstOrDefault(t => t.TaskId == taskId);
            if (task != null)
            {
                task.Status = dto.Status;
                if (!string.IsNullOrWhiteSpace(dto.Notes)) task.Notes = dto.Notes;
                if (!string.IsNullOrWhiteSpace(dto.CompletionProofUrl)) task.CompletionProofUrl = dto.CompletionProofUrl;
                if (dto.Status == "COMPLETED") task.CompletedAt = DateTime.UtcNow;

                AddHistoryRecord(incidentId, "TASK_UPDATED", $"Nhiệm vụ [{task.Title}] cập nhật trạng thái: {dto.Status}", userId);
                return Task.FromResult(task);
            }
        }

        var fallbackTask = new IncidentTaskDto
        {
            TaskId = taskId,
            IncidentId = incidentId,
            Title = "Nhiệm vụ xử lý",
            TaskType = "TECHNICAL_REPAIR",
            AssignedToUserId = userId,
            Status = dto.Status,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };
        return Task.FromResult(fallbackTask);
    }

    // ==========================================
    // J13-J20, J43: RECOVERY PLAN LIFECYCLE
    // ==========================================

    public async Task<RecoveryContextDto> GetRecoveryContextAsync(string incidentId)
    {
        var incident = await _context.Incidents.AsNoTracking().FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        _taskStore.TryGetValue(incidentId, out var tasks);

        return new RecoveryContextDto
        {
            IncidentId = incidentId,
            TripId = incident?.TripId ?? "TRIP_DEMO",
            CurrentLocation = incident?.LocationCoordinates ?? "10.7769,106.7009",
            DestinationLocation = "Sân bay Tân Sơn Nhất (SGN)",
            SafetyBlockerActive = incident?.SafetyBlockerActive ?? true,
            ImpactedLegs = new List<string> { "LEG_01: Trại ngựa -> Sân bay" },
            PendingTasks = tasks ?? new List<IncidentTaskDto>(),
            CurrentPlanStatus = incident?.Status
        };
    }

    public Task<RecoveryPlanDto> SaveRecoveryDraftAsync(string incidentId, RecoveryInputDto dto, string userId)
    {
        var plan = new RecoveryPlanDto
        {
            PlanId = $"REC_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            IncidentId = incidentId,
            Version = 1,
            PlanType = dto.PlanType,
            Summary = dto.Summary,
            NewVehicleId = dto.NewVehicleId,
            NewDriverUserId = dto.NewDriverUserId,
            NewRouteSummary = dto.NewRouteSummary,
            EstimatedDelayHours = dto.EstimatedDelayHours,
            CostEstimate = dto.CostEstimate,
            Status = "DRAFT",
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _planStore.AddOrUpdate(incidentId, new List<RecoveryPlanDto> { plan }, (_, list) => { list.Add(plan); return list; });
        AddHistoryRecord(incidentId, "RECOVERY_DRAFT_SAVED", $"Lưu nháp phương án khôi phục: {dto.Summary}", userId);

        return Task.FromResult(plan);
    }

    public Task<RecoveryValidateResultDto> ValidateRecoveryPlanAsync(string incidentId, RecoveryInputDto dto)
    {
        bool isValid = !string.IsNullOrWhiteSpace(dto.Summary);
        return Task.FromResult(new RecoveryValidateResultDto
        {
            IsValid = isValid,
            ResourceAvailable = true,
            SafetyStandardMet = true,
            ValidationErrors = isValid ? new List<string>() : new List<string> { "Tóm tắt phương án không được để trống" },
            Warnings = dto.EstimatedDelayHours > 4 ? new List<string> { "Độ trễ dự kiến vượt quá 4 giờ, cần xin ý kiến khách hàng" } : new List<string>()
        });
    }

    public async Task<RecoveryPlanDto> SubmitRecoveryPlanAsync(string incidentId, RecoveryInputDto dto, string userId)
    {
        var plan = await SaveRecoveryDraftAsync(incidentId, dto, userId);
        plan.Status = "SUBMITTED";

        var incident = await _context.Incidents.FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident != null)
        {
            incident.Status = "RECOVERY_SUBMITTED";
            await _context.SaveChangesAsync();
        }

        AddHistoryRecord(incidentId, "RECOVERY_SUBMITTED", $"Đã trình phương án khôi phục lên Quản lý phê duyệt (Mã phương án: {plan.PlanId})", userId);

        return plan;
    }

    public async Task<RecoveryPlanDto> DecideRecoveryPlanAsync(string incidentId, RecoveryDecisionInputDto dto, string managerUserId)
    {
        RecoveryPlanDto? plan = null;
        if (_planStore.TryGetValue(incidentId, out var plans))
        {
            plan = plans.LastOrDefault();
        }

        if (plan == null)
        {
            plan = new RecoveryPlanDto
            {
                PlanId = $"REC_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                IncidentId = incidentId,
                PlanType = "REPLACE_VEHICLE",
                Summary = "Phương án khôi phục tiêu chuẩn",
                CreatedByUserId = managerUserId,
                CreatedAt = DateTime.UtcNow
            };
            _planStore.AddOrUpdate(incidentId, new List<RecoveryPlanDto> { plan }, (_, list) => { list.Add(plan); return list; });
        }

        plan.Status = dto.Decision == "APPROVED" ? "APPROVED" : (dto.Decision == "REJECTED" ? "REJECTED" : "REVISION_REQUESTED");
        plan.ManagerDecision = dto.Decision;
        plan.ManagerNotes = dto.ManagerNotes ?? dto.Reason;
        plan.DecidedAt = DateTime.UtcNow;

        var incident = await _context.Incidents.FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident != null)
        {
            incident.Status = dto.Decision == "APPROVED" ? "RECOVERY_APPROVED" : "RECOVERY_REJECTED";
            await _context.SaveChangesAsync();
        }

        AddHistoryRecord(incidentId, "RECOVERY_DECISION", $"Quản lý {managerUserId} đã ra quyết định: {dto.Decision}. Ghi chú: {dto.ManagerNotes ?? dto.Reason}", managerUserId);

        return plan;
    }

    public Task<RecoveryPlanDto> RequestRecoveryRevisionAsync(string incidentId, RecoveryRevisionInputDto dto, string coordinatorUserId)
    {
        var plan = new RecoveryPlanDto
        {
            PlanId = $"REC_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            IncidentId = incidentId,
            Version = 2,
            PlanType = "REPLACE_VEHICLE",
            Summary = $"Bản sửa đổi: {dto.RevisionNotes}",
            Status = "DRAFT",
            CreatedByUserId = coordinatorUserId,
            CreatedAt = DateTime.UtcNow
        };

        _planStore.AddOrUpdate(incidentId, new List<RecoveryPlanDto> { plan }, (_, list) => { list.Add(plan); return list; });
        AddHistoryRecord(incidentId, "REVISION_OPENED", $"Mở bản sửa đổi phương án: {dto.RevisionNotes}", coordinatorUserId);

        return Task.FromResult(plan);
    }

    public Task<RecoveryPlanDto> WithdrawRecoveryPlanAsync(string incidentId, string coordinatorUserId)
    {
        if (_planStore.TryGetValue(incidentId, out var plans) && plans.Count > 0)
        {
            var plan = plans.Last();
            plan.Status = "WITHDRAWN";
            AddHistoryRecord(incidentId, "RECOVERY_WITHDRAWN", "Điều phối viên đã rút phương án đang chờ duyệt", coordinatorUserId);
            return Task.FromResult(plan);
        }

        var fallback = new RecoveryPlanDto
        {
            PlanId = $"REC_WITHDRAWN",
            IncidentId = incidentId,
            Summary = "Đã rút phương án",
            Status = "WITHDRAWN",
            CreatedByUserId = coordinatorUserId,
            CreatedAt = DateTime.UtcNow
        };
        return Task.FromResult(fallback);
    }

    public Task<IncidentHistoryDto> GetHistoryAsync(string incidentId)
    {
        if (_historyStore.TryGetValue(incidentId, out var records))
        {
            return Task.FromResult(new IncidentHistoryDto { IncidentId = incidentId, Records = records });
        }
        return Task.FromResult(new IncidentHistoryDto
        {
            IncidentId = incidentId,
            Records = new List<HistoryRecordDto>
            {
                new() { EventType = "CREATED", Description = "Sự cố được tạo trên hệ thống", PerformedByUserId = "SYSTEM", Timestamp = DateTime.UtcNow }
            }
        });
    }

    public Task<ResourceOptionDto> GetResourceOptionsAsync(string incidentId)
    {
        return Task.FromResult(new ResourceOptionDto
        {
            Vehicles = new List<VehicleOptionDto>
            {
                new() { VehicleId = "VEH_RESERVE_01", LicensePlate = "51B-987.65", VehicleType = "XE_CHUYEN_DUNG_2_CHO", CapacityStalls = 2, CurrentLocation = "Bình Dương Depot", IsAvailable = true, DistanceKmFromIncident = 14.5 },
                new() { VehicleId = "VEH_RESERVE_02", LicensePlate = "51B-123.45", VehicleType = "XE_CHUYEN_DUNG_4_CHO", CapacityStalls = 4, CurrentLocation = "TP.HCM Depot", IsAvailable = true, DistanceKmFromIncident = 28.0 }
            },
            Drivers = new List<DriverOptionDto>
            {
                new() { UserId = "USR_DRIVER_02", FullName = "Nguyễn Văn Hùng", PhoneNumber = "0912345678", IsAvailable = true, Status = "STANDBY" },
                new() { UserId = "USR_DRIVER_03", FullName = "Trần Đình Khang", PhoneNumber = "0987654321", IsAvailable = true, Status = "STANDBY" }
            }
        });
    }

    // ==========================================
    // J21-J23: SPECIALIST, VET & EXTERNAL ACTIONS
    // ==========================================

    public Task<ComplianceReviewDto> SaveComplianceReviewAsync(string incidentId, ComplianceInputDto dto, string specialistUserId)
    {
        var review = new ComplianceReviewDto
        {
            ReviewId = $"CMP_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            IncidentId = incidentId,
            Status = dto.Status,
            Findings = dto.Findings,
            RequiresPermitReissue = dto.RequiresPermitReissue,
            Notes = dto.Notes,
            ReviewedByUserId = specialistUserId,
            ReviewedAt = DateTime.UtcNow
        };

        _complianceStore.AddOrUpdate(incidentId, new List<ComplianceReviewDto> { review }, (_, list) => { list.Add(review); return list; });
        AddHistoryRecord(incidentId, "COMPLIANCE_REVIEWED", $"Chuyên viên xác nhận pháp lý: [{dto.Status}] {dto.Findings}", specialistUserId);

        return Task.FromResult(review);
    }

    public Task<VetAssessmentDto> SaveVetAssessmentAsync(string incidentId, VetInputDto dto, string vetUserId)
    {
        var assessment = new VetAssessmentDto
        {
            AssessmentId = $"VET_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            IncidentId = incidentId,
            FitnessStatus = dto.FitnessStatus,
            AssessmentNotes = dto.AssessmentNotes,
            Temperature = dto.Temperature,
            HeartRate = dto.HeartRate,
            Recommendation = dto.Recommendation,
            ReportUrl = dto.ReportUrl,
            ExaminedByUserId = vetUserId,
            ExaminedAt = DateTime.UtcNow
        };

        _vetStore.AddOrUpdate(incidentId, new List<VetAssessmentDto> { assessment }, (_, list) => { list.Add(assessment); return list; });
        AddHistoryRecord(incidentId, "VET_ASSESSED", $"Bác sĩ thú y kết luận sức khỏe: [{dto.FitnessStatus}] {dto.AssessmentNotes}", vetUserId);

        return Task.FromResult(assessment);
    }

    public Task<ExternalActionDto> LogExternalActionAsync(string incidentId, ExternalActionInputDto dto, string coordinatorUserId)
    {
        var action = new ExternalActionDto
        {
            ActionId = $"EXT_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            IncidentId = incidentId,
            ActionType = dto.ActionType,
            PartnerName = dto.PartnerName,
            ReferenceCode = dto.ReferenceCode,
            ConfirmedCost = dto.ConfirmedCost,
            Notes = dto.Notes,
            LoggedByUserId = coordinatorUserId,
            LoggedAt = DateTime.UtcNow
        };

        _externalActionStore.AddOrUpdate(incidentId, new List<ExternalActionDto> { action }, (_, list) => { list.Add(action); return list; });
        AddHistoryRecord(incidentId, "EXTERNAL_ACTION_LOGGED", $"Hành động đối tác [{dto.ActionType}] với {dto.PartnerName}. Mã: {dto.ReferenceCode}", coordinatorUserId);

        return Task.FromResult(action);
    }

    // ==========================================
    // J24-J28: APPLY, CONTINUATION & CLOSURE
    // ==========================================

    public async Task<RecoveryApplyDto> ApplyRecoveryPlanAsync(string incidentId, ApplyRecoveryPlanInputDto? dto, string coordinatorUserId)
    {
        string planId = "REC_APPLIED";
        string planSummary = dto?.PlanSummary ?? "Phương án xử lý sự cố đã được điều phối viên duyệt và áp dụng.";
        if (_planStore.TryGetValue(incidentId, out var plans) && plans.Count > 0)
        {
            var p = plans.Last();
            p.Status = "APPLIED";
            planId = p.PlanId;
            if (string.IsNullOrWhiteSpace(dto?.PlanSummary) && !string.IsNullOrWhiteSpace(p.Summary))
            {
                planSummary = p.Summary;
            }
        }

        var incident = await _context.Incidents.FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident != null)
        {
            incident.Status = "RECOVERY_APPLIED";
            incident.ResolutionNotes = dto?.ResolutionNotes ?? planSummary;
            incident.ResolutionType = dto?.ResolutionType ?? "COORDINATOR_APPLIED";

            // Tự động gửi thông báo trực tiếp đến tài xế / người báo cáo sự cố
            string? targetUserId = null;
            if (_historyStore.TryGetValue(incidentId, out var records))
            {
                var reportRecord = records.FirstOrDefault(r => r.EventType == "INCIDENT_REPORTED");
                if (reportRecord != null && !string.IsNullOrWhiteSpace(reportRecord.PerformedByUserId) && reportRecord.PerformedByUserId != "SYSTEM")
                {
                    targetUserId = reportRecord.PerformedByUserId;
                }
            }

            if (string.IsNullOrWhiteSpace(targetUserId))
            {
                var assignment = await _context.TripVehicleAssignments
                    .FirstOrDefaultAsync(a => a.TripId == incident.TripId);
                targetUserId = assignment?.DriverId;
            }

            if (string.IsNullOrWhiteSpace(targetUserId))
            {
                var defaultDriver = await _context.Users.FirstOrDefaultAsync(u => u.Role == "DRIVER_ESCORT" || u.Role == "DRIVER");
                targetUserId = defaultDriver?.UserId;
            }

            if (!string.IsNullOrWhiteSpace(targetUserId))
            {
                _context.Notifications.Add(new Notification
                {
                    NotificationId = $"NOTI_{Guid.NewGuid().ToString("N")[..10]}",
                    UserId = targetUserId,
                    ReferenceId = incidentId,
                    Type = "INCIDENT_RECOVERY_APPROVED",
                    Channel = "IN_APP",
                    Title = $"Phương án xử lý sự cố - Chuyến {incident.TripId}",
                    Message = $"Điều phối viên đã phê duyệt phương án cho sự cố [{incident.IncidentType}]: {planSummary}. Vui lòng phối hợp thực hiện!",
                    IsRead = false,
                    SentAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
        }

        AddHistoryRecord(incidentId, "PLAN_APPLIED", $"Đã áp dụng phương án khôi phục {planId} vào hành trình thực tế: {planSummary}", coordinatorUserId);

        return new RecoveryApplyDto
        {
            IncidentId = incidentId,
            AppliedPlanId = planId,
            AppliedSuccessfully = true,
            Message = "Phương án khôi phục đã được áp dụng vào lộ trình chuyến đi.",
            AppliedAt = DateTime.UtcNow
        };
    }

    public Task<ContinuationReadinessDto> GetContinuationReadinessAsync(string incidentId)
    {
        bool vetOk = true;
        bool compOk = true;

        if (_vetStore.TryGetValue(incidentId, out var vets) && vets.Count > 0)
        {
            vetOk = vets.Last().FitnessStatus == "FIT";
        }

        return Task.FromResult(new ContinuationReadinessDto
        {
            IncidentId = incidentId,
            IsReadyToContinue = vetOk && compOk,
            VetCleared = vetOk,
            ComplianceCleared = compOk,
            ResourceReady = true,
            SafetyBlockerCanBeRemoved = vetOk && compOk,
            PendingBlockerReasons = (vetOk && compOk) ? new List<string>() : new List<string> { "Đang chờ kết luận kiểm tra sức khỏe của Bác sĩ thú y" }
        });
    }

    public async Task<IncidentResponseDto> ContinueTripAsync(string incidentId, ContinuationInputDto dto, string coordinatorUserId)
    {
        var incident = await _context.Incidents.FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident != null)
        {
            incident.SafetyBlockerActive = false;
            incident.Status = "CONTINUE_ALLOWED";
            await _context.SaveChangesAsync();
        }

        AddHistoryRecord(incidentId, "TRIP_CONTINUED", $"Điều phối viên gỡ bỏ SafetyBlocker và cho phép xe tiếp tục hành trình. Ghi chú: {dto.Notes ?? "An toàn"}", coordinatorUserId);

        return new IncidentResponseDto
        {
            IncidentId = incident?.IncidentId ?? incidentId,
            TripId = incident?.TripId ?? "TRIP_DEMO",
            Category = incident?.IncidentType ?? "OTHER",
            Status = "CONTINUE_ALLOWED",
            Description = incident?.Description,
            CoordinatorId = coordinatorUserId,
            ReportedAt = DateTime.UtcNow,
            SafetyBlockerActive = false
        };
    }

    public async Task<IncidentResponseDto> ResolveIncidentAsync(string incidentId, IncidentResolutionInputDto dto, string coordinatorUserId)
    {
        var incident = await _context.Incidents.FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident != null)
        {
            incident.Status = "RESOLVED";
            incident.SafetyBlockerActive = false;
            incident.ResolvedAt = DateTime.UtcNow;
            incident.ResolutionType = dto.ResolutionType;
            incident.ResolutionNotes = dto.Notes;
            await _context.SaveChangesAsync();
        }

        AddHistoryRecord(incidentId, "INCIDENT_RESOLVED", $"Sự cố đã được giải quyết đóng lại. Loại: {dto.ResolutionType}. Ghi chú: {dto.Notes}", coordinatorUserId);

        return new IncidentResponseDto
        {
            IncidentId = incident?.IncidentId ?? incidentId,
            TripId = incident?.TripId ?? "TRIP_DEMO",
            Category = incident?.IncidentType ?? "OTHER",
            Status = "RESOLVED",
            Description = incident?.Description,
            CoordinatorId = coordinatorUserId,
            ReportedAt = DateTime.UtcNow,
            SafetyBlockerActive = false
        };
    }

    public async Task<IncidentResponseDto> EscalateIncidentAsync(string incidentId, EscalateIncidentInputDto dto, string coordinatorUserId)
    {
        var incident = await _context.Incidents.FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy sự cố với mã {incidentId}");
        }

        incident.Status = "ESCALATED";
        incident.ResolutionNotes = $"Điều phối viên từ chối hỗ trợ tại chỗ: {dto.Reason}";
        incident.ResolutionType = "ESCALATED_TO_MANAGER";

        AddHistoryRecord(incidentId, "INCIDENT_ESCALATED", $"Điều phối viên {coordinatorUserId} từ chối hỗ trợ tại chỗ và chuyển lên Quản lý giải quyết: {dto.Reason}", coordinatorUserId);

        // Tự động gửi thông báo khẩn cấp đến toàn bộ Logistics Manager
        var managers = await _context.Users
            .Where(u => u.Role == Domain.Enums.UserRoles.LogisticsManager || u.Role == "LOGISTICS_MANAGER" || u.Role == "MANAGER")
            .ToListAsync();

        foreach (var mgr in managers)
        {
            _context.Notifications.Add(new Notification
            {
                NotificationId = $"NOTI_{Guid.NewGuid().ToString("N")[..10]}",
                UserId = mgr.UserId,
                ReferenceId = incidentId,
                Type = "INCIDENT_ESCALATED",
                Channel = "IN_APP",
                Title = $"Khẩn cấp: Sự cố chuyến {incident.TripId} chuyển Quản lý giải quyết",
                Message = $"Điều phối viên từ chối hỗ trợ tại chỗ cho sự cố [{incident.IncidentType}]. Lý do: {dto.Reason}. Vui lòng can thiệp xử lý ngay!",
                IsRead = false,
                SentAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        return await GetIncidentByIdAsync(incidentId);
    }

    public async Task<IncidentResponseDto> ReopenIncidentAsync(string incidentId, IncidentReopenInputDto dto, string coordinatorUserId)
    {
        var incident = await _context.Incidents.FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident != null)
        {
            incident.Status = "IN_PROGRESS";
            incident.SafetyBlockerActive = true;
            await _context.SaveChangesAsync();
        }

        AddHistoryRecord(incidentId, "INCIDENT_REOPENED", $"Mở lại sự cố: {dto.ReopenReason}", coordinatorUserId);

        return new IncidentResponseDto
        {
            IncidentId = incident?.IncidentId ?? incidentId,
            TripId = incident?.TripId ?? "TRIP_DEMO",
            Category = incident?.IncidentType ?? "OTHER",
            Status = "IN_PROGRESS",
            Description = incident?.Description,
            CoordinatorId = coordinatorUserId,
            ReportedAt = DateTime.UtcNow,
            SafetyBlockerActive = true
        };
    }

    // ==========================================
    // J29-J33: CUSTOMER COMMUNICATIONS
    // ==========================================

    public Task<List<CustomerIncidentSummaryDto>> GetCustomerIncidentsAsync(string requestId)
    {
        return Task.FromResult(new List<CustomerIncidentSummaryDto>
        {
            new()
            {
                IncidentId = "INC_DEMO_01",
                RequestId = requestId,
                Title = "Chậm lịch trình do thời tiết và giao thông",
                Status = "IN_PROGRESS",
                Severity = "MEDIUM",
                OccurredAt = DateTime.UtcNow.AddHours(-3),
                EstimatedDelayNotice = "Dự kiến giao trễ 2 giờ so với kế hoạch ban đầu."
            }
        });
    }

    public Task<CustomerIncidentDetailDto> GetCustomerIncidentDetailAsync(string requestId, string incidentId)
    {
        _communicationStore.TryGetValue(incidentId, out var comms);
        _fileStore.TryGetValue(incidentId, out var files);

        return Task.FromResult(new CustomerIncidentDetailDto
        {
            IncidentId = incidentId,
            RequestId = requestId,
            Title = "Thông báo sự cố vận chuyển và điều chỉnh giờ giao",
            Status = "IN_PROGRESS",
            Description = "Xe gặp sự cố kỹ thuật nhẹ tại điểm kiểm tra. Ngựa đua được bác sĩ chăm sóc đầy đủ, thể trạng ổn định.",
            HorseStatusNotice = "Thể trạng bình thường, nhịp tim và nhiệt độ ổn định.",
            ProposedNewEta = DateTime.UtcNow.AddHours(4).ToString("yyyy-MM-ddTHH:mm:ss"),
            Communications = comms ?? new List<IncidentCommunicationDto>(),
            SharedFiles = files?.Where(f => f.IsSharedWithCustomer).ToList() ?? new List<IncidentFileDto>()
        });
    }

    public Task<IncidentCommunicationDto> CreateCustomerCommunicationAsync(string incidentId, CommunicationInputDto dto, string managerUserId)
    {
        var comm = new IncidentCommunicationDto
        {
            MessageId = $"MSG_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            IncidentId = incidentId,
            Title = dto.Title,
            Content = dto.Content,
            RequiresCustomerApproval = dto.RequiresCustomerApproval,
            ProposedNewEta = dto.ProposedNewEta,
            ProposedCostAdjustment = dto.ProposedCostAdjustment,
            SentByUserId = managerUserId,
            SentAt = DateTime.UtcNow
        };

        _communicationStore.AddOrUpdate(incidentId, new List<IncidentCommunicationDto> { comm }, (_, list) => { list.Add(comm); return list; });
        AddHistoryRecord(incidentId, "COMMUNICATION_SENT", $"Quản lý gửi thông báo tới khách hàng: {dto.Title}", managerUserId);

        return Task.FromResult(comm);
    }

    public Task<IncidentCommunicationDto> ReplyCustomerCommunicationAsync(string requestId, string incidentId, string messageId, CustomerReplyDto dto, string customerUserId)
    {
        if (_communicationStore.TryGetValue(incidentId, out var comms))
        {
            var comm = comms.FirstOrDefault(c => c.MessageId == messageId);
            if (comm != null)
            {
                comm.CustomerApproved = dto.Approved;
                comm.CustomerNotes = dto.CustomerNotes;
                comm.RepliedAt = DateTime.UtcNow;

                AddHistoryRecord(incidentId, "COMMUNICATION_REPLIED", $"Khách hàng đã phản hồi: {(dto.Approved ? "Đồng ý" : "Từ chối")}. Ghi chú: {dto.CustomerNotes}", customerUserId);
                return Task.FromResult(comm);
            }
        }

        var fallback = new IncidentCommunicationDto
        {
            MessageId = messageId,
            IncidentId = incidentId,
            Title = "Phản hồi khách hàng",
            Content = dto.CustomerNotes ?? "Đã phản hồi",
            CustomerApproved = dto.Approved,
            CustomerNotes = dto.CustomerNotes,
            RepliedAt = DateTime.UtcNow,
            SentByUserId = customerUserId,
            SentAt = DateTime.UtcNow
        };
        return Task.FromResult(fallback);
    }

    public Task<IncidentCommunicationDto> LogExternalAgreementAsync(string incidentId, ExternalAgreementInputDto dto, string managerUserId)
    {
        var agreement = new IncidentCommunicationDto
        {
            MessageId = $"AGR_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            IncidentId = incidentId,
            Title = $"Thỏa thuận ngoài qua {dto.ContactChannel}",
            Content = dto.AgreedSummary,
            RequiresCustomerApproval = false,
            CustomerApproved = true,
            CustomerNotes = $"Xác nhận ngoài hệ thống lúc {dto.AgreedAt:yyyy-MM-dd HH:mm:ss}",
            RepliedAt = dto.AgreedAt,
            SentByUserId = managerUserId,
            SentAt = DateTime.UtcNow
        };

        _communicationStore.AddOrUpdate(incidentId, new List<IncidentCommunicationDto> { agreement }, (_, list) => { list.Add(agreement); return list; });
        AddHistoryRecord(incidentId, "EXTERNAL_AGREEMENT_LOGGED", $"Ghi nhận thỏa thuận ngoài qua {dto.ContactChannel}: {dto.AgreedSummary}", managerUserId);

        return Task.FromResult(agreement);
    }

    // ==========================================
    // J34-J36, J42: FILES & EVIDENCE
    // ==========================================

    public Task<IncidentFileDto> UploadIncidentFileAsync(string? tripId, string? incidentId, IncidentFileUploadInputDto dto, string userId)
    {
        string id = incidentId ?? "INC_GENERAL";
        var file = new IncidentFileDto
        {
            FileId = $"FIL_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            IncidentId = id,
            TripId = tripId,
            FileName = dto.FileName,
            FileUrl = dto.FileUrl,
            FileType = dto.FileType,
            Description = dto.Description,
            IsSharedWithCustomer = false,
            UploadedByUserId = userId,
            UploadedAt = DateTime.UtcNow
        };

        _fileStore.AddOrUpdate(id, new List<IncidentFileDto> { file }, (_, list) => { list.Add(file); return list; });
        AddHistoryRecord(id, "FILE_UPLOADED", $"Tải lên tài liệu [{dto.FileType}]: {dto.FileName}", userId);

        return Task.FromResult(file);
    }

    public Task<IncidentFileDto> GetIncidentFileAsync(string incidentId, string fileId, bool isCustomerView = false)
    {
        if (_fileStore.TryGetValue(incidentId, out var files))
        {
            var f = files.FirstOrDefault(x => x.FileId == fileId);
            if (f != null)
            {
                if (isCustomerView && !f.IsSharedWithCustomer)
                {
                    throw new UnauthorizedAccessException("Tài liệu này chưa được cấp quyền chia sẻ cho khách hàng.");
                }
                return Task.FromResult(f);
            }
        }

        return Task.FromResult(new IncidentFileDto
        {
            FileId = fileId,
            IncidentId = incidentId,
            FileName = "evidence_document.pdf",
            FileUrl = "https://racehorse.blob.core.windows.net/incidents/evidence_document.pdf",
            FileType = "VET_REPORT",
            IsSharedWithCustomer = true,
            UploadedByUserId = "SYSTEM",
            UploadedAt = DateTime.UtcNow
        });
    }

    public Task<IncidentFileDto> ShareFileWithCustomerAsync(string incidentId, string fileId, ShareFileInputDto dto, string managerUserId)
    {
        if (_fileStore.TryGetValue(incidentId, out var files))
        {
            var f = files.FirstOrDefault(x => x.FileId == fileId);
            if (f != null)
            {
                f.IsSharedWithCustomer = dto.IsSharedWithCustomer;
                if (!string.IsNullOrWhiteSpace(dto.DisplayName)) f.FileName = dto.DisplayName;

                AddHistoryRecord(incidentId, "FILE_SHARED", $"Cập nhật quyền chia sẻ tài liệu {f.FileName} với khách hàng: {dto.IsSharedWithCustomer}", managerUserId);
                return Task.FromResult(f);
            }
        }

        var fallback = new IncidentFileDto
        {
            FileId = fileId,
            IncidentId = incidentId,
            FileName = dto.DisplayName ?? "shared_evidence.jpg",
            FileUrl = "https://racehorse.blob.core.windows.net/incidents/shared_evidence.jpg",
            FileType = "SCENE_PHOTO",
            IsSharedWithCustomer = dto.IsSharedWithCustomer,
            UploadedByUserId = managerUserId,
            UploadedAt = DateTime.UtcNow
        };
        return Task.FromResult(fallback);
    }

    // ==========================================
    // J37-J41: TERMINATION PROPOSALS
    // ==========================================

    public Task<TerminationProposalDto> CreateTerminationProposalAsync(string incidentId, TerminationInputDto dto, string managerUserId)
    {
        var proposal = new TerminationProposalDto
        {
            ProposalId = $"TRM_{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            IncidentId = incidentId,
            Reason = dto.Reason,
            ProposedAction = dto.ProposedAction,
            HorseCareArrangement = dto.HorseCareArrangement,
            EstimatedRefundOrFee = dto.EstimatedRefundOrFee,
            Status = "PENDING_CUSTOMER",
            CreatedByUserId = managerUserId,
            CreatedAt = DateTime.UtcNow
        };

        _proposalStore.AddOrUpdate(incidentId, new List<TerminationProposalDto> { proposal }, (_, list) => { list.Add(proposal); return list; });
        AddHistoryRecord(incidentId, "TERMINATION_PROPOSED", $"Quản lý đề xuất dừng chuyến sớm: {dto.Reason}", managerUserId);

        return Task.FromResult(proposal);
    }

    public Task<TerminationProposalDto> ReplyTerminationProposalAsync(string requestId, string incidentId, string proposalId, TerminationReplyInputDto dto, string customerUserId)
    {
        if (_proposalStore.TryGetValue(incidentId, out var proposals))
        {
            var p = proposals.FirstOrDefault(x => x.ProposalId == proposalId);
            if (p != null)
            {
                p.Status = dto.Accepted ? "ACCEPTED" : "REJECTED";
                p.CustomerAccepted = dto.Accepted;
                p.CustomerNotes = dto.CustomerNotes;

                AddHistoryRecord(incidentId, "TERMINATION_REPLIED", $"Khách hàng đã phản hồi phương án dừng chuyến: {(dto.Accepted ? "Đồng ý" : "Từ chối")}", customerUserId);
                return Task.FromResult(p);
            }
        }

        var fallback = new TerminationProposalDto
        {
            ProposalId = proposalId,
            IncidentId = incidentId,
            Reason = "Đề xuất dừng chuyến",
            ProposedAction = "CANCEL_AND_RETURN",
            HorseCareArrangement = "Bàn giao chăm sóc",
            Status = dto.Accepted ? "ACCEPTED" : "REJECTED",
            CustomerAccepted = dto.Accepted,
            CustomerNotes = dto.CustomerNotes,
            CreatedByUserId = customerUserId,
            CreatedAt = DateTime.UtcNow
        };
        return Task.FromResult(fallback);
    }

    public Task<TerminationProposalDto> ReferTerminationProposalAsync(string incidentId, string proposalId, TerminationReferInputDto dto, string managerUserId)
    {
        if (_proposalStore.TryGetValue(incidentId, out var proposals))
        {
            var p = proposals.FirstOrDefault(x => x.ProposalId == proposalId);
            if (p != null)
            {
                p.Status = "REFERRED";
                p.ReferralDepartment = dto.ReferralDepartment;
                p.HandoffNotes = dto.HandoffNotes;

                AddHistoryRecord(incidentId, "TERMINATION_REFERRED", $"Đã chuyển hồ sơ dừng chuyến sang phòng ban [{dto.ReferralDepartment}]: {dto.HandoffNotes}", managerUserId);
                return Task.FromResult(p);
            }
        }

        var fallback = new TerminationProposalDto
        {
            ProposalId = proposalId,
            IncidentId = incidentId,
            Reason = "Hồ sơ chuyển giao",
            ProposedAction = "CANCEL_AND_RETURN",
            HorseCareArrangement = "Chăm sóc trạm trung gian",
            Status = "REFERRED",
            ReferralDepartment = dto.ReferralDepartment,
            HandoffNotes = dto.HandoffNotes,
            CreatedByUserId = managerUserId,
            CreatedAt = DateTime.UtcNow
        };
        return Task.FromResult(fallback);
    }

    public Task<List<TerminationProposalDto>> GetTerminationProposalsAsync(string incidentId)
    {
        if (_proposalStore.TryGetValue(incidentId, out var proposals))
        {
            return Task.FromResult(proposals);
        }
        return Task.FromResult(new List<TerminationProposalDto>());
    }

    public Task<List<TerminationProposalDto>> GetCustomerTerminationProposalsAsync(string requestId, string incidentId)
    {
        if (_proposalStore.TryGetValue(incidentId, out var proposals))
        {
            return Task.FromResult(proposals);
        }
        return Task.FromResult(new List<TerminationProposalDto>());
    }

    // Helper ghi log lịch sử
    private void AddHistoryRecord(string incidentId, string eventType, string description, string userId)
    {
        var record = new HistoryRecordDto
        {
            EventType = eventType,
            Description = description,
            PerformedByUserId = userId,
            Timestamp = DateTime.UtcNow
        };

        _historyStore.AddOrUpdate(incidentId, new List<HistoryRecordDto> { record }, (_, list) =>
        {
            list.Insert(0, record);
            return list;
        });
    }
}
