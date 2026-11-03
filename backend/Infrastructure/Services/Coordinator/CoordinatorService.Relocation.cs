using Application.DTOs;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public partial class CoordinatorService
    {
        // =========================================================================
        // PICKUP RELOCATION WORKFLOW (F3-J28..J33)
        // =========================================================================

        public async Task<PickupAccessDto> EvaluatePickupAccessAsync(string tripId, AccessInputDto dto, string userId)
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

            trip.Version += 1;
            await RecordHistoryAsync(cleanTripId, trip.Version, "PICKUP_ACCESS_EVALUATED", userId, "COORDINATOR", $"Đánh giá tiếp cận điểm đón: {dto.Result} - {dto.Proof}");

            await _context.SaveChangesAsync();

            return new PickupAccessDto
            {
                Result = dto.Result,
                Proof = dto.Proof,
                Valid = true,
                By = new ActorDto { UserId = userId, Name = "Điều phối viên" },
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
            };
        }

        public async Task<List<PickupCandidateDto>> GetRelocationCandidatesAsync(string tripId)
        {
            var facilities = await _context.PartnerFacilities
                .Where(f => f.Purposes != null && (f.Purposes.Contains("QUARANTINE") || f.Purposes.Contains("REST")))
                .ToListAsync();

            if (!facilities.Any())
            {
                facilities = await _context.PartnerFacilities.Take(5).ToListAsync();
            }

            return facilities.Select(f => new PickupCandidateDto
            {
                Place = new PlaceDto
                {
                    Id = f.FacilityId,
                    Version = 1,
                    Name = f.Name,
                    Country = f.CountryCode ?? "VN",
                    Province = f.City ?? "TP. Hồ Chí Minh",
                    Address = f.Address ?? "Địa chỉ cơ sở",
                    Geo = new GeoDto { Lat = (double)(f.Latitude ?? 10.7769m), Lng = (double)(f.Longitude ?? 106.7009m) },
                    Functions = (f.Purposes ?? "REST,QUARANTINE").Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
                    Hours = f.OperatingHours ?? "24/7",
                    Contact = f.ContactPerson ?? "Quản lý cơ sở",
                    Phone = f.ContactPhone ?? "+84901234567",
                    Status = "ACTIVE",
                    Sample = true,
                    UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                    Rest = new RestFacilitiesDto
                    {
                        ParkingStalls = 10,
                        HasWater = f.HasWaterFeed,
                        HasStabling = f.HasStabling,
                        SupportsOvernight = f.SupportsOvernight
                    }
                },
                StraightLineKm = 5.2,
                Eligible = true,
                Blockers = new List<BlockerDto>()
            }).ToList();
        }

        public async Task<PickupRelocationDto> ProposePickupRelocationAsync(string tripId, PickupProposalInputDto dto, string userId)
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

            var facility = await _context.PartnerFacilities.FirstOrDefaultAsync(f => f.FacilityId == dto.PlaceId);
            string placeName = facility?.Name ?? "Cơ sở kiểm dịch tiếp nhận";

            var relocation = new PickupRelocationProposal
            {
                RelocationId = "RELOC_" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
                TripId = cleanTripId,
                OriginalAddress = trip.Request?.Departure ?? "Địa chỉ gốc của khách",
                AccessEvaluation = "INACCESSIBLE",
                CandidatePlaceId = dto.PlaceId,
                Reason = dto.Reason,
                Status = "PROPOSED",
                ProposedBy = userId,
                ProposedAt = DateTime.UtcNow
            };

            _context.PickupRelocations.Add(relocation);
            trip.Version += 1;

            await RecordHistoryAsync(cleanTripId, trip.Version, "PICKUP_RELOCATION_PROPOSED", userId, "COORDINATOR", $"Đề xuất đổi điểm nhận tại {placeName}: {dto.Reason}");
            await _context.SaveChangesAsync();

            return new PickupRelocationDto
            {
                RelocationId = relocation.RelocationId,
                Status = relocation.Status,
                PlaceSnapshot = new PlaceDto
                {
                    Id = dto.PlaceId,
                    Version = dto.PlaceVersion,
                    Name = placeName,
                    Country = facility?.CountryCode ?? "VN",
                    Address = facility?.Address ?? "Địa chỉ cơ sở",
                    Geo = new GeoDto { Lat = (double)(facility?.Latitude ?? 10.77m), Lng = (double)(facility?.Longitude ?? 106.70m) },
                    Functions = (facility?.Purposes ?? "REST,QUARANTINE").Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
                    Hours = facility?.OperatingHours ?? "24/7",
                    Contact = facility?.ContactPerson ?? "Quản lý",
                    Phone = facility?.ContactPhone ?? string.Empty,
                    Status = "ACTIVE",
                    UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
                },
                Reason = dto.Reason,
                HandoverAt = dto.HandoverAt,
                Valid = true,
                By = new ActorDto { UserId = userId, Name = "Điều phối viên" },
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
            };
        }

        public async Task<PickupRelocationDto> ManagerRelocationDecisionAsync(string tripId, PickupDecisionInputDto dto, string managerId)
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

            var proposal = await _context.PickupRelocations.FirstOrDefaultAsync(p => p.RelocationId == dto.RelocationId);
            if (proposal == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy đề xuất đổi điểm đón có mã {dto.RelocationId}");
            }

            proposal.ManagerDecision = dto.Decision;
            proposal.ManagerDecisionBy = managerId;
            proposal.ManagerDecisionAt = DateTime.UtcNow;

            if (dto.Decision == "APPROVE")
            {
                proposal.Status = "MANAGER_APPROVED";
                await RecordHistoryAsync(cleanTripId, trip.Version, "RELOCATION_APPROVED", managerId, "LOGISTICS_MANAGER", "Quản lý đã duyệt đề xuất đổi điểm đón");
            }
            else
            {
                proposal.Status = "REJECTED";
                await RecordHistoryAsync(cleanTripId, trip.Version, "RELOCATION_REJECTED", managerId, "LOGISTICS_MANAGER", $"Quản lý từ chối đề xuất đổi điểm đón: {dto.Reason}");
            }

            trip.Version += 1;
            await _context.SaveChangesAsync();

            return new PickupRelocationDto
            {
                RelocationId = proposal.RelocationId,
                Status = proposal.Status,
                PlaceSnapshot = new PlaceDto { Id = proposal.CandidatePlaceId, Name = "Điểm đổi nhận" },
                Reason = proposal.Reason,
                HandoverAt = proposal.ProposedAt.ToString("yyyy-MM-dd HH:mm"),
                Valid = true,
                By = new ActorDto { UserId = managerId, Name = "Quản lý vận tải" },
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
            };
        }

        public async Task<PickupRelocationDto> RecordCustomerConsentAsync(string tripId, ConsentInputDto dto, string managerId)
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

            var proposal = await _context.PickupRelocations.FirstOrDefaultAsync(p => p.RelocationId == dto.RelocationId);
            if (proposal == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy đề xuất đổi điểm đón {dto.RelocationId}");
            }

            proposal.CustomerConsentMethod = dto.Channel;
            proposal.CustomerConsentNote = dto.Note;
            proposal.CustomerConsentConfirmedBy = managerId;
            proposal.CustomerConsentConfirmedAt = DateTime.UtcNow;
            proposal.Status = "CUSTOMER_CONFIRMED";

            // Khi khách hàng đã đồng ý thực tế: cập nhật điểm đón chính thức mới
            trip.EffectiveOriginPlaceId = proposal.CandidatePlaceId;
            trip.Version += 1;

            await RecordHistoryAsync(cleanTripId, trip.Version, "CUSTOMER_CONSENT_CONFIRMED", managerId, "LOGISTICS_MANAGER", $"Ghi nhận khách đồng ý đổi điểm nhận qua {dto.Channel}: {dto.Note}");
            await _context.SaveChangesAsync();

            return new PickupRelocationDto
            {
                RelocationId = proposal.RelocationId,
                Status = proposal.Status,
                PlaceSnapshot = new PlaceDto { Id = proposal.CandidatePlaceId, Name = "Điểm đổi nhận đã khách duyệt" },
                Reason = proposal.Reason,
                HandoverAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                CustomerConsent = new ConsentDto
                {
                    Channel = dto.Channel,
                    Note = dto.Note,
                    RecordedBy = new ActorDto { UserId = managerId, Name = "Quản lý vận tải" },
                    At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
                },
                Valid = true,
                By = new ActorDto { UserId = managerId, Name = "Quản lý vận tải" },
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
            };
        }

        public async Task<PickupRelocationDto> ReopenRelocationProposalAsync(string tripId, ExpectedDto dto, string userId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            trip.Version += 1;
            await RecordHistoryAsync(cleanTripId, trip.Version, "RELOCATION_REOPENED", userId, "COORDINATOR", "Mở lại quy trình tìm kiếm điểm đón thay thế");
            await _context.SaveChangesAsync();

            return new PickupRelocationDto
            {
                RelocationId = "RELOC_NEW",
                Status = "PROPOSED",
                PlaceSnapshot = new PlaceDto { Id = "PLACE_NEW", Name = "Điểm đề xuất mới" },
                Reason = "Mở lại đề xuất tìm điểm mới",
                HandoverAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                Valid = true,
                By = new ActorDto { UserId = userId, Name = "Điều phối viên" },
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
            };
        }

        public async Task<TripContextDto> SendPickupRelocationAsync(string tripId, PickupSendInputDto dto, string managerId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans
                .Include(t => t.Request)
                .Include(t => t.PickupRelocations)
                .FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            if (dto.ExpectedVersion > 0 && dto.ExpectedVersion != trip.Version)
            {
                throw new InvalidOperationException($"STALE_VERSION: Phiên bản chuyến đi đã thay đổi ({trip.Version} != {dto.ExpectedVersion}).");
            }

            var proposal = await _context.PickupRelocations.FirstOrDefaultAsync(p => p.RelocationId == dto.RelocationId && (p.TripId == cleanTripId || p.TripId == tripId));
            if (proposal == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy đề xuất đổi điểm đón có mã {dto.RelocationId}");
            }

            if (proposal.Status != "MANAGER_APPROVED")
            {
                throw new InvalidOperationException($"Chỉ có thể gửi đề xuất đã được Manager duyệt (Trạng thái hiện tại: {proposal.Status}).");
            }

            proposal.Status = "AWAITING_CUSTOMER";
            proposal.ProposalVersion = dto.ProposalVersion > 0 ? dto.ProposalVersion : proposal.ProposalVersion;
            proposal.SentAt = DateTime.UtcNow;
            proposal.SentBy = managerId;
            proposal.ScheduleImpact = "Đổi nơi nhận; Coordinator sẽ tính lại giờ đến từng điểm sau khi khách chấp nhận.";
            proposal.CustomerResponsibilities = "Khách tự đưa ngựa đến điểm tập kết và bàn giao vào giờ đã thống nhất.";

            trip.Version += 1;
            await RecordHistoryAsync(cleanTripId, trip.Version, "RELOCATION_SENT_TO_CUSTOMER", managerId, "LOGISTICS_MANAGER", $"Đã gửi đề xuất điểm đón thay thế ({proposal.RelocationId}) cho chủ đơn.");
            await _context.SaveChangesAsync();

            return await GetTripContextAsync(cleanTripId, "MANAGER");
        }

        public async Task<CustomerPickupProposalDto> GetCustomerPickupRelocationAsync(string tripId, string customerId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans
                .Include(t => t.Request)
                .Include(t => t.PickupRelocations)
                .FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            var proposal = trip.PickupRelocations?
                .Where(p => p.Status == "AWAITING_CUSTOMER" || p.Status == "CUSTOMER_CONFIRMED" || p.Status == "CUSTOMER_REJECTED")
                .OrderByDescending(p => p.ProposedAt)
                .FirstOrDefault();

            if (proposal == null)
            {
                throw new KeyNotFoundException($"Chưa có đề xuất điểm đổi nhận nào được gửi cho chuyến đi {tripId}");
            }

            var candidatePlace = await _context.PartnerFacilities.FindAsync(proposal.CandidatePlaceId);

            return new CustomerPickupProposalDto
            {
                TripId = cleanTripId,
                RequestId = trip.RequestId,
                RelocationId = proposal.RelocationId,
                ProposalVersion = proposal.ProposalVersion,
                Status = proposal.Status,
                OriginalPickup = new PlaceGeoDto
                {
                    Name = trip.Request?.Departure ?? "Điểm nhận ban đầu",
                    Address = proposal.OriginalAddress,
                    Country = "VN",
                    Geo = new GeoDto
                    {
                        Lat = (double)(trip.Request?.PickupLatitude ?? 10.7769m),
                        Lng = (double)(trip.Request?.PickupLongitude ?? 106.7009m)
                    }
                },
                ProposedPickup = new PlaceGeoDto
                {
                    Name = candidatePlace?.Name ?? "Điểm tập kết đề xuất",
                    Address = candidatePlace?.Address ?? "Địa chỉ cơ sở tập kết",
                    Country = candidatePlace?.CountryCode ?? "VN",
                    Geo = new GeoDto
                    {
                        Lat = (double)(candidatePlace?.Latitude ?? 10.78m),
                        Lng = (double)(candidatePlace?.Longitude ?? 106.71m)
                    }
                },
                HandoverAt = proposal.ProposedAt.ToString("yyyy-MM-dd HH:mm"),
                Reason = proposal.Reason,
                ScheduleImpact = proposal.ScheduleImpact ?? "Đổi nơi nhận; Coordinator sẽ tính lại lộ trình và cập nhật thời gian.",
                CostImpactVnd = 0,
                CustomerResponsibilities = proposal.CustomerResponsibilities ?? "Khách hàng tự đưa ngựa đến điểm tập kết đã thống nhất.",
                SentAt = proposal.SentAt?.ToString("yyyy-MM-dd HH:mm") ?? proposal.ProposedAt.ToString("yyyy-MM-dd HH:mm"),
                ReplyAt = proposal.CustomerReplyAt?.ToString("yyyy-MM-dd HH:mm"),
                CustomerReply = !string.IsNullOrEmpty(proposal.CustomerReplyDecision)
                    ? new CustomerReplyDto
                    {
                        Decision = proposal.CustomerReplyDecision,
                        Note = proposal.CustomerReplyNote,
                        At = proposal.CustomerReplyAt?.ToString("yyyy-MM-dd HH:mm") ?? string.Empty
                    }
                    : null
            };
        }

        public async Task<CustomerPickupProposalDto> CustomerRelocationDecisionAsync(string tripId, CustomerPickupDecisionInputDto dto, string customerId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans
                .Include(t => t.Request)
                .Include(t => t.PickupRelocations)
                .FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            var proposal = await _context.PickupRelocations.FirstOrDefaultAsync(p => p.RelocationId == dto.RelocationId && (p.TripId == cleanTripId || p.TripId == tripId));
            if (proposal == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy đề xuất đổi điểm đón có mã {dto.RelocationId}");
            }

            if (proposal.Status != "AWAITING_CUSTOMER")
            {
                throw new InvalidOperationException($"Đề xuất không ở trạng thái chờ khách hàng phản hồi (Trạng thái hiện tại: {proposal.Status}).");
            }

            string decisionUpper = dto.Decision?.Trim().ToUpperInvariant() ?? "REJECT";
            if (decisionUpper == "REJECT" && (string.IsNullOrWhiteSpace(dto.Note) || dto.Note.Trim().Length < 5))
            {
                throw new ArgumentException("Khi từ chối điểm nhận mới, khách hàng phải cung cấp lý do ít nhất 5 ký tự.");
            }

            proposal.CustomerReplyAt = DateTime.UtcNow;
            proposal.CustomerReplyDecision = decisionUpper;
            proposal.CustomerReplyNote = dto.Note;

            if (decisionUpper == "ACCEPT")
            {
                proposal.Status = "CUSTOMER_CONFIRMED";
                trip.EffectiveOriginPlaceId = proposal.CandidatePlaceId;
                trip.PlanVersion += 1;
                trip.Version += 1;
                await RecordHistoryAsync(cleanTripId, trip.Version, "CUSTOMER_ACCEPTED_RELOCATION", customerId, "CUSTOMER", $"Khách hàng đã chấp nhận điểm đón mới tại cơ sở {proposal.CandidatePlaceId}.");
            }
            else
            {
                proposal.Status = "CUSTOMER_REJECTED";
                trip.Version += 1;
                await RecordHistoryAsync(cleanTripId, trip.Version, "CUSTOMER_REJECTED_RELOCATION", customerId, "CUSTOMER", $"Khách hàng từ chối điểm đón mới: {dto.Note}");
            }

            await _context.SaveChangesAsync();

            return await GetCustomerPickupRelocationAsync(cleanTripId, customerId);
        }
    }
}

