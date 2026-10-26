using Application.Flow1.Dtos;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace WebApi.Extensions.Flow1;

public sealed class NoteDescriptions : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type == typeof(ContactInput) && schema.Properties.TryGetValue("cityId", out var city))
        {
            schema.Required.Add("cityId");
            city.Description = "ID địa giới Geoapify từ GET /api/locations/cities, cùng quốc gia của điểm nhận/giao. Backend xác minh tọa độ nằm trong địa giới; cityName lấy từ nhà cung cấp, không nhập từ client.";
            city.Example = new OpenApiString("COPY_CITY_ID_FROM_LOCATIONS_CITIES");
        }
        if (context.Type == typeof(RequestDraftInput) || context.Type == typeof(RequestUpdateInput))
        {
            foreach (var name in new[] { "expectedTransportDate", "expectedDeliveryDate" })
            {
                schema.Required.Add(name);
                if (schema.Properties.TryGetValue(name, out var date))
                {
                    date.Format = "date";
                    date.Pattern = @"^\d{4}-\d{2}-\d{2}$";
                }
            }
            if (schema.Properties.TryGetValue("expectedTransportDate", out var start))
                start.Description = "Ngày bắt đầu vận chuyển dự kiến, dạng yyyy-MM-dd. Không phải thời điểm tạo đơn.";
            if (schema.Properties.TryGetValue("expectedDeliveryDate", out var end))
                end.Description = "Ngày kết thúc vận chuyển/giao ngựa dự kiến, dạng yyyy-MM-dd; bằng hoặc sau ngày bắt đầu. Cùng ngày dùng khi chuyến hoàn thành trong ngày.";
        }
        if (context.Type == typeof(HorseInput) && schema.Properties.TryGetValue("healthNotes", out var health))
        {
            health.Description = "Lưu ý sức khỏe riêng của ngựa, tối đa 2.000 ký tự. Gửi chuỗi rỗng nếu không có lưu ý. Đây là dữ liệu hồ sơ ngựa, không phải hướng dẫn cho một chuyến cụ thể.";
            health.Example = new OpenApiString("Nhạy cảm với tiếng ồn.");
        }
        if ((context.Type == typeof(RequestDraftInput) || context.Type == typeof(RequestUpdateInput))
            && schema.Properties.TryGetValue("careInstructions", out var care))
        {
            care.Description = "Hướng dẫn chăm sóc áp dụng cho yêu cầu/chuyến vận chuyển này. Lưu ý sức khỏe cố định của từng ngựa được khai báo riêng ở healthNotes trong hồ sơ ngựa.";
            care.Example = new OpenApiString("Tiếp cận ngựa nhẹ nhàng trong quá trình nhận và giao.");
        }
    }
}
