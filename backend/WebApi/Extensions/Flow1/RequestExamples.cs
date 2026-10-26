using System.Globalization;
using System.Text.Json;
using Application.Flow1.Dtos;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace WebApi.Extensions.Flow1;

// Examples are documentation input, never runtime defaults, tariffs, credentials or bypass codes.
public sealed class RequestExamples : ISchemaFilter, IOperationFilter
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static DateTime TravelDay => DateTime.UtcNow.Date.AddDays(60);
    private static string Date(DateTime value) => value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    private static string Departure => TravelDay.AddHours(8).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);
    private static string Arrival => TravelDay.AddDays(2).AddHours(18).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);
    private const string Care = "Tiếp cận ngựa nhẹ nhàng; liên hệ người nhận trước khi giao.";

    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        var sample = Sample(context.Type);
        if (sample is not null) schema.Example = Example(sample);
    }

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var controller = context.MethodInfo.DeclaringType;
        if (controller?.Namespace != "WebApi.Controllers.Flow1") return;
        var action = controller.Name + "." + context.MethodInfo.Name;

        foreach (var parameter in operation.Parameters)
        {
            var value = Parameter(parameter.Name);
            if (value is null) continue;
            parameter.Example = value;
        }

        if (controller.Name == "VnpayController")
        {
            AddIpnExamples(operation);
            return;
        }

        if (operation.Parameters.Any(p => p.In == ParameterLocation.Path))
            operation.Description += "\n\n**Dữ liệu mẫu:** Các mã như HORSE_001, REQUEST_001, CONTRACT_001 chỉ minh họa. Khi test, thay bằng mã đã tạo/được phân công cho đúng tài khoản và đúng trạng thái.";

        if (operation.RequestBody is null) return;
        if (controller.Name == "RequestsController")
        {
            context.SchemaGenerator.GenerateSchema(typeof(RequestUpdateInput), context.SchemaRepository);
            operation.RequestBody.Description += " data là chuỗi JSON theo schema RequestUpdateInput, files là danh sách tệp. Các trường ngày, liên hệ/thành phố, horses và horseNotes là bắt buộc. Hồ sơ theo đơn được gắn trong documents với fileName/documentType/horseId/expiryDate; tên file phải khớp files. Hồ sơ chung dùng INVITATION_LETTER, COMPETITION_REGISTRATION, ATA_CARNET và không có horseId; hồ sơ từng ngựa dùng mã UPPER_SNAKE_CASE tối đa 50 ký tự, ví dụ COGGINS_TEST, EQUINE_FLU_VAX, DOMESTIC_VET_PASS, HEALTH_CERTIFICATE.";
        }
        var bodyType = context.MethodInfo.GetParameters().Select(p => p.ParameterType)
            .FirstOrDefault(t => t.Namespace == "Application.Flow1.Dtos");
        var sample = bodyType is null ? null : Sample(bodyType);
        sample = action switch
        {
            "RequestReviewsController.RejectAsync" => new ReasonInput("Hồ sơ hiện chưa đáp ứng phạm vi vận chuyển đã đăng ký."),
            "TripAssignmentsController.HoldAsync" => new ReasonInput("Cần kiểm tra lại phương án vận chuyển trước khi khởi hành."),
            "CancellationsController.ManagerCancelAsync" => new ReasonInput("Không thể tổ chức vận chuyển theo lịch đã thống nhất với khách hàng."),
            _ => sample
        };
        foreach (var (contentType, media) in operation.RequestBody.Content)
        {
            if (contentType.Contains("json", StringComparison.OrdinalIgnoreCase) && sample is not null)
                media.Example = Example(sample);
            if (contentType == "multipart/form-data") Multipart(media.Schema, context.SchemaRepository);
        }
        if (bodyType == typeof(SignInput))
            operation.RequestBody.Description += " OTP 123456 trong ví dụ chỉ minh họa định dạng; phải thay bằng OTP thật nhận qua email. Không có mã OTP mẫu nào được backend tự chấp nhận.";
        if (bodyType == typeof(ContractDraftInput))
            operation.RequestBody.Description += " Giá và tỷ lệ trong ví dụ là dữ liệu nhập thử của Manager, không phải bảng giá cố định của hệ thống.";
    }

    private static object? Sample(Type type)
    {
        if (type == typeof(HorseInput)) return new HorseInput("Thunder", "Thoroughbred", "STALLION", "2020-05-15",
            "981" + DateTime.UtcNow.Ticks.ToString(CultureInfo.InvariantCulture)[^12..], "500000000", "VND",
            Passport(), "Nhạy cảm với tiếng ồn.");
        if (type == typeof(PassportInput)) return Passport();
        if (type == typeof(RequestDraftInput)) return new RequestDraftInput("Hà Nội, Việt Nam", "Tokyo, Nhật Bản", "VN", "JP", "AIR", Date(TravelDay), Date(TravelDay.AddDays(2)), Care);
        if (type == typeof(RequestUpdateInput)) return new RequestUpdateInput("Hà Nội, Việt Nam", "Tokyo, Nhật Bản", "VN", "JP", "AIR", Date(TravelDay), Date(TravelDay.AddDays(2)), Care,
            Pickup(), Delivery(), ["HORSE_001"], new Dictionary<string, string> { ["HORSE_001"] = "Dùng dây dắt quen thuộc khi tiếp nhận ngựa." });
        if (type == typeof(ContactInput)) return Pickup();
        if (type == typeof(ContractDraftInput)) return new ContractDraftInput(Arrival, Budget(), Departure, 40, "", Items(), "AIR",
            "Các khoản thu được liệt kê trong hợp đồng; đây là dữ liệu minh họa để nhập thử.", Terms());
        if (type == typeof(BudgetInput)) return Budget();
        if (type == typeof(PriceItem)) return Items()[0];
        if (type == typeof(ContractTerm)) return Terms()[0];
        if (type == typeof(ReviewInput)) return new ReviewInput("Vui lòng kiểm tra và cập nhật lại số điện thoại của người nhận ngựa.");
        if (type == typeof(ReasonInput)) return new ReasonInput("Khách hàng thay đổi kế hoạch và không còn nhu cầu vận chuyển theo lịch này.");
        if (type == typeof(VersionInput)) return new VersionInput(1);
        if (type == typeof(FeedbackInput)) return new FeedbackInput(1, "Tôi đề nghị điều chỉnh giờ nhận ngựa sang buổi sáng theo lịch đã trao đổi.");
        if (type == typeof(FeedbackDecision)) return new FeedbackDecision(1, "ACCEPTED", "Đồng ý đề nghị; Manager sẽ cập nhật và phát hành phiên bản hợp đồng mới.");
        if (type == typeof(ExtensionInput)) return new ExtensionInput(1, "Khách hàng cần thêm thời gian hoàn tất thanh toán và ký trước mốc chuẩn bị chuyến.");
        if (type == typeof(PaymentInput)) return new PaymentInput("VNPAY");
        if (type == typeof(SignInput)) return new SignInput(1, "123456");
        if (type == typeof(AssignmentInput)) return new AssignmentInput("USER_006", "USER_005");
        if (type == typeof(CancellationDecision)) return new CancellationDecision("APPROVED", "Đồng ý hủy trước khi ký và chuyển sang theo dõi hoàn tiền đã nhận.");
        if (type == typeof(CostInput)) return new CostInput(Arrival, Departure, "AIR");
        return null;
    }

    private static PassportInput Passport() => new("VN-HORSE-2021-001", "Đơn vị cấp hộ chiếu ngựa", "2021-06-01", Date(DateTime.UtcNow.Date.AddYears(5)));
    private static ContactInput Pickup() => new("Trại ngựa Hà Nội", "Hà Nội, Việt Nam", "100000", "Nguyễn Văn A", "+84901234567",
        "Gọi trước 30 phút khi đến nhận ngựa.", 21.0278m, 105.8342m, "COPY_PICKUP_CITY_ID_FROM_LOCATIONS_CITIES");
    private static ContactInput Delivery() => new("Sân đua Tokyo", "Tokyo Racecourse, Fuchu, Tokyo, Japan", "1830024", "Yuki Tanaka", "+81312345678",
        "Liên hệ người nhận trước khi đến cổng.", 35.666m, 139.485m, "COPY_DELIVERY_CITY_ID_FROM_LOCATIONS_CITIES");
    private static BudgetInput Budget() => new(10000000, 2000000, 500000, 2500000, 1000000);
    private static PriceItem[] Items() =>
    [
        new(14000000, "Vận chuyển ngựa theo tuyến và lịch trong hợp đồng", true),
        new(2000000, "Hỗ trợ thủ tục vận chuyển", true),
        new(1000000, "Dịch vụ chăm sóc thú y theo nội dung thỏa thuận", true),
        new(3000000, "Bảo hiểm theo phạm vi được hai bên thỏa thuận", true)
    ];
    private static ContractTerm[] Terms() =>
    [
        new("Phạm vi dịch vụ", "Vận chuyển và chăm sóc theo danh sách ngựa, tuyến, lịch và nội dung đã được hai bên thống nhất."),
        new("Thanh toán và ký", "Khách hàng hoàn tất tiền cọc đã xác minh và ký bằng OTP trong thời hạn hoàn tất hợp đồng."),
        new("Thuế và phí", "Các khoản giá, thuế và phí áp dụng được hai bên xác nhận trong những mục thu và điều khoản của hợp đồng.")
    ];

    private static IOpenApiAny? Parameter(string name) => name.ToLowerInvariant() switch
    {
        "horseid" or "horse" => new OpenApiString("HORSE_001"),
        "requestid" or "excluderequestid" => new OpenApiString("REQUEST_001"),
        "contractid" => new OpenApiString("CONTRACT_001"),
        "versionno" => new OpenApiInteger(1),
        "invoiceid" => new OpenApiString("INVOICE_001"),
        "paymentid" => new OpenApiString("PAYMENT_001"),
        "notificationid" => new OpenApiString("NOTIFICATION_001"),
        "recordid" or "document" => new OpenApiString("LEGAL_MEDICAL_RECORD_001"),
        "tripid" or "id" => new OpenApiString("TRIP_001"),
        "eventid" => new OpenApiString("HANDOFF_EVENT_001"),
        "cityid" => new OpenApiString("COPY_CITY_ID_FROM_LOCATIONS_CITIES"),
        "origincountry" or "country" => new OpenApiString("VN"),
        "destinationcountry" => new OpenApiString("JP"),
        "mode" => new OpenApiString("AIR"),
        "expectedTransportDate" => new OpenApiString(Date(TravelDay)),
        "expectedDeliveryDate" => new OpenApiString(Date(TravelDay.AddDays(2))),
        "q" => new OpenApiString("Hà Nội"),
        "lat" => new OpenApiDouble(21.0278),
        "lng" => new OpenApiDouble(105.8342),
        "filetype" or "kind" => new OpenApiString("passport"),
        "documenttype" => new OpenApiString("PASSPORT"),
        "idempotency-key" => new OpenApiString(Guid.NewGuid().ToString()),
        _ => null
    };

    private static void Multipart(OpenApiSchema schema, SchemaRepository repository)
    {
        if (schema.Reference is not null) schema = repository.Schemas[schema.Reference.Id];
        foreach (var (name, property) in schema.Properties)
        {
            if (name.Equals("Data", StringComparison.OrdinalIgnoreCase))
            {
                property.Example = new OpenApiString(JsonSerializer.Serialize(Sample(typeof(RequestUpdateInput)), new JsonSerializerOptions(Json) {
                    WriteIndented = true, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.Create(System.Text.Unicode.UnicodeRanges.All) }));
                property.Extensions["x-request-json-editor"] = new OpenApiBoolean(true);
                property.Description = "JSON đầy đủ của yêu cầu: tuyến, hai ngày, pickup/delivery có cityId, horses, horseNotes, documents. Mỗi documents[].fileName phải khớp tên tệp trong files. Không gửi RequestID hoặc đường dẫn file.";
            }
            else if (name.Equals("Files", StringComparison.OrdinalIgnoreCase))
            {
                property.Extensions["x-request-file-picker"] = new OpenApiBoolean(true);
                property.Description = "Chọn các tệp khai báo trong data.documents. Mỗi tệp tối đa 10 MiB; tổng tối đa 60 MiB/33 tệp. Bỏ trống khi không có tệp mới; PUT giữ hồ sơ cũ nếu không gửi thay thế.";
            }
            else if (name.Equals("DocumentType", StringComparison.OrdinalIgnoreCase))
            {
                property.Example = property.Default = new OpenApiString("HEALTH_CERTIFICATE");
                property.Description = "Mã loại giấy tờ viết hoa; ví dụ HEALTH_CERTIFICATE. Upload chưa đồng nghĩa đã được chuyên viên duyệt.";
            }
            else if (name.Equals("ExpiryDate", StringComparison.OrdinalIgnoreCase))
            {
                property.Example = property.Default = new OpenApiString(DateTime.UtcNow.Date.AddYears(1).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture));
                property.Description = "Hạn của giấy tờ nếu có; có thể bỏ trống.";
            }
            else if (property.Format == "binary")
                property.Description = "Bấm chọn tệp thật từ máy; Swagger không tự chọn hoặc tải lên tệp. Tối đa 10 MiB, định dạng ảnh/PDF phù hợp loại hồ sơ.";
        }
    }

    private static void AddIpnExamples(OpenApiOperation operation)
    {
        var values = new Dictionary<string, (string Value, string Description, bool Required)>
        {
            ["vnp_TmnCode"] = ("DEMO1234", "Mã merchant Sandbox do VNPAY cấp; mã này chỉ minh họa.", true),
            ["vnp_TxnRef"] = ("PAYMENT001", "Tham chiếu của session thanh toán: PAYMENT_001 được gửi sang VNPAY dưới dạng PAYMENT001.", true),
            ["vnp_Amount"] = ("800000000", "Số tiền VND nhân 100; ví dụ này tương ứng 8.000.000 VND.", true),
            ["vnp_CurrCode"] = ("VND", "Đơn vị tiền của giao dịch.", false),
            ["vnp_ResponseCode"] = ("00", "Mã phản hồi do VNPAY gửi; 00 minh họa kết quả thành công.", true),
            ["vnp_TransactionStatus"] = ("00", "Trạng thái giao dịch do VNPAY gửi; 00 minh họa kết quả thành công.", true),
            ["vnp_TransactionNo"] = ("123456789", "Mã giao dịch thật do VNPAY cấp; bắt buộc khi thông báo thành công.", false),
            ["vnp_PayDate"] = (DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(7)).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture), "Thời điểm thanh toán theo UTC+7, dạng yyyyMMddHHmmss; cần khi thành công.", false),
            ["vnp_BankCode"] = ("NCB", "Mã ngân hàng do VNPAY trả về.", false),
            ["vnp_SecureHash"] = (new string('0', 128), "Chữ ký HMAC thật của thông báo VNPAY. Chuỗi 0 chỉ minh họa độ dài và sẽ không xác thực thành công; không nhập HashSecret vào đây.", true)
        };
        foreach (var (name, sample) in values)
            operation.Parameters.Add(new OpenApiParameter
            {
                Name = name, In = ParameterLocation.Query, Required = sample.Required, Description = sample.Description,
                Schema = new OpenApiSchema { Type = "string" }, Example = new OpenApiString(sample.Value)
            });
        operation.Description += "\n\n**Dữ liệu mẫu:** IPN là callback tự động. Các giá trị dưới đây chỉ minh họa cấu trúc; chữ ký mẫu không hợp lệ và không thể dùng để xác nhận tiền. Không điền secret merchant vào Swagger.";
    }

    private static IOpenApiAny Example(object sample) => Convert(JsonSerializer.SerializeToElement(sample, Json));
    private static IOpenApiAny Convert(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var obj = new OpenApiObject();
                foreach (var property in element.EnumerateObject()) obj[property.Name] = Convert(property.Value);
                return obj;
            case JsonValueKind.Array:
                var array = new OpenApiArray();
                foreach (var item in element.EnumerateArray()) array.Add(Convert(item));
                return array;
            case JsonValueKind.Number:
                return element.TryGetInt32(out var integer) ? new OpenApiInteger(integer) : new OpenApiDouble(element.GetDouble());
            case JsonValueKind.True: return new OpenApiBoolean(true);
            case JsonValueKind.False: return new OpenApiBoolean(false);
            case JsonValueKind.Null: return new OpenApiNull();
            default: return new OpenApiString(element.GetString());
        }
    }
}
