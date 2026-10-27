using System.Text.Json;
using Application.Common.Exceptions;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services;

public class Flow1ManagerService : IFlow1ManagerService
{
    private readonly ITransportRequestDAO _requestDao;
    private readonly IRequestHorseMappingDAO _mappingDao;
    private readonly ILegalMedicalRecordDAO _medicalDao;
    private readonly IContractDAO _contractDao;
    private readonly IInvoiceDAO _invoiceDao;
    private readonly ITripPlanDAO _tripPlanDao;
    private readonly IUserDAO _userDao;
    private readonly HorseTransportDbContext _context;
    private readonly ILogger<Flow1ManagerService> _logger;

    public Flow1ManagerService(
        ITransportRequestDAO requestDao,
        IRequestHorseMappingDAO mappingDao,
        ILegalMedicalRecordDAO medicalDao,
        IContractDAO contractDao,
        IInvoiceDAO invoiceDao,
        ITripPlanDAO tripPlanDao,
        IUserDAO userDao,
        HorseTransportDbContext context,
        ILogger<Flow1ManagerService> logger)
    {
        _requestDao = requestDao;
        _mappingDao = mappingDao;
        _medicalDao = medicalDao;
        _contractDao = contractDao;
        _invoiceDao = invoiceDao;
        _tripPlanDao = tripPlanDao;
        _userDao = userDao;
        _context = context;
        _logger = logger;
    }

    public async Task<List<ManagerTransportRequestDto>> GetRequestsAsync()
    {
        var requests = await _context.TransportRequests
            .AsNoTracking()
            .Include(r => r.RequestHorseMappings)
                .ThenInclude(m => m.Horse)
            .OrderByDescending(r => r.ExpectedDate)
            .ToListAsync();

        var result = new List<ManagerTransportRequestDto>();
        foreach (var req in requests)
        {
            var horses = req.RequestHorseMappings.Select(m => m.Horse).Where(h => h != null).Cast<Horse>().ToList();
            result.Add(MapToManagerDto(req, horses));
        }

        return result;
    }

    public async Task<ManagerTransportRequestDto?> GetRequestByIdAsync(string requestId)
    {
        var req = await _requestDao.GetWithHorsesAsync(requestId);
        if (req == null) return null;

        var horses = req.RequestHorseMappings.Select(m => m.Horse).Where(h => h != null).Cast<Horse>().ToList();
        return MapToManagerDto(req, horses);
    }

    public async Task<ManagerTransportRequestDto?> AcceptRequestAsync(string requestId)
    {
        var req = await _requestDao.GetWithHorsesAsync(requestId);
        if (req == null) return null;

        req.Status = "CONTRACT_PREPARATION";
        await _requestDao.UpdateAsync(req);
        _logger.LogInformation("Manager đã chấp thuận đơn {RequestId} chuyển sang CONTRACT_PREPARATION", requestId);

        var horses = req.RequestHorseMappings.Select(m => m.Horse).Where(h => h != null).Cast<Horse>().ToList();
        return MapToManagerDto(req, horses);
    }

    public async Task<ManagerTransportRequestDto?> RequestChangesAsync(string requestId, ManagerRequestChangesDto dto)
    {
        var req = await _requestDao.GetWithHorsesAsync(requestId);
        if (req == null) return null;

        req.Status = "CHANGES_REQUESTED";
        var feedbackData = JsonSerializer.Serialize(new { feedback = dto.Feedback, fields = dto.Fields });
        req.Purpose = $"{req.Purpose?.Split('|').FirstOrDefault() ?? ""}|{feedbackData}";

        await _requestDao.UpdateAsync(req);
        _logger.LogInformation("Manager yêu cầu sửa đổi đơn {RequestId}: {Feedback}", requestId, dto.Feedback);

        var horses = req.RequestHorseMappings.Select(m => m.Horse).Where(h => h != null).Cast<Horse>().ToList();
        var result = MapToManagerDto(req, horses);
        result.Feedback = dto.Feedback;
        result.RevisionFields = dto.Fields;
        return result;
    }

    public async Task<ManagerTransportRequestDto?> RejectRequestAsync(string requestId, ManagerRejectRequestDto dto)
    {
        var req = await _requestDao.GetWithHorsesAsync(requestId);
        if (req == null) return null;

        req.Status = "REJECTED";
        req.Purpose = $"{req.Purpose?.Split('|').FirstOrDefault() ?? ""}|REJECTED_REASON:{dto.Reason}";

        await _requestDao.UpdateAsync(req);
        _logger.LogInformation("Manager từ chối đơn {RequestId}: {Reason}", requestId, dto.Reason);

        var horses = req.RequestHorseMappings.Select(m => m.Horse).Where(h => h != null).Cast<Horse>().ToList();
        var result = MapToManagerDto(req, horses);
        result.Reason = dto.Reason;
        return result;
    }

    public async Task<CostPlanDto> GetCostEstimateAsync(string requestId, CostEstimateRequestDto dto)
    {
        var req = await _requestDao.GetWithHorsesAsync(requestId);
        var horseCount = req?.RequestHorseMappings.Count ?? 1;
        if (horseCount == 0) horseCount = 1;

        decimal totalValue = 0;
        if (req != null)
        {
            foreach (var m in req.RequestHorseMappings)
            {
                if (m.Horse?.DeclaredValueVnd.HasValue == true)
                {
                    totalValue += m.Horse.DeclaredValueVnd.Value;
                }
            }
        }
        if (totalValue == 0) totalValue = 100000000m * horseCount;

        var transportCost = 15000000m * horseCount;
        var crewCost = 8000000m;
        var permitCost = 5000000m * horseCount;
        var vetCost = 4000000m * horseCount;
        var insuranceCost = totalValue * 0.015m;
        var total = transportCost + crewCost + permitCost + vetCost + insuranceCost;

        return new CostPlanDto
        {
            Costs = new CostSummaryDto
            {
                Transport = transportCost,
                Crew = crewCost,
                Permit = permitCost,
                Vet = vetCost,
                Insurance = insuranceCost,
                Total = total
            },
            Days = 2,
            StableNights = 1,
            CrewCount = 2,
            DoctorCount = 1,
            VehicleCount = 1,
            RoadDistanceKm = 450,
            InsuredValueVnd = totalValue,
            MinimumInsuranceAssumed = false,
            Currency = "VND"
        };
    }

    public async Task<ContractEditorDataDto?> GetContractEditorAsync(string requestId, string? mode)
    {
        var req = await _requestDao.GetWithHorsesAsync(requestId);
        if (req == null) return null;

        var customer = await _userDao.GetByIdAsync(req.CustomerId);
        var horses = req.RequestHorseMappings.Select(m => m.Horse).Where(h => h != null).Cast<Horse>().ToList();

        var trip = await _tripPlanDao.GetByRequestIdAsync(requestId);
        Contract? contract = null;
        if (trip != null) contract = await _contractDao.GetByTripIdAsync(trip.TripId);

        var managerReqDto = MapToManagerDto(req, horses);

        var data = new ContractEditorDataDto
        {
            Request = managerReqDto,
            Customer = new ManagerCustomerInfoDto
            {
                Id = customer?.UserId ?? req.CustomerId,
                Name = customer?.FullName ?? "Khách hàng",
                Email = customer?.Email ?? "",
                Phone = customer?.Phone ?? "",
                Company = "CLB Đua Ngựa"
            },
            Horses = horses.Select(h => new ManagerHorseRefDto
            {
                Id = h.HorseId,
                Name = h.Name,
                Breed = h.Breed ?? "Thoroughbred",
                Microchip = h.MicrochipIso,
                PassportNo = h.FeiPassportNo ?? ""
            }).ToList(),
            Draft = new ManagerContractDraftDto
            {
                Mode = req.TransportType ?? "ROAD",
                DepartAt = req.ExpectedDate?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                ArriveAt = req.ExpectedDate?.AddDays(2).ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd HH:mm"),
                DepositPct = 30,
                Items = new List<ContractItemDto>
                {
                    new() { Desc = "Cước vận chuyển ngựa chuyên dụng", Amount = 35000000m, Required = true },
                    new() { Desc = "Phí chăm sóc thú y & kiểm dịch", Amount = 10000000m, Required = true },
                    new() { Desc = "Bảo hiểm rủi ro vận tải", Amount = 5000000m, Required = true }
                },
                Terms = GetDefaultTerms(),
                Budget = new Dictionary<string, decimal> { { "TRANSPORT", 25000000m }, { "VET", 6000000m } }
            },
            Defaults = new ContractEditorDefaultsDto
            {
                Terms = GetDefaultTerms()
            }
        };

        return data;
    }

    public async Task<bool> SaveContractDraftAsync(string requestId, ManagerContractDraftDto draft)
    {
        var req = await _requestDao.GetByIdAsync(requestId);
        if (req == null) return false;

        _logger.LogInformation("Manager đã lưu bản nháp hợp đồng cho đơn {RequestId}", requestId);
        return true;
    }

    public async Task<ContractVersionDto> PublishContractAsync(string requestId, int versionNo)
    {
        var req = await _requestDao.GetWithHorsesAsync(requestId);
        if (req == null)
        {
            throw new BusinessRuleException("Không tìm thấy đơn vận chuyển", StatusCodes.Status404NotFound, "NOT_FOUND");
        }

        // Tạo TripPlan nếu chưa có
        var trip = await _tripPlanDao.GetByRequestIdAsync(requestId);
        if (trip == null)
        {
            trip = new TripPlan
            {
                TripId = $"TRP_{DateTime.UtcNow:yyyyMMdd}_{Guid.NewGuid().ToString()[..6].ToUpperInvariant()}",
                RequestId = requestId,
                TotalDistanceKm = 450,
                TTotalHours = 12,
                TotalCost = 50000000m,
                Status = "PLANNING"
            };
            await _tripPlanDao.AddAsync(trip);
        }

        var contractCode = $"CTR_{DateTime.UtcNow:yyyyMMdd}_{new Random().Next(100, 999)}";
        var total = 50000000m;
        var depositPct = 30;
        var depositAmount = total * depositPct / 100m;

        var contract = new Contract
        {
            ContractId = $"CTR_{Guid.NewGuid().ToString()[..8].ToUpperInvariant()}",
            TripId = trip.TripId,
            CustomerId = req.CustomerId,
            ContractCode = contractCode,
            CurrencyCode = "VND",
            TotalQuotedPrice = total,
            BaseContractPriceP = total,
            DepositRateStandard = depositPct,
            ContractStatus = "ISSUED",
            SignedAt = null
        };
        await _contractDao.AddAsync(contract);

        // Tạo hóa đơn cọc
        var invoice = new Invoice
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

        // Cập nhật trạng thái đơn
        req.Status = "CONTRACT_READY";
        await _requestDao.UpdateAsync(req);
        _logger.LogInformation("Đã phát hành hợp đồng {ContractCode} cho đơn {RequestId}", contractCode, requestId);

        return new ContractVersionDto
        {
            V = versionNo,
            Number = contractCode,
            ContractId = contract.ContractId,
            Mode = req.TransportType ?? "ROAD",
            IssuedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
            ValidUntil = DateTime.UtcNow.AddHours(24).ToString("yyyy-MM-dd HH:mm"),
            Items = new List<ContractItemDto>
            {
                new() { Desc = "Cước vận chuyển ngựa chuyên dụng", Amount = total * 0.7m, Required = true },
                new() { Desc = "Phí chăm sóc thú y & kiểm dịch", Amount = total * 0.2m, Required = true },
                new() { Desc = "Bảo hiểm rủi ro vận tải", Amount = total * 0.1m, Required = true }
            },
            Total = total,
            DepositPct = depositPct,
            DepositAmount = depositAmount,
            Currency = "VND",
            State = "ISSUED",
            Terms = GetDefaultTerms()
        };
    }

    public async Task<bool> RespondFeedbackAsync(string contractId, ManagerRespondFeedbackDto dto)
    {
        var contract = await _contractDao.GetByIdAsync(contractId);
        if (contract == null) return false;

        contract.ContractStatus = dto.Decision == "ACCEPTED" ? "FEEDBACK_ACCEPTED" : "FEEDBACK_REJECTED";
        await _contractDao.UpdateAsync(contract);
        return true;
    }

    public async Task<bool> ExtendDeadlineAsync(string contractId, ManagerExtendDeadlineDto dto)
    {
        var contract = await _contractDao.GetByIdAsync(contractId);
        if (contract == null) return false;

        // Gia hạn thêm 24h
        _logger.LogInformation("Manager đã gia hạn thêm thời hạn cho hợp đồng {ContractId}: {Reason}", contractId, dto.Reason);
        return true;
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private static List<ContractTermDto> GetDefaultTerms() => new()
    {
        new() { Title = "Phạm vi dịch vụ", Text = "Vận chuyển ngựa từ điểm nhận đến điểm giao theo tuyến đã thống nhất, bao gồm chăm sóc cơ bản trong hành trình." },
        new() { Title = "Giá trị hợp đồng", Text = "Giá trị hợp đồng là giá chính thức; không phát sinh chi phí ngoài các khoản đã liệt kê nếu không có thỏa thuận bằng văn bản." },
        new() { Title = "Quy định thanh toán", Text = "Khách hàng thanh toán tiền cọc theo tỷ lệ ghi trong hợp đồng. Nút ký OTP chỉ mở sau khi tiền cọc được xác minh." },
        new() { Title = "Thời hạn hiệu lực", Text = "Hạn chung 24 giờ kể từ khi phát hành áp dụng cho thanh toán cọc, xác minh và ký OTP; Manager có thể gia hạn." }
    };

    private static ManagerTransportRequestDto MapToManagerDto(TransportRequest req, List<Horse> horses)
    {
        var careNotes = req.Purpose?.Split('|').FirstOrDefault() ?? "";

        var dto = new ManagerTransportRequestDto
        {
            Id = req.RequestId,
            CustomerId = req.CustomerId,
            Origin = req.Departure,
            Destination = req.Destination,
            Date = req.ExpectedDate?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
            Status = req.Status,
            SubmittedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
            CareNotes = careNotes,
            Pickup = new PlaceDto
            {
                Name = req.Departure,
                Address = req.Departure,
                Contact = req.DesignatedReceiverName ?? "Người nhận",
                Phone = req.DesignatedReceiverPhone ?? "+84901234567"
            },
            Delivery = new PlaceDto
            {
                Name = req.Destination,
                Address = req.Destination,
                Contact = req.DesignatedReceiverName ?? "Người nhận",
                Phone = req.DesignatedReceiverPhone ?? "+84901234567"
            },
            Horses = horses.Select(h => h.HorseId).ToList(),
            Dossier = horses.Select(h => new ManagerDossierItemDto
            {
                Name = $"Hồ sơ {h.Name}",
                Scope = h.HorseId,
                Status = !string.IsNullOrEmpty(h.PassportScanUrl) ? "APPROVED" : "ACTION_REQUIRED",
                File = h.PassportScanUrl
            }).ToList()
        };

        return dto;
    }
}
