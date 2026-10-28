using System.Text.Json;
using Application.DTOs;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public partial class CoordinatorService
    {
        // =========================================================================
        // AIR PARTNERS CRUD & FLIGHT OPERATIONS (F3-J05, J13, J20, J34..J42, J50, J54)
        // =========================================================================

        public async Task<List<AirPartnerDto>> GetAirPartnersAsync(string? status)
        {
            var query = _context.AirPartners.AsQueryable();
            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(p => p.Status == status);
            }

            var partners = await query.ToListAsync();
            return partners.Select(p => new AirPartnerDto
            {
                Id = p.PartnerId,
                Version = 1,
                Name = p.PartnerName,
                Contact = p.ContactEmail ?? "Đại diện đối tác",
                Email = p.ContactEmail ?? "contact@partner.com",
                Phone = p.ContactPhone ?? "+84901234567",
                Services = "Vận chuyển ngựa thi đấu quốc tế bằng máy bay chuyên dụng",
                Status = p.Status,
                Sample = true,
                UpdatedAt = (p.UpdatedAt ?? p.CreatedAt).ToString("yyyy-MM-dd HH:mm")
            }).ToList();
        }

        public async Task<AirPartnerDto?> GetAirPartnerDetailAsync(string partnerId)
        {
            var partner = await _context.AirPartners.FirstOrDefaultAsync(p => p.PartnerId == partnerId);
            if (partner == null) return null;

            return new AirPartnerDto
            {
                Id = partner.PartnerId,
                Version = 1,
                Name = partner.PartnerName,
                Contact = partner.ContactEmail ?? "Đại diện",
                Email = partner.ContactEmail ?? "contact@partner.com",
                Phone = partner.ContactPhone ?? "+84901234567",
                Services = "Vận chuyển ngựa quốc tế",
                Status = partner.Status,
                Sample = true,
                UpdatedAt = (partner.UpdatedAt ?? partner.CreatedAt).ToString("yyyy-MM-dd HH:mm")
            };
        }

        public async Task<AirPartnerDto> CreateAirPartnerAsync(AirPartnerInputDto dto, string userId)
        {
            string newId = "PARTNER_" + Guid.NewGuid().ToString("N")[..6].ToUpper();
            var partner = new AirPartner
            {
                PartnerId = newId,
                PartnerName = dto.Name,
                CountryCode = "VN",
                ContactEmail = dto.Email,
                ContactPhone = dto.Phone,
                Status = "ACTIVE",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AirPartners.Add(partner);
            await _context.SaveChangesAsync();

            return new AirPartnerDto
            {
                Id = partner.PartnerId,
                Version = 1,
                Name = partner.PartnerName,
                Contact = dto.Contact,
                Email = partner.ContactEmail,
                Phone = partner.ContactPhone,
                Services = dto.Services,
                Status = partner.Status,
                Sample = false,
                UpdatedAt = (partner.UpdatedAt ?? partner.CreatedAt).ToString("yyyy-MM-dd HH:mm")
            };
        }

        public async Task<AirPartnerDto> UpdateAirPartnerAsync(string partnerId, AirPartnerUpdateDto dto, string userId)
        {
            var partner = await _context.AirPartners.FirstOrDefaultAsync(p => p.PartnerId == partnerId);
            if (partner == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy đối tác hàng không {partnerId}");
            }

            partner.PartnerName = dto.Name;
            partner.ContactEmail = dto.Email;
            partner.ContactPhone = dto.Phone;
            partner.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new AirPartnerDto
            {
                Id = partner.PartnerId,
                Version = 1,
                Name = partner.PartnerName,
                Contact = dto.Contact,
                Email = partner.ContactEmail,
                Phone = partner.ContactPhone,
                Services = dto.Services,
                Status = partner.Status,
                Sample = false,
                UpdatedAt = (partner.UpdatedAt ?? partner.CreatedAt).ToString("yyyy-MM-dd HH:mm")
            };
        }

        public async Task<AirPartnerDto> UpdateAirPartnerStatusAsync(string partnerId, AirPartnerStatusDto dto, string userId)
        {
            var partner = await _context.AirPartners.FirstOrDefaultAsync(p => p.PartnerId == partnerId);
            if (partner == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy đối tác hàng không {partnerId}");
            }

            partner.Status = dto.Status;
            partner.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new AirPartnerDto
            {
                Id = partner.PartnerId,
                Version = 1,
                Name = partner.PartnerName,
                Contact = partner.ContactEmail ?? "Đại diện",
                Email = partner.ContactEmail ?? "email@partner.com",
                Phone = partner.ContactPhone ?? "+84901234567",
                Services = "Vận chuyển ngựa",
                Status = partner.Status,
                Sample = false,
                UpdatedAt = (partner.UpdatedAt ?? partner.CreatedAt).ToString("yyyy-MM-dd HH:mm")
            };
        }

        public async Task<DeletedDto> DeleteAirPartnerAsync(string partnerId)
        {
            var partner = await _context.AirPartners.FirstOrDefaultAsync(p => p.PartnerId == partnerId);
            if (partner == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy đối tác {partnerId}");
            }

            bool hasFlights = await _context.FlightCatalogs.AnyAsync(f => f.PartnerId == partnerId);
            if (hasFlights)
            {
                throw new InvalidOperationException($"CANNOT_DELETE_PARTNER: Đối tác '{partner.PartnerName}' đang có chuyến bay trong lịch catalogue!");
            }

            _context.AirPartners.Remove(partner);
            await _context.SaveChangesAsync();

            return new DeletedDto { Id = partnerId, Deleted = true };
        }

        public async Task<List<FlightServiceDto>> GetFlightCatalogAsync(string? partnerId, string? originAirport, string? destAirport)
        {
            var query = _context.FlightCatalogs.Include(f => f.Partner).Where(f => f.IsActive).AsQueryable();

            if (!string.IsNullOrEmpty(partnerId))
            {
                query = query.Where(f => f.PartnerId == partnerId);
            }

            if (!string.IsNullOrEmpty(originAirport))
            {
                query = query.Where(f => f.OriginAirportPlaceId == originAirport);
            }

            if (!string.IsNullOrEmpty(destAirport))
            {
                query = query.Where(f => f.DestAirportPlaceId == destAirport);
            }

            var items = await query.ToListAsync();

            return items.Select(f => new FlightServiceDto
            {
                ServiceId = f.ServiceId,
                CatalogVersion = 1,
                PartnerId = f.PartnerId,
                PartnerName = f.Partner?.PartnerName ?? "Hãng bay đối tác",
                Airline = f.Airline,
                ProviderFlightCode = f.ProviderFlightCode,
                OriginAirportPlaceId = f.OriginAirportPlaceId,
                OriginAirportPlaceName = f.OriginAirportPlaceId.Contains("SGN") ? "Sân bay Quốc tế Tân Sơn Nhất (SGN)" : "Sân bay Nội Bài (HAN)",
                DestAirportPlaceId = f.DestAirportPlaceId,
                DestAirportPlaceName = "Sân bay Quốc tế Narita (NRT)",
                DepartureTime = f.DepartureTime,
                ArrivalTime = f.ArrivalTime,
                DepartureTimeZone = f.DepartureTimeZone ?? "Asia/Ho_Chi_Minh",
                ArrivalTimeZone = f.ArrivalTimeZone ?? "Asia/Tokyo",
                DurationMinutes = (TimeSpan.TryParse(f.ArrivalTime, out var arr) && TimeSpan.TryParse(f.DepartureTime, out var dep)) ? (int)(arr - dep).TotalMinutes : 360,
                PriceVnd = f.PriceVnd,
                CapacityHorses = f.CapacityHorses,
                CareProvider = f.CareProvider ?? "AIRLINE",
                DirectFlight = f.DirectFlight,
                Sample = true,
                UpdatedAt = f.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            }).ToList();
        }

        public async Task<FlightServiceDto?> LookupFlightAsync(string partnerId, string providerFlightCode)
        {
            var flight = await _context.FlightCatalogs
                .Include(f => f.Partner)
                .FirstOrDefaultAsync(f =>
                    (f.PartnerId == partnerId && f.ProviderFlightCode == providerFlightCode) ||
                    f.ProviderFlightCode == providerFlightCode ||
                    f.ServiceId == providerFlightCode ||
                    f.PartnerId == partnerId);

            if (flight == null) return null;

            return new FlightServiceDto
            {
                ServiceId = flight.ServiceId,
                CatalogVersion = 1,
                PartnerId = flight.PartnerId,
                PartnerName = flight.Partner?.PartnerName ?? "Hãng bay",
                Airline = flight.Airline,
                ProviderFlightCode = flight.ProviderFlightCode,
                OriginAirportPlaceId = flight.OriginAirportPlaceId,
                OriginAirportPlaceName = flight.OriginAirportPlaceId.Contains("SGN") ? "Sân bay Quốc tế Tân Sơn Nhất (SGN)" : "Sân bay Quốc tế Nội Bài (HAN)",
                DestAirportPlaceId = flight.DestAirportPlaceId,
                DestAirportPlaceName = "Sân bay Quốc tế Narita (NRT)",
                DepartureTime = flight.DepartureTime,
                ArrivalTime = flight.ArrivalTime,
                PriceVnd = flight.PriceVnd,
                CapacityHorses = flight.CapacityHorses,
                DirectFlight = flight.DirectFlight
            };
        }

        public async Task<PlanDto> SelectFlightAsync(string tripId, FlightSelectInputDto dto, string userId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}");
            }

            string lookupCode = !string.IsNullOrEmpty(dto.ProviderFlightCode) ? dto.ProviderFlightCode : dto.ServiceId;
            var flight = await LookupFlightAsync(dto.PartnerId, lookupCode);
            if (flight == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến bay {lookupCode} của đối tác {dto.PartnerId}");
            }

            PlanDto plan = !string.IsNullOrWhiteSpace(trip.DraftPlanJson)
                ? JsonSerializer.Deserialize<PlanDto>(trip.DraftPlanJson)!
                : BuildDefaultPlanFromTrip(trip, "AIR", isDraft: true);

            plan.Flight = new FlightProposalDto
            {
                FlightVersion = 1,
                Status = "DRAFT",
                Service = flight,
                CareAcknowledged = true
            };

            trip.DraftPlanJson = JsonSerializer.Serialize(plan);
            trip.Version += 1;

            await RecordHistoryAsync(cleanTripId, trip.Version, "FLIGHT_SELECTED", userId, "COORDINATOR", $"Chọn chuyến bay {dto.ProviderFlightCode} vào kế hoạch nháp");
            await _context.SaveChangesAsync();

            return plan;
        }

        public async Task<PlanDto> SubmitFlightBudgetProposalAsync(string tripId, BudgetCommandDto dto, string userId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null) throw new KeyNotFoundException($"Không tìm thấy chuyến đi {tripId}");

            PlanDto plan = !string.IsNullOrWhiteSpace(trip.DraftPlanJson)
                ? JsonSerializer.Deserialize<PlanDto>(trip.DraftPlanJson)!
                : BuildDefaultPlanFromTrip(trip, "AIR", isDraft: true);

            if (plan.Flight != null)
            {
                plan.Flight.Status = "BUDGET_PENDING";
            }

            trip.DraftPlanJson = JsonSerializer.Serialize(plan);
            trip.Version += 1;

            await RecordHistoryAsync(cleanTripId, trip.Version, "FLIGHT_BUDGET_SUBMITTED", userId, "COORDINATOR", "Nộp riêng đề xuất ngân sách vé máy bay cho Manager duyệt");
            await _context.SaveChangesAsync();

            return plan;
        }

        public async Task<PlanDto> ManagerFlightBudgetDecisionAsync(string tripId, BudgetDecisionInputDto dto, string managerId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null) throw new KeyNotFoundException($"Không tìm thấy chuyến đi {tripId}");

            PlanDto plan = !string.IsNullOrWhiteSpace(trip.DraftPlanJson)
                ? JsonSerializer.Deserialize<PlanDto>(trip.DraftPlanJson)!
                : BuildDefaultPlanFromTrip(trip, "AIR", isDraft: true);

            if (plan.Flight != null)
            {
                plan.Flight.Status = dto.Decision == "APPROVE" ? "BUDGET_APPROVED" : "REJECTED";
            }

            trip.DraftPlanJson = JsonSerializer.Serialize(plan);
            trip.Version += 1;

            await RecordHistoryAsync(cleanTripId, trip.Version, "FLIGHT_BUDGET_DECISION", managerId, "LOGISTICS_MANAGER", $"Quản lý quyết định ngân sách chuyến bay: {dto.Decision} - {dto.Reason}");
            await _context.SaveChangesAsync();

            return plan;
        }

        public async Task<BookingDto> SaveFlightBookingV2Async(string tripId, BookingInputDto dto, string userId)
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

            // Quy định nghiệp vụ F3-J13: Phải chờ Kế hoạch được Manager APPROVED mới được đặt vé và lưu booking!
            if (trip.RouteStatus != "APPROVED")
            {
                throw new InvalidOperationException("PLAN_NOT_APPROVED: Kế hoạch và ngân sách chặng bay chưa được Manager phê duyệt! Không được phép ghi nhận mã đặt chỗ trước khi có phê duyệt.");
            }

            var currentBooking = await _context.FlightBookings
                .Where(fb => fb.TripId == cleanTripId || fb.TripId == tripId)
                .OrderByDescending(fb => fb.BookingVersion)
                .FirstOrDefaultAsync();

            int nextVersion = (currentBooking?.BookingVersion ?? 0) + 1;

            var newBooking = new FlightBooking
            {
                TripId = cleanTripId,
                BookingVersion = nextVersion,
                RouteVersionId = 120,
                ProviderName = "Nippon Cargo Airlines",
                Airline = "NCA Cargo",
                FlightNumber = "KZ-102",
                DepartureAirportCheckpointId = 101,
                ArrivalAirportCheckpointId = 201,
                DepartureAt = DateTime.UtcNow.AddDays(2).AddHours(4),
                ArrivalAt = DateTime.UtcNow.AddDays(2).AddHours(10),
                DirectFlight = true,
                BookingReference = dto.BookingRef,
                BookingConfirmed = true,
                Note = dto.Note,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.FlightBookings.Add(newBooking);
            trip.Version += 1;

            await RecordHistoryAsync(cleanTripId, trip.Version, "FLIGHT_BOOKED", userId, "COORDINATOR", $"Ghi nhận đặt vé chuyến bay thực tế thành công: Ref {dto.BookingRef}");
            await _context.SaveChangesAsync();

            return new BookingDto
            {
                BookingId = newBooking.FlightBookingId,
                PlanVersion = trip.PlanVersion,
                FlightVersion = dto.FlightVersion,
                PartnerId = "PARTNER_NCA",
                BookingRef = dto.BookingRef,
                ConfirmedHorses = dto.ConfirmedHorses,
                Source = dto.Source,
                Status = "BOOKED",
                EvidenceFileId = dto.EvidenceFileId,
                RecordedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                RecordedBy = new ActorDto { UserId = userId, Name = "Điều phối viên" }
            };
        }

        public async Task<BookingDto> CancelFlightBookingV2Async(string tripId, CancelBookingInputDto dto, string userId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null) throw new KeyNotFoundException($"Không tìm thấy chuyến đi {tripId}");

            var booking = await _context.FlightBookings.FirstOrDefaultAsync(fb => fb.FlightBookingId == dto.BookingId);
            if (booking != null)
            {
                booking.BookingConfirmed = false;
                booking.Note = $"Đã hủy: {dto.Reason} (Mã hủy: {dto.CancellationRef})";
            }

            trip.Version += 1;
            await RecordHistoryAsync(cleanTripId, trip.Version, "FLIGHT_BOOKING_CANCELLED", userId, "COORDINATOR", $"Ghi nhận hủy đặt chỗ chuyến bay: {dto.Reason}");
            await _context.SaveChangesAsync();

            return new BookingDto
            {
                BookingId = dto.BookingId,
                PlanVersion = trip.PlanVersion,
                FlightVersion = 1,
                PartnerId = "PARTNER_NCA",
                BookingRef = booking?.BookingReference ?? string.Empty,
                ConfirmedHorses = 2,
                Source = "PARTNER_REFERENCE",
                Status = "CANCELLED",
                EvidenceFileId = dto.EvidenceFileId,
                RecordedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                RecordedBy = new ActorDto { UserId = userId, Name = "Điều phối viên" }
            };
        }

        public async Task<PlanningFileDto> UploadPlanningFileAsync(string tripId, string fileName, string contentType, long size, string storagePath, string userId)
        {
            string fileId = "FILE_" + Guid.NewGuid().ToString("N")[..8].ToUpper();
            var attachment = new PlanningAttachment
            {
                FileId = fileId,
                TripId = tripId,
                FileName = fileName,
                FileType = fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? "PDF" : "IMAGE",
                ContentType = contentType,
                FileSize = size,
                StoragePath = storagePath,
                UploadedBy = userId,
                UploadedAtUtc = DateTime.UtcNow
            };

            _context.PlanningAttachments.Add(attachment);
            await _context.SaveChangesAsync();

            return new PlanningFileDto
            {
                FileId = fileId,
                FileName = fileName,
                ContentType = contentType,
                Size = (int)size,
                UploadedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                UploadedBy = new ActorDto { UserId = userId, Name = "Người upload" }
            };
        }

        public async Task<PlanningAttachment?> GetPlanningFileAsync(string tripId, string fileId)
        {
            return await _context.PlanningAttachments.FirstOrDefaultAsync(a => a.TripId == tripId && a.FileId == fileId);
        }
    }
}

