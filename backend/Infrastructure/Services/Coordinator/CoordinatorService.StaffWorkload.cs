using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public partial class CoordinatorService
    {
        /// <summary>Chuyến còn giữ nhân sự tổ xe: chưa bàn giao xong. Khi chuyến COMPLETED hoặc bị hủy, nhân sự được giải phóng.</summary>
        private static readonly string[] CrewHoldingTripStatuses = { "PLANNING", "READY_TO_DEPART", "IN_TRANSIT" };

        /// <summary>Mỗi nhân sự tổ xe (tài xế, phụ lái, bác sĩ thú y/hộ tống) chỉ được giao cho một chuyến chưa bàn giao xong.</summary>
        /// <returns>userId -> mã chuyến khác đang giữ nhân sự đó (bỏ qua chuyến <paramref name="exceptTripId"/>).</returns>
        private async Task<Dictionary<string, string>> CrewBusyOnOtherTripsAsync(string? exceptTripId)
        {
            var rows = await _context.TripVehicleAssignments
                .Where(a => a.TripId != exceptTripId && a.Trip != null && CrewHoldingTripStatuses.Contains(a.Trip.Status))
                .Select(a => new { a.TripId, a.DriverId, a.CoDriverId, a.VeterinarianId, a.EscortId })
                .ToListAsync();

            var busy = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var row in rows)
            {
                foreach (var id in new[] { row.DriverId, row.CoDriverId, row.VeterinarianId, row.EscortId })
                {
                    if (!string.IsNullOrEmpty(id)) busy.TryAdd(id, row.TripId);
                }
            }
            return busy;
        }

        private static string CrewBusyMessage(string role, string userId, string otherTripId) =>
            $"{role} {userId} đang được giao cho chuyến {otherTripId} chưa bàn giao xong; chỉ gán được sang chuyến khác sau khi chuyến đó bàn giao.";
    }
}
