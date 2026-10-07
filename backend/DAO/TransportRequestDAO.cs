using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng TRANSPORT_REQUEST (Đơn đặt dịch vụ vận chuyển của khách hàng).
/// Tương ứng bảng TRANSPORTREQUEST trong HorseTransportDB.sql
/// </summary>
public class TransportRequestDAO : BaseDAO<TransportRequest>
{
    public TransportRequestDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<List<TransportRequest>> GetByCustomerIdAsync(string customerId)
    {
        return await _dbSet.AsNoTracking().Where(r => r.CustomerID == customerId).OrderByDescending(r => r.CreatedAt).ToListAsync();
    }

    public async Task<List<TransportRequest>> GetByStatusAsync(string status)
    {
        return await _dbSet.AsNoTracking().Where(r => r.Status == status).ToListAsync();
    }

    public async Task<List<TransportRequest>> GetPendingRequestsAsync()
    {
        return await _dbSet.AsNoTracking().Where(r => r.Status == "Draft" || r.Status == "PendingSurvey").ToListAsync();
    }
}
