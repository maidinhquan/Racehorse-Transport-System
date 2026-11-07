namespace Domain.Flow1.Entities;

/// <summary>Hợp đồng bảo hiểm của chuyến (bảng TRIP_INSURANCE) – chỉ đọc trạng thái để Quản lý biết Specialist đã xác minh chưa.</summary>
public sealed class TripInsuranceRecord
{
    public string InsuranceID { get; set; } = null!;
    public string TripID { get; set; } = null!;
    public string Status { get; set; } = null!;
    public DateTime CreatedAtUtc { get; set; }
}
