namespace Infrastructure.Services
{
    /// <summary>
    /// Liên kết nhân sự trong danh bạ của Điều phối (mã EMP-xx, lưu trong phương án tuyến) với tài khoản đăng nhập trong bảng USER.
    /// Nhờ liên kết này chuyến Điều phối xếp mới hiện ra ở trang của đúng tài xế / bác sĩ thú y.
    /// </summary>
    public static class StaffDirectoryLinks
    {
        private static readonly Dictionary<string, string> Links = new(StringComparer.OrdinalIgnoreCase)
        {
            ["EMP-21"] = "USER_012", // Nguyen Van Hung
            ["EMP-22"] = "USER_013", // Le Quoc Tuan
            ["EMP-23"] = "USER_015", // Pham Thanh Son
            ["EMP-25"] = "USER_016", // Bui Van Long
            ["EMP-26"] = "USER_017", // Dang Van Khoa
            ["EMP-31"] = "USER_018", // BS. Nguyen Minh Anh
            ["EMP-32"] = "USER_019", // BS. Tran Quoc Bao
            ["EMP-35"] = "USER_014", // BS. Le Thu Trang
        };

        /// <summary>Mã tài khoản của nhân sự trong danh bạ, hoặc null nếu người đó chưa có tài khoản được liên kết.</summary>
        public static string? UserIdFor(string? staffCode) =>
            !string.IsNullOrWhiteSpace(staffCode) && Links.TryGetValue(staffCode.Trim(), out var userId) ? userId : null;
    }
}
