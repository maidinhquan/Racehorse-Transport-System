using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng INCIDENT (Quản lý sự cố phát sinh trên đường: hỏng xe, kẹt đường, bão lũ, y tế).
/// Tương ứng bảng INCIDENT trong HorseTransportDB.sql
/// </summary>
public class IncidentDAO : BaseDAO<Incident>
{
    public IncidentDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<Incident>> GetByTripIdAsync(string tripId)
    {
        return await _dbSet.AsNoTracking().Where(i => i.TripID == tripId).OrderByDescending(i => i.ReportedAt).ToListAsync();
    }

    public async Task<List<Incident>> GetPendingApprovalAsync()
    {
        return await _dbSet.AsNoTracking().Where(i => string.IsNullOrEmpty(i.ApprovedBy)).ToListAsync();
    }

    public async Task<List<Incident>> GetByIncidentTypeAsync(string incidentType)
    {
        return await _dbSet.AsNoTracking().Where(i => i.IncidentType == incidentType).ToListAsync();
    }
}
