using System.Security.Cryptography;
using System.Text.Json;
using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;

namespace Application.Flow1.Services;

public sealed class RequestAssessmentChecklist(IDataSession data, IPrivateFiles files)
{
    public sealed record Source(string Id, string HorseId, string HorseName, string Type, string Stage,
        string? FileKey, DateOnly? Expiry, bool Usable, string? SourceRevision)
    {
        public object View() => new
        {
            checklistItemId = Id, horseId = HorseId, HorseName, documentType = Type, Stage,
            fileAvailable = !string.IsNullOrWhiteSpace(FileKey), expiryDate = Expiry, Usable,
        };
    }

    public async Task<Source[]> LoadAsync(string requestId, DateTime delivery, CancellationToken ct)
    {
        var links = await data.ListAsync<RequestHorse>(x => x.RequestID == requestId, ct);
        var ids = links.Select(x => x.HorseID).ToArray();
        var horses = await data.ListAsync<Horse>(x => ids.Contains(x.HorseID), ct);
        var records = await data.ListAsync<MedicalRecord>(x => x.RequestID == requestId, ct);
        var sources = new List<Source>();
        var requiredThrough = DateOnly.FromDateTime(delivery);
        foreach (var horse in horses.OrderBy(x => x.HorseID, StringComparer.Ordinal))
        {
            void Add(string type, string stage, string? key, DateTime? expiry = null, bool complete = true, string? revision = null)
            {
                DateOnly? expiryDate = expiry is null ? null : DateOnly.FromDateTime(expiry.Value);
                sources.Add(new(horse.HorseID + ":" + type, horse.HorseID, horse.Name, type, stage,
                    key, expiryDate, complete && !string.IsNullOrWhiteSpace(key)
                        && (expiryDate is null || expiryDate >= requiredThrough), revision));
            }
            Add("PASSPORT", "BEFORE_CONTRACT", horse.PassportScanUrl, horse.PassportExpiryDate,
                !string.IsNullOrWhiteSpace(horse.FEI_Passport_No) && horse.PassportExpiryDate is not null,
                horse.FEI_Passport_No);
            Add("PHOTO", "BEFORE_CONTRACT", horse.PhotoUrl);
            Add("OWNERSHIP", "BEFORE_CONTRACT", horse.OwnershipCertificateFileUrl);
            Add("VALUATION", "OPTIONAL", horse.ValuationDocumentFileUrl);
            foreach (var type in new[] { "HEALTH_CERTIFICATE", "VACCINATION" })
            {
                var candidates = records.Where(r => r.HorseID == horse.HorseID && Normalize(r.DocumentType) == type)
                    .OrderBy(r => r.RecordID, StringComparer.Ordinal).ToArray();
                // Historical rows can repeat the same upload under legacy aliases.
                var uploads = candidates.Where(r => !string.IsNullOrWhiteSpace(r.UploadedFileUrl))
                    .GroupBy(r => new { r.UploadedFileUrl, r.ExpiryDate }).ToArray();
                var record = uploads.Length == 1 ? uploads[0].First() : null;
                Add(type, "BEFORE_DEPARTURE", record?.UploadedFileUrl, record?.ExpiryDate,
                    record?.ExpiryDate is not null, JsonSerializer.Serialize(candidates));
            }
        }
        return sources.ToArray();
    }

    public static string Version(Source[] sources) =>
        Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(sources)));

    public static void Validate(Source[] sources, RequestScheduleOption option, SpecialistAssessmentInput input, DateOnly today)
    {
        Require(Version(sources) == input.ChecklistVersion, "STALE_CHECKLIST", "Hồ sơ đã thay đổi. Tải lại checklist.");
        Require(input.Result is "FEASIBLE" or "NEEDS_SUPPLEMENT" or "NOT_FEASIBLE",
            "VALIDATION_ERROR", "Kết luận hồ sơ không hợp lệ.", 400);
        Require(input.Result == "FEASIBLE" || !string.IsNullOrWhiteSpace(input.Note),
            "VALIDATION_ERROR", "Vui lòng ghi lý do kết luận.", 400);
        var items = input.Items;
        Require(items.Count == sources.Length && items.Select(x => x.ChecklistItemId).Distinct().Count() == sources.Length
            && sources.All(s => items.Any(x => x.ChecklistItemId == s.Id)),
            "VALIDATION_ERROR", "Cần đánh giá từng mục trong checklist đúng một lần.", 400);

        foreach (var source in sources)
        {
            var item = items.Single(x => x.ChecklistItemId == source.Id);
            var document = source.Type switch
            {
                "PASSPORT" => "Hộ chiếu FEI",
                "PHOTO" => "Ảnh nhận dạng",
                "OWNERSHIP" => "Giấy chứng nhận sở hữu",
                "VALUATION" => "Chứng từ giá trị",
                "HEALTH_CERTIFICATE" => "Giấy kiểm dịch / sức khỏe",
                "VACCINATION" => "Sổ tiêm chủng",
                _ => source.Type,
            };
            var label = $"{source.HorseName} ({source.HorseId}) · {document}";
            Require(item.Status is "VERIFIED" or "MISSING" or "INVALID" or "NEEDS_FOLLOW_UP",
                "VALIDATION_ERROR", $"{label}: chọn trạng thái giấy tờ hợp lệ.", 400);
            Require(item.Status != "VERIFIED" || source.Usable,
                "INVALID_DOCUMENT", $"{label}: chưa có tệp hợp lệ hoặc giấy tờ không còn hiệu lực qua ngày giao. Không thể chọn Đã xác minh.");
            Require(item.Status != "NEEDS_FOLLOW_UP" || source.Stage == "BEFORE_DEPARTURE",
                "INVALID_DOCUMENT", $"{label}: giấy tờ này phải xử lý trước hợp đồng hoặc không bắt buộc, không áp dụng kế hoạch bổ sung trước ngày nhận ngựa.");
            Require(source.Stage == "OPTIONAL" || item.Status == "VERIFIED" || !string.IsNullOrWhiteSpace(item.Reason),
                "VALIDATION_ERROR", $"{label}: nhập lý do giấy tờ chưa được xác minh.", 400);
            var pickup = DateOnly.FromDateTime(option.PickupDate);
            Require(item.Status != "NEEDS_FOLLOW_UP" || item.RequiredByDate is { } due && due >= today && due <= pickup,
                "INVALID_DOCUMENT", $"{label}: hạn nộp phải từ {today:dd/MM/yyyy} đến hết ngày đi {pickup:dd/MM/yyyy}.");
            if (input.Result != "FEASIBLE" || source.Stage == "OPTIONAL" || item.Status == "VERIFIED") continue;
            Require(source.Stage == "BEFORE_DEPARTURE" && item.Status == "NEEDS_FOLLOW_UP",
                "INVALID_DOCUMENT", $"{label}: chưa đủ điều kiện kết luận Khả thi. Xác minh giấy tờ trước hợp đồng; giấy tờ trước khởi hành cần kế hoạch bổ sung. Nếu chưa đáp ứng, chọn Cần bổ sung hoặc Không khả thi.");
        }
    }

    public Task<(byte[] Bytes, string ContentType)> ReadAsync(Source source, CancellationToken ct)
    {
        Require(!string.IsNullOrWhiteSpace(source.FileKey), "NOT_FOUND", "Mục này chưa có tệp.", 404);
        return files.ReadAsync(source.FileKey!, ct);
    }

    private static string? Normalize(string? type) => type?.Trim().ToUpperInvariant() switch
    {
        "DT-2" or "HEALTH_CERTIFICATE" => "HEALTH_CERTIFICATE",
        "DT-3" or "VACCINATION" or "EQUINE_FLU_VAX" => "VACCINATION",
        _ => null,
    };
}
