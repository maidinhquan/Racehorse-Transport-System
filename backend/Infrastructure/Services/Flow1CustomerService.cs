using System.Globalization;
using System.Text.Json;
using Application.Common.Exceptions;
using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services;

public class Flow1CustomerService : IFlow1CustomerService
{
    private readonly ITransportRequestDAO _requestDao;
    private readonly IRequestHorseMappingDAO _mappingDao;
    private readonly ILegalMedicalRecordDAO _medicalDao;
    private readonly IContractDAO _contractDao;
    private readonly IInvoiceDAO _invoiceDao;
    private readonly IPaymentDAO _paymentDao;
    private readonly ITripPlanDAO _tripPlanDao;
    private readonly IUserDAO _userDao;
    private readonly HorseTransportDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IMemoryCache _cache;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly ILogger<Flow1CustomerService> _logger;

    public Flow1CustomerService(
        ITransportRequestDAO requestDao,
        IRequestHorseMappingDAO mappingDao,
        ILegalMedicalRecordDAO medicalDao,
        IContractDAO contractDao,
        IInvoiceDAO invoiceDao,
        IPaymentDAO paymentDao,
        ITripPlanDAO tripPlanDao,
        IUserDAO userDao,
        HorseTransportDbContext context,
        IEmailService emailService,
        IMemoryCache cache,
        IWebHostEnvironment env,
        IConfiguration config,
        ILogger<Flow1CustomerService> logger)
    {
        _requestDao = requestDao;
        _mappingDao = mappingDao;
        _medicalDao = medicalDao;
        _contractDao = contractDao;
        _invoiceDao = invoiceDao;
        _paymentDao = paymentDao;
        _tripPlanDao = tripPlanDao;
        _userDao = userDao;
        _context = context;
        _emailService = emailService;
        _cache = cache;
        _env = env;
        _config = config;
        _logger = logger;
    }

    public Task<FormOptionsDto> GetFormOptionsAsync(string origin, string destination, string? mode)
    {
        var options = new FormOptionsDto
        {
            Currency = "VND",
            PreparationDays = 3,
            DefaultDepositPct = 30,
            ContractDeadlineHours = 24,
            SupportedRoutes = new List<SupportedRouteDto>
            {
                new() { Id = "ROUTE_001", OriginCountry = "VN", DestinationCountry = "VN", Mode = "ROAD" },
                new() { Id = "ROUTE_002", OriginCountry = "VN", DestinationCountry = "VN", Mode = "AIR" },
                new() { Id = "ROUTE_003", OriginCountry = "VN", DestinationCountry = "JP", Mode = "AIR" }
            }
        };
        return Task.FromResult(options);
    }

    private async Task<string> GenerateNextRequestIdAsync()
    {
        var existingIds = await _context.TransportRequests
            .Select(r => r.RequestId)
            .ToListAsync();

        var maxNumber = 0;
        foreach (var id in existingIds)
        {
            if (id.StartsWith("REQUEST_") && int.TryParse(id["REQUEST_".Length..], out var num))
            {
                if (num > maxNumber) maxNumber = num;
            }
        }

        return $"REQUEST_{maxNumber + 1:D3}";
    }

    public async Task<CustomerTransportRequestDto> CreateRequestAsync(string customerId, TripInfoInput input)
    {
        var requestId = await GenerateNextRequestIdAsync();
        DateTime? expectedDate = null;
        if (DateTime.TryParse(input.Date, out var dt))
        {
            expectedDate = dt.Date;
        }

        var careNotes = input.CareNotes ?? "";
        var entity = new TransportRequest
        {
            RequestId = requestId,
            CustomerId = customerId,
            Departure = string.IsNullOrWhiteSpace(input.Origin) ? "Ho Chi Minh City, VN" : input.Origin,
            Destination = string.IsNullOrWhiteSpace(input.Destination) ? "Tokyo, JP" : input.Destination,
            ExpectedDate = expectedDate ?? DateTime.UtcNow.AddDays(7),
            Purpose = careNotes.Length > 100 ? careNotes[..100] : careNotes,
            TransportType = input.Mode,
            Status = "DRAFT",
            BaseCost = 0
        };

        await _requestDao.AddAsync(entity);
        _logger.LogInformation("Khách hàng {CustomerId} đã khởi tạo đơn nháp {RequestId}", customerId, requestId);

        var dto = MapToCustomerDto(entity, new List<Horse>(), new List<LegalMedicalRecord>(), 0, 1, new Dictionary<string, string>());
        dto.SubmittedAt = null; // Important: F1-J18Response201 forbids submittedAt
        dto.CareNotes = careNotes;
        return dto;
    }

    public async Task<List<CustomerTransportRequestDto>> GetCustomerRequestsAsync(string customerId)
    {
        var requests = await _requestDao.GetByCustomerIdAsync(customerId);
        var result = new List<CustomerTransportRequestDto>();

        foreach (var req in requests)
        {
            var horses = req.RequestHorseMappings.Select(m => m.Horse).Where(h => h != null).Cast<Horse>().ToList();
            var records = await _medicalDao.GetByRequestIdAsync(req.RequestId);
            result.Add(MapToCustomerDto(req, horses, records, Math.Max(1, horses.Count), 1, new Dictionary<string, string>()));
        }

        return result;
    }

    public async Task<CustomerTransportRequestDto?> GetRequestByIdAsync(string customerId, string requestId)
    {
        var req = await _requestDao.GetWithHorsesAsync(requestId);
        if (req == null || req.CustomerId != customerId)
        {
            return null;
        }

        var horses = req.RequestHorseMappings.Select(m => m.Horse).Where(h => h != null).Cast<Horse>().ToList();
        var records = await _medicalDao.GetByRequestIdAsync(requestId);
        var notes = ParseHorseNotes(req.Purpose);

        return MapToCustomerDto(req, horses, records, Math.Max(1, horses.Count), 3, notes);
    }

    public async Task<CustomerTransportRequestDto> SaveRequestAsync(string customerId, string requestId, CustomerSaveRequestDto input)
    {
        var req = await _requestDao.GetWithHorsesAsync(requestId);
        if (req == null || req.CustomerId != customerId)
        {
            throw new BusinessRuleException("Không tìm thấy đơn vận chuyển", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        if (req.Status != "DRAFT" && req.Status != "CHANGES_REQUESTED")
        {
            throw new BusinessRuleException("Chỉ có thể chỉnh sửa đơn ở trạng thái DRAFT hoặc CHANGES_REQUESTED", StatusCodes.Status400BadRequest, "INVALID_STATE");
        }

        if (!string.IsNullOrWhiteSpace(input.Origin)) req.Departure = input.Origin;
        if (!string.IsNullOrWhiteSpace(input.Destination)) req.Destination = input.Destination;
        if (DateTime.TryParse(input.Date, out var dt)) req.ExpectedDate = dt.Date;
        if (!string.IsNullOrWhiteSpace(input.Mode)) req.TransportType = input.Mode;

        if (input.Delivery != null)
        {
            req.DesignatedReceiverName = input.Delivery.Contact;
            req.DesignatedReceiverPhone = input.Delivery.Phone;
        }

        // Lưu ghi chú & notes dạng JSON trong Purpose
        var notesJson = JsonSerializer.Serialize(input.HorseNotes ?? new Dictionary<string, string>());
        req.Purpose = $"{input.CareNotes ?? ""}|{notesJson}";

        // Cập nhật mapping danh sách ngựa
        await _mappingDao.DeleteByRequestIdAsync(requestId);
        if (input.Horses != null && input.Horses.Count > 0)
        {
            var validHorses = input.Horses.Where(h => !string.IsNullOrWhiteSpace(h)).Distinct().ToList();
            foreach (var hId in validHorses)
            {
                string? hNotes = null;
                input.HorseNotes?.TryGetValue(hId, out hNotes);
                var mapping = new RequestHorseMapping
                {
                    RequestId = requestId,
                    HorseId = hId,
                    CareInstructions = hNotes
                };
                await _mappingDao.AddAsync(mapping);
            }
        }

        await _requestDao.UpdateAsync(req);
        _logger.LogInformation("Đã lưu tiến trình nháp cho đơn {RequestId}", requestId);

        var updated = await _requestDao.GetWithHorsesAsync(requestId);
        var horses = updated!.RequestHorseMappings.Select(m => m.Horse).Where(h => h != null).Cast<Horse>().ToList();
        var records = await _medicalDao.GetByRequestIdAsync(requestId);
        return MapToCustomerDto(updated, horses, records, input.HorseCount, input.WizardStep, input.HorseNotes ?? new Dictionary<string, string>());
    }

    public async Task<DocumentChecklistDto> GetDocumentChecklistAsync(string customerId, string requestId)
    {
        var req = await _requestDao.GetWithHorsesAsync(requestId);
        if (req == null || req.CustomerId != customerId)
        {
            throw new BusinessRuleException("Không tìm thấy đơn vận chuyển", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        var horses = req.RequestHorseMappings.Select(m => m.Horse).Where(h => h != null).Cast<Horse>().ToList();
        var records = await _medicalDao.GetByRequestIdAsync(requestId);

        var checklist = new DocumentChecklistDto
        {
            RequestId = requestId,
            CanSubmit = true,
            Items = new List<DocumentChecklistItemDto>(),
            Issues = new List<DocumentIssueDto>(),
            Warnings = new List<string>()
        };

        if (horses.Count == 0)
        {
            checklist.CanSubmit = false;
            checklist.Issues.Add(new DocumentIssueDto
            {
                Field = "horses",
                Code = "NO_HORSES_SELECTED",
                Message = "Chưa chọn ngựa nào cho đơn vận chuyển."
            });
            return checklist;
        }

        var plannedDate = req.ExpectedDate ?? DateTime.UtcNow.Date;

        foreach (var horse in horses)
        {
            // 1. Kiểm tra Hộ chiếu (Bắt buộc)
            var hasPassportNumber = !string.IsNullOrWhiteSpace(horse.FeiPassportNo);
            var hasPassportFile = !string.IsNullOrWhiteSpace(horse.PassportScanUrl);
            var passportExpired = horse.PassportExpiryDate.HasValue && horse.PassportExpiryDate.Value < plannedDate;

            if (!hasPassportNumber || !hasPassportFile)
            {
                checklist.CanSubmit = false;
                checklist.Issues.Add(new DocumentIssueDto
                {
                    Field = $"horses.{horse.HorseId}.passport.scan",
                    Code = "REQUIRED_DOCUMENT_MISSING",
                    Message = $"{horse.Name}: Chưa nộp đủ số hoặc scan hộ chiếu ngựa."
                });
            }
            else if (passportExpired)
            {
                checklist.CanSubmit = false;
                checklist.Issues.Add(new DocumentIssueDto
                {
                    Field = $"horses.{horse.HorseId}.passport.expiry",
                    Code = "PASSPORT_EXPIRED",
                    Message = $"{horse.Name}: Hộ chiếu hết hạn trước ngày khởi hành dự kiến."
                });
            }

            if (hasPassportFile)
            {
                checklist.Items.Add(new DocumentChecklistItemDto
                {
                    Key = "passport",
                    Scope = horse.HorseId,
                    Name = "Hộ chiếu ngựa",
                    Kind = "file",
                    Status = hasPassportNumber && !passportExpired ? "SUBMITTED" : "ACTION_REQUIRED",
                    Optional = false,
                    Note = "Đã có scan hộ chiếu hợp lệ.",
                    File = new FileRefDto { Name = Path.GetFileName(horse.PassportScanUrl), Url = $"/api/customer/horses/{horse.HorseId}/files/passport" }
                });
            }

            // 2. Kiểm tra Giấy chứng nhận sở hữu (Bắt buộc)
            var hasOwnership = !string.IsNullOrWhiteSpace(horse.OwnershipCertificateFileUrl);
            if (!hasOwnership)
            {
                checklist.CanSubmit = false;
                checklist.Issues.Add(new DocumentIssueDto
                {
                    Field = $"horses.{horse.HorseId}.ownership",
                    Code = "REQUIRED_DOCUMENT_MISSING",
                    Message = $"{horse.Name}: Chưa nộp giấy chứng nhận sở hữu."
                });
            }
            else
            {
                checklist.Items.Add(new DocumentChecklistItemDto
                {
                    Key = "ownership",
                    Scope = horse.HorseId,
                    Name = "Chứng nhận sở hữu",
                    Kind = "file",
                    Status = "SUBMITTED",
                    Optional = false,
                    Note = "Đã có giấy chứng nhận sở hữu.",
                    File = new FileRefDto { Name = Path.GetFileName(horse.OwnershipCertificateFileUrl), Url = $"/api/customer/horses/{horse.HorseId}/files/ownership" }
                });
            }

            // 3. Sổ tiêm ngừa cúm (Kiểm tra y tế theo BA/Tester rule)
            var fluRecord = records.FirstOrDefault(r => r.HorseId == horse.HorseId && r.DocumentType == "VACCINATION");
            var hasFlu = fluRecord != null && !string.IsNullOrWhiteSpace(fluRecord.UploadedFileUrl);
            if (hasFlu)
            {
                checklist.Items.Add(new DocumentChecklistItemDto
                {
                    Key = "flu",
                    Scope = horse.HorseId,
                    Name = "Sổ tiêm ngừa cúm",
                    Kind = "file",
                    Status = "SUBMITTED",
                    Optional = true,
                    Note = "Đã nộp sổ tiêm phòng.",
                    File = new FileRefDto { Name = Path.GetFileName(fluRecord!.UploadedFileUrl), Url = fluRecord.UploadedFileUrl }
                });
            }
        }

        return checklist;
    }

    public async Task<DocRecordDto> UploadHorseDocumentAsync(string customerId, string requestId, string horseId, string documentType, Stream fileStream, string fileName, string contentType)
    {
        var req = await _requestDao.GetByIdAsync(requestId);
        if (req == null || req.CustomerId != customerId)
        {
            throw new BusinessRuleException("Không tìm thấy đơn vận chuyển", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(ext)) ext = ".pdf";

        // BA Validation: Magic Bytes Check
        using var memory = new MemoryStream();
        await fileStream.CopyToAsync(memory);
        var bytes = memory.ToArray();

        if (bytes.Length > 20 * 1024 * 1024)
        {
            throw new BusinessRuleException("Dung lượng file vượt quá 20MB", StatusCodes.Status400BadRequest, "FILE_TOO_LARGE");
        }

        if (!IsValidMagicBytes(bytes, ext))
        {
            throw new BusinessRuleException("Nội dung tệp không hợp lệ hoặc chứa mã độc", StatusCodes.Status400BadRequest, "INVALID_FILE_SIGNATURE");
        }

        // Lưu vật lý file vào App_Data/private/{horseId}/ với timestamp (Audit Trail)
        var storageDir = Path.Combine(_env.ContentRootPath, "App_Data", "private", horseId);
        Directory.CreateDirectory(storageDir);

        var safeName = $"{documentType.ToLowerInvariant()}_{DateTime.UtcNow.Ticks}{ext}";
        var fullPath = Path.Combine(storageDir, safeName);
        await File.WriteAllBytesAsync(fullPath, bytes);

        var relativeUrl = $"private/{horseId}/{safeName}";

        // Cập nhật bản ghi LEGAL_MEDICAL_RECORD
        var record = await _medicalDao.GetByHorseAndDocumentTypeAsync(requestId, horseId, documentType.ToUpperInvariant());
        if (record == null)
        {
            record = new LegalMedicalRecord
            {
                RecordId = $"MED_{Guid.NewGuid().ToString()[..8].ToUpperInvariant()}",
                RequestId = requestId,
                HorseId = horseId,
                DocumentType = documentType.ToUpperInvariant(),
                DocumentStatus = "SUBMITTED",
                RequirementStatus = "PENDING",
                UploadedFileUrl = relativeUrl,
                ExpiryDate = DateTime.UtcNow.AddMonths(6)
            };
            await _medicalDao.AddAsync(record);
        }
        else
        {
            record.UploadedFileUrl = relativeUrl;
            record.DocumentStatus = "SUBMITTED";
            await _medicalDao.UpdateAsync(record);
        }

        _logger.LogInformation("Đã upload chứng từ {DocType} cho ngựa {HorseId} trong đơn {RequestId}", documentType, horseId, requestId);

        return new DocRecordDto
        {
            Key = documentType.ToLowerInvariant(),
            Scope = horseId,
            Status = "SUBMITTED",
            File = new FileRefDto
            {
                Name = fileName,
                Url = $"/api/customer/horses/{horseId}/files/{documentType.ToLowerInvariant()}"
            },
            UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
        };
    }

    public async Task<CustomerTransportRequestDto> SubmitRequestAsync(string customerId, string requestId)
    {
        var req = await _requestDao.GetWithHorsesAsync(requestId);
        if (req == null || req.CustomerId != customerId)
        {
            throw new BusinessRuleException("Không tìm thấy đơn vận chuyển", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        var checklist = await GetDocumentChecklistAsync(customerId, requestId);
        if (!checklist.CanSubmit)
        {
            var firstError = checklist.Issues.FirstOrDefault()?.Message ?? "Hồ sơ chưa đủ điều kiện gửi.";
            throw new BusinessRuleException(firstError, StatusCodes.Status400BadRequest, "VALIDATION_ERROR");
        }

        req.Status = "PENDING_REVIEW";
        await _requestDao.UpdateAsync(req);
        _logger.LogInformation("Khách hàng đã nộp đơn vận chuyển {RequestId} sang trạng thái PENDING_REVIEW", requestId);

        var horses = req.RequestHorseMappings.Select(m => m.Horse).Where(h => h != null).Cast<Horse>().ToList();
        var records = await _medicalDao.GetByRequestIdAsync(requestId);
        return MapToCustomerDto(req, horses, records, Math.Max(1, horses.Count), 3, ParseHorseNotes(req.Purpose));
    }

    public async Task<bool> CancelRequestAsync(string customerId, string requestId, string reason)
    {
        var req = await _requestDao.GetByIdAsync(requestId);
        if (req == null || req.CustomerId != customerId)
        {
            return false;
        }

        req.Status = "CANCELLED";
        req.Purpose = $"{req.Purpose}|CANCELLED_REASON:{reason}";
        await _requestDao.UpdateAsync(req);
        return true;
    }

    public async Task<ContractResponseDto> GetContractAsync(string customerId, string requestId)
    {
        var trip = await _tripPlanDao.GetByRequestIdAsync(requestId);
        Contract? contract = null;
        if (trip != null)
        {
            contract = await _contractDao.GetByTripIdAsync(trip.TripId);
        }

        if (contract == null)
        {
            // Kiểm tra theo customer
            var contracts = await _contractDao.GetByCustomerIdAsync(customerId);
            contract = contracts.FirstOrDefault();
        }

        if (contract == null)
        {
            return new ContractResponseDto { CurrentVersion = null };
        }

        var total = contract.TotalQuotedPrice ?? 50000000m;
        var depositPct = Convert.ToInt32(contract.DepositRateStandard ?? 30m);
        var depositAmount = total * depositPct / 100m;

        var versionDto = new ContractVersionDto
        {
            V = 1,
            Number = contract.ContractCode,
            ContractId = contract.ContractId,
            Mode = "ROAD",
            IssuedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
            ValidUntil = DateTime.UtcNow.AddHours(24).ToString("yyyy-MM-dd HH:mm"),
            Total = total,
            DepositPct = depositPct,
            DepositAmount = depositAmount,
            Currency = "VND",
            State = contract.ContractStatus == "SIGNED" ? "EFFECTIVE" : "ISSUED",
            Terms = GetDefaultTerms(),
            Items = new List<ContractItemDto>
            {
                new() { Desc = "Cước vận chuyển ngựa chuyên dụng", Amount = total * 0.7m, Required = true },
                new() { Desc = "Phí chăm sóc thú y & kiểm dịch", Amount = total * 0.2m, Required = true },
                new() { Desc = "Bảo hiểm rủi ro vận tải", Amount = total * 0.1m, Required = true }
            },
            SignedAt = contract.SignedAt?.ToString("yyyy-MM-dd HH:mm")
        };

        return new ContractResponseDto { CurrentVersion = versionDto };
    }

    public async Task<bool> AcceptTermsAsync(string customerId, string contractId, int versionNo)
    {
        var contract = await _contractDao.GetByIdAsync(contractId);
        if (contract == null || contract.CustomerId != customerId) return false;
        contract.ContractStatus = "TERMS_ACCEPTED";
        await _contractDao.UpdateAsync(contract);
        return true;
    }

    public async Task<bool> RequestContractFeedbackAsync(string customerId, string contractId, int versionNo, string text)
    {
        var contract = await _contractDao.GetByIdAsync(contractId);
        if (contract == null || contract.CustomerId != customerId) return false;
        contract.ContractStatus = "CHANGES_REQUESTED";
        await _contractDao.UpdateAsync(contract);
        return true;
    }

    public async Task<SignOtpResponseDto> SendSignOtpAsync(string customerId, string contractId, int versionNo)
    {
        var user = await _userDao.GetByIdAsync(customerId);
        if (user == null || string.IsNullOrWhiteSpace(user.Email))
        {
            throw new BusinessRuleException("Không tìm thấy thông tin email người dùng", StatusCodes.Status400BadRequest, "USER_NO_EMAIL");
        }

        var otp = new Random().Next(100000, 999999).ToString();
        var cacheKey = $"SIGN_OTP_{contractId}_{versionNo}";
        _cache.Set(cacheKey, otp, TimeSpan.FromMinutes(5));

        try
        {
            await _emailService.SendEmailAsync(user.Email, "Mã OTP ký kết Hợp đồng vận chuyển ngựa",
                $"Mã OTP xác thực ký hợp đồng của bạn là: <b>{otp}</b>. Mã có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi gửi email OTP ký hợp đồng");
        }

        return new SignOtpResponseDto
        {
            ExpiresInSeconds = 300,
            ResendAfterSeconds = 60,
            SentTo = user.Email
        };
    }

    public async Task<SignContractResponseDto> SignContractAsync(string customerId, string contractId, int versionNo, string otp)
    {
        var cacheKey = $"SIGN_OTP_{contractId}_{versionNo}";
        if (!_cache.TryGetValue<string>(cacheKey, out var expectedOtp) || expectedOtp != otp)
        {
            throw new BusinessRuleException("Mã OTP không hợp lệ hoặc đã hết hạn", StatusCodes.Status400BadRequest, "INVALID_OTP");
        }

        var contract = await _contractDao.GetByIdAsync(contractId);
        if (contract == null || contract.CustomerId != customerId)
        {
            throw new BusinessRuleException("Không tìm thấy hợp đồng", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        contract.SignedAt = DateTime.UtcNow;
        contract.ContractStatus = "SIGNED";
        await _contractDao.UpdateAsync(contract);

        var trip = await _tripPlanDao.GetByIdAsync(contract.TripId);
        if (trip != null)
        {
            var req = await _requestDao.GetByIdAsync(trip.RequestId);
            if (req != null)
            {
                req.Status = "ACTIVATED";
                await _requestDao.UpdateAsync(req);
            }
        }

        return new SignContractResponseDto
        {
            RequestId = trip?.RequestId ?? "REQ_001",
            RequestStatus = "ACTIVATED",
            TripId = contract.TripId,
            TripStatus = "PLANNING",
            SignedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
        };
    }

    public async Task<DepositInfoDto> GetDepositInfoAsync(string customerId, string requestId)
    {
        var trip = await _tripPlanDao.GetByRequestIdAsync(requestId);
        Contract? contract = null;
        if (trip != null) contract = await _contractDao.GetByTripIdAsync(trip.TripId);

        if (contract == null)
        {
            var contracts = await _contractDao.GetByCustomerIdAsync(customerId);
            contract = contracts.FirstOrDefault();
        }

        if (contract == null)
        {
            throw new BusinessRuleException("Chưa phát hành hợp đồng cho đơn này", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        var invoice = await _invoiceDao.GetDepositInvoiceByContractIdAsync(contract.ContractId);
        if (invoice == null)
        {
            var depositAmount = (contract.TotalQuotedPrice ?? 50000000m) * (contract.DepositRateStandard ?? 30m) / 100m;
            invoice = new Invoice
            {
                InvoiceId = $"INV_{Guid.NewGuid().ToString()[..8].ToUpperInvariant()}",
                ContractId = contract.ContractId,
                InvoiceType = "DEPOSIT",
                CurrencyCode = "VND",
                TotalPayableAmount = depositAmount,
                PaidAmount = 0,
                PaymentStatus = "UNPAID",
                DueDate = DateTime.UtcNow.AddHours(24)
            };
            await _invoiceDao.AddAsync(invoice);
        }

        return new DepositInfoDto
        {
            InvoiceId = invoice.InvoiceId,
            CanPay = invoice.PaymentStatus != "PAID",
            Amount = invoice.TotalPayableAmount,
            Status = invoice.PaymentStatus
        };
    }

    public async Task<PaymentSessionResponseDto> CreatePaymentSessionAsync(string customerId, string invoiceId, string method, string clientIp)
    {
        var invoice = await _invoiceDao.GetByIdAsync(invoiceId);
        if (invoice == null)
        {
            throw new BusinessRuleException("Không tìm thấy hóa đơn", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        var gateway = new Infrastructure.ExternalServices.Vnpay.VnpayGateway(_config);
        var paymentId = $"PAY_{DateTime.UtcNow.Ticks}";

        var paymentUrl = gateway.CreateUrl(new Infrastructure.ExternalServices.Vnpay.VnpayPaymentRequest
        {
            Id = paymentId,
            Amount = invoice.TotalPayableAmount,
            CreatedAt = DateTime.UtcNow
        }, clientIp);

        return new PaymentSessionResponseDto
        {
            Id = paymentId,
            PaymentUrl = paymentUrl
        };
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private static bool IsValidMagicBytes(byte[] header, string extension)
    {
        if (header.Length < 4) return false;
        var ext = extension.ToLowerInvariant();
        if (ext == ".pdf") return header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46;
        if (ext == ".png") return header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47;
        if (ext == ".jpg" || ext == ".jpeg") return header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF;
        if (ext == ".webp") return header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46;
        return true;
    }

    private static List<ContractTermDto> GetDefaultTerms() => new()
    {
        new() { Title = "Phạm vi dịch vụ", Text = "Vận chuyển ngựa từ điểm nhận đến điểm giao theo tuyến đã thống nhất, bao gồm chăm sóc cơ bản trong hành trình." },
        new() { Title = "Giá trị hợp đồng", Text = "Giá trị hợp đồng là giá chính thức; không phát sinh chi phí ngoài các khoản đã liệt kê nếu không có thỏa thuận bằng văn bản." },
        new() { Title = "Quy định thanh toán", Text = "Khách hàng thanh toán tiền cọc theo tỷ lệ ghi trong hợp đồng. Nút ký OTP chỉ mở sau khi tiền cọc được xác minh." },
        new() { Title = "Thời hạn hiệu lực", Text = "Hạn chung 24 giờ kể từ khi phát hành áp dụng cho thanh toán cọc, xác minh và ký OTP; Manager có thể gia hạn." }
    };

    private static Dictionary<string, string> ParseHorseNotes(string? purpose)
    {
        if (string.IsNullOrWhiteSpace(purpose)) return new Dictionary<string, string>();
        var parts = purpose.Split('|');
        if (parts.Length > 1)
        {
            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, string>>(parts[1]) ?? new Dictionary<string, string>();
            }
            catch { }
        }
        return new Dictionary<string, string>();
    }

    private static CustomerTransportRequestDto MapToCustomerDto(
        TransportRequest req,
        List<Horse> horses,
        List<LegalMedicalRecord> records,
        int horseCount,
        int wizardStep,
        Dictionary<string, string> notes)
    {
        var careNotes = req.Purpose?.Split('|').FirstOrDefault() ?? "";

        var dto = new CustomerTransportRequestDto
        {
            Id = req.RequestId,
            Origin = req.Departure,
            Destination = req.Destination,
            Date = req.ExpectedDate?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
            HorseCount = horses.Count > 0 ? horses.Count : horseCount,
            RequestedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
            SubmittedAt = req.Status != "DRAFT" ? DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm") : "",
            Status = req.Status,
            CareNotes = careNotes,
            Pickup = new PlaceDto
            {
                Name = req.Departure,
                Address = req.Departure,
                Contact = req.DesignatedReceiverName ?? "Người gửi",
                Phone = req.DesignatedReceiverPhone ?? "+84901234567",
                Postal = "",
                Notes = ""
            },
            Delivery = new PlaceDto
            {
                Name = req.Destination,
                Address = req.Destination,
                Contact = req.DesignatedReceiverName ?? "Người nhận",
                Phone = req.DesignatedReceiverPhone ?? "+84901234567",
                Postal = "",
                Notes = ""
            },
            Horses = horses.Select(h => h.HorseId).ToList(),
            HorseNotes = notes,
            WizardStep = wizardStep,
            Docs = records.Where(r => !string.IsNullOrEmpty(r.UploadedFileUrl)).Select(r => new DocRecordDto
            {
                Key = r.DocumentType?.ToLowerInvariant() ?? "doc",
                Scope = r.HorseId,
                Status = r.DocumentStatus ?? "SUBMITTED",
                File = new FileRefDto { Name = Path.GetFileName(r.UploadedFileUrl), Url = r.UploadedFileUrl },
                UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
            }).ToList()
        };

        return dto;
    }
}
