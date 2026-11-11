using System.ComponentModel.DataAnnotations;

namespace Application.DTOs.Flow5;

/// <summary>
/// DTO khi Tài xế báo cáo cản trở không vào được điểm lấy ngựa
/// </summary>
public class PickupAccessBlockedRequestDto
{
    [Required(ErrorMessage = "Lý do cản trở là bắt buộc.")]
    [StringLength(500, ErrorMessage = "Lý do không được vượt quá 500 ký tự.")]
    public string Reason { get; set; } = null!;

    [Required(ErrorMessage = "Tọa độ vĩ độ (Latitude) của xe là bắt buộc.")]
    [Range(-90.0, 90.0, ErrorMessage = "Latitude phải nằm trong khoảng -90 đến 90.")]
    public decimal? Latitude { get; set; }

    [Required(ErrorMessage = "Tọa độ kinh độ (Longitude) của xe là bắt buộc.")]
    [Range(-180.0, 180.0, ErrorMessage = "Longitude phải nằm trong khoảng -180 đến 180.")]
    public decimal? Longitude { get; set; }

    [StringLength(500)]
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Hình ảnh chụp vị trí không thể vào (vật cản, đường hẹp, cổng khóa...)
    /// </summary>
    [StringLength(500)]
    public string? BlockedImageUrl { get; set; }

    /// <summary>
    /// Hình ảnh chụp vị trí chọn chỗ dời địa điểm (bãi đỗ chờ, điểm hẹn ngoài đường lớn)
    /// </summary>
    [StringLength(500)]
    public string? RelocationImageUrl { get; set; }

    /// <summary>
    /// Tên hoặc mô tả vị trí dời địa điểm do tài xế chọn/đề xuất
    /// </summary>
    [StringLength(255)]
    public string? ProposedRelocationPlaceName { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

/// <summary>
/// DTO khi Điều phối viên đề xuất phương án (Đổi điểm hẹn hoặc Điều xe nhỏ trung chuyển)
/// </summary>
public class PickupAccessResolutionRequestDto
{
    /// <summary>
    /// Hình thức giải quyết: "RELOCATING" (Dắt bộ ra điểm hẹn <500m) hoặc "SHUTTLING" (Điều xe nhỏ >=500m)
    /// </summary>
    [Required(ErrorMessage = "Hình thức giải quyết (ResolutionType) là bắt buộc.")]
    [RegularExpression("^(RELOCATING|SHUTTLING)$", ErrorMessage = "ResolutionType chỉ chấp nhận 'RELOCATING' hoặc 'SHUTTLING'.")]
    public string ResolutionType { get; set; } = null!;

    // Các trường áp dụng khi RELOCATING (< 500m)
    [StringLength(255)]
    public string? MeetingPointName { get; set; }

    [Range(-90.0, 90.0, ErrorMessage = "MeetingLatitude phải nằm trong khoảng -90 đến 90.")]
    public decimal? MeetingLatitude { get; set; }

    [Range(-180.0, 180.0, ErrorMessage = "MeetingLongitude phải nằm trong khoảng -180 đến 180.")]
    public decimal? MeetingLongitude { get; set; }

    // Các trường áp dụng khi SHUTTLING (>= 500m)
    [StringLength(50)]
    public string? ShuttleVehicleId { get; set; }

    [StringLength(50)]
    public string? ShuttleDriverId { get; set; }

    [Range(0, 100000000, ErrorMessage = "Chi phí trung chuyển phải từ 0 đến 100.000.000 VNĐ.")]
    public decimal? ShuttleCostVnd { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

/// <summary>
/// DTO khi Khách hàng phê duyệt phương án
/// </summary>
public class PickupAccessDecisionRequestDto
{
    [Required(ErrorMessage = "Quyết định phê duyệt là bắt buộc.")]
    [RegularExpression("^(APPROVED|REJECTED)$", ErrorMessage = "Quyết định chỉ chấp nhận 'APPROVED' hoặc 'REJECTED'.")]
    public string Decision { get; set; } = null!;

    [StringLength(500)]
    public string? RejectionReason { get; set; }
}

/// <summary>
/// DTO phản hồi trạng thái ngoại lệ tiếp cận điểm đón
/// </summary>
public class PickupAccessStatusResponseDto
{
    public string TripId { get; set; } = null!;
    public string PickupAccessStatus { get; set; } = null!;
    public string? RelocationMeetingPointName { get; set; }
    public decimal? RelocationLatitude { get; set; }
    public decimal? RelocationLongitude { get; set; }
    public int? RelocationDistanceMeters { get; set; }
    public string? ShuttleVehicleId { get; set; }
    public string? ShuttleDriverId { get; set; }
    public decimal? ShuttleCostVnd { get; set; }
    public string? CustomerApprovalStatus { get; set; }
    public DateTime? CustomerApprovalAt { get; set; }
    public bool SafetyBlockerActive { get; set; }
    public string? BlockedImageUrl { get; set; }
    public string? RelocationImageUrl { get; set; }
    public string Message { get; set; } = string.Empty;
}

