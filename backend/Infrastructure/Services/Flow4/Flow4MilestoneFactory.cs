using System.Globalization;
using System.Text.Json;
using Domain.Entities;
using Domain.Entities.Flow4;

namespace Infrastructure.Services.Flow4;

/// <summary>
/// Sinh các mốc hành trình (Flow 4) từ phương án tuyến mà Điều phối đã gửi và Manager đã duyệt (TRIP_PLAN.ApprovedPlanJson),
/// để tài xế thấy đúng lịch trình và tọa độ các điểm dừng. Mỗi trạm dừng/chốt kiểm soát có cả mốc đến và mốc rời đi tuần tự.
/// Hiện chỉ hỗ trợ tuyến đường bộ; chuyến hàng không giữ nguyên.
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
            var seq = 0;
            foreach (var stop in stops.EnumerateArray())
            {
                var type = stop.TryGetProperty("type", out var t) ? t.GetString() ?? "" : "";
                var name = stop.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                var last = index == count - 1;

                decimal? lat = null, lng = null;
                if (stop.TryGetProperty("geo", out var geo) && geo.ValueKind == JsonValueKind.Object
                    && geo.TryGetProperty("lat", out var la) && la.TryGetDecimal(out var latValue)
                    && geo.TryGetProperty("lng", out var lo) && lo.TryGetDecimal(out var lngValue))
                {
                    lat = latValue; lng = lngValue;
                }

                var arrivePlanned = stop.TryGetProperty("arriveAt", out var at) && DateTime.TryParse(at.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedArrive)
                    ? parsedArrive : DateTime.UtcNow;
                var departPlanned = stop.TryGetProperty("departAt", out var dt) && DateTime.TryParse(dt.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDepart)
                    ? parsedDepart : arrivePlanned.AddMinutes(30);

                if (index == 0)
                {
                    lastNumber++;
                    seq++;
                    result.Add(new TripMilestone
                    {
                        MilestoneId = "MILESTONE_" + lastNumber.ToString("000", CultureInfo.InvariantCulture),
                        TripId = trip.TripId,
                        Leg = "road",
                        MilestoneKind = "DEPARTED",
                        SequenceOrder = seq,
                        Label = $"Xuất phát từ {name}",
                        Status = "PENDING",
                        PlannedTime = arrivePlanned,
                        RequiresHealthCheck = false,
                        Latitude = lat,
                        Longitude = lng,
                    });
                }
                else if (last)
                {
                    lastNumber++;
                    seq++;
                    result.Add(new TripMilestone
                    {
                        MilestoneId = "MILESTONE_" + lastNumber.ToString("000", CultureInfo.InvariantCulture),
                        TripId = trip.TripId,
                        Leg = "road",
                        MilestoneKind = "FINAL_ARRIVED",
                        SequenceOrder = seq,
                        Label = $"Đến điểm giao {name}",
                        Status = "PENDING",
                        PlannedTime = arrivePlanned,
                        RequiresHealthCheck = false,
                        Latitude = lat,
                        Longitude = lng,
                    });
                }
                else
                {
                    var isCheckpoint = CheckpointTypes.Contains(type);
                    var arriveKind = isCheckpoint ? "CHECKPOINT_ARRIVED" : "STOP_ARRIVED";
                    var departKind = isCheckpoint ? "CHECKPOINT_DEPARTED" : "STOP_DEPARTED";
                    var arriveLabel = isCheckpoint ? $"Đến chốt kiểm soát {name}" : $"Đến trạm dừng {name}";
                    var departLabel = isCheckpoint ? $"Rời chốt kiểm soát {name}" : $"Rời trạm dừng {name}";

                    // 1. Đến trạm dừng / chốt kiểm soát
                    lastNumber++;
                    seq++;
                    result.Add(new TripMilestone
                    {
                        MilestoneId = "MILESTONE_" + lastNumber.ToString("000", CultureInfo.InvariantCulture),
                        TripId = trip.TripId,
                        Leg = "road",
                        MilestoneKind = arriveKind,
                        SequenceOrder = seq,
                        Label = arriveLabel.Length > 255 ? arriveLabel[..255] : arriveLabel,
                        Status = "PENDING",
                        PlannedTime = arrivePlanned,
                        RequiresHealthCheck = false,
                        Latitude = lat,
                        Longitude = lng,
                    });

                    // 2. Rời trạm dừng / chốt kiểm soát
                    lastNumber++;
                    seq++;
                    result.Add(new TripMilestone
                    {
                        MilestoneId = "MILESTONE_" + lastNumber.ToString("000", CultureInfo.InvariantCulture),
                        TripId = trip.TripId,
                        Leg = "road",
                        MilestoneKind = departKind,
                        SequenceOrder = seq,
                        Label = departLabel.Length > 255 ? departLabel[..255] : departLabel,
                        Status = "PENDING",
                        PlannedTime = departPlanned,
                        RequiresHealthCheck = departKind == "STOP_DEPARTED",
                        Latitude = lat,
                        Longitude = lng,
                    });
                }

                index++;
            }
        }
        catch (JsonException)
        {
            return new List<TripMilestone>();
        }
        return result;
    }
}
