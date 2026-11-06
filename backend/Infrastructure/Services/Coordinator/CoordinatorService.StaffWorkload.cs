using System.Text.Json;
using Application.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public partial class CoordinatorService
    {
        /// <summary>Chuyến còn giữ nhân sự tổ xe: chưa bàn giao xong. Khi chuyến COMPLETED hoặc bị hủy, nhân sự được giải phóng.</summary>
        private static readonly string[] CrewHoldingTripStatuses = { "PLANNING", "READY_TO_DEPART", "IN_TRANSIT", "PENDING_APPROVAL", "PLAN_APPROVED", "RETURNED" };

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

            // Đồng thời kiểm tra nhân sự đã được lưu trong phương án (DraftPlanJson / ApprovedPlanJson) của các chuyến chưa bàn giao
            var activeTrips = await _context.TripPlans
                .Where(t => t.TripId != exceptTripId && CrewHoldingTripStatuses.Contains(t.Status) && (!string.IsNullOrEmpty(t.DraftPlanJson) || !string.IsNullOrEmpty(t.ApprovedPlanJson)))
                .Select(t => new { t.TripId, t.DraftPlanJson, t.ApprovedPlanJson })
                .ToListAsync();

            foreach (var t in activeTrips)
            {
                foreach (var json in new[] { t.ApprovedPlanJson, t.DraftPlanJson })
                {
                    if (string.IsNullOrWhiteSpace(json)) continue;
                    try
                    {
                        var plan = JsonSerializer.Deserialize<PlanDto>(json);
                        if (plan?.Resources != null)
                        {
                            foreach (var res in plan.Resources)
                            {
                                if (res.Crew == null) continue;
                                foreach (var code in new[] { res.Crew.MainDriver, res.Crew.CoDriver, res.Crew.Veterinarian })
                                {
                                    var uid = StaffDirectoryLinks.UserIdFor(code) ?? (!string.IsNullOrWhiteSpace(code) && code.StartsWith("USER_", StringComparison.OrdinalIgnoreCase) ? code.Trim() : null);
                                    if (!string.IsNullOrEmpty(uid)) busy.TryAdd(uid, t.TripId);
                                }
                            }
                        }
                    }
                    catch { }
                }
            }

            return busy;
        }

        /// <summary>
        /// Từ chối phương án nếu nhân sự trong phần nguồn lực (mã danh bạ EMP-xx hoặc USER_xx) đang được giao cho một chuyến khác chưa bàn giao xong.
        /// Kiểm tra ngay khi điều phối lưu nháp, nộp tuyến và xác nhận nguồn lực, không đợi tới lúc Manager duyệt khởi hành.
        /// </summary>
        private async Task EnsureCrewFreeAsync(string tripId, IEnumerable<RoadResourcesDto>? resources)
        {
            if (resources == null) return;
            var list = resources.ToList();
            if (list.Count == 0) return;
            var busy = await CrewBusyOnOtherTripsAsync(tripId);
            if (busy.Count == 0) return;
            static string? ToUserId(string? code) =>
                StaffDirectoryLinks.UserIdFor(code) ?? (!string.IsNullOrWhiteSpace(code) && code.StartsWith("USER_", StringComparison.OrdinalIgnoreCase) ? code.Trim() : null);
            foreach (var resource in list)
            {
                foreach (var (role, code) in new[] { ("Tài xế chính", resource.Crew?.MainDriver), ("Phụ lái", resource.Crew?.CoDriver), ("Bác sĩ thú y", resource.Crew?.Veterinarian) })
                {
                    var userId = ToUserId(code);
                    if (userId != null && busy.TryGetValue(userId, out var otherTrip))
                        throw new InvalidOperationException("STAFF_BUSY_ON_ACTIVE_TRIP: " + CrewBusyMessage(role, userId, otherTrip));
                }
            }
        }

        private async Task EnsureCrewFreeFromPlanJsonAsync(string tripId, params string?[] planJsons)
        {
            foreach (var json in planJsons)
            {
                if (string.IsNullOrWhiteSpace(json)) continue;
                PlanDto? plan = null;
                try { plan = JsonSerializer.Deserialize<PlanDto>(json); } catch (JsonException) { }
                if (plan?.Resources is { Count: > 0 }) { await EnsureCrewFreeAsync(tripId, plan.Resources); return; }
            }
        }

        private static string CrewBusyMessage(string role, string userId, string otherTripId) =>
            $"{role} {userId} đang được giao cho chuyến {otherTripId} chưa bàn giao xong; chỉ gán được sang chuyến khác sau khi chuyến đó bàn giao.";
    }
}
