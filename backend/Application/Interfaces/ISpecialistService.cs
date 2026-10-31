using System.Collections.Generic;
using System.Threading.Tasks;
using Application.DTOs;

namespace Application.Interfaces
{
    public interface ISpecialistService
    {
        Task<List<SpecTripDto>> GetTripsAsync(string userId, string role);
        Task<List<CustomerDocDto>> GetCustomerDocsAsync(string? tripId = null);
        Task<List<TripDocumentDto>> GetCompanyDocumentsAsync(string? tripId = null);
        Task<List<DocRequestDto>> GetDocRequestsAsync(string? tripId = null);
        Task<List<QuarantineBookingDto>> GetQuarantineBookingsAsync(string? tripId = null);
        Task<List<DocTypeDto>> GetDocTypesAsync();
        Task<List<RegulationDto>> GetRegulationsAsync();
        Task<List<RegPackageDto>> GetPackagesAsync();
        Task<List<AuditEntryDto>> GetAuditLogsAsync(string? tripId = null);

        Task<bool> ApplyRequirementSetAsync(string tripId, string pkgId, string userId);
        Task<bool> ReviewCustomerDocAsync(string tripId, ReviewCustomerDocInputDto input, string userId);
        Task<bool> CreateDocRequestAsync(CreateDocRequestInputDto input, string userId);
        Task<bool> RecordCompanyDocumentAsync(RecordDocInputDto input, string userId);
        Task<bool> ReviewCompanyDocumentAsync(string docId, ReviewDocInputDto input, string userId);
        Task<bool> SaveInsuranceAsync(string tripId, SaveInsuranceInputDto input, string userId);
        Task<bool> VerifyInsuranceAsync(string tripId, string userId);
        Task<bool> SaveQuarantineBookingAsync(SaveBookingInputDto input, string userId);
        Task<bool> ConfirmDocsReadyAsync(string tripId, string userId);
        Task<bool> RecordClearanceAsync(string tripId, RecordClearanceInputDto input, string userId);

        Task<bool> SaveDocTypeAsync(DocTypeDto input, string userId);
        Task<bool> SaveRegulationAsync(RegulationDto input, string userId);
        Task<bool> SavePackageAsync(RegPackageDto input, string userId);

        Task<List<DocRequestDto>> GetCustomerSupplementsAsync(string requestId);
    }
}

