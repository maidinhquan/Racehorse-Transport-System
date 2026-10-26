using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Any;
using Swashbuckle.AspNetCore.SwaggerGen;
using WebApi.Extensions.Flow1;

namespace WebApi.Extensions;

// Documentation only; routes, DTOs, authorization and service guards are unchanged.
public sealed class Flow1SwaggerExamples : IOperationFilter
{
    private static readonly IReadOnlyDictionary<string, string> Responses = new Dictionary<string, string>
    {
        ["400"] = "Dữ liệu gửi lên bị thiếu, sai định dạng hoặc không hợp lệ. Kiểm tra các trường và mã lỗi trong phản hồi.",
        ["401"] = "Chưa đăng nhập, token hết hạn hoặc token không hợp lệ. Đăng nhập và gửi token Bearer trong Authorization.",
        ["403"] = "Tài khoản không có vai trò được phép thực hiện thao tác hoặc đã ngừng hoạt động.",
        ["404"] = "Không tìm thấy tài nguyên hoặc tài nguyên không thuộc phạm vi người gọi được phép xem.",
        ["409"] = "Trạng thái hiện tại không cho phép thao tác, phiên bản không còn hiện hành hoặc dữ liệu bị xung đột. Đọc lại dữ liệu trước khi thử lại.",
        ["429"] = "Gửi yêu cầu quá thường xuyên. Chờ hết thời gian giới hạn hoặc thời gian gửi lại OTP rồi thử lại.",
        ["500"] = "Lỗi xử lý phía máy chủ hoặc cấu hình nghiệp vụ không hợp lệ. Kiểm tra mã lỗi và log backend.",
        ["503"] = "Database, cấu trúc database hoặc dịch vụ cần thiết như bản đồ, SMTP, PDF, VNPAY chưa được cấu hình đúng hoặc chưa sẵn sàng."
    };

    private static readonly IReadOnlyDictionary<string, string> Parameters = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["requestId"] = "Mã yêu cầu vận chuyển, ví dụ REQUEST_001. Quyền truy cập được kiểm tra theo tài khoản đang đăng nhập.",
        ["horseId"] = "Mã ngựa, ví dụ HORSE_001. Ngựa phải thuộc phạm vi được phép truy cập.",
        ["contractId"] = "Mã hợp đồng, ví dụ CONTRACT_001.",
        ["versionNo"] = "Số phiên bản nội dung hợp đồng, bắt đầu từ 1. Đây không phải mã chống cập nhật đồng thời.",
        ["invoiceId"] = "Mã hóa đơn tiền cọc, ví dụ INVOICE_001.",
        ["paymentId"] = "Mã giao dịch thanh toán, ví dụ PAYMENT_001.",
        ["notificationId"] = "Mã thông báo thuộc tài khoản đang đăng nhập, ví dụ NOTIFICATION_001.",
        ["recordId"] = "Mã bản ghi giấy tờ theo yêu cầu, ví dụ LEGAL_MEDICAL_RECORD_001.",
        ["originCountry"] = "Mã nước đi đang hoạt động trong COUNTRY, ví dụ VN.",
        ["destinationCountry"] = "Mã nước đến đang hoạt động trong COUNTRY, ví dụ JP. Chính sách COUNTRY được tra theo nước đến.",
        ["mode"] = "Phương thức vận chuyển trong tuyến được hỗ trợ, ví dụ ROAD hoặc AIR.",
        ["date"] = "Ngày dự kiến theo dạng yyyy-MM-dd, ví dụ 2026-12-20.",
        ["excludeRequestId"] = "Không tính xung đột với chính yêu cầu này khi chọn ngựa. Nếu truyền, yêu cầu phải thuộc khách hàng.",
        ["q"] = "Địa chỉ hoặc từ khóa địa điểm cần tìm.",
        ["country"] = "Mã nước gồm hai chữ cái viết hoa, ví dụ VN hoặc JP.",
        ["lat"] = "Vĩ độ của điểm cần hiển thị, trong khoảng -90 đến 90.",
        ["lng"] = "Kinh độ của điểm cần hiển thị, trong khoảng -180 đến 180.",
        ["fileType"] = "Loại hồ sơ ngựa: photo (ảnh), passport (hộ chiếu), ownership (sở hữu), value-proof (chứng minh giá trị).",
        ["documentType"] = "Loại giấy tờ hồ sơ ngựa hoặc mã giấy tờ y tế viết hoa. Nếu có nhiều bản cùng loại, tải theo recordId.",
        ["id"] = "Mã chuyến được phân công, ví dụ TRIP_001.",
        ["tripId"] = "Mã chuyến vận chuyển, ví dụ TRIP_001.",
        ["eventId"] = "Mã sự kiện bàn giao đã lưu khi phân công; phải khớp chuyến và nhân sự đang đăng nhập.",
        ["horse"] = "Mã ngựa thuộc yêu cầu của chuyến đang được giao.",
        ["kind"] = "Loại tệp hồ sơ ngựa: photo, passport, ownership hoặc value-proof.",
        ["document"] = "Mã medical record thuộc yêu cầu của chuyến được giao."
    };

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var controller = context.MethodInfo.DeclaringType;
        if (controller?.Namespace != "WebApi.Controllers.Flow1") return;

        var note = EndpointDescriptions.Find(controller.Name, context.MethodInfo.Name);
        var position = FlowOrder.Find(controller.Name, context.MethodInfo.Name);
        operation.Tags = [new OpenApiTag { Name = position?.Group ?? "Flow 1 · Chức năng khác" }];
        operation.Summary = (position is null ? "" : $"{position.Step:00}. ") + (note?.Title ?? "Chức năng Flow 1");
        if (position is not null) operation.Extensions["x-flow-order"] = new OpenApiInteger(position.Rank);
        operation.Description = $"**Chức năng:** {note?.Function ?? "Tài liệu chức năng đang được bổ sung."}\n\n" +
            $"**Ai được dùng:** {Audience(context)}\n\n" +
            $"**Điều kiện:** {note?.Conditions ?? "Thực hiện theo quyền truy cập và trạng thái nghiệp vụ hiện tại."}";

        var authorization = Authorization(context);
        var isPublic = IsPublic(context) || authorization.Length == 0;
        // An anonymous requirement is emitted explicitly; an empty list is omitted by this OpenAPI writer.
        if (isPublic) operation.Security = [new OpenApiSecurityRequirement()];

        if (controller.Name == "VnpayController")
        {
            operation.Responses["200"] = new OpenApiResponse { Description = "Kết quả tiếp nhận IPN. RspCode: 00 = đã ghi nhận; 02 = đã xử lý trước đó; 97 = chữ ký/dữ liệu không hợp lệ; 01 = không tìm thấy giao dịch; 04 = sai số tiền hoặc merchant. HTTP 200 không đồng nghĩa thanh toán thành công." };
            operation.Responses["500"] = new OpenApiResponse { Description = Responses["500"] };
            operation.Responses["503"] = new OpenApiResponse { Description = Responses["503"] };
            return;
        }

        foreach (var parameter in operation.Parameters)
            if (Parameters.TryGetValue(parameter.Name, out var description)) parameter.Description = description;

        if (controller.Name == "RequestsController" && context.MethodInfo.Name == "CreateAsync")
            operation.Parameters.Add(new OpenApiParameter
            {
                Name = "Idempotency-Key", In = ParameterLocation.Header, Required = true,
                Description = "UUID do phía gọi tạo cho một thao tác tạo yêu cầu. Giữ nguyên khóa khi gửi lại cùng thao tác do timeout; không đổi khóa chỉ vì mạng chậm và không dùng lại cho nội dung khác.",
                Schema = new OpenApiSchema { Type = "string", Format = "uuid" }
            });

        if (operation.RequestBody is not null)
            operation.RequestBody.Description = operation.RequestBody.Content.ContainsKey("multipart/form-data")
                ? "Gửi tệp và các trường biểu mẫu bằng multipart/form-data; tệp tối đa 10 MiB."
                : "Dữ liệu JSON cho thao tác này. Điền các trường bắt buộc theo schema; không truyền trường ngoài DTO. Tiền dùng VND nguyên; ngày giờ dùng UTC theo định dạng của từng trường.";

        foreach (var (status, description) in Responses)
        {
            if ((status is "401" or "403") && isPublic) continue;
            if (!operation.Responses.TryGetValue(status, out var response)) operation.Responses[status] = response = new OpenApiResponse();
            response.Description = description;
        }

        var successStatus = (note?.SuccessStatus ?? 200).ToString();
        if (successStatus != "200" && operation.Responses.Remove("200", out var defaultResponse))
            operation.Responses.TryAdd(successStatus, defaultResponse);
        if (!operation.Responses.TryGetValue(successStatus, out var success)) operation.Responses[successStatus] = success = new OpenApiResponse();
        success.Description = successStatus == "201" ? "Tạo hoặc phát hành thành công. Kết quả chứa mã tài nguyên và trạng thái đã lưu." : "Thực hiện thành công. Xem nội dung phản hồi bên dưới.";

        if (controller.Name == "PaymentsController" && context.MethodInfo.Name == "ReceiptAsync")
        {
            operation.Responses.Remove("200");
            operation.Responses["501"] = new OpenApiResponse { Description = "Chưa hỗ trợ tải biên nhận: schema hiện tại không lưu tệp PDF biên nhận. Sau khi kiểm tra quyền, API trả PAYMENT_RECEIPT_UNAVAILABLE; dùng API xem giao dịch để đọc bằng chứng thanh toán." };
        }
    }

    private static IAuthorizeData[] Authorization(OperationFilterContext context) =>
        context.MethodInfo.DeclaringType!.GetCustomAttributes(true).Concat(context.MethodInfo.GetCustomAttributes(true)).OfType<IAuthorizeData>().ToArray();

    private static bool IsPublic(OperationFilterContext context) =>
        context.MethodInfo.DeclaringType!.GetCustomAttributes(true).Concat(context.MethodInfo.GetCustomAttributes(true)).OfType<IAllowAnonymous>().Any();

    private static string Audience(OperationFilterContext context)
    {
        if (context.MethodInfo.DeclaringType?.Name == "VnpayController") return "Máy chủ VNPAY gọi tự động; không yêu cầu đăng nhập bằng JWT.";
        var authorization = Authorization(context);
        if (IsPublic(context) || authorization.Length == 0) return "Mọi người, không cần đăng nhập.";

        var groups = authorization.Where(a => !string.IsNullOrWhiteSpace(a.Roles))
            .Select(a => a.Roles!.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.Ordinal)).ToArray();
        if (groups.Length == 0) return "Người dùng đã đăng nhập bằng token Bearer hợp lệ.";
        var roles = groups[0];
        foreach (var group in groups.Skip(1)) roles.IntersectWith(group);
        return string.Join(" hoặc ", roles.Select(role => role switch
        {
            "CUSTOMER" => "Khách hàng (CUSTOMER)",
            "LOGISTICS_MANAGER" => "Quản lý vận chuyển (LOGISTICS_MANAGER)",
            "TRANSPORT_SPECIALIST" => "Chuyên viên vận chuyển (TRANSPORT_SPECIALIST)",
            "FLEET_ROUTE_COORDINATOR" => "Điều phối viên (FLEET_ROUTE_COORDINATOR)",
            _ => role
        })) + ". Cần token Bearer hợp lệ của đúng vai trò.";
    }
}
