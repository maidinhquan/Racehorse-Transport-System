using System.Text;
using System.Text.Json;
using Application.DTOs.Flow1;

namespace Application.Common.Flow1;

// Metadata travels INSIDE the issued PDF; it is not a DB selection/history store.
public static class PublishedClauseSelection
{
    private const string Marker = "%RACEHORSE-CLAUSES:";
    private const string AdditionalMarker = "%RACEHORSE-ADDITIONAL-CLAUSES:";
    public static byte[] Attach(byte[] pdf, IReadOnlyList<ClauseCard> clauses, IReadOnlyList<string>? additionalClauses = null)
    {
        var comment = Encoding.ASCII.GetBytes("\n" + Marker + Convert.ToBase64String(JsonSerializer.SerializeToUtf8Bytes(clauses)) + "\n"+
            AdditionalMarker+Convert.ToBase64String(JsonSerializer.SerializeToUtf8Bytes(additionalClauses??[]))+"\n");
        // Keep the original final startxref/%%EOF pair intact. A second EOF without
        // a startxref breaks strict PDF readers, even if a browser repairs it.
        var offset = Encoding.ASCII.GetString(pdf).LastIndexOf("startxref", StringComparison.Ordinal);
        return offset >= 0 ? [.. pdf.AsSpan(0,offset), .. comment, .. pdf.AsSpan(offset)] : [.. pdf, .. comment];
    }
    public static IReadOnlyList<ClauseCard> Read(byte[] pdf)
    {
        var text = Encoding.ASCII.GetString(pdf);
        var start = text.LastIndexOf(Marker, StringComparison.Ordinal);
        if (start < 0) throw new InvalidDataException("Issued PDF has no selectable clause metadata; explicit review is required.");
        var value = text[(start + Marker.Length)..].Split('\n')[0].Trim();
        return JsonSerializer.Deserialize<ClauseCard[]>(Convert.FromBase64String(value)) ?? [];
    }
    public static IReadOnlyList<string> ReadAdditional(byte[] pdf)
    {
        var text=Encoding.ASCII.GetString(pdf);var start=text.LastIndexOf(AdditionalMarker,StringComparison.Ordinal);
        if(start<0)return [];
        var value=text[(start+AdditionalMarker.Length)..].Split('\n')[0].Trim();
        return JsonSerializer.Deserialize<string[]>(Convert.FromBase64String(value))??[];
    }
}
