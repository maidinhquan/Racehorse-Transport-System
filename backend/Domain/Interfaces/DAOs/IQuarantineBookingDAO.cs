using Domain.Entities;

namespace Domain.Interfaces.DAOs;

public interface IQuarantineBookingDAO : IBaseDAO<QuarantineBooking>
{
    Task<List<QuarantineBooking>> GetByRequestIdAsync(string requestId, CancellationToken cancellationToken = default);
    Task<List<QuarantineBooking>> GetByFacilityIdAsync(string facilityId, CancellationToken cancellationToken = default);
    Task<List<QuarantineBooking>> GetAllBookingsAsync(CancellationToken cancellationToken = default);
}
