using System.Diagnostics;
using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
namespace Infrastructure.Flow6.Documents;
public sealed class DeliveryRenderer(string executable) : IDeliveryRenderer
{
    public byte[] Render(JsonObject revision)
    {
        if(!File.Exists(executable))throw new AftercareException("FEATURE_NOT_SUPPORTED","Configure Flow6:LibreOfficeExecutable for immutable delivery PDF rendering.",501);
        var folder=Path.Combine(Path.GetTempPath(),"flow6-pdf-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(folder);
        try
        {
            var html=BuildHtml(revision);
            var source=Path.Combine(folder,"delivery.html");File.WriteAllText(source,html,Encoding.UTF8);
            var start=new ProcessStartInfo(executable){UseShellExecute=false,CreateNoWindow=true};
            foreach(var arg in new[]{"-env:UserInstallation="+new Uri(Path.Combine(folder,"profile")).AbsoluteUri,"--headless","--convert-to","pdf","--outdir",folder,source})start.ArgumentList.Add(arg);
            using var process=Process.Start(start)??throw new InvalidOperationException("PDF renderer did not start.");
            if(!process.WaitForExit(30000)){process.Kill(true);throw new AftercareException("PDF_RENDER_FAILED","PDF rendering timed out.",503);}
            var output=Path.Combine(folder,"delivery.pdf");
            if(process.ExitCode!=0||!File.Exists(output))throw new AftercareException("PDF_RENDER_FAILED","PDF rendering failed.",503);
            return File.ReadAllBytes(output);
        }
        finally {Directory.Delete(folder,true);}
    }

    private static string Str(JsonNode? n)=>n is JsonValue v&&v.TryGetValue<string>(out var s)?s:"";
    private static string E(string? s)=>string.IsNullOrWhiteSpace(s)?"Chưa có":WebHtml(s);
    private static string WebHtml(string s)=>WebUtility.HtmlEncode(s);
    private static string Time(JsonNode? n)
    {
        var s=Str(n);
        if(!DateTime.TryParse(s,CultureInfo.InvariantCulture,DateTimeStyles.AdjustToUniversal|DateTimeStyles.AssumeUniversal,out var t))return "Chưa có";
        return t.AddHours(7).ToString("dd/MM/yyyy HH:mm",CultureInfo.InvariantCulture);
    }
    private static string Condition(string? c)=>c switch{"NORMAL"=>"Bình thường","MONITOR"=>"Cần theo dõi","ABNORMAL"=>"Bất thường",_=>c??""};
    private static string StatusText(string? s)=>s switch{"CONFIRMED"=>"Đã xác nhận","REFUSED"=>"Bị từ chối","AWAITING_OTP"=>"Chờ mã OTP","DRAFT"=>"Bản nháp",_=>s??""};

    private static string BuildHtml(JsonObject revision)
    {
        var content=revision["content"] as JsonObject??new JsonObject();
        var receiver=content["receiver"] as JsonObject??new JsonObject();
        var sb=new StringBuilder();
        sb.Append("<!doctype html><html><head><meta charset='utf-8'><style>")
          .Append("body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0}")
          .Append("h1{text-align:center;font-size:20px;margin:0 0 4px}")
          .Append(".sub{text-align:center;color:#555;margin:0 0 18px}")
          .Append("h2{font-size:14px;margin:18px 0 6px;border-bottom:1px solid #999;padding-bottom:3px}")
          .Append("table{width:100%;border-collapse:collapse}")
          .Append("td,th{border:1px solid #999;padding:5px 7px;text-align:left;vertical-align:top}")
          .Append("th{background:#eee;width:28%}")
          .Append("table.items th{width:auto}")
          .Append("</style></head><body>")
          .Append("<h1>BIÊN BẢN BÀN GIAO NGỰA</h1>")
          .Append("<p class='sub'>Mã biên bản: ").Append(E(Str(revision["id"]))).Append(" &nbsp;•&nbsp; Phiên bản ").Append(E(Str(revision["number"]))).Append("</p>");

        sb.Append("<h2>1. Thông tin chung</h2><table>")
          .Append("<tr><th>Trạng thái</th><td>").Append(E(StatusText(Str(revision["status"])))).Append("</td></tr>")
          .Append("<tr><th>Điểm giao</th><td>").Append(E(Str(content["location"]))).Append("</td></tr>")
          .Append("<tr><th>Thời gian lập</th><td>").Append(Time(revision["createdAtUtc"])).Append("</td></tr>")
          .Append("<tr><th>Thời gian xác nhận</th><td>").Append(Time(revision["confirmedAtUtc"])).Append("</td></tr>");
        if(!string.IsNullOrWhiteSpace(Str(revision["refusalReason"])))
            sb.Append("<tr><th>Lý do từ chối</th><td>").Append(E(Str(revision["refusalReason"]))).Append("</td></tr>");
        sb.Append("</table>");

        sb.Append("<h2>2. Người nhận</h2><table>")
          .Append("<tr><th>Họ và tên</th><td>").Append(E(Str(receiver["name"]))).Append("</td></tr>")
          .Append("<tr><th>Số điện thoại</th><td>").Append(E(Str(receiver["phone"]))).Append("</td></tr>")
          .Append("<tr><th>Đã đối chiếu thẩm quyền nhận ngựa</th><td>").Append(receiver["authorized"] is JsonValue a&&a.TryGetValue<bool>(out var ok)&&ok?"Có":"Không").Append("</td></tr>")
          .Append("</table>");

        sb.Append("<h2>3. Danh sách ngựa bàn giao</h2><table class='items'><tr><th>STT</th><th>Tên ngựa</th><th>Số vi mạch</th><th>Khớp vi mạch</th><th>Tình trạng</th><th>Tài sản đi kèm</th></tr>");
        var i=0;
        foreach(var node in content["items"] as JsonArray??new JsonArray())
        {
            if(node is not JsonObject item)continue;
            var identity=item["identity"] as JsonObject;
            var name=Str(identity?["name"]);
            var verified=item["microchipVerified"] is JsonValue v&&v.TryGetValue<bool>(out var chip)&&chip;
            sb.Append("<tr><td>").Append(++i).Append("</td><td>").Append(E(string.IsNullOrWhiteSpace(name)?Str(item["horseId"]):name))
              .Append("</td><td>").Append(E(Str(identity?["microchip"])))
              .Append("</td><td>").Append(verified?"Đã khớp":"Chưa khớp")
              .Append("</td><td>").Append(E(Condition(Str(item["condition"]))))
              .Append("</td><td>").Append(E(Str(item["assets"]))).Append("</td></tr>");
        }
        sb.Append("</table>");

        sb.Append("<h2>4. Giấy tờ bàn giao</h2><p>").Append(E(Str(content["commonDocuments"]))).Append("</p>");
        sb.Append("<table style='margin-top:40px;border:0'><tr>")
          .Append("<td style='border:0;text-align:center;width:50%'><b>Người nhận</b><br/><br/><br/>").Append(E(Str(receiver["name"]))).Append("</td>")
          .Append("<td style='border:0;text-align:center;width:50%'><b>Tài xế bàn giao</b><br/><br/><br/>&nbsp;</td>")
          .Append("</tr></table></body></html>");
        return sb.ToString();
    }
}
