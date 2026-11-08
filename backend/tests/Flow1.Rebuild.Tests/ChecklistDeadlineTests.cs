using Application.Common.Exceptions;
using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Domain.Flow1.Entities;
using Xunit;

namespace Flow1.Rebuild.Tests;

public class ChecklistDeadlineTests
{
    [Theory]
    [InlineData(0, true)]
    [InlineData(5, true)]
    [InlineData(-1, false)]
    [InlineData(6, false)]
    public void Follow_up_deadline_includes_today_and_pickup_without_processing_days(int offset, bool valid)
    {
        var today = new DateOnly(2026, 11, 7);
        var sources = new[] { new RequestAssessmentChecklist.Source(
            "HORSE_001:VACCINATION", "HORSE_001", "Test horse", "VACCINATION",
            "BEFORE_DEPARTURE", null, null, false, null) };
        var option = new RequestScheduleOption { PickupDate = today.AddDays(5).ToDateTime(TimeOnly.MinValue) };
        var input = new SpecialistAssessmentInput(1, RequestAssessmentChecklist.Version(sources), "FEASIBLE", null,
            new[] { new ChecklistItemAssessmentInput(sources[0].Id, "NEEDS_FOLLOW_UP",
                "Khách bổ sung", today.AddDays(offset), null) });
        if (valid)
            RequestAssessmentChecklist.Validate(sources, option, input, today);
        else
            Assert.Throws<BusinessRuleException>(() => RequestAssessmentChecklist.Validate(sources, option, input, today));
    }
}
