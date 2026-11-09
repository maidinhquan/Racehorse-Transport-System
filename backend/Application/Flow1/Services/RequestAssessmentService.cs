using System.Text.Json;
using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Application.Flow1.Mapping;
using Domain.Enums;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;

namespace Application.Flow1.Services;

public sealed partial class RequestAssessmentService(
    IDataSession data, AccessService access, CatalogService catalogs, RequestSchedulePolicy schedule,
    RequestAssessmentChecklist checklist, RequestReviewResources resources, NotificationService notifications, TimeProvider clock)
{
    private const string Coordinator = UserRoles.FleetRouteCoordinator;
    private const string Specialist = UserRoles.TransportSpecialist;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const string Pending = "PENDING_REVIEW";
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<object> ManagerAsync(string actor, string id, CancellationToken ct)
    {
        var request = await access.RequestAsync(id, actor, true, ct);
        var review = await LatestAsync(id, ct);
        var staff = await data.ListAsync<Account>(x => x.IsActive, ct);
        return new
        {
            requestRevision = review is null ? 1 : review.RequestRevision + (review.Status == "CLOSED" ? 1 : 0),
            review = review is null || review.Status == "CLOSED" ? null : await ViewAsync(request, review, false, false, ct),
            coordinators = Staff(staff, Coordinator), specialists = Staff(staff, Specialist),
        };
    }

    public Task<object> AssignAsync(string actor, string id, AssignRequestReviewInput input, CancellationToken ct) =>
        data.WriteAsync<object>(async token =>
        {
            var request = await access.RequestAsync(id, actor, true, token);
            var prior = await LatestAsync(id, token);
            Require(request.Status == Pending && (prior is null || prior.Status == "CLOSED"),
                "INVALID_STATE", "Yêu cầu đã được giao xét duyệt hoặc đã chuyển bước.");
            Require(input.RequestRevision == (prior?.RequestRevision ?? 0) + 1,
                "STALE_REVIEW", "Phiên xét duyệt đã thay đổi.");
            await access.AccountAsync(input.CoordinatorId, Coordinator, token);
            await access.AccountAsync(input.SpecialistId, Specialist, token);
            var row = new RequestAssessment
            {
                RequestID = id, RequestRevision = input.RequestRevision,
                CoordinatorID = input.CoordinatorId, SpecialistID = input.SpecialistId, Status = "COORDINATOR_PENDING",
            };
            data.Add(row);
            await data.SaveAsync(token);
            return await ViewAsync(request, row, false, false, token);
        }, ct);

    public async Task<object> QueueAsync(string actor, string role, CancellationToken ct)
    {
        await access.AccountAsync(actor, role, ct);
        var rows = await data.ListAsync<RequestAssessment>(x => role == Coordinator
            ? x.CoordinatorID == actor && x.Status == "COORDINATOR_PENDING"
            : x.SpecialistID == actor && x.Status == "SPECIALIST_PENDING", ct);
        var ids = rows.Select(x => x.RequestID).ToArray();
        var requests = await data.ListAsync<TransportRequest>(x => ids.Contains(x.RequestID) && x.Status == Pending, ct);
        return from row in rows join request in requests on row.RequestID equals request.RequestID
            orderby request.ExpectedDate select new
            {
                reviewId = row.ReviewID, requestId = row.RequestID, row.RequestRevision,
                origin = request.Departure, destination = request.Destination, expectedTransportDate = Day(request.ExpectedDate),
            };
    }

    public async Task<object> DetailAsync(string actor, string id, string role, CancellationToken ct)
    {
        var (request, review) = await ReviewerAsync(actor, id, role, ct);
        return await ViewAsync(request, review, role == Coordinator, role == Specialist, ct);
    }

    public Task<object> AssessCoordinatorAsync(string actor, string id, CoordinatorAssessmentInput input, CancellationToken ct) =>
        data.WriteAsync<object>(async token =>
        {
            var (request, review) = await ReviewerAsync(actor, id, Coordinator, token);
            Require(review.Status == "COORDINATOR_PENDING", "INVALID_STATE", "Phiên đã qua bước Điều phối.");
            RequireRevision(review, input.RequestRevision);
            Require(request.ExpectedDate is not null && request.CommittedDeadline is not null && request.TransportType is "ROAD" or "AIR",
                "INVALID_STATE", "Yêu cầu chưa có lịch hoặc phương thức vận chuyển hợp lệ.");
            var original = await MakeOptionAsync(request, review, true, request.TransportType!, request.ExpectedDate!.Value,
                request.CommittedDeadline!.Value, input.Original.Result, input.Original.Reason, token);
            var options = new List<RequestScheduleOption> { original };
            if (input.Alternative is { } alternative)
            {
                Require(alternative.Result == "FEASIBLE", "VALIDATION_ERROR",
                    "Lịch đề xuất phải khả thi. Nếu chưa tìm được lịch phù hợp, bỏ chọn Đề xuất lịch khác và ghi rõ lý do của lịch khách yêu cầu.", 400);
                var pickup = alternative.ExpectedTransportDate.ToDateTime(TimeOnly.MinValue);
                var delivery = alternative.ExpectedDeliveryDate.ToDateTime(TimeOnly.MinValue);
                Require(pickup != original.PickupDate || delivery != original.DeliveryDate || alternative.Mode != original.Mode,
                    "VALIDATION_ERROR", "Lịch đề xuất phải khác lịch gốc.", 400);
                options.Add(await MakeOptionAsync(request, review, false, alternative.Mode, pickup, delivery,
                    alternative.Result, alternative.Reason, token));
            }
            foreach (var option in options) data.Add(option);
            review.Status = options.Any(x => x.CoordinatorResult == "FEASIBLE") ? "SPECIALIST_PENDING" : "MANAGER_PENDING";
            await data.SaveAsync(token);
            return await ViewAsync(request, review, false, false, token);
        }, ct);

    public Task<object> AssessSpecialistAsync(string actor, string id, string optionId, SpecialistAssessmentInput input, CancellationToken ct) =>
        data.WriteAsync<object>(async token =>
        {
            var (request, review) = await ReviewerAsync(actor, id, Specialist, token);
            Require(review.Status == "SPECIALIST_PENDING", "INVALID_STATE", "Phiên đã qua bước Specialist.");
            RequireRevision(review, input.RequestRevision);
            var options = await OptionsAsync(id, token);
            var option = FindOption(options, optionId);
            Require(option.CoordinatorResult == "FEASIBLE", "INVALID_STATE", "Phương án chưa đạt đánh giá Điều phối.");
            var sources = await checklist.LoadAsync(request.RequestID, option.DeliveryDate, token);
            RequestAssessmentChecklist.Validate(sources, option, input, DateOnly.FromDateTime(schedule.Today(request.OriginCountry)));
            option.ChecklistVersion = input.ChecklistVersion;
            option.SpecialistResult = input.Result;
            option.SpecialistNote = input.Note;
            option.ChecklistAssessmentJson = JsonSerializer.Serialize(input.Items, JsonOptions);
            if (options.All(x => x.CoordinatorResult != "FEASIBLE" || x.SpecialistResult is not null))
                review.Status = "MANAGER_PENDING";
            return await ViewAsync(request, review, false, true, token);
        }, ct);

    public async Task<(byte[] Bytes, string ContentType)> FileAsync(string actor, string id, string optionId, string itemId, CancellationToken ct)
    {
        var (request, _) = await ReviewerAsync(actor, id, Specialist, ct);
        var option = FindOption(await OptionsAsync(id, ct), optionId);
        Require(option.CoordinatorResult == "FEASIBLE", "NOT_FOUND", "Không tìm thấy phương án khả thi.", 404);
        var source = (await checklist.LoadAsync(request.RequestID, option.DeliveryDate, ct)).SingleOrDefault(x => x.Id == itemId);
        Require(source is not null, "NOT_FOUND", "Không tìm thấy mục checklist.", 404);
        return await checklist.ReadAsync(source!, ct);
    }

    public async Task<object?> CustomerAsync(string actor, string id, CancellationToken ct)
    {
        var request = await access.RequestAsync(id, actor, false, ct);
        var review = await LatestAsync(id, ct);
        if (request.Status != "CHANGES_REQUESTED" || review?.Status is not ("CUSTOMER_SCHEDULE_PENDING" or "CUSTOMER_CHANGES_PENDING"))
            return null;
        var confirm = review.Status == "CUSTOMER_SCHEDULE_PENDING";
        var option = confirm ? FindOption(await OptionsAsync(review.ReviewID, ct), review.SelectedOptionID) : null;
        return new
        {
            reviewId = review.ReviewID, review.RequestRevision, scheduleOptionId = option?.OptionID,
            mode = option?.Mode ?? request.TransportType, expectedTransportDate = Day(option?.PickupDate ?? request.ExpectedDate),
            expectedDeliveryDate = Day(option?.DeliveryDate ?? request.CommittedDeadline),
            customerDeadlineUtc = Utc(review.CustomerDeadlineUtc), feedback = request.RevisionFeedback,
            action = confirm ? "CONFIRM_SCHEDULE" : "SUPPLEMENT_DOCUMENTS",
        };
    }

    public Task<object> RespondAsync(string actor, string id, ScheduleResponseInput input, CancellationToken ct) =>
        data.WriteAsync<object>(async token =>
        {
            var request = await access.RequestAsync(id, actor, false, token);
            var review = await CurrentAsync(id, input.ReviewId, input.RequestRevision, token);
            Require(request.Status == "CHANGES_REQUESTED" && review.Status == "CUSTOMER_SCHEDULE_PENDING"
                && review.SelectedOptionID == input.ScheduleOptionId && review.CustomerDeadlineUtc > Now,
                "INVALID_STATE", "Phương án đã hết hạn hoặc không còn chờ xác nhận.");
            Require(input.Decision is "ACCEPTED" or "REJECTED", "VALIDATION_ERROR", "Phản hồi lịch không hợp lệ.", 400);
            if (input.Decision == "ACCEPTED")
            {
                var option = FindOption(await OptionsAsync(review.ReviewID, token), input.ScheduleOptionId);
                request.ExpectedDate = option.PickupDate;
                request.CommittedDeadline = option.DeliveryDate;
                request.TransportType = option.Mode;
                request.PreparationDays = (int)await schedule.PreparationAsync(option.Mode, token);
                var horses = await data.ListAsync<RequestHorse>(x => x.RequestID == id, token);
                await HorseBookingRules.RequireAvailableAsync(data, horses.Select(x => x.HorseID).ToArray(), request, token);
            }
            review.Status = input.Decision == "ACCEPTED" ? "CUSTOMER_ACCEPTED" : "CUSTOMER_REJECTED";
            review.CustomerDeadlineUtc = null;
            request.Status = Pending;
            return await RequestViewAsync(request, token);
        }, ct);

    public Task<object> AcceptAsync(string actor, string id, AcceptRequestReviewInput input, CancellationToken ct) =>
        data.WriteAsync<object>(async token =>
        {
            var request = await access.RequestAsync(id, actor, true, token);
            var review = await CurrentAsync(id, input.ReviewId, input.RequestRevision, token);
            if (review.Status == "APPROVED" && review.SelectedOptionID == input.ScheduleOptionId)
                return await RequestViewAsync(request, token);
            var option = FindOption(await OptionsAsync(review.ReviewID, token), input.ScheduleOptionId);
            Require(request.Status == Pending && (option.IsOriginal
                    ? review.Status is "MANAGER_PENDING" or "CUSTOMER_ACCEPTED" or "CUSTOMER_REJECTED"
                    : review.Status == "CUSTOMER_ACCEPTED" && review.SelectedOptionID == option.OptionID),
                "INVALID_STATE", "Chưa hoàn tất xét duyệt hoặc khách chưa xác nhận lịch đề xuất.");
            await EnsureReadyAsync(request, option, token);
            request.ExpectedDate = option.PickupDate;
            request.CommittedDeadline = option.DeliveryDate;
            request.TransportType = option.Mode;
            request.PreparationDays = (int)await schedule.PreparationAsync(option.Mode, token);
            var horses = await data.ListAsync<RequestHorse>(x => x.RequestID == id, token);
            await HorseBookingRules.RequireAvailableAsync(data, horses.Select(x => x.HorseID).ToArray(), request, token);
            request.Status = "CONTRACT_PREPARATION";
            review.Status = "APPROVED";
            review.SelectedOptionID = option.OptionID;
            notifications.Add(request.CustomerID, id, "REQUEST_REVIEWED", "Yêu cầu đã được chấp thuận", "Quản lý đang chuẩn bị hợp đồng.");
            return RequestMapper.View(request, horses);
        }, ct);

    public Task<object> ChangesAsync(string actor, string id, ReviewInput input, CancellationToken ct) =>
        data.WriteAsync<object>(async token =>
        {
            var request = await access.RequestAsync(id, actor, true, token);
            var review = await CurrentAsync(id, input.ReviewId, input.RequestRevision, token);
            Require(request.Status == Pending
                && review.Status is ("MANAGER_PENDING" or "CUSTOMER_ACCEPTED" or "CUSTOMER_REJECTED"),
                "INVALID_STATE", "Chỉ yêu cầu khách bổ sung trước khi chấp thuận yêu cầu. Yêu cầu đã chấp thuận không thể trả về bước khách sửa và gửi lại.");
            if (input.Action == "CONFIRM_SCHEDULE")
            {
                var option = FindOption(await OptionsAsync(review.ReviewID, token), input.ScheduleOptionId);
                Require(!option.IsOriginal && review.Status == "MANAGER_PENDING", "INVALID_STATE",
                    "Chỉ gửi lịch đề xuất chưa được phản hồi.");
                await EnsureReadyAsync(request, option, token);
                review.SelectedOptionID = option.OptionID;
                review.Status = "CUSTOMER_SCHEDULE_PENDING";
            }
            else
            {
                Require(input.Action == "SUPPLEMENT_DOCUMENTS", "VALIDATION_ERROR", "Loại yêu cầu chỉnh sửa không hợp lệ.", 400);
                review.Status = "CUSTOMER_CHANGES_PENDING";
                review.SelectedOptionID = null;
            }
            review.CustomerDeadlineUtc = Now.AddHours((double)await schedule.CustomerResponseHoursAsync(token));
            request.Status = "CHANGES_REQUESTED";
            request.RevisionFeedback = Required(input.Feedback, 2000);
            notifications.Add(request.CustomerID, id, "REQUEST_REVIEWED", "Yêu cầu cần phản hồi", request.RevisionFeedback);
            return await RequestViewAsync(request, token);
        }, ct);

    public Task<object> RejectAsync(string actor, string id, string reason, CancellationToken ct) =>
        data.WriteAsync<object>(async token =>
        {
            var request = await access.RequestAsync(id, actor, true, token);
            if (request.Status == "REJECTED") return await RequestViewAsync(request, token);
            Require(request.Status is Pending or "CHANGES_REQUESTED", "INVALID_STATE", "Yêu cầu đã qua bước xét duyệt.");
            var review = await LatestAsync(id, token);
            if (review is not null)
            {
                review.Status = "CLOSED";
                review.CustomerDeadlineUtc = null;
            }
            request.Status = "REJECTED";
            request.ManagerNotes = Required(reason, 1000);
            notifications.Add(request.CustomerID, id, "REQUEST_REVIEWED", "Yêu cầu bị từ chối", request.ManagerNotes);
            return await RequestViewAsync(request, token);
        }, ct);

    public async Task ValidatePublicationAsync(TransportRequest request, string mode, DateTime pickup, DateTime delivery, CancellationToken ct)
    {
        var review = await LatestAsync(request.RequestID, ct);
        if (review?.Status != "APPROVED") return; // Existing contracts drafted before request assessments.
        var option = FindOption(await OptionsAsync(review.ReviewID, ct), review.SelectedOptionID);
        Require(option.Mode == mode && option.PickupDate == pickup.Date && option.DeliveryDate == delivery.Date,
            "SCHEDULE_LOCKED", "Hợp đồng phải giữ phương án vận chuyển đã duyệt.");
        await EnsureChecklistAsync(request, option, ct);
    }

    private async Task EnsureReadyAsync(TransportRequest request, RequestScheduleOption option, CancellationToken ct)
    {
        await EnsureLeadAsync(request.OriginCountry, option.Mode, option.PickupDate, ct);
        await EnsureChecklistAsync(request, option, ct);
    }

    private async Task EnsureChecklistAsync(TransportRequest request, RequestScheduleOption option, CancellationToken ct)
    {
        Require(option.CoordinatorResult == "FEASIBLE" && option.SpecialistResult == "FEASIBLE",
            "REVIEW_INCOMPLETE", "Phương án chưa được cả Điều phối và Chuyên viên xác nhận khả thi.");
        var sources = await checklist.LoadAsync(request.RequestID, option.DeliveryDate, ct);
        Require(option.ChecklistVersion == RequestAssessmentChecklist.Version(sources), "STALE_CHECKLIST",
            "Hồ sơ đã thay đổi. Cần yêu cầu cập nhật và xét duyệt lại.");
        var items = JsonSerializer.Deserialize<ChecklistItemAssessmentInput[]>(option.ChecklistAssessmentJson!, JsonOptions)!;
        RequestAssessmentChecklist.Validate(sources, option, new(0, option.ChecklistVersion!, "FEASIBLE", null, items),
            DateOnly.FromDateTime(schedule.Today(request.OriginCountry)));
    }

    private async Task<RequestScheduleOption> MakeOptionAsync(TransportRequest request, RequestAssessment review, bool original,
        string mode, DateTime pickup, DateTime delivery, string result, string reason, CancellationToken ct)
    {
        Require(mode is "AIR" or "ROAD" && pickup.Year >= 1753 && delivery >= pickup
            && result is "FEASIBLE" or "NOT_FEASIBLE", "VALIDATION_ERROR", "Lịch hoặc kết luận Điều phối không hợp lệ.", 400);
        if (result == "FEASIBLE")
        {
            await catalogs.ValidateAsync(request.OriginCountry!, request.DestinationCountry!, mode, ct);
            await EnsureLeadAsync(request.OriginCountry, mode, pickup, ct);
        }
        return new()
        {
            ReviewID = review.ReviewID, IsOriginal = original,
            Mode = mode, PickupDate = pickup.Date, DeliveryDate = delivery.Date, CoordinatorResult = result,
            CoordinatorReason = Required(reason, 2000),
        };
    }

    private async Task EnsureLeadAsync(string? origin, string mode, DateTime pickup, CancellationToken ct)
    {
        var earliest = await schedule.EarliestPickupAsync(origin, mode, false, ct);
        Require(pickup.Date >= earliest, "INSUFFICIENT_PREPARATION_TIME", $"Ngày nhận ngựa sớm nhất là {earliest:dd/MM/yyyy}.");
    }

    private async Task<(TransportRequest Request, RequestAssessment Review)> ReviewerAsync(string actor, string id, string role, CancellationToken ct)
    {
        await access.AccountAsync(actor, role, ct);
        var review = await data.FindAsync<RequestAssessment>(ct, id);
        Require(review is not null && (role == Coordinator ? review.CoordinatorID : review.SpecialistID) == actor,
            "NOT_FOUND", "Không tìm thấy phiên xét duyệt.", 404);
        var request = await data.FindAsync<TransportRequest>(ct, review!.RequestID);
        Require(request is not null && request.Status == Pending && review.Status != "CLOSED",
            "INVALID_STATE", "Phiên xét duyệt không còn mở.");
        if (role == Specialist)
            Require(review.Status != "COORDINATOR_PENDING", "INVALID_STATE", "Chưa có kết quả Điều phối.");
        return (request!, review);
    }

    private async Task<RequestAssessment> CurrentAsync(string requestId, string? id, int revision, CancellationToken ct)
    {
        var review = await LatestAsync(requestId, ct);
        Require(review is not null && review.ReviewID == id && review.Status != "CLOSED",
            "STALE_REVIEW", "Không tìm thấy phiên xét duyệt hiện hành.");
        RequireRevision(review!, revision);
        return review!;
    }

    private async Task<RequestAssessment?> LatestAsync(string id, CancellationToken ct) =>
        (await data.ListAsync<RequestAssessment>(x => x.RequestID == id, ct))
            .OrderByDescending(x => x.RequestRevision).FirstOrDefault();

    private Task<List<RequestScheduleOption>> OptionsAsync(string id, CancellationToken ct) =>
        data.ListAsync<RequestScheduleOption>(x => x.ReviewID == id, ct);

    private async Task<object> ViewAsync(TransportRequest request, RequestAssessment review, bool withResources, bool withChecklist, CancellationToken ct)
    {
        var options = new List<object>();
        foreach (var option in (await OptionsAsync(review.ReviewID, ct)).OrderByDescending(x => x.IsOriginal))
        {
            var sources = withChecklist && option.CoordinatorResult == "FEASIBLE"
                ? await checklist.LoadAsync(request.RequestID, option.DeliveryDate, ct) : null;
            options.Add(new
            {
                scheduleOptionId = option.OptionID, option.IsOriginal, option.Mode,
                expectedTransportDate = Day(option.PickupDate), expectedDeliveryDate = Day(option.DeliveryDate),
                option.CoordinatorResult, option.CoordinatorReason, option.SpecialistResult, option.SpecialistNote,
                checklistVersion = sources is null ? option.ChecklistVersion : RequestAssessmentChecklist.Version(sources),
                checklist = sources?.Select(x => x.View()).ToArray(),
                assessment = option.ChecklistAssessmentJson is null ? (JsonElement?)null
                    : JsonSerializer.Deserialize<JsonElement>(option.ChecklistAssessmentJson),
            });
        }
        var links = await data.ListAsync<RequestHorse>(x => x.RequestID == request.RequestID, ct);
        return new
        {
            reviewId = review.ReviewID, requestId = review.RequestID, review.RequestRevision, review.Status,
            coordinatorId = review.CoordinatorID, specialistId = review.SpecialistID, review.SelectedOptionID,
            customerDeadlineUtc = Utc(review.CustomerDeadlineUtc), origin = request.Departure, destination = request.Destination,
            originCountry = request.OriginCountry, destinationCountry = request.DestinationCountry,
            mode = request.TransportType, expectedTransportDate = Day(request.ExpectedDate),
            expectedDeliveryDate = Day(request.CommittedDeadline), horseCount = links.Count, options,
            resources = withResources ? await resources.ReadAsync(request, links.Count, ct) : null,
        };
    }

    private async Task<object> RequestViewAsync(TransportRequest request, CancellationToken ct) =>
        RequestMapper.View(request, await data.ListAsync<RequestHorse>(x => x.RequestID == request.RequestID, ct));

    private static object Staff(IEnumerable<Account> accounts, string role) => accounts
        .Where(x => UserRoles.NormalizeRole(x.Role) == role).OrderBy(x => x.FullName)
        .Select(x => new { id = x.UserID, name = x.FullName }).ToArray();

    private static RequestScheduleOption FindOption(IEnumerable<RequestScheduleOption> options, string? id) =>
        options.SingleOrDefault(x => x.OptionID == id) ?? throw Failure("NOT_FOUND", "Không tìm thấy phương án.", 404);

    private static void RequireRevision(RequestAssessment review, int revision) =>
        Require(review.RequestRevision == revision, "STALE_REVIEW", "Phiên xét duyệt đã thay đổi.");

    private static DateTime? Utc(DateTime? value) => value is null ? null : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);
    private static DateOnly? Day(DateTime? value) => value is null ? null : DateOnly.FromDateTime(value.Value);
}
