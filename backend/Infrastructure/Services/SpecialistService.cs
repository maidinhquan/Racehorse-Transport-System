using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public class SpecialistService : ISpecialistService
    {
        private readonly HorseTransportDbContext _context;

        public SpecialistService(HorseTransportDbContext context)
        {
            _context = context;
        }

        // =========================================================================
        // 1. TRIPS & CONTEXT
        // =========================================================================

        public async Task<List<SpecTripDto>> GetTripsAsync(string userId, string role)
        {
            var query = _context.TripPlans
                .Include(t => t.Request)
                    .ThenInclude(r => r!.Customer)
                .Include(t => t.Request)
                    .ThenInclude(r => r!.RequestHorseMappings)
                        .ThenInclude(m => m.Horse)
                .Include(t => t.Insurances)
                .Include(t => t.RequirementSets)
                .Include(t => t.CheckpointClearances)
                .AsQueryable();

            if (role == "TRANSPORT_SPECIALIST" && !string.IsNullOrEmpty(userId))
            {
                query = query.Where(t => t.Status == "PLANNING" || t.Status == "SCHEDULED" || t.Status == "IN_TRANSIT" || t.Status == "COMPLETED" || t.Status == "CONFIRMED");
            }

            var trips = await query.ToListAsync();
            var result = new List<SpecTripDto>();

            foreach (var t in trips)
            {
                var req = t.Request;
                var horses = req?.RequestHorseMappings?.Select(m => new SpecHorseDto
                {
                    Id = m.HorseId,
                    Name = m.Horse?.Name ?? m.HorseId,
                    Microchip = m.Horse?.MicrochipIso ?? string.Empty,
                    PassportNo = m.Horse?.FeiPassportNo ?? string.Empty
                }).ToList() ?? new List<SpecHorseDto>();

                // ReqSet snapshot
                ReqSetSnapshotDto? reqSetDto = null;
                var latestReqSet = t.RequirementSets?.OrderByDescending(r => r.AppliedAtUtc).FirstOrDefault();
                if (latestReqSet != null && !string.IsNullOrEmpty(latestReqSet.SnapshotJson))
                {
                    try
                    {
                        reqSetDto = JsonSerializer.Deserialize<ReqSetSnapshotDto>(latestReqSet.SnapshotJson);
                    }
                    catch { /* Use null if unparseable */ }
                }

                // Insurance
                InsuranceDto? insDto = null;
                var latestIns = t.Insurances?.OrderByDescending(i => i.CreatedAtUtc).FirstOrDefault();
                if (latestIns != null)
                {
                    insDto = new InsuranceDto
                    {
                        Insurer = latestIns.Insurer,
                        Policy = latestIns.PolicyNumber,
                        ValidFrom = latestIns.ValidFrom.ToString("yyyy-MM-dd"),
                        ValidTo = latestIns.ValidTo.ToString("yyyy-MM-dd"),
                        Coverage = latestIns.CoverageAmount,
                        Status = latestIns.Status,
                        CheckedBy = latestIns.CheckedBy,
                        CheckedAt = latestIns.CheckedAtUtc?.ToString("yyyy-MM-dd HH:mm")
                    };
                }

                // Checkpoints
                var checkpoints = t.CheckpointClearances?.OrderBy(c => c.CheckpointIndex).Select(c => new RouteCheckpointDto
                {
                    Name = c.CheckpointName,
                    Type = "QUARANTINE_STATION",
                    Country = "VN",
                    PlannedAt = c.ClearedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                    ArrivedAt = c.ClearedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                    Clearance = new ClearanceDetailDto
                    {
                        Result = c.Result,
                        At = c.ClearedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                        Ref = c.RefNumber ?? string.Empty,
                        By = c.ClearedBy
                    }
                }).ToList() ?? new List<RouteCheckpointDto>();

                result.Add(new SpecTripDto
                {
                    Id = t.TripId,
                    RequestId = t.RequestId,
                    CustomerName = req?.Customer?.FullName ?? "Khách hàng",
                    Origin = req?.Departure ?? "Việt Nam",
                    Destination = req?.Destination ?? "Việt Nam",
                    OriginCountry = req?.Departure != null && (req.Departure.ToUpper().Contains("JAPAN") || req.Departure.ToUpper().Contains("JP")) ? "JP" : "VN",
                    DestCountry = req?.Destination != null && (req.Destination.ToUpper().Contains("JAPAN") || req.Destination.ToUpper().Contains("JP")) ? "JP" : "VN",
                    Mode = req?.TransportType ?? "ROAD",
                    Status = t.Status,
                    Deployment = t.DeploymentStatus ?? "CONFIRMED",
                    PlannedDepart = req?.ExpectedDate?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                    Eta = req?.CommittedDeadline?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd HH:mm"),
                    Horses = horses,
                    ReqSet = reqSetDto,
                    DocsReady = t.DocsReadyAtUtc.HasValue ? new DocsReadyDto
                    {
                        At = t.DocsReadyAtUtc.Value.ToString("yyyy-MM-dd HH:mm"),
                        By = t.DocsReadyBy ?? "Specialist"
                    } : null,
                    Insurance = insDto,
                    Checkpoints = checkpoints
                });
            }

            return result;
        }

        // =========================================================================
        // 2. CUSTOMER DOCUMENTS
        // =========================================================================

        public async Task<List<CustomerDocDto>> GetCustomerDocsAsync(string? tripId = null)
        {
            var query = _context.TripPlans
                .Include(t => t.Request)
                    .ThenInclude(r => r!.RequestHorseMappings)
                        .ThenInclude(m => m.Horse)
                .AsQueryable();

            if (!string.IsNullOrEmpty(tripId))
            {
                query = query.Where(t => t.TripId == tripId);
            }

            var trips = await query.ToListAsync();
            var result = new List<CustomerDocDto>();

            var openRequests = await _context.DocumentRequests
                .Where(r => r.Status == "OPEN")
                .ToListAsync();

            var legalRecords = await _context.LegalMedicalRecords.ToListAsync();

            foreach (var t in trips)
            {
                var req = t.Request;
                if (req?.RequestHorseMappings == null) continue;

                foreach (var map in req.RequestHorseMappings)
                {
                    var h = map.Horse;
                    if (h == null) continue;

                    // 1. Passport
                    var passReq = openRequests.FirstOrDefault(r => r.TripId == t.TripId && r.Scope == h.HorseId && r.KeyName == "passport");
                    var passRecord = legalRecords.FirstOrDefault(r => r.RequestId == req.RequestId && r.HorseId == h.HorseId && (r.DocumentType == "PASSPORT" || r.DocumentType == "DT-1"));
                    result.Add(new CustomerDocDto
                    {
                        TripId = t.TripId,
                        Key = "passport",
                        Scope = h.HorseId,
                        Status = passReq != null ? "ACTION_REQUIRED" : (passRecord?.DocumentStatus ?? (!string.IsNullOrEmpty(h.PassportScanUrl) ? "APPROVED" : "MISSING")),
                        Optional = false,
                        File = passRecord?.UploadedFileUrl ?? h.PassportScanUrl,
                        Note = !string.IsNullOrEmpty(h.FeiPassportNo) ? $"Số hộ chiếu: {h.FeiPassportNo}" : "Hộ chiếu ngựa",
                        Issue = passReq?.Reason,
                        Expiry = h.PassportExpiryDate?.ToString("yyyy-MM-dd"),
                        ReviewedAt = passRecord?.ReviewedAtUtc?.ToString("yyyy-MM-dd HH:mm"),
                        ReviewedBy = passRecord?.ReviewedBy
                    });

                    // 2. Ownership
                    var ownReq = openRequests.FirstOrDefault(r => r.TripId == t.TripId && r.Scope == h.HorseId && r.KeyName == "ownership");
                    result.Add(new CustomerDocDto
                    {
                        TripId = t.TripId,
                        Key = "ownership",
                        Scope = h.HorseId,
                        Status = ownReq != null ? "ACTION_REQUIRED" : (!string.IsNullOrEmpty(h.OwnershipCertificateFileUrl) ? "APPROVED" : "OPTIONAL"),
                        Optional = true,
                        File = h.OwnershipCertificateFileUrl,
                        Note = "Chứng nhận sở hữu ngựa",
                        Issue = ownReq?.Reason
                    });

                    // 3. Bio / Photo
                    result.Add(new CustomerDocDto
                    {
                        TripId = t.TripId,
                        Key = "bio",
                        Scope = h.HorseId,
                        Status = !string.IsNullOrEmpty(h.PhotoUrl) ? "APPROVED" : "OPTIONAL",
                        Optional = true,
                        File = h.PhotoUrl,
                        Note = $"Màu: {h.Breed}, Giống: {h.Breed}, Vi mạch: {h.MicrochipIso}"
                    });

                    // 4. Value proof
                    result.Add(new CustomerDocDto
                    {
                        TripId = t.TripId,
                        Key = "valueProof",
                        Scope = h.HorseId,
                        Status = !string.IsNullOrEmpty(h.ValuationDocumentFileUrl) ? "APPROVED" : "OPTIONAL",
                        Optional = true,
                        File = h.ValuationDocumentFileUrl,
                        Note = h.DeclaredValueVnd.HasValue ? $"Giá trị khai báo: {h.DeclaredValueVnd.Value:N0} VND" : "Chứng nhận giá trị"
                    });

                    // 5. Equine Flu vaccination (Sổ tiêm cúm)
                    var fluReq = openRequests.FirstOrDefault(r => r.TripId == t.TripId && r.Scope == h.HorseId && r.KeyName == "flu");
                    var fluRecord = legalRecords.FirstOrDefault(r => r.RequestId == req.RequestId && r.HorseId == h.HorseId && (r.DocumentType == "EQUINE_FLU_VAX" || r.DocumentType == "flu" || r.DocumentType == "DT-3"));
                    result.Add(new CustomerDocDto
                    {
                        TripId = t.TripId,
                        Key = "flu",
                        Scope = h.HorseId,
                        Status = fluReq != null ? "ACTION_REQUIRED" : (fluRecord?.DocumentStatus ?? "SUBMITTED"),
                        Optional = false,
                        File = fluRecord?.UploadedFileUrl ?? "/api/customer/horses/" + h.HorseId + "/files/flu",
                        Note = "Tiêm vắc xin cúm định kỳ",
                        Issue = fluReq?.Reason,
                        Expiry = fluRecord?.ExpiryDate?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.AddMonths(6).ToString("yyyy-MM-dd"),
                        ReviewedAt = fluRecord?.ReviewedAtUtc?.ToString("yyyy-MM-dd HH:mm"),
                        ReviewedBy = fluRecord?.ReviewedBy
                    });

                    // 6. Health certificate (Giấy chứng nhận sức khỏe)
                    var healthReq = openRequests.FirstOrDefault(r => r.TripId == t.TripId && r.Scope == h.HorseId && r.KeyName == "health");
                    var healthRecord = legalRecords.FirstOrDefault(r => r.RequestId == req.RequestId && r.HorseId == h.HorseId && (r.DocumentType == "HEALTH_CERTIFICATE" || r.DocumentType == "health" || r.DocumentType == "DT-2"));
                    result.Add(new CustomerDocDto
                    {
                        TripId = t.TripId,
                        Key = "health",
                        Scope = h.HorseId,
                        Status = healthReq != null ? "ACTION_REQUIRED" : (healthRecord?.DocumentStatus ?? "SUBMITTED"),
                        Optional = false,
                        File = healthRecord?.UploadedFileUrl ?? "/api/customer/horses/" + h.HorseId + "/files/health",
                        Note = "Chứng nhận kiểm dịch thú y đủ điều kiện di chuyển",
                        Issue = healthReq?.Reason,
                        Expiry = healthRecord?.ExpiryDate?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.AddDays(10).ToString("yyyy-MM-dd"),
                        ReviewedAt = healthRecord?.ReviewedAtUtc?.ToString("yyyy-MM-dd HH:mm"),
                        ReviewedBy = healthRecord?.ReviewedBy
                    });
                }
            }

            return result;
        }

        public async Task<bool> ReviewCustomerDocAsync(string tripId, ReviewCustomerDocInputDto input, string userId)
        {
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
            if (trip == null) return false;

            // Tìm record tương ứng hoặc tạo mới
            var docType = input.Key == "passport" ? "DT-1" : input.Key == "health" ? "DT-2" : input.Key == "flu" ? "DT-3" : input.Key;
            var record = await _context.LegalMedicalRecords
                .FirstOrDefaultAsync(r => r.RequestId == trip.RequestId && r.HorseId == input.Scope && (r.DocumentType == docType || r.DocumentType == input.Key));

            if (record == null)
            {
                record = new LegalMedicalRecord
                {
                    RecordId = "LMR_" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
                    RequestId = trip.RequestId,
                    HorseId = input.Scope,
                    TripId = tripId,
                    DocumentType = docType,
                    RequirementStatus = "MANDATORY"
                };
                _context.LegalMedicalRecords.Add(record);
            }

            record.DocumentStatus = input.Decision == "APPROVED" ? "APPROVED" : "ACTION_REQUIRED";
            record.ReviewedBy = userId;
            record.ReviewedAtUtc = DateTime.UtcNow;
            record.RejectionReason = input.Decision == "REJECTED" ? input.Reason : null;

            // Nếu APPROVE thì fulfill request bổ sung nếu có
            if (input.Decision == "APPROVED")
            {
                var openReq = await _context.DocumentRequests
                    .FirstOrDefaultAsync(r => r.TripId == tripId && r.Scope == input.Scope && r.KeyName == input.Key && r.Status != "FULFILLED");
                if (openReq != null)
                {
                    openReq.Status = "FULFILLED";
                    openReq.FulfilledAtUtc = DateTime.UtcNow;
                }
            }

            // Hủy Docs READY nếu có thay đổi
            trip.DocsReadyAtUtc = null;
            trip.DocsReadyBy = null;

            await LogAuditAsync(tripId, userId, "TRANSPORT_SPECIALIST", input.Decision == "APPROVED" ? "Duyệt giấy tờ khách" : "Từ chối giấy tờ khách", input.Key, $"Ngựa {input.Scope}: {input.Reason}");
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CreateDocRequestAsync(CreateDocRequestInputDto input, string userId)
        {
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == input.TripId);
            if (trip == null) return false;

            var reqDocId = "DOC_REQ_" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
            var docReq = new DocumentRequest
            {
                RequestDocId = reqDocId,
                TripId = input.TripId,
                RequestId = trip.RequestId,
                KeyName = input.Key,
                Scope = input.Scope,
                Reason = input.Reason,
                DueAt = !string.IsNullOrEmpty(input.DueAt) ? DateTime.Parse(input.DueAt) : DateTime.UtcNow.AddDays(3),
                Status = "OPEN",
                CreatedBy = userId,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.DocumentRequests.Add(docReq);

            // Cập nhật trạng thái record sang ACTION_REQUIRED
            var docType = input.Key == "passport" ? "DT-1" : input.Key == "health" ? "DT-2" : input.Key == "flu" ? "DT-3" : input.Key;
            var record = await _context.LegalMedicalRecords
                .FirstOrDefaultAsync(r => r.RequestId == trip.RequestId && r.HorseId == input.Scope && (r.DocumentType == docType || r.DocumentType == input.Key));
            if (record != null)
            {
                record.DocumentStatus = "ACTION_REQUIRED";
                record.RejectionReason = input.Reason;
                record.ReviewedBy = userId;
                record.ReviewedAtUtc = DateTime.UtcNow;
            }

            trip.DocsReadyAtUtc = null;
            trip.DocsReadyBy = null;

            await LogAuditAsync(input.TripId, userId, "TRANSPORT_SPECIALIST", "Yêu cầu bổ sung hồ sơ", input.Key, $"Ngựa {input.Scope}: {input.Reason}");
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<DocRequestDto>> GetDocRequestsAsync(string? tripId = null)
        {
            var query = _context.DocumentRequests.AsQueryable();
            if (!string.IsNullOrEmpty(tripId))
            {
                query = query.Where(r => r.TripId == tripId);
            }

            var list = await query.OrderByDescending(r => r.CreatedAtUtc).ToListAsync();
            return list.Select(r => new DocRequestDto
            {
                Id = r.RequestDocId,
                TripId = r.TripId,
                Key = r.KeyName,
                Scope = r.Scope,
                Reason = r.Reason,
                DueAt = r.DueAt?.ToString("yyyy-MM-dd"),
                Status = r.Status,
                CreatedAt = r.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                History = new List<string[]> { new[] { r.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"), $"Tạo yêu cầu: {r.Reason}" } }
            }).ToList();
        }

        public async Task<List<DocRequestDto>> GetCustomerSupplementsAsync(string requestId)
        {
            var list = await _context.DocumentRequests
                .Where(r => r.RequestId == requestId)
                .OrderByDescending(r => r.CreatedAtUtc)
                .ToListAsync();

            return list.Select(r => new DocRequestDto
            {
                Id = r.RequestDocId,
                TripId = r.TripId,
                Key = r.KeyName,
                Scope = r.Scope,
                Reason = r.Reason,
                DueAt = r.DueAt?.ToString("yyyy-MM-dd"),
                Status = r.Status,
                CreatedAt = r.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                History = new List<string[]> { new[] { r.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"), r.Reason } }
            }).ToList();
        }

        // =========================================================================
        // 3. COMPANY DOCUMENTS (CBN)
        // =========================================================================

        public async Task<List<TripDocumentDto>> GetCompanyDocumentsAsync(string? tripId = null)
        {
            var query = _context.LegalMedicalRecords
                .Where(r => r.DocumentScope == "PER_TRIP" || r.DocumentType != null && (r.DocumentType.StartsWith("DT-4") || r.DocumentType.StartsWith("DT-5") || r.DocumentType.StartsWith("DT-6") || r.DocumentType.StartsWith("DT-7") || r.DocumentType.StartsWith("DT-8")))
                .AsQueryable();

            if (!string.IsNullOrEmpty(tripId))
            {
                query = query.Where(r => r.TripId == tripId);
            }

            var records = await query.ToListAsync();
            return records.Select(r => new TripDocumentDto
            {
                Id = r.RecordId,
                TripId = r.TripId ?? string.Empty,
                TypeId = r.DocumentType ?? "DT-8",
                HorseId = r.HorseId,
                Status = r.DocumentStatus ?? "SUBMITTED",
                Number = r.DocumentNumber ?? string.Empty,
                Issuer = r.IssuingAuthority ?? "Cục Thú y / Hải quan",
                IssuedAt = r.IssuedDate?.ToString("yyyy-MM-dd") ?? string.Empty,
                Expiry = r.ExpiryDate?.ToString("yyyy-MM-dd") ?? string.Empty,
                PhysicalCopy = r.PhysicalCopyCollected,
                Versions = new List<DocVersionDto>
                {
                    new DocVersionDto
                    {
                        V = r.DocumentVersion,
                        File = r.UploadedFileUrl ?? string.Empty,
                        At = (r.ReviewedAtUtc ?? DateTime.UtcNow).ToString("yyyy-MM-dd HH:mm"),
                        By = r.ReviewedBy ?? "Specialist"
                    }
                },
                Reviews = r.ReviewedAtUtc.HasValue ? new List<DocReviewDto>
                {
                    new DocReviewDto
                    {
                        V = r.DocumentVersion,
                        Decision = r.DocumentStatus == "APPROVED" ? "APPROVED" : "REJECTED",
                        At = r.ReviewedAtUtc.Value.ToString("yyyy-MM-dd HH:mm"),
                        By = r.ReviewedBy ?? "Specialist",
                        Remark = r.RejectionReason ?? "Đã kiểm tra"
                    }
                } : new List<DocReviewDto>()
            }).ToList();
        }

        public async Task<bool> RecordCompanyDocumentAsync(RecordDocInputDto input, string userId)
        {
            var recordId = "LMR_" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
            var record = new LegalMedicalRecord
            {
                RecordId = recordId,
                TripId = input.TripId,
                RequestId = (await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == input.TripId))?.RequestId ?? "UNKNOWN",
                DocumentType = input.TypeId,
                HorseId = input.HorseId,
                DocumentNumber = input.Number,
                IssuingAuthority = input.Issuer,
                IssuedDate = !string.IsNullOrEmpty(input.IssuedAt) ? DateTime.Parse(input.IssuedAt) : DateTime.UtcNow,
                ExpiryDate = !string.IsNullOrEmpty(input.Expiry) ? DateTime.Parse(input.Expiry) : DateTime.UtcNow.AddMonths(1),
                UploadedFileUrl = input.File,
                DocumentStatus = "SUBMITTED",
                DocumentScope = input.HorseId != null ? "PER_HORSE" : "PER_TRIP",
                ReviewedBy = userId,
                ReviewedAtUtc = DateTime.UtcNow
            };

            _context.LegalMedicalRecords.Add(record);

            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == input.TripId);
            if (trip != null)
            {
                trip.DocsReadyAtUtc = null;
                trip.DocsReadyBy = null;
            }

            await LogAuditAsync(input.TripId, userId, "TRANSPORT_SPECIALIST", "Ghi nhận chứng từ CBN", input.TypeId, $"Số công văn: {input.Number}");
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ReviewCompanyDocumentAsync(string docId, ReviewDocInputDto input, string userId)
        {
            var record = await _context.LegalMedicalRecords.FirstOrDefaultAsync(r => r.RecordId == docId);
            if (record == null) return false;

            record.DocumentStatus = input.Decision;
            record.ReviewedBy = userId;
            record.ReviewedAtUtc = DateTime.UtcNow;
            record.RejectionReason = input.Remark;

            if (record.TripId != null)
            {
                var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == record.TripId);
                if (trip != null)
                {
                    trip.DocsReadyAtUtc = null;
                    trip.DocsReadyBy = null;
                }
            }

            await LogAuditAsync(record.TripId, userId, "TRANSPORT_SPECIALIST", $"Thẩm định chứng từ {docId}", record.DocumentType ?? "DOC", input.Remark);
            await _context.SaveChangesAsync();
            return true;
        }

        // =========================================================================
        // 4. INSURANCE
        // =========================================================================

        public async Task<bool> SaveInsuranceAsync(string tripId, SaveInsuranceInputDto input, string userId)
        {
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
            if (trip == null) return false;

            var existing = await _context.TripInsurances.FirstOrDefaultAsync(i => i.TripId == tripId);
            if (existing == null)
            {
                existing = new TripInsurance
                {
                    InsuranceId = "INS_" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
                    TripId = tripId,
                    Insurer = input.Insurer,
                    PolicyNumber = input.Policy,
                    ValidFrom = DateTime.Parse(input.ValidFrom),
                    ValidTo = DateTime.Parse(input.ValidTo),
                    CoverageAmount = input.Coverage,
                    Status = "PENDING",
                    CreatedAtUtc = DateTime.UtcNow
                };
                _context.TripInsurances.Add(existing);
            }
            else
            {
                existing.Insurer = input.Insurer;
                existing.PolicyNumber = input.Policy;
                existing.ValidFrom = DateTime.Parse(input.ValidFrom);
                existing.ValidTo = DateTime.Parse(input.ValidTo);
                existing.CoverageAmount = input.Coverage;
                existing.Status = "PENDING";
            }

            trip.DocsReadyAtUtc = null;
            trip.DocsReadyBy = null;

            await LogAuditAsync(tripId, userId, "TRANSPORT_SPECIALIST", "Cập nhật bảo hiểm chuyến", "INSURANCE", $"Hãng: {input.Insurer}, HĐ: {input.Policy}, Mức: {input.Coverage:N0} VND");
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> VerifyInsuranceAsync(string tripId, string userId)
        {
            var ins = await _context.TripInsurances.FirstOrDefaultAsync(i => i.TripId == tripId);
            if (ins == null) return false;

            ins.Status = "VERIFIED";
            ins.CheckedBy = userId;
            ins.CheckedAtUtc = DateTime.UtcNow;

            await LogAuditAsync(tripId, userId, "TRANSPORT_SPECIALIST", "Xác minh bảo hiểm hợp lệ", "INSURANCE", $"Đã xác minh hợp đồng {ins.PolicyNumber}");
            await _context.SaveChangesAsync();
            return true;
        }

        // =========================================================================
        // 5. QUARANTINE BOOKINGS
        // =========================================================================

        public async Task<List<QuarantineBookingDto>> GetQuarantineBookingsAsync(string? tripId = null)
        {
            var query = _context.QuarantineBookings.AsQueryable();
            if (!string.IsNullOrEmpty(tripId))
            {
                var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
                if (trip != null)
                {
                    query = query.Where(b => b.RequestId == trip.RequestId);
                }
            }

            var bookings = await query.ToListAsync();
            return bookings.Select(b => new QuarantineBookingDto
            {
                Id = b.BookingId,
                TripId = tripId ?? string.Empty,
                Station = b.StationName ?? "Trạm kiểm dịch",
                Slot = b.ExpectedStartDate?.ToString("yyyy-MM-dd HH:mm") ?? string.Empty,
                Ref = b.ConfirmationNumber ?? string.Empty,
                Status = b.Status == "COMPLETED" || b.Status == "BOOKED" ? "BOOKED" : "REQUESTED",
                Notes = $"Quốc gia: {b.Country ?? "VN"}",
                ConfirmedAt = b.ExpectedStartDate?.ToString("yyyy-MM-dd HH:mm")
            }).ToList();
        }

        public async Task<bool> SaveQuarantineBookingAsync(SaveBookingInputDto input, string userId)
        {
            var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == input.TripId);
            if (trip == null) return false;

            var existing = await _context.QuarantineBookings.FirstOrDefaultAsync(b => b.RequestId == trip.RequestId && b.ConfirmationNumber == input.Ref);
            if (existing == null)
            {
                existing = new QuarantineBooking
                {
                    BookingId = "QBK_" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
                    RequestId = trip.RequestId,
                    StationName = input.Station,
                    ConfirmationNumber = input.Ref,
                    ExpectedStartDate = !string.IsNullOrEmpty(input.Slot) ? DateTime.Parse(input.Slot) : DateTime.UtcNow,
                    Status = "BOOKED"
                };
                _context.QuarantineBookings.Add(existing);
            }
            else
            {
                existing.StationName = input.Station;
                existing.ConfirmationNumber = input.Ref;
                existing.Status = "BOOKED";
            }

            await LogAuditAsync(input.TripId, userId, "TRANSPORT_SPECIALIST", "Xác nhận đặt lịch trạm kiểm dịch", "QUARANTINE", $"Trạm: {input.Station}, Mã: {input.Ref}");
            await _context.SaveChangesAsync();
            return true;
        }

        // =========================================================================
        // 6. REQUIREMENT SETS & DOCS READY
        // =========================================================================

        public async Task<bool> ApplyRequirementSetAsync(string tripId, string pkgId, string userId)
        {
            var trip = await _context.TripPlans.Include(t => t.RequirementSets).FirstOrDefaultAsync(t => t.TripId == tripId);
            if (trip == null) return false;

            var allPkgs = await GetPackagesAsync();
            var pkg = allPkgs.FirstOrDefault(p => p.Id == pkgId) ?? allPkgs.First();

            var allRegs = await GetRegulationsAsync();
            var rules = pkg.Items.Select(item =>
            {
                var reg = allRegs.FirstOrDefault(r => r.Country == item[0] && r.Direction == item[1]);
                return new ReqRuleDto
                {
                    Country = item[0],
                    Direction = item[1],
                    RegId = reg?.Id,
                    RegV = reg?.V ?? 1,
                    Lines = reg?.Lines ?? new List<RequirementLineDto>()
                };
            }).ToList();

            var snapshot = new ReqSetSnapshotDto
            {
                PkgId = pkg.Id,
                PkgV = pkg.V,
                Name = pkg.Name,
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                By = userId,
                Rules = rules
            };

            var snapshotRecord = new TripRequirementSet
            {
                SnapshotId = "REQ_SET_" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
                TripId = tripId,
                PkgId = pkg.Id,
                PkgVersion = pkg.V,
                PkgName = pkg.Name,
                AppliedBy = userId,
                AppliedAtUtc = DateTime.UtcNow,
                SnapshotJson = JsonSerializer.Serialize(snapshot)
            };

            _context.TripRequirementSets.Add(snapshotRecord);

            trip.DocsReadyAtUtc = null;
            trip.DocsReadyBy = null;

            await LogAuditAsync(tripId, userId, "TRANSPORT_SPECIALIST", "Áp dụng bộ yêu cầu hồ sơ", "REQUIREMENT_SET", $"{pkg.Name} v{pkg.V}");
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ConfirmDocsReadyAsync(string tripId, string userId)
        {
            var trip = await _context.TripPlans
                .Include(t => t.Insurances)
                .Include(t => t.RequirementSets)
                .FirstOrDefaultAsync(t => t.TripId == tripId);

            if (trip == null) return false;

            // Kiểm tra bảo hiểm
            var ins = trip.Insurances.OrderByDescending(i => i.CreatedAtUtc).FirstOrDefault();
            if (ins == null || ins.Status != "VERIFIED")
            {
                throw new InvalidOperationException("Bảo hiểm chuyến đi chưa được xác minh (VERIFIED).");
            }

            // Kiểm tra các yêu cầu bổ sung còn OPEN không
            var hasOpenRequests = await _context.DocumentRequests.AnyAsync(r => r.TripId == tripId && r.Status == "OPEN");
            if (hasOpenRequests)
            {
                throw new InvalidOperationException("Còn yêu cầu bổ sung giấy tờ đang chờ khách hàng nộp.");
            }

            trip.DocsReadyAtUtc = DateTime.UtcNow;
            trip.DocsReadyBy = userId;

            await LogAuditAsync(tripId, userId, "TRANSPORT_SPECIALIST", "Xác nhận hồ sơ sẵn sàng khởi hành (Docs READY)", "TRIP_PLAN", "Toàn bộ giấy tờ, bảo hiểm và kiểm dịch hợp lệ.");
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RecordClearanceAsync(string tripId, RecordClearanceInputDto input, string userId)
        {
            var clearance = new TripCheckpointClearance
            {
                ClearanceId = "CLR_" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
                TripId = tripId,
                CheckpointIndex = input.CheckpointIndex,
                CheckpointName = $"Trạm kiểm dịch {input.CheckpointIndex + 1}",
                Result = input.Result,
                RefNumber = input.Ref,
                ClearedBy = userId,
                ClearedAtUtc = DateTime.UtcNow
            };

            _context.TripCheckpointClearances.Add(clearance);
            await LogAuditAsync(tripId, userId, "TRANSPORT_SPECIALIST", "Ghi nhận thông quan trạm", "CLEARANCE", $"Kết quả: {input.Result}, Mã: {input.Ref}");
            await _context.SaveChangesAsync();
            return true;
        }

        // =========================================================================
        // 7. CATALOGUES & AUDIT
        // =========================================================================

        public Task<List<DocTypeDto>> GetDocTypesAsync()
        {
            return Task.FromResult(new List<DocTypeDto>
            {
                new DocTypeDto { Id = "DT-1", Name = "Hộ chiếu ngựa", Group = "IDENTITY", Scope = "PER_HORSE", Provider = "CUSTOMER", ValidityDays = null, Status = "ACTIVE" },
                new DocTypeDto { Id = "DT-2", Name = "Giấy chứng nhận sức khỏe", Group = "MEDICAL", Scope = "PER_HORSE", Provider = "CUSTOMER", ValidityDays = 10, Status = "ACTIVE" },
                new DocTypeDto { Id = "DT-3", Name = "Sổ tiêm phòng cúm ngựa", Group = "MEDICAL", Scope = "PER_HORSE", Provider = "CUSTOMER", ValidityDays = 365, Status = "ACTIVE" },
                new DocTypeDto { Id = "DT-4", Name = "Giấy phép xuất khẩu", Group = "CUSTOMS", Scope = "PER_TRIP", Provider = "CBN", ValidityDays = 30, Status = "ACTIVE" },
                new DocTypeDto { Id = "DT-5", Name = "Giấy phép nhập khẩu", Group = "CUSTOMS", Scope = "PER_TRIP", Provider = "CBN", ValidityDays = 30, Status = "ACTIVE" },
                new DocTypeDto { Id = "DT-6", Name = "Giấy chứng nhận kiểm dịch", Group = "QUARANTINE", Scope = "PER_HORSE", Provider = "CBN", ValidityDays = 14, Status = "ACTIVE" },
                new DocTypeDto { Id = "DT-7", Name = "Tờ khai hải quan", Group = "CUSTOMS", Scope = "PER_TRIP", Provider = "CBN", ValidityDays = 30, Status = "ACTIVE" },
                new DocTypeDto { Id = "DT-8", Name = "Giấy phép vận chuyển nội địa", Group = "CUSTOMS", Scope = "PER_TRIP", Provider = "CBN", ValidityDays = 30, Status = "ACTIVE" },
            });
        }

        public Task<List<RegulationDto>> GetRegulationsAsync()
        {
            return Task.FromResult(new List<RegulationDto>
            {
                new RegulationDto
                {
                    Id = "REG-1", Country = "VN", Direction = "EXPORT", V = 1, EffectiveFrom = "2026-08-12", Status = "ACTIVE",
                    Note = "Giấy chứng nhận sức khỏe do Cục Thú y cấp trong vòng 10 ngày trước khởi hành.",
                    Lines = new List<RequirementLineDto>
                    {
                        new RequirementLineDto { TypeId = "DT-1", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_SUBMIT", Level = "REQUIRED" },
                        new RequirementLineDto { TypeId = "DT-2", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_DEPART", Condition = "Cấp trong vòng 10 ngày trước khởi hành", Level = "REQUIRED" },
                        new RequirementLineDto { TypeId = "DT-3", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_DEPART", Level = "REQUIRED" },
                        new RequirementLineDto { TypeId = "DT-4", Provider = "CBN", Scope = "PER_TRIP", Stage = "BEFORE_DEPART", Level = "REQUIRED" },
                        new RequirementLineDto { TypeId = "DT-7", Provider = "CBN", Scope = "PER_TRIP", Stage = "BEFORE_DEPART", Level = "REQUIRED" },
                    }
                },
                new RegulationDto
                {
                    Id = "REG-5", Country = "VN", Direction = "DOMESTIC", V = 1, EffectiveFrom = "2026-05-10", Status = "ACTIVE",
                    Note = "Giấy phép vận chuyển thú y cấp tỉnh.",
                    Lines = new List<RequirementLineDto>
                    {
                        new RequirementLineDto { TypeId = "DT-1", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_SUBMIT", Level = "REQUIRED" },
                        new RequirementLineDto { TypeId = "DT-3", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_DEPART", Level = "REQUIRED" },
                        new RequirementLineDto { TypeId = "DT-8", Provider = "CBN", Scope = "PER_TRIP", Stage = "BEFORE_DEPART", Level = "REQUIRED" },
                    }
                },
                new RegulationDto
                {
                    Id = "REG-2", Country = "JP", Direction = "IMPORT", V = 1, EffectiveFrom = "2026-06-01", Status = "ACTIVE",
                    Note = "Quy định kiểm dịch động vật của AQS Nhật Bản.",
                    Lines = new List<RequirementLineDto>
                    {
                        new RequirementLineDto { TypeId = "DT-5", Provider = "CBN", Scope = "PER_TRIP", Stage = "BEFORE_DEPART", Level = "REQUIRED" },
                        new RequirementLineDto { TypeId = "DT-6", Provider = "CBN", Scope = "PER_HORSE", Stage = "BEFORE_DEPART", Level = "REQUIRED" }
                    }
                }
            });
        }

        public Task<List<RegPackageDto>> GetPackagesAsync()
        {
            return Task.FromResult(new List<RegPackageDto>
            {
                new RegPackageDto
                {
                    Id = "RP-1", Name = "Nội địa Việt Nam", Items = new List<string[]> { new[] { "VN", "DOMESTIC" } },
                    Origin = "VN", Dest = "VN", Modes = new List<string> { "ROAD" }, Note = "Giấy phép vận chuyển thú y cấp tỉnh cho tuyến trong nước.",
                    V = 1, EffectiveFrom = "2026-09-15", Status = "ACTIVE"
                },
                new RegPackageDto
                {
                    Id = "RP-2", Name = "Việt Nam → Nhật Bản (hàng không)", Items = new List<string[]> { new[] { "VN", "EXPORT" }, new[] { "JP", "IMPORT" } },
                    Origin = "VN", Dest = "JP", Modes = new List<string> { "AIR" }, Note = "Xuất khẩu từ Việt Nam (Cục Thú y) và nhập khẩu Nhật Bản (AQS).",
                    V = 1, EffectiveFrom = "2026-09-15", Status = "ACTIVE"
                }
            });
        }

        public async Task<List<AuditEntryDto>> GetAuditLogsAsync(string? tripId = null)
        {
            var query = _context.SpecialistAuditLogs.AsQueryable();
            if (!string.IsNullOrEmpty(tripId))
            {
                query = query.Where(a => a.TripId == tripId);
            }

            var logs = await query.OrderByDescending(a => a.CreatedAtUtc).Take(50).ToListAsync();
            return logs.Select(a => new AuditEntryDto
            {
                At = a.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                Actor = a.ActorId,
                Role = a.Role,
                Action = a.Action,
                Entity = a.Entity,
                Detail = a.Detail
            }).ToList();
        }

        public Task<bool> SaveDocTypeAsync(DocTypeDto input, string userId) => Task.FromResult(true);
        public Task<bool> SaveRegulationAsync(RegulationDto input, string userId) => Task.FromResult(true);
        public Task<bool> SavePackageAsync(RegPackageDto input, string userId) => Task.FromResult(true);

        private async Task LogAuditAsync(string? tripId, string actorId, string role, string action, string entity, string? detail)
        {
            var audit = new SpecialistAuditLog
            {
                AuditId = "AUD_" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
                TripId = tripId,
                ActorId = actorId,
                Role = role,
                Action = action,
                Entity = entity,
                Detail = detail,
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.SpecialistAuditLogs.Add(audit);
            await Task.CompletedTask;
        }
    }
}
