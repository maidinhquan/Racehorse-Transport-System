using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Any;
namespace WebApi.Extensions.Flow6;

// Navigation follows business steps; branches are not mandatory sequential calls.
public static class JourneyOrder
{
    private sealed record Stage(string Name, string Description, int[] Operations);
    private static readonly Stage[] Stages =
    [
        new("Flow 6 · 01. Tiếp nhận chuyến tại điểm giao", "Nhân sự được phân công đọc chuyến, hồ sơ nhận đầu chuyến, sức khỏe và sự cố để chuẩn bị giao.", [1,2,38,39,40]),
        new("Flow 6 · 02. Lập và kiểm tra biên bản", "Lập nháp, kiểm người nhận/ngựa/tài sản/giấy tờ, đọc và sửa nội dung trước khi gửi OTP.", [3,4,5,6,45]),
        new("Flow 6 · 03. Xác nhận bàn giao bằng OTP", "Gửi và xác nhận OTP đúng phiên bản. Hủy OTP, từ chối nhận và lập phiên bản giao lại là các nhánh theo tình huống.", [7,8,9,10,11]),
        new("Flow 6 · 04. Xem hồ sơ tất toán và biên bản đã giao", "Hồ sơ nháp được tạo hoặc lấy khi xác nhận giao. Manager có thể chuẩn bị trước; khách chỉ xem hồ sơ thuộc mình.", [14,15,16,12,13,42,41,47,46]),
        new("Flow 6 · 05. Tính số dư và lập hóa đơn cuối", "Lấy giá đã ký và tiền cọc verified. Phát hành hóa đơn đầu tiên trước điều chỉnh; sau điều chỉnh gọi lại để áp vào hóa đơn khi đủ điều kiện.", [17,18,22,23]),
        new("Flow 6 · 06. Nhánh điều chỉnh và hoàn tiền", "Chỉ dùng khi phát sinh. Manager quyết định khoản thu thêm/giảm/hoàn; ghi nhận hoàn tiền không tự chuyển tiền. Hoàn thành cần bộ xác minh đã cấu hình.", [19,20,21,27,28]),
        new("Flow 6 · 07. Thanh toán số dư qua VNPay", "Khách mở phiên và xem kết quả. VNPay gửi IPN qua URL dùng chung /api/payments/vnpay/ipn; browser Return không ghi tiền. Manager duyệt đối soát nếu thanh toán muộn.", [24,25,44,48]),
        new("Flow 6 · 08. Manager xác nhận tất toán", "Sau giao hợp lệ và đủ nghĩa vụ tài chính: chuyển SETTLED, mở thời hạn phản hồi. Không yêu cầu khách nghiệm thu riêng.", [26]),
        new("Flow 6 · 09. Khiếu nại và hỗ trợ", "Có thể khiếu nại ngay sau bàn giao dù chưa trả đủ tiền; không cần chờ bước 08. Manager xử lý OPEN → IN_PROGRESS → RESOLVED. SUPPORT dùng được sau CLOSED.", [29,30,31,32,33]),
        new("Flow 6 · 10. Đánh giá và thời hạn phản hồi", "Một đánh giá mỗi hồ sơ. Khi hết khiếu nại và nghĩa vụ tiền, mở lại đủ thời hạn; retry không kéo dài tiếp.", [34,35,43,36]),
        new("Flow 6 · 11. Đóng hồ sơ", "Chỉ đóng sau thời hạn phản hồi và hết khiếu nại/nghĩa vụ tiền. Chuyến vẫn COMPLETED, phiên bản hợp đồng vẫn SIGNED.", [37])
    ];

    public static void Apply(OpenApiOperation operation, string id)
    {
        var number = int.Parse(id[^2..]);
        var stage = Stages.Single(s => s.Operations.Contains(number));
        var group = Array.IndexOf(Stages, stage) + 1;
        var step = Array.IndexOf(stage.Operations, number) + 1;
        operation.Tags = [new() { Name = stage.Name }];
        // Reuse the existing Flow 1 UI sorter without editing its code.
        operation.Extensions["x-flow-order"] = new OpenApiInteger(6000 + group * 100 + step);
        operation.Extensions["x-flow-step"] = new OpenApiInteger(step);
    }

    public static void Apply(OpenApiDocument document)
    {
        var used = document.Paths.Values.SelectMany(p => p.Operations.Values).SelectMany(o => o.Tags).Select(t => t.Name).ToHashSet();
        var tags = (document.Tags ?? []).Where(t => t.Name != "Flow 6" && !t.Name.StartsWith("Flow 6 · ", StringComparison.Ordinal)).ToList();
        tags.AddRange(Stages.Where(s => used.Contains(s.Name)).Select(s => new OpenApiTag { Name = s.Name, Description = s.Description }));
        document.Tags = tags;
    }
}
