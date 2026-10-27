using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace WebApi.Extensions.Flow1;

public sealed record FlowStage(string Name, string Description, string[] Actions);
public sealed record FlowPosition(string Group, int Step, int Rank);

// Swagger navigation follows the user journey rather than controller names or HTTP methods.
public sealed class FlowOrder : IDocumentFilter
{
    private static readonly FlowStage[] Stages =
    [
        new("Flow 1 · 01. Hồ sơ khách hàng", "Sau khi đăng nhập, kiểm tra thông tin tài khoản khách hàng.",
        ["DirectoryController.ProfileAsync"]),
        new("Flow 1 · 02. Tạo và quản lý hồ sơ ngựa", "Xem ngựa đang có, tạo hồ sơ, tải giấy tờ và cập nhật thông tin. Chọn ngựa theo lịch ở chặng tạo yêu cầu.",
        ["HorsesController.CustomerHorsesAsync", "HorsesController.CreateAsync", "HorseFilesController.UploadAsync",
         "HorseFilesController.ReadAsync", "HorsesController.DetailAsync", "HorsesController.UpdateAsync"]),
        new("Flow 1 · 03. Tạo và gửi yêu cầu vận chuyển", "Khách hàng chọn tuyến/địa điểm, tạo bản nháp, chọn ngựa, hoàn thiện hồ sơ rồi gửi Manager duyệt.",
        ["CatalogsController.RoutesAsync", "CatalogsController.OptionsAsync", "LocationsController.CitiesAsync", "LocationsController.SearchAsync",
         "MapboxPreviewController.Get", "RequestsController.CreateAsync", "HorsesController.SelectableAsync",
         "RequestsController.UpdateAsync", "RequestDocumentsController.ChecklistAsync",
         "RequestDocumentsController.ReadAsync",  "RequestsController.CustomerRequestsAsync",
         "RequestsController.CustomerRequestAsync"]),
        new("Flow 1 · 04. Manager xem và duyệt yêu cầu", "Manager đọc yêu cầu/hồ sơ và chọn chấp nhận, yêu cầu bổ sung hoặc từ chối. Các quyết định là những nhánh thay thế, không phải gọi lần lượt tất cả.",
        ["DirectoryController.CustomersAsync", "RequestsController.ManagerRequestsAsync", "RequestsController.ManagerRequestAsync",
         "HorsesController.ManagerHorsesAsync", "HorseFilesController.ManagerReadAsync", "RequestDocumentsController.ManagerReadAsync",
         "RequestReviewsController.AcceptAsync", "RequestReviewsController.ChangesAsync", "RequestReviewsController.RejectAsync"]),
        new("Flow 1 · 05. Soạn và phát hành hợp đồng", "Manager mở trình soạn, xem dự toán, lưu nháp và phát hành. Xử lý phản hồi, gia hạn, nhắc việc và bỏ draft là các thao tác theo tình huống.",
        ["ContractsController.EditorAsync", "CostsController.CalculateAsync", "ContractsController.SaveAsync",
         "ContractsController.PublishAsync", "ContractsController.ManagerVersionAsync", "ContractsController.FeedbackDecisionAsync",
         "ContractsController.ExtendAsync", "ContractsController.RemindAsync", "ContractsController.DeleteAsync"]),
        new("Flow 1 · 06. Khách hàng xem và phản hồi hợp đồng", "Khách hàng xem nội dung/PDF của bản phát hành, đồng ý điều khoản hoặc gửi đề nghị sửa. Đồng ý điều khoản chưa phải ký hợp đồng.",
        ["ContractsController.CurrentAsync", "ContractsController.CustomerVersionAsync", "ContractsController.PdfAsync",
         "ContractsController.AcceptTermsAsync", "ContractsController.FeedbackAsync"]),
        new("Flow 1 · 07. Thanh toán tiền cọc", "Khách hàng xem tiền cọc và mở phiên VNPAY. IPN do VNPAY tự gọi; các API xem giao dịch chỉ đọc kết quả đã lưu.",
        ["PaymentsController.DepositAsync", "PaymentsController.SessionAsync", "VnpayController.IpnAsync",
         "PaymentsController.CustomerPaymentAsync", "PaymentsController.ListAsync", "PaymentsController.ManagerPaymentAsync",
         "PaymentsController.ReceiptAsync"]),
        new("Flow 1 · 08. Nhận OTP và ký hợp đồng", "Sau khi đồng ý điều khoản và đủ cọc đã xác minh, khách hàng nhận OTP rồi xác nhận ký.",
        ["ContractSigningController.SendAsync", "ContractSigningController.SignAsync"]),
        new("Flow 1 · 09. Phân công và bàn giao chuyến", "Manager chọn nhân sự cho chuyến đã có hợp đồng ký. Nhân sự được giao đọc hồ sơ; hold/resume dùng khi cần tạm giữ trước khởi hành.",
        ["TripAssignmentsController.ListAsync", "TripAssignmentsController.DetailAsync", "DirectoryController.StaffAsync",
         "TripAssignmentsController.AssignAsync", "HandoffsController.ListAsync", "HandoffsController.PdfAsync",
         "HandoffsController.HorseAsync", "HandoffsController.DocumentAsync", "TripAssignmentsController.HoldAsync",
         "TripAssignmentsController.ResumeAsync"]),
        new("Flow 1 · 10. Nhánh hủy yêu cầu và hoàn tiền", "Dùng khi muốn hủy trước ký, không phải bước bắt buộc sau phân công. API đánh dấu hoàn tiền không tự chuyển tiền.",
        ["CancellationsController.CustomerCancelAsync", "CancellationsController.ManagerCancelAsync",
         "CancellationsController.DecideAsync", "CancellationsController.RefundAsync"]),
        new("Flow 1 · 11. Thông báo", "Khách hàng và Manager có thể xem/đánh dấu thông báo trong suốt quá trình xử lý.",
        ["NotificationsController.CustomerNotificationsAsync", "NotificationsController.CustomerReadAsync",
         "NotificationsController.CustomerReadAllAsync", "NotificationsController.ManagerNotificationsAsync",
         "NotificationsController.ManagerReadAsync", "NotificationsController.ManagerReadAllAsync"])
    ];

    private static readonly IReadOnlyDictionary<string, FlowPosition> Positions = Stages
        .SelectMany((stage, stageIndex) => stage.Actions.Select((action, actionIndex) =>
            new KeyValuePair<string, FlowPosition>(action, new(stage.Name, actionIndex + 1, (stageIndex + 1) * 100 + actionIndex))))
        .ToDictionary(x => x.Key, x => x.Value, StringComparer.Ordinal);

    public static FlowPosition? Find(string controller, string action) => Positions.GetValueOrDefault(controller + "." + action);

    public void Apply(OpenApiDocument document, DocumentFilterContext context)
    {
        var names = document.Paths.Values.SelectMany(p => p.Operations.Values).SelectMany(o => o.Tags).Select(t => t.Name).Distinct().ToHashSet();
        var original = document.Tags?.ToDictionary(t => t.Name, StringComparer.Ordinal) ?? new Dictionary<string, OpenApiTag>();
        var tags = new List<OpenApiTag>();
        // Keep the existing authentication group intact and put it before the Flow 1 journey.
        if (names.Remove("Auth")) tags.Add(original.GetValueOrDefault("Auth") ?? new OpenApiTag { Name = "Auth" });
        foreach (var stage in Stages)
            if (names.Remove(stage.Name)) tags.Add(new OpenApiTag { Name = stage.Name, Description = stage.Description });
        foreach (var name in names.OrderBy(n => n, StringComparer.Ordinal))
            tags.Add(original.GetValueOrDefault(name) ?? new OpenApiTag { Name = name });
        document.Tags = tags;
    }
}
