using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface ILegalMedicalRecordDAO : IBaseDAO<LegalMedicalRecord>
{
    Task<List<LegalMedicalRecord>> GetByRequestIdAsync(string requestId, CancellationToken cancellationToken = default);
    Task<List<LegalMedicalRecord>> GetByHorseIdAsync(string horseId, CancellationToken cancellationToken = default);
    Task<LegalMedicalRecord?> GetByHorseAndDocumentTypeAsync(string requestId, string horseId, string documentType, CancellationToken cancellationToken = default);
}
