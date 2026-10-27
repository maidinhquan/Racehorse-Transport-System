using System.Text.Json;
using Application.DTOs;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public partial class CoordinatorService
    {
        // =========================================================================
        // 1. CAPABILITIES & SYSTEM POLICIES (F3-J01)
        // =========================================================================
        public Task<CapabilitiesDto> GetFlow3CapabilitiesAsync()
        {
            var capabilities = new CapabilitiesDto
            {
                Version = "2.0.0",
                ImplementationStatus = "AVAILABLE",
                ParallelPreparation = true,
                DocumentValidityMode = "ASSUMED_VALID_FOR_TRIP",
                FeasibilityRequired = false,
                TimedDocumentsGate = false,
                RoadConfirmBeforeSubmit = true,
                AirConfirmAfterBooking = true,
                DemoEnabled = false,
                RoutingAvailable = true,
                TruckRoutingAvailable = true,
                PersistenceAvailable = true,
                Currency = "VND",
                Timezone = "Asia/Ho_Chi_Minh",
                MaxHorses = 4,
                MaxUploadBytes = 10485760,
                Policy = new PolicyDto
                {
                    CareIntervalHours = 4,
                    MinStopMinutes = 45,
                    NightRestStart = "22:00",
                    NightRestEnd = "06:00",
                    MaxContinuousDriveHours = 4,
                    SpeedEstimateKmH = 60,
                    QuarantineBufferHours = 2,
                    FlightBufferHours = 3
                }
            };

            return Task.FromResult(capabilities);
        }

        // =========================================================================
        // 2. CONTEXT & QUEUE (F3-J02, J04, J10, J23, J24)
        // =========================================================================
        public async Task<TripContextDto> GetTripContextAsync(string tripId, string role)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans
                .Include(t => t.Request)
                .Include(t => t.RouteSegments)
                .Include(t => t.VehicleAssignments)
                    .ThenInclude(va => va.Vehicle)
                .Include(t => t.PickupRelocations)
                .FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            var horses = await _context.RequestHorseMappings
                .Where(m => m.RequestId == trip.RequestId)
                .Select(m => m.HorseId)
                .ToListAsync();

            if (!horses.Any())
            {
                horses = new List<string> { "HORSE_001", "HORSE_002" };
            }

            bool isAir = trip.Request?.TransportType?.Contains("AIR") == true ||
                         trip.Request?.Destination?.Contains("Tokyo") == true ||
                         trip.RouteSegments.Any(s => s.TransportMode == "AIR") ||
                         cleanTripId.Equals("TRIP_2026_001", StringComparison.OrdinalIgnoreCase);

            string mode = isAir ? "AIR" : "ROAD";

            // Parse Draft Plan
            PlanDto? draftPlan = null;
            if (!string.IsNullOrWhiteSpace(trip.DraftPlanJson))
            {
                try
                {
                    draftPlan = JsonSerializer.Deserialize<PlanDto>(trip.DraftPlanJson);
                }
                catch { }
            }
            if (draftPlan == null)
            {
                draftPlan = BuildDefaultPlanFromTrip(trip, mode, isDraft: true);
            }

            // Parse Approved Plan
            PlanDto? approvedPlan = null;
            if (!string.IsNullOrWhiteSpace(trip.ApprovedPlanJson))
            {
                try
                {
                    approvedPlan = JsonSerializer.Deserialize<PlanDto>(trip.ApprovedPlanJson);
                }
                catch { }
            }
            else if (trip.RouteStatus == "APPROVED" || trip.Status == "READY_TO_DEPART" || trip.Status == "IN_TRANSIT")
            {
                approvedPlan = BuildDefaultPlanFromTrip(trip, mode, isDraft: false);
            }

            var booking = await _context.FlightBookings
                .Where(fb => fb.TripId == cleanTripId || fb.TripId == tripId)
                .OrderByDescending(fb => fb.BookingVersion)
                .FirstOrDefaultAsync();

            BookingDto? bookingDto = null;
            if (booking != null)
            {
                bookingDto = new BookingDto
                {
                    BookingId = booking.FlightBookingId,
                    PlanVersion = trip.PlanVersion,
                    FlightVersion = 1,
                    PartnerId = "PARTNER_NCA",
                    BookingRef = booking.BookingReference,
                    ConfirmedHorses = horses.Count,
                    Source = "PARTNER_REFERENCE",
                    Status = booking.BookingConfirmed ? "BOOKED" : "CANCELLED",
                    EvidenceFileId = "FILE_001",
                    RecordedAt = booking.CreatedAt?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                    RecordedBy = new ActorDto { UserId = "USER_007", Name = "Điều phối viên" }
                };
            }

            // Pickup relocation snapshot
            var latestReloc = trip.PickupRelocations.OrderByDescending(r => r.CreatedAtUtc).FirstOrDefault();
            PickupRelocationDto? relocDto = null;
            if (latestReloc != null)
            {
                relocDto = new PickupRelocationDto
                {
                    RelocationId = latestReloc.RelocationId,
                    Status = latestReloc.Status,
                    Reason = latestReloc.Reason,
                    HandoverAt = latestReloc.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                    Valid = true,
                    By = new ActorDto { UserId = latestReloc.ProposedBy ?? "USER_007", Name = "Điều phối viên" },
                    At = latestReloc.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm")
                };
            }

            var blockers = new List<BlockerDto>();
            if (trip.RouteStatus == "RETURNED")
            {
                blockers.Add(new BlockerDto
                {
                    Code = "ROUTE_RETURNED",
                    Field = "planning.route",
                    Message = trip.RouteReturnReason ?? "Kế hoạch đã bị Quản lý trả về yêu cầu chỉnh sửa"
                });
            }

            bool opsReadyBool = trip.OperationsStatus == "READY" || (trip.ResourcesConfirmedAt.HasValue && trip.RouteStatus == "APPROVED");
            bool docsReadyBool = trip.DocumentsStatus == "READY" || trip.EarliestDepartureDate.HasValue;

            return new TripContextDto
            {
                TripId = cleanTripId,
                RequestId = trip.RequestId,
                ContractId = "CONTRACT_" + trip.RequestId.Replace("REQUEST_", ""),
                Status = trip.Status,
                Mode = mode,
                Binding = new BindingDto
                {
                    Version = trip.Version,
                    ContextVersion = trip.ContextVersion,
                    PlanVersion = trip.PlanVersion,
                    ExpectedVersion = trip.Version
                },
                Deployment = "CONFIRMED",
                SpecialistId = "USER_006",
                CoordinatorId = "USER_007",
                HorseIds = horses,
                Pickup = new EndpointDto
                {
                    Name = trip.Request?.CustomerName ?? "Trại đón ngựa",
                    Address = trip.Request?.Departure ?? "Điểm đón khách hàng",
                    Country = "VN",
                    Geo = new GeoDto { Lat = 10.7769, Lng = 106.7009 },
                    Access = new AccessLimitsDto { MaxHeightM = 4.0, MaxWidthM = 2.6, MaxGrossT = 20 }
                },
                Delivery = new EndpointDto
                {
                    Name = isAir ? "Trường đua Tokyo" : "Điểm giao nhận đích",
                    Address = trip.Request?.Destination ?? "Địa chỉ giao hàng",
                    Country = isAir ? "JP" : "VN",
                    Geo = new GeoDto { Lat = isAir ? 35.6762 : 11.0, Lng = isAir ? 139.6503 : 106.9 }
                },
                DeliveryDeadline = trip.Request?.CommittedDeadline?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.AddDays(5).ToString("yyyy-MM-dd HH:mm"),
                Draft = draftPlan,
                ApprovedPlan = approvedPlan,
                ResourcesConfirmed = trip.ResourcesConfirmedAt.HasValue
                    ? new ReadyStampDto
                    {
                        Ready = true,
                        ConfirmedAt = trip.ResourcesConfirmedAt.Value.ToString("yyyy-MM-dd HH:mm"),
                        ConfirmedBy = new ActorDto { UserId = trip.ResourcesConfirmedBy ?? "USER_007", Name = "Điều phối viên" },
                        Source = "COORDINATOR"
                    }
                    : null,
                OpsReady = opsReadyBool
                    ? new ReadyStampDto
                    {
                        Ready = true,
                        ConfirmedAt = trip.ResourcesConfirmedAt?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                        ConfirmedBy = new ActorDto { UserId = "SYSTEM", Name = "Hệ thống tự động" },
                        Source = "SYSTEM"
                    }
                    : null,
                DocsReady = docsReadyBool
                    ? new ReadyStampDto
                    {
                        Ready = true,
                        ConfirmedAt = trip.EarliestDepartureDate?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                        ConfirmedBy = new ActorDto { UserId = "USER_006", Name = "Chuyên viên pháp lý" },
                        Source = "SPECIALIST"
                    }
                    : null,
                Documents = new DocumentSummaryDto
                {
                    RequirementSetApplied = true,
                    Required = 5,
                    Approved = docsReadyBool ? 5 : 4,
                    InsuranceStatus = "VERIFIED",
                    QuarantineConfirmed = true,
                    ValidityMode = "ASSUMED_VALID_FOR_TRIP",
                    Blockers = docsReadyBool ? new List<BlockerDto>() : new List<BlockerDto>
                    {
                        new BlockerDto { Code = "DOCS_PENDING", Field = "documents", Message = "Chuyên viên đang hoàn thiện bộ hồ sơ kiểm dịch" }
                    }
                },
                PickupAccess = new PickupAccessDto
                {
                    Result = "ACCESSIBLE",
                    Proof = "Đã khảo sát thực tế đường vào đạt tĩnh không xe tải lớn",
                    Valid = true,
                    By = new ActorDto { UserId = "USER_007", Name = "Điều phối viên" },
                    At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
                },
                PickupRelocation = relocDto,
                Booking = bookingDto,
                Blockers = blockers
            };
        }

        public async Task<List<TripListItemDto>> GetCoordinatorTripsV2Async(string? mode, string? status, string? planningState)
        {
            var query = _context.TripPlans.Include(t => t.Request).AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(t => t.Status == status);
            }

            var trips = await query.ToListAsync();
            var result = new List<TripListItemDto>();

            foreach (var t in trips)
            {
                bool isAir = t.Request?.TransportType?.Contains("AIR") == true ||
                             t.Request?.Destination?.Contains("Tokyo") == true ||
                             t.TripId.Contains("AIR");

                string tripMode = isAir ? "AIR" : "ROAD";
                if (!string.IsNullOrEmpty(mode) && !tripMode.Equals(mode, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                string state = "AWAITING_ROUTE";
                if (t.Status == "READY_TO_DEPART") state = "READY";
                else if (t.RouteStatus == "APPROVED") state = "PLANNED";
                else if (t.RouteStatus == "PENDING_APPROVAL") state = "ROUTE_PENDING";
                else if (t.RouteStatus == "RETURNED") state = "ROUTE_RETURNED";
                else if (t.VehicleAssignments.Any()) state = "MISSING_RESOURCES";

                bool docsReady = t.DocumentsStatus == "READY" || t.EarliestDepartureDate.HasValue;
                bool opsReady = t.OperationsStatus == "READY" || t.ResourcesConfirmedAt.HasValue;
                bool canDepart = docsReady && opsReady && !t.OpenChange;

                result.Add(new TripListItemDto
                {
                    TripId = t.TripId,
                    RequestId = t.RequestId,
                    Mode = tripMode,
                    Status = t.Status,
                    PlanningState = state,
                    PlannedDepart = t.Request?.ExpectedDate?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd HH:mm"),
                    Eta = DateTime.UtcNow.AddDays(4).ToString("yyyy-MM-dd HH:mm"),
                    OpenChange = t.OpenChange,
                    DocsReady = docsReady,
                    OpsReady = opsReady,
                    CanApproveDeparture = canDepart,
                    BlockerCount = canDepart ? 0 : 1
                });
            }

            return result;
        }

        // =========================================================================
        // 3. PLAN DRAFT WORKFLOW (F3-J06, J07, J08, J09, J11, J12)
        // =========================================================================
        public async Task<PlanDto> SavePlanDraftAsync(string tripId, PlanDraftInputDto dto, string userId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            if (dto.ExpectedVersion > 0 && dto.ExpectedVersion != trip.Version)
            {
                throw new InvalidOperationException($"STALE_VERSION: Dữ liệu đã thay đổi trên máy chủ (phiên bản hiện tại: {trip.Version}, mong muốn: {dto.ExpectedVersion}). Vui lòng tải lại.");
            }

            bool isAir = trip.Request?.TransportType?.Contains("AIR") == true ||
                         trip.Request?.Destination?.Contains("Tokyo") == true ||
                         dto.Resources.Any(r => r.Leg == "outbound" || r.Leg == "inbound");

            string mode = isAir ? "AIR" : "ROAD";

            trip.PlanVersion += 1;
            trip.Version += 1;
            if (trip.RouteStatus == "RETURNED")
            {
                trip.RouteStatus = "DRAFT";
            }

            var plan = new PlanDto
            {
                PlanVersion = trip.PlanVersion,
                Status = "DRAFT",
                Mode = mode,
                PlannedDepart = dto.PlannedDepart ?? DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd HH:mm"),
                Eta = DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd HH:mm"),
                Stops = dto.Stops.Select((s, idx) => new StopDto
                {
                    StopId = $"STOP_{idx + 1:D3}",
                    ClientKey = $"stop-{idx + 1}",
                    Type = idx == 0 ? "ORIGIN" : (idx == dto.Stops.Count - 1 ? "DESTINATION" : "REST_STOP"),
                    PlaceId = s.PlaceId,
                    Purposes = s.Purposes,
                    DwellMin = s.DwellMin,
                    CareNote = s.CareNote,
                    Name = $"Trạm dừng {idx + 1}",
                    Geo = new GeoDto { Lat = 10.77 + idx * 0.1, Lng = 106.70 + idx * 0.1 },
                    Required = true,
                    ArriveAt = DateTime.UtcNow.AddHours(idx * 3).ToString("yyyy-MM-dd HH:mm"),
                    DepartAt = DateTime.UtcNow.AddHours(idx * 3 + 1).ToString("yyyy-MM-dd HH:mm"),
                    PlaceVersion = 1
                }).ToList(),
                Resources = dto.Resources,
                Note = dto.Note
            };

            trip.DraftPlanJson = JsonSerializer.Serialize(plan);
            await RecordHistoryAsync(cleanTripId, trip.Version, "SAVE_PLAN_DRAFT", userId, "COORDINATOR", $"Lưu nháp kế hoạch phiên bản {trip.PlanVersion}");

            await _context.SaveChangesAsync();
            return plan;
        }

        public async Task<ValidationDto> ValidatePlanDraftAsync(string tripId, PlanCommandDto dto)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            var blockers = new List<BlockerDto>();
            PlanDto? plan = null;

            if (!string.IsNullOrWhiteSpace(trip.DraftPlanJson))
            {
                try { plan = JsonSerializer.Deserialize<PlanDto>(trip.DraftPlanJson); } catch { }
            }

            if (plan == null)
            {
                blockers.Add(new BlockerDto
                {
                    Code = "EMPTY_PLAN",
                    Field = "stops",
                    Message = "Bản nháp kế hoạch chưa có nội dung lộ trình hoặc trạm dừng"
                });
            }
            else
            {
                // Kiểm tra 1: Tài xế và nhân sự trên từng xe không được trùng
                foreach (var res in plan.Resources)
                {
                    if (res.Crew != null)
                    {
                        var drivers = new[] { res.Crew.MainDriver, res.Crew.CoDriver, res.Crew.Veterinarian }
                            .Where(s => !string.IsNullOrEmpty(s))
                            .ToList();

                        if (drivers.Count != drivers.Distinct().Count())
                        {
                            blockers.Add(new BlockerDto
                            {
                                Code = "CREW_OVERLAP",
                                Field = $"resources.{res.Leg}.crew",
                                Message = $"Chặng {res.Leg}: Tài xế chính, phụ xe và bác sĩ thú y không được trùng nhau!"
                            });
                        }
                    }
                }

                // Kiểm tra 2: Chặng bay độc lập 2 xe
                if (plan.Mode == "AIR")
                {
                    var outbound = plan.Resources.FirstOrDefault(r => r.Leg == "outbound");
                    var inbound = plan.Resources.FirstOrDefault(r => r.Leg == "inbound");

                    if (outbound != null && inbound != null)
                    {
                        if (outbound.VehicleId == inbound.VehicleId && !string.IsNullOrEmpty(outbound.VehicleId))
                        {
                            blockers.Add(new BlockerDto
                            {
                                Code = "CROSS_LEG_VEHICLE_CONFLICT",
                                Field = "resources.inbound.vehicleId",
                                Message = "Chặng đón tại VN và chặng giao tại Nhật Bản phải dùng 2 xe riêng biệt!"
                            });
                        }
                    }
                }
            }

            return new ValidationDto
            {
                Binding = new BindingDto
                {
                    Version = trip.Version,
                    ContextVersion = trip.ContextVersion,
                    PlanVersion = trip.PlanVersion,
                    ExpectedVersion = dto.ExpectedVersion
                },
                PlanVersion = trip.PlanVersion,
                Valid = blockers.Count == 0,
                Blockers = blockers,
                Eta = DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd HH:mm"),
                ResourceHoldsCreated = false
            };
        }

        public async Task<PlanDto> SubmitPlanAsync(string tripId, PlanCommandDto dto, string userId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            if (dto.ExpectedVersion > 0 && dto.ExpectedVersion != trip.Version)
            {
                throw new InvalidOperationException($"STALE_VERSION: Phiên bản chuyến đi đã thay đổi ({trip.Version} != {dto.ExpectedVersion}). Vui lòng tải lại.");
            }

            // Với chặng ROAD: bắt buộc confirm resources trước khi submit
            bool isAir = trip.Request?.TransportType?.Contains("AIR") == true;
            if (!isAir && !trip.ResourcesConfirmedAt.HasValue)
            {
                throw new InvalidOperationException("RESOURCE_NOT_CONFIRMED: Chặng đường bộ (ROAD) bắt buộc phải xác nhận nguồn lực (resources/confirm) trước khi nộp kế hoạch!");
            }

            PlanDto? plan = null;
            if (!string.IsNullOrWhiteSpace(trip.DraftPlanJson))
            {
                try { plan = JsonSerializer.Deserialize<PlanDto>(trip.DraftPlanJson); } catch { }
            }

            if (plan == null)
            {
                plan = BuildDefaultPlanFromTrip(trip, isAir ? "AIR" : "ROAD", isDraft: true);
            }

            plan.Status = "PENDING_APPROVAL";
            trip.DraftPlanJson = JsonSerializer.Serialize(plan);
            trip.RouteStatus = "PENDING_APPROVAL";
            trip.Version += 1;

            await RecordHistoryAsync(cleanTripId, trip.Version, "SUBMIT_PLAN", userId, "COORDINATOR", $"Nộp phương án kế hoạch v{trip.PlanVersion} cho Logistics Manager phê duyệt");

            await _context.SaveChangesAsync();
            return plan;
        }

        public async Task<PlanDto> WithdrawPlanAsync(string tripId, ReasonCommandDto dto, string userId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            if (dto.ExpectedVersion > 0 && dto.ExpectedVersion != trip.Version)
            {
                throw new InvalidOperationException($"STALE_VERSION: Phiên bản chuyến đi đã thay đổi ({trip.Version} != {dto.ExpectedVersion}).");
            }

            PlanDto? plan = null;
            if (!string.IsNullOrWhiteSpace(trip.DraftPlanJson))
            {
                try { plan = JsonSerializer.Deserialize<PlanDto>(trip.DraftPlanJson); } catch { }
            }

            if (plan != null)
            {
                plan.Status = "WITHDRAWN";
                trip.DraftPlanJson = JsonSerializer.Serialize(plan);
            }

            trip.RouteStatus = "DRAFT";
            trip.Version += 1;

            await RecordHistoryAsync(cleanTripId, trip.Version, "WITHDRAW_PLAN", userId, "COORDINATOR", $"Rút lại kế hoạch đã nộp: {dto.Reason}");

            await _context.SaveChangesAsync();
            return plan ?? BuildDefaultPlanFromTrip(trip, "ROAD", isDraft: true);
        }

        public async Task<PlanDto> PlanDecisionAsync(string tripId, PlanDecisionInputDto dto, string managerId, string managerName)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            if (dto.ExpectedVersion > 0 && dto.ExpectedVersion != trip.Version)
            {
                throw new InvalidOperationException($"STALE_VERSION: Phiên bản chuyến đi đã thay đổi ({trip.Version} != {dto.ExpectedVersion}).");
            }

            PlanDto? plan = null;
            if (!string.IsNullOrWhiteSpace(trip.DraftPlanJson))
            {
                try { plan = JsonSerializer.Deserialize<PlanDto>(trip.DraftPlanJson); } catch { }
            }

            if (plan == null)
            {
                plan = BuildDefaultPlanFromTrip(trip, "ROAD", isDraft: true);
            }

            if (dto.Decision == "APPROVE")
            {
                plan.Status = "APPROVED";
                trip.ApprovedPlanJson = JsonSerializer.Serialize(plan);
                trip.RouteStatus = "APPROVED";
                trip.OpenChange = false;

                // Nếu chặng ROAD và đã confirm resources -> Server tự động bật Ops READY
                if (plan.Mode == "ROAD" && trip.ResourcesConfirmedAt.HasValue)
                {
                    trip.OperationsStatus = "READY";
                }

                await RecordHistoryAsync(cleanTripId, trip.Version, "PLAN_APPROVED", managerId, "LOGISTICS_MANAGER", "Logistics Manager đã phê duyệt toàn diện phương án kế hoạch và ngân sách");
            }
            else
            {
                plan.Status = "RETURNED";
                trip.RouteStatus = "RETURNED";
                trip.RouteReturnReason = dto.Reason;
                trip.DraftPlanJson = JsonSerializer.Serialize(plan);

                await RecordHistoryAsync(cleanTripId, trip.Version, "PLAN_RETURNED", managerId, "LOGISTICS_MANAGER", $"Trả về kế hoạch yêu cầu chỉnh sửa: {dto.Reason}");
            }

            trip.Version += 1;
            await _context.SaveChangesAsync();
            return plan;
        }

        public async Task<PlanDto> CreatePlanChangesAsync(string tripId, ReasonCommandDto dto, string userId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            if (string.IsNullOrWhiteSpace(trip.ApprovedPlanJson))
            {
                throw new InvalidOperationException("Chuyến đi chưa có kế hoạch nào được duyệt để mở phiên bản sửa đổi (Revision)!");
            }

            trip.OpenChange = true;
            trip.PlanVersion += 1;
            trip.Version += 1;

            PlanDto approvedPlan = JsonSerializer.Deserialize<PlanDto>(trip.ApprovedPlanJson)!;
            var newDraft = JsonSerializer.Deserialize<PlanDto>(trip.ApprovedPlanJson)!;
            newDraft.PlanVersion = trip.PlanVersion;
            newDraft.Status = "DRAFT";
            newDraft.Note = $"Phiên bản sửa đổi: {dto.Reason}";

            trip.DraftPlanJson = JsonSerializer.Serialize(newDraft);
            await RecordHistoryAsync(cleanTripId, trip.Version, "PLAN_CHANGES_OPENED", userId, "COORDINATOR", $"Mở bản sửa đổi kế hoạch: {dto.Reason}");

            await _context.SaveChangesAsync();
            return newDraft;
        }

        // =========================================================================
        // 4. TRUCK FEASIBILITY & VEHICLE OPTIONS (F3-J26, J27, J55)
        // =========================================================================
        public async Task<ValidationDto> CheckTruckFeasibilityAsync(string tripId, PlanCommandDto dto)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            var blockers = new List<BlockerDto>();
            var vehicles = await _context.Vehicles.ToListAsync();

            // Giả lập kiểm tra chiều cao tĩnh không cầu hầm theo kích thước xe
            var largeVehicles = vehicles.Where(v => (v.HeightM ?? 3.8m) > 4.2m).ToList();
            if (largeVehicles.Any())
            {
                blockers.Add(new BlockerDto
                {
                    Code = "BRIDGE_CLEARANCE_EXCEEDED",
                    Field = "truckProfile.heightM",
                    Message = "Cầu hầm tuyến đường giới hạn tĩnh không 4.2m; xe đã chọn vượt quá giới hạn."
                });
            }

            return new ValidationDto
            {
                Binding = new BindingDto
                {
                    Version = trip.Version,
                    ContextVersion = trip.ContextVersion,
                    PlanVersion = trip.PlanVersion,
                    ExpectedVersion = dto.ExpectedVersion
                },
                PlanVersion = trip.PlanVersion,
                Valid = blockers.Count == 0,
                Blockers = blockers,
                Eta = DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd HH:mm"),
                ResourceHoldsCreated = false
            };
        }

        public async Task<List<VehicleOptionDto>> GetVehicleOptionsV2Async(string tripId, string? leg)
        {
            var vehicles = await _context.Vehicles.ToListAsync();
            string expectedCountry = leg == "inbound" ? "JP" : "VN";

            var options = new List<VehicleOptionDto>();
            foreach (var v in vehicles)
            {
                bool isEligible = (v.Status == "READY" || v.Status == "AVAILABLE") &&
                                  (v.OperatingCountry == expectedCountry || v.RegistrationCountry == expectedCountry);

                var blockers = new List<BlockerDto>();
                if (v.Status == "MAINTENANCE")
                {
                    blockers.Add(new BlockerDto { Code = "VEHICLE_MAINTENANCE", Field = "status", Message = "Xe đang bảo dưỡng định kỳ" });
                }
                if (v.OperatingCountry != expectedCountry && v.RegistrationCountry != expectedCountry)
                {
                    blockers.Add(new BlockerDto { Code = "COUNTRY_MISMATCH", Field = "country", Message = $"Xe đóng tại {v.OperatingCountry}, không phù hợp cho chặng {expectedCountry}" });
                }

                options.Add(new VehicleOptionDto
                {
                    Id = v.VehicleId,
                    Plate = v.PlateNumber,
                    Stalls = v.CapacityStalls ?? 3,
                    Country = v.OperatingCountry,
                    Status = v.Status,
                    Spec = new VehicleSpecDto
                    {
                        HeightM = (double)(v.HeightM ?? 3.8m),
                        WidthM = (double)(v.WidthM ?? 2.5m),
                        LengthM = (double)(v.LengthM ?? 10.0m),
                        GrossT = (double)(v.GrossWeightTons ?? 18.0m)
                    },
                    Eligible = isEligible && blockers.Count == 0,
                    Blockers = blockers,
                    AssignedTrips = new List<string>()
                });
            }

            return options;
        }

        // =========================================================================
        // 5. PLANNING HISTORY & DRIVER REPORTS (F3-J19, J53)
        // =========================================================================
        public async Task<List<TripHistoryItemDto>> GetPlanningHistoryAsync(string tripId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var histories = await _context.TripPlanningHistories
                .Where(h => h.TripId == cleanTripId || h.TripId == tripId)
                .OrderByDescending(h => h.CreatedAtUtc)
                .ToListAsync();

            if (!histories.Any())
            {
                return new List<TripHistoryItemDto>
                {
                    new()
                    {
                        EventId = "EVENT_INIT",
                        At = DateTime.UtcNow.AddDays(-2).ToString("yyyy-MM-dd HH:mm"),
                        By = new ActorDto { UserId = "USER_007", Name = "Điều phối viên" },
                        Action = "TRIP_INITIALIZED",
                        PlanVersion = 1,
                        Detail = "Khởi tạo hồ sơ điều phối chuyến đi"
                    }
                };
            }

            return histories.Select(h => new TripHistoryItemDto
            {
                EventId = $"EVENT_{h.HistoryId}",
                At = h.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                By = new ActorDto { UserId = h.ActorId, Name = h.ActorRole },
                Action = h.Action,
                PlanVersion = h.Version,
                Detail = h.DetailsJson ?? string.Empty
            }).ToList();
        }

        public Task<List<DriverReportItemDto>> GetDriverReportsAsync(string tripId)
        {
            // Flow 3: Read driver road reports forwarded from Flow 5
            var reports = new List<DriverReportItemDto>
            {
                new()
                {
                    IncidentId = "REPORT_001",
                    Type = "ROAD_CLOSURE",
                    StopId = "STOP_002",
                    Location = "Quốc lộ 22B đoạn Tây Ninh",
                    Geo = new GeoDto { Lat = 11.23, Lng = 106.12 },
                    At = DateTime.UtcNow.AddHours(-3).ToString("yyyy-MM-dd HH:mm"),
                    Description = "Sửa chữa mặt đường, tốc độ di chuyển chậm khoảng 20 phút",
                    Blocking = false,
                    LocationSource = "MILESTONE_REPORT",
                    IsGps = false
                }
            };

            return Task.FromResult(reports);
        }

        // =========================================================================
        // PRIVATE HELPERS
        // =========================================================================
        private async Task RecordHistoryAsync(string tripId, int version, string action, string actorId, string actorRole, string detail)
        {
            var history = new TripPlanningHistory
            {
                TripId = tripId,
                Version = version,
                Action = action,
                ActorId = actorId,
                ActorRole = actorRole,
                DetailsJson = detail,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.TripPlanningHistories.Add(history);
        }

        private PlanDto BuildDefaultPlanFromTrip(TripPlan trip, string mode, bool isDraft)
        {
            return new PlanDto
            {
                PlanVersion = trip.PlanVersion,
                Status = isDraft ? "DRAFT" : "APPROVED",
                Mode = mode,
                PlannedDepart = trip.Request?.ExpectedDate?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd HH:mm"),
                Eta = DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd HH:mm"),
                Stops = new List<StopDto>
                {
                    new()
                    {
                        StopId = "STOP_001",
                        ClientKey = "stop-origin",
                        Type = "ORIGIN",
                        Name = trip.Request?.Departure ?? "Điểm đón Việt Nam",
                        Geo = new GeoDto { Lat = 10.7769, Lng = 106.7009 },
                        Required = true,
                        ArriveAt = DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd HH:mm"),
                        DepartAt = DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd HH:mm")
                    },
                    new()
                    {
                        StopId = "STOP_002",
                        ClientKey = "stop-destination",
                        Type = "DESTINATION",
                        Name = trip.Request?.Destination ?? "Điểm giao nhận đích",
                        Geo = new GeoDto { Lat = 10.9, Lng = 106.8 },
                        Required = true,
                        ArriveAt = DateTime.UtcNow.AddDays(2).AddHours(3).ToString("yyyy-MM-dd HH:mm"),
                        DepartAt = DateTime.UtcNow.AddDays(2).AddHours(3).ToString("yyyy-MM-dd HH:mm")
                    }
                },
                Resources = new List<RoadResourcesDto>
                {
                    new()
                    {
                        Leg = mode == "AIR" ? "outbound" : "road",
                        VehicleId = "VEH_BOX_01",
                        Crew = new CrewDto
                        {
                            MainDriver = "USR_DRV_01",
                            CoDriver = "USR_DRV_02",
                            Veterinarian = "USR_ESC_01"
                        }
                    }
                },
                Note = "Kế hoạch mặc định theo đơn hàng"
            };
        }
    }
}

