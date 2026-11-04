using System.Globalization;
using System.Text.Json;
using Domain.Entities;
using Domain.Entities.Flow4;

namespace Infrastructure.Services.Flow4;

/// <summary>
/// Sinh các mốc hành trình (Flow 4) từ phương án tuyến mà Điều phối đã gửi và Manager đã duyệt (TRIP_PLAN.ApprovedPlanJson),
/// để tài xế thấy đúng lịch trình và tọa độ các điểm dừng. Hiện chỉ hỗ trợ tuyến đường bộ; chuyến hàng không giữ nguyên.
/// </summary>
public static class Flow4MilestoneFactory
{
    private static readonly string[] CheckpointTypes = { "CHECKPOINT", "QUARANTINE_STATION" };

    /// <summary>Số thứ tự lớn nhất trong các mã dạng MILESTONE_nnn, để cấp mã mới liên tiếp.</summary>
    public static int MaxMilestoneNumber(IEnumerable<string> existingIds) =>
        existingIds.Select(id => id.StartsWith("MILESTONE_", StringComparison.Ordinal) && int.TryParse(id["MILESTONE_".Length..], out var n) ? n : 0)
            .DefaultIfEmpty(0).Max();

    public static List<TripMilestone> FromApprovedPlan(TripPlan trip, int lastNumber)
    {
        var result = new List<TripMilestone>();
        if (string.IsNullOrWhiteSpace(trip.ApprovedPlanJson)) return result;
        try
        {
            using var document = JsonDocument.Parse(trip.ApprovedPlanJson);
            var root = document.RootElement;
            if (!root.TryGetProperty("mode", out var mode) || !string.Equals(mode.GetString(), "ROAD", StringComparison.OrdinalIgnoreCase)) return result;
            if (!root.TryGetProperty("stops", out var stops) || stops.ValueKind != JsonValueKind.Array || stops.GetArrayLength() < 2) return result;

            var count = stops.GetArrayLength();
            var index = 0;
            foreach (var stop in stops.EnumerateArray())
            {
                var type = stop.TryGetProperty("type", out var t) ? t.GetString() ?? "" : "";
                var name = stop.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                var last = index == count - 1;
                var kind = index == 0 ? "DEPARTED" : last ? "FINAL_ARRIVED" : CheckpointTypes.Contains(type) ? "CHECKPOINT_ARRIVED" : "STOP_ARRIVED";
                var label = kind switch
                {
                    "DEPARTED" => $"Xuất phát từ {name}",
                    "FINAL_ARRIVED" => $"Đến điểm giao {name}",
                    "CHECKPOINT_ARRIVED" => $"Đến chốt kiểm soát {name}",
                    _ => $"Đến trạm dừng {name}",
                };
                decimal? lat = null, lng = null;
                if (stop.TryGetProperty("geo", out var geo) && geo.ValueKind == JsonValueKind.Object
                    && geo.TryGetProperty("lat", out var la) && la.TryGetDecimal(out var latValue)
                    && geo.TryGetProperty("lng", out var lo) && lo.TryGetDecimal(out var lngValue))
                {
                    lat = latValue; lng = lngValue;
                }
                var planned = stop.TryGetProperty("arriveAt", out var at) && DateTime.TryParse(at.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)
                    ? parsed : DateTime.UtcNow;
                lastNumber++;
                index++;
                result.Add(new TripMilestone
                {
                    MilestoneId = "MILESTONE_" + lastNumber.ToString("000", CultureInfo.InvariantCulture),
                    TripId = trip.TripId,
                    Leg = "road",
                    MilestoneKind = kind,
                    SequenceOrder = index,
                    Label = label.Length > 255 ? label[..255] : label,
                    Status = "PENDING",
                    PlannedTime = planned,
                    RequiresHealthCheck = kind == "STOP_ARRIVED",
                    Latitude = lat,
                    Longitude = lng,
                });
            }
        }
        catch (JsonException)
        {
            return new List<TripMilestone>();
        }
        return result;
    }
}
