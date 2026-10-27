using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Application.DTOs;
using Xunit;

namespace Registration.Tests
{
    public class SpecialistAndManagerRoleTests
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        [Fact]
        public async Task Specialist_GetTrips_ReturnsSuccessWithList()
        {
            using var factory = new RegistrationTestFactory();
            var client = factory.CreateApiClient();

            var res = await client.GetAsync("/api/specialist/trips");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);

            var content = await res.Content.ReadFromJsonAsync<ApiResponse<List<SpecialistTripDto>>>(JsonOptions);
            Assert.NotNull(content);
            Assert.True(content.Success);
            Assert.NotEmpty(content.Data);
        }

        [Fact]
        public async Task Specialist_GetTripById_ReturnsCorrectTrip()
        {
            using var factory = new RegistrationTestFactory();
            var client = factory.CreateApiClient();

            var res = await client.GetAsync("/api/specialist/trips/TRP-902");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);

            var content = await res.Content.ReadFromJsonAsync<ApiResponse<SpecialistTripDto>>(JsonOptions);
            Assert.NotNull(content);
            Assert.True(content.Success);
            Assert.Equal("TRP-902", content.Data.Id);
            Assert.Equal("JP", content.Data.DestCountry);
        }

        [Fact]
        public async Task Specialist_ApplyRequirementSet_Succeeds()
        {
            using var factory = new RegistrationTestFactory();
            var client = factory.CreateApiClient();

            var body = new ApplyRequirementSetDto { PkgId = "RP-2" };
            var res = await client.PutAsJsonAsync("/api/specialist/trips/TRP-902/requirement-set", body);
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);

            var detailRes = await client.GetAsync("/api/specialist/trips/TRP-902");
            var content = await detailRes.Content.ReadFromJsonAsync<ApiResponse<SpecialistTripDto>>(JsonOptions);
            Assert.NotNull(content?.Data?.ReqSet);
            Assert.Equal("RP-2", content.Data.ReqSet.PkgId);
        }

        [Fact]
        public async Task Specialist_ReviewCustomerDoc_And_CreateDocRequest_Succeeds()
        {
            using var factory = new RegistrationTestFactory();
            var client = factory.CreateApiClient();

            // 1. Review with action required
            var reviewDto = new ReviewCustomerDocDto
            {
                DocId = "hor-1035-passport.pdf",
                Key = "passport",
                Scope = "HOR-1035",
                Decision = "REJECTED",
                Reason = "Ảnh chụp scan hộ chiếu trang 2 bị mờ dấu thị thực."
            };
            var resReview = await client.PostAsJsonAsync("/api/specialist/trips/TRP-902/customer-documents/review", reviewDto);
            Assert.Equal(HttpStatusCode.OK, resReview.StatusCode);

            // 2. Create Doc Request
            var reqDto = new CreateDocRequestDto
            {
                RequestId = "TRN-8924",
                HorseId = "HOR-1035",
                DocType = "Hộ chiếu ngựa",
                Description = "Yêu cầu tải lại ảnh chụp scan màu đầy đủ dấu thị thực."
            };
            var resReq = await client.PostAsJsonAsync("/api/specialist/document-requests", reqDto);
            Assert.Equal(HttpStatusCode.OK, resReq.StatusCode);

            var content = await resReq.Content.ReadFromJsonAsync<ApiResponse<DocRequestDto>>(JsonOptions);
            Assert.NotNull(content?.Data);
            Assert.Equal("OPEN", content.Data.Status);
        }

        [Fact]
        public async Task Specialist_QuarantineBookings_And_Regulations_Accessible()
        {
            using var factory = new RegistrationTestFactory();
            var client = factory.CreateApiClient();

            // 1. Quarantine bookings
            var qRes = await client.GetAsync("/api/specialist/quarantine-bookings");
            Assert.Equal(HttpStatusCode.OK, qRes.StatusCode);
            var qContent = await qRes.Content.ReadFromJsonAsync<ApiResponse<List<QuarantineBookingDto>>>(JsonOptions);
            Assert.NotNull(qContent);
            Assert.NotEmpty(qContent.Data);

            // 2. Save new booking
            var newBooking = new SaveBookingDto
            {
                TripId = "TRP-902",
                FacilityName = "Trạm Narita AQS",
                StartDate = "2026-10-18",
                EndDate = "2026-10-25",
                HorseCount = 1,
                BookingRef = "AQS-AUTO-01"
            };
            var postBookingRes = await client.PostAsJsonAsync("/api/specialist/quarantine-bookings", newBooking);
            Assert.Equal(HttpStatusCode.OK, postBookingRes.StatusCode);

            // 3. Regulations & Document Types
            var regRes = await client.GetAsync("/api/specialist/regulations");
            Assert.Equal(HttpStatusCode.OK, regRes.StatusCode);

            var docTypeRes = await client.GetAsync("/api/specialist/document-types");
            Assert.Equal(HttpStatusCode.OK, docTypeRes.StatusCode);

            var auditRes = await client.GetAsync("/api/specialist/audit");
            Assert.Equal(HttpStatusCode.OK, auditRes.StatusCode);
        }

        [Fact]
        public async Task Manager_TripAssignment_And_ReportsOverview_Succeeds()
        {
            using var factory = new RegistrationTestFactory();
            var client = factory.CreateApiClient();

            // 1. Assign specialist and coordinator
            var assignDto = new ManagerTripAssignmentDto
            {
                SpecialistId = "USR-SPEC-001",
                CoordinatorId = "USR-COORD-001"
            };
            var assignRes = await client.PostAsJsonAsync("/api/manager/trips/TRP-902/assignment", assignDto);
            Assert.Equal(HttpStatusCode.OK, assignRes.StatusCode);

            // 2. Get Reports Overview
            var reportRes = await client.GetAsync("/api/manager/reports/overview");
            Assert.Equal(HttpStatusCode.OK, reportRes.StatusCode);

            var reportContent = await reportRes.Content.ReadFromJsonAsync<ApiResponse<ManagerReportsOverviewDto>>(JsonOptions);
            Assert.NotNull(reportContent?.Data);
            Assert.True(reportContent.Data.TotalTrips > 0);
            Assert.True(reportContent.Data.TotalRevenue > 0);
            Assert.True(reportContent.Data.OnTimeDeliveryRate > 90);
        }

        [Fact]
        public async Task Manager_Incidents_ActualCosts_And_Complaints_Workflows()
        {
            using var factory = new RegistrationTestFactory();
            var client = factory.CreateApiClient();

            // 1. Incidents list
            var incRes = await client.GetAsync("/api/manager/incidents");
            Assert.Equal(HttpStatusCode.OK, incRes.StatusCode);
            var incContent = await incRes.Content.ReadFromJsonAsync<ApiResponse<List<IncidentDto>>>(JsonOptions);
            Assert.NotNull(incContent);
            Assert.NotEmpty(incContent.Data);

            // 2. Incident plan approval
            var planDecisionDto = new IncidentPlanDecisionDto
            {
                Approve = true,
                Note = "Duyệt phương án theo dõi y tế đặc biệt."
            };
            var planRes = await client.PostAsJsonAsync("/api/manager/incidents/INC-302/plans/PLN-302/decision", planDecisionDto);
            Assert.Equal(HttpStatusCode.OK, planRes.StatusCode);

            // 3. Actual costs saving
            var costDto = new SaveActualCostDto
            {
                Costs = new Dictionary<string, decimal>
                {
                    ["FUEL"] = 500,
                    ["STAFF"] = 600,
                    ["PROCEDURE"] = 200,
                    ["VET"] = 350,
                    ["INSURANCE"] = 250,
                    ["TRANSPORT"] = 900
                },
                Extra = new List<ExtraCostDto>
                {
                    new() { Label = "INC-302 • Theo dõi chuyên sâu", Amount = 350, Payer = "COMPANY" }
                }
            };
            var saveCostRes = await client.PutAsJsonAsync("/api/manager/trips/TRP-902/actual-costs", costDto);
            Assert.Equal(HttpStatusCode.OK, saveCostRes.StatusCode);

            // 4. Complaints list & reply
            var cmpRes = await client.GetAsync("/api/manager/complaints");
            Assert.Equal(HttpStatusCode.OK, cmpRes.StatusCode);

            var replyDto = new ComplaintReplyDto
            {
                Text = "CBN Transport ghi nhận và xin bồi thường 150 USD phí dịch vụ.",
                Propose = true,
                Amount = 150
            };
            var replyRes = await client.PostAsJsonAsync("/api/manager/complaints/CMP-121/replies", replyDto);
            Assert.Equal(HttpStatusCode.OK, replyRes.StatusCode);
        }
    }
}
