using Application.DTOs;

namespace Application.Interfaces
{
    public interface ISpecialistService
    {
        Task<List<SpecialistTripDto>> GetTripsAsync(CancellationToken cancellationToken = default);
        Task<SpecialistTripDto?> GetTripByIdAsync(string tripId, CancellationToken cancellationToken = default);
        Task<bool> ApplyRequirementSetAsync(string tripId, string pkgId, CancellationToken cancellationToken = default);
        Task<(bool Success, string Message)> ConfirmDocsReadyAsync(string tripId, string specialistName, CancellationToken cancellationToken = default);
        Task<bool> SaveInsuranceAsync(string tripId, InsuranceSaveDto dto, CancellationToken cancellationToken = default);
        Task<bool> VerifyInsuranceAsync(string tripId, string specialistName, CancellationToken cancellationToken = default);
        Task<bool> RecordClearanceAsync(string tripId, RecordClearanceDto dto, string specialistName, CancellationToken cancellationToken = default);
        Task<List<CustomerDocDto>> GetCustomerDocsAsync(CancellationToken cancellationToken = default);
        Task<bool> ReviewCustomerDocAsync(string tripId, ReviewCustomerDocDto dto, string specialistName, CancellationToken cancellationToken = default);
        Task<List<DocRequestDto>> GetDocRequestsAsync(CancellationToken cancellationToken = default);
        Task<DocRequestDto> CreateDocRequestAsync(CreateDocRequestDto dto, string specialistName, CancellationToken cancellationToken = default);
        Task<List<QuarantineBookingDto>> GetQuarantineBookingsAsync(CancellationToken cancellationToken = default);
        Task<bool> SaveQuarantineBookingAsync(SaveBookingDto dto, CancellationToken cancellationToken = default);
        Task<List<DocTypeDto>> GetDocTypesAsync(CancellationToken cancellationToken = default);
        Task<bool> SaveDocTypeAsync(DocTypeDto dto, CancellationToken cancellationToken = default);
        Task<List<RegulationDto>> GetRegulationsAsync(CancellationToken cancellationToken = default);
        Task<bool> SaveRegulationAsync(RegulationDto dto, CancellationToken cancellationToken = default);
        Task<List<RegPackageDto>> GetPackagesAsync(CancellationToken cancellationToken = default);
        Task<bool> SavePackageAsync(RegPackageDto dto, CancellationToken cancellationToken = default);
        Task<List<TripDocumentDto>> GetCompanyDocumentsAsync(CancellationToken cancellationToken = default);
        Task<bool> RecordCompanyDocumentAsync(TripDocumentDto dto, CancellationToken cancellationToken = default);
        Task<List<AuditEntryDto>> GetAuditLogAsync(CancellationToken cancellationToken = default);
    }
}
