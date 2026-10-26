using Application.Flow1.Dtos;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace WebApi.Extensions.Flow1;

public sealed class NoteDescriptions : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
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
