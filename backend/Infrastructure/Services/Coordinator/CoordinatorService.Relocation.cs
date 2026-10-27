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
                    Name = f.FacilityName,
                    Country = f.Country ?? "VN",
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
            string placeName = facility?.FacilityName ?? "Cơ sở kiểm dịch tiếp nhận";

            var relocation = new PickupRelocationProposal
            {
                TripId = cleanTripId,
                OriginalAddress = trip.Request?.Departure ?? "Địa chỉ gốc của khách",
                AccessEvaluation = "INACCESSIBLE",
                CandidatePlaceId = dto.PlaceId,
                Reason = dto.Reason,
                Status = "PROPOSED",
                ProposedBy = userId,
                CreatedAtUtc = DateTime.UtcNow
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
                    Country = facility?.Country ?? "VN",
                    Address = facility?.Address ?? "Địa chỉ cơ sở",
                    Geo = new GeoDto { Lat = (double)(facility?.Latitude ?? 10.77m), Lng = (double)(facility?.Longitude ?? 106.70m) },
                    Functions = new List<string> { "QUARANTINE", "REST" },
                    Hours = facility?.OperatingHours ?? "24/7",
                    Contact = facility?.ContactPerson ?? "Quản lý",
                    Phone = facility?.ContactPhone ?? "+84901234567",
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
            proposal.ManagerDecisionAtUtc = DateTime.UtcNow;

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
                HandoverAt = proposal.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
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
            proposal.CustomerConsentRecordedBy = managerId;
            proposal.CustomerConsentRecordedAtUtc = DateTime.UtcNow;
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
    }
}

