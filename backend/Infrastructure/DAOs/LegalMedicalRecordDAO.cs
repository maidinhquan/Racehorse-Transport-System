using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class LegalMedicalRecordDAO : BaseDAO<LegalMedicalRecord>, ILegalMedicalRecordDAO
{
    public LegalMedicalRecordDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<LegalMedicalRecord>> GetByRequestIdAsync(string requestId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(r => r.RequestId == requestId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<LegalMedicalRecord>> GetByHorseIdAsync(string horseId, CancellationToken cancellationToken = default)
    {
        return await DbSet.AsNoTracking()
            .Where(r => r.HorseId == horseId)
            .ToListAsync(cancellationToken);
    }

    public async Task<LegalMedicalRecord?> GetByHorseAndDocumentTypeAsync(string requestId, string horseId, string documentType, CancellationToken cancellationToken = default)
    {
        return await DbSet
            .FirstOrDefaultAsync(r => r.RequestId == requestId && r.HorseId == horseId && r.DocumentType == documentType, cancellationToken);
    }
}
