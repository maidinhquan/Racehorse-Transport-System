using Application.DTOs.Flow5;
using Application.Interfaces.Flow5;
using Domain.Entities;
using Infrastructure.Data.Context;
using Infrastructure.Services.Flow5;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Flow1.Tests;

public class PickupAccessTests
{
    private HorseTransportDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<HorseTransportDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var context = new HorseTransportDbContext(options);
        return context;
    }

    private async Task SeedTripDataAsync(HorseTransportDbContext context, string tripId = "TRIP_TEST_01", string driverId = "DRIVER_01", string customerId = "CUSTOMER_01")
    {
        var customer = new User
        {
            UserId = customerId,
            Username = "customer_test",
            PasswordHash = "hash",
            FullName = "Khách hàng Test",
            Role = "CUSTOMER",
            Email = "customer@example.com",
            IsActive = true
        };

        var driver = new User
        {
            UserId = driverId,
            Username = "driver_test",
            PasswordHash = "hash",
            FullName = "Tài xế Test",
            Role = "DRIVER_ESCORT",
            Email = "driver@example.com",
            IsActive = true
        };

        var coordinator = new User
        {
            UserId = "COORD_01",
            Username = "coord_test",
            PasswordHash = "hash",
            FullName = "Điều phối Test",
            Role = "FLEET_ROUTE_COORDINATOR",
            Email = "coord@example.com",
            IsActive = true
        };

        var vehicle = new Vehicle
        {
            VehicleId = "VEH_01",
            PlateNumber = "51B-12345",
            Type = "HORSEBOX_3_STALLS",
            Status = "AVAILABLE"
        };

        var shuttleVehicle = new Vehicle
        {
            VehicleId = "SHUTTLE_VEH_01",
            PlateNumber = "51B-99999",
            Type = "HORSEBOX_2_STALLS",
            Status = "AVAILABLE"
        };

        var request = new TransportRequest
        {
            RequestId = "REQ_TEST_01",
            CustomerId = customerId,
            PickupStableName = "Trại ngựa Test",
            PickupLatitude = 10.8231m,
            PickupLongitude = 106.6297m,
            Status = "APPROVED",
            OriginCountry = "VN",
            DestinationCountry = "VN",
            Departure = "Hà Nội",
            Destination = "TP. Hồ Chí Minh"
        };

        var trip = new TripPlan
        {
            TripId = tripId,
            RequestId = request.RequestId,
            Status = "IN_TRANSIT",
            PickupAccessStatus = "NORMAL"
        };

        var assignment = new TripVehicleAssignment
        {
            AssignmentId = "ASSIGN_01",
            TripId = tripId,
            VehicleId = vehicle.VehicleId,
            DriverId = driverId
        };

        context.Users.AddRange(customer, driver, coordinator);
        context.Vehicles.AddRange(vehicle, shuttleVehicle);
        context.TransportRequests.Add(request);
        context.TripPlans.Add(trip);
        context.TripVehicleAssignments.Add(assignment);

        await context.SaveChangesAsync();
    }

    // =========================================================================
    // 1. DRIVER ENDPOINT TESTS
    // =========================================================================

    [Fact]
    public async Task Driver_ReportAccessBlocked_ThrowsSecurityException_WhenCallerIsNotAssignedDriver()
    {
        using var context = CreateInMemoryContext();
        await SeedTripDataAsync(context, "TRIP_TEST_01", "DRIVER_01", "CUSTOMER_01");

        var service = new PickupAccessService(context);
        var dto = new PickupAccessBlockedRequestDto
        {
            Reason = "Đường làng quá hẹp không vừa xe 3 chỗ",
            Latitude = 10.8250m,
            Longitude = 106.6300m
        };

        // Caller là HACKER_DRIVER_99, không phải DRIVER_01 được gán trên chuyến
        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.ReportAccessBlockedAsync("TRIP_TEST_01", dto, "HACKER_DRIVER_99"));

        Assert.Contains("Bạn không phải tài xế phụ trách chuyến đi này", ex.Message);
    }

    [Fact]
    public async Task Driver_ReportAccessBlocked_ThrowsInvalidOperationException_WhenTripAlreadyCompleted()
    {
        using var context = CreateInMemoryContext();
        await SeedTripDataAsync(context, "TRIP_TEST_01", "DRIVER_01", "CUSTOMER_01");

        var trip = await context.TripPlans.FirstAsync(t => t.TripId == "TRIP_TEST_01");
        trip.Status = "COMPLETED";
        await context.SaveChangesAsync();

        var service = new PickupAccessService(context);
        var dto = new PickupAccessBlockedRequestDto
        {
            Reason = "Cầu yếu",
            Latitude = 10.8250m,
            Longitude = 106.6300m
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ReportAccessBlockedAsync("TRIP_TEST_01", dto, "DRIVER_01"));

        Assert.Contains("Chỉ được báo cáo cản trở khi chuyến đi đang chuẩn bị hoặc đang thực hiện", ex.Message);
    }

    [Fact]
    public async Task Driver_ReportAccessBlocked_CalculatesDistanceAndActivatesBlocker_Success()
    {
        using var context = CreateInMemoryContext();
        await SeedTripDataAsync(context, "TRIP_TEST_01", "DRIVER_01", "CUSTOMER_01");

        var service = new PickupAccessService(context);
        // Tọa độ xe cách điểm đón ~211 mét
        var dto = new PickupAccessBlockedRequestDto
        {
            Reason = "Cổng trang trại bị khóa và ngõ hẹp",
            Latitude = 10.8250m,
            Longitude = 106.6300m
        };

        var result = await service.ReportAccessBlockedAsync("TRIP_TEST_01", dto, "DRIVER_01");

        Assert.Equal("BLOCKED", result.PickupAccessStatus);
        Assert.True(result.SafetyBlockerActive);
        Assert.NotNull(result.RelocationDistanceMeters);
        Assert.True(result.RelocationDistanceMeters > 0);

        var dbTrip = await context.TripPlans.FirstAsync(t => t.TripId == "TRIP_TEST_01");
        Assert.Equal("BLOCKED", dbTrip.PickupAccessStatus);
        Assert.Equal(result.RelocationDistanceMeters, dbTrip.RelocationDistanceMeters);
    }

    // =========================================================================
    // 2. COORDINATOR ENDPOINT TESTS
    // =========================================================================

    [Fact]
    public async Task Coordinator_ResolveAccess_ThrowsArgumentException_WhenRelocatingMissingCoordinates()
    {
        using var context = CreateInMemoryContext();
        await SeedTripDataAsync(context, "TRIP_TEST_01", "DRIVER_01", "CUSTOMER_01");

        var trip = await context.TripPlans.FirstAsync(t => t.TripId == "TRIP_TEST_01");
        trip.PickupAccessStatus = "BLOCKED";
        await context.SaveChangesAsync();

        var service = new PickupAccessService(context);
        var dto = new PickupAccessResolutionRequestDto
        {
            ResolutionType = "RELOCATING",
            MeetingPointName = "Cây xăng đầu ngõ",
            MeetingLatitude = null // Thiếu tọa độ
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            service.ResolveAccessAsync("TRIP_TEST_01", dto, "COORD_01"));

        Assert.Contains("Tọa độ điểm hẹn là bắt buộc khi chọn phương án dắt bộ", ex.Message);
    }

    [Fact]
    public async Task Coordinator_ResolveAccess_Relocating_SetsPendingCustomerApprovalWithZeroCost()
    {
        using var context = CreateInMemoryContext();
        await SeedTripDataAsync(context, "TRIP_TEST_01", "DRIVER_01", "CUSTOMER_01");

        var trip = await context.TripPlans.FirstAsync(t => t.TripId == "TRIP_TEST_01");
        trip.PickupAccessStatus = "BLOCKED";
        await context.SaveChangesAsync();

        var service = new PickupAccessService(context);
        var dto = new PickupAccessResolutionRequestDto
        {
            ResolutionType = "RELOCATING",
            MeetingPointName = "Bãi đất trống cạnh trạm xăng Petrolimex",
            MeetingLatitude = 10.8260m,
            MeetingLongitude = 106.6310m
        };

        var result = await service.ResolveAccessAsync("TRIP_TEST_01", dto, "COORD_01");

        Assert.Equal("RELOCATING", result.PickupAccessStatus);
        Assert.Equal(0, result.ShuttleCostVnd);
        Assert.Equal("PENDING", result.CustomerApprovalStatus);
        Assert.Equal("Bãi đất trống cạnh trạm xăng Petrolimex", result.RelocationMeetingPointName);
    }

    [Fact]
    public async Task Coordinator_ResolveAccess_Shuttling_SetsVehicleAndCost_Success()
    {
        using var context = CreateInMemoryContext();
        await SeedTripDataAsync(context, "TRIP_TEST_01", "DRIVER_01", "CUSTOMER_01");

        var trip = await context.TripPlans.FirstAsync(t => t.TripId == "TRIP_TEST_01");
        trip.PickupAccessStatus = "BLOCKED";
        await context.SaveChangesAsync();

        var service = new PickupAccessService(context);
        var dto = new PickupAccessResolutionRequestDto
        {
            ResolutionType = "SHUTTLING",
            ShuttleVehicleId = "SHUTTLE_VEH_01",
            ShuttleDriverId = "DRIVER_01",
            ShuttleCostVnd = 500000m
        };

        var result = await service.ResolveAccessAsync("TRIP_TEST_01", dto, "COORD_01");

        Assert.Equal("SHUTTLING", result.PickupAccessStatus);
        Assert.Equal(500000m, result.ShuttleCostVnd);
        Assert.Equal("PENDING", result.CustomerApprovalStatus);
        Assert.Equal("SHUTTLE_VEH_01", result.ShuttleVehicleId);
    }

    [Fact]
    public async Task Coordinator_ResolveAccess_ThrowsArgumentException_WhenShuttleCostNegative()
    {
        using var context = CreateInMemoryContext();
        await SeedTripDataAsync(context, "TRIP_TEST_01", "DRIVER_01", "CUSTOMER_01");

        var service = new PickupAccessService(context);
        var dto = new PickupAccessResolutionRequestDto
        {
            ResolutionType = "SHUTTLING",
            ShuttleVehicleId = "SHUTTLE_VEH_01",
            ShuttleCostVnd = -50000m // Chi phí âm
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            service.ResolveAccessAsync("TRIP_TEST_01", dto, "COORD_01"));

        Assert.Contains("Chi phí trung chuyển không được là số âm", ex.Message);
    }

    [Fact]
    public async Task Status_GetAccessStatus_ReturnsCorrectStatusAndSafetyBlocker()
    {
        using var context = CreateInMemoryContext();
        await SeedTripDataAsync(context, "TRIP_TEST_01", "DRIVER_01", "CUSTOMER_01");

        var trip = await context.TripPlans.FirstAsync(t => t.TripId == "TRIP_TEST_01");
        trip.PickupAccessStatus = "SHUTTLING";
        trip.ShuttleVehicleId = "SHUTTLE_VEH_01";
        trip.ShuttleCostVnd = 750000m;
        trip.CustomerApprovalStatus = "PENDING";

        context.Incidents.Add(new Incident
        {
            IncidentId = "INC_STATUS_TEST",
            TripId = "TRIP_TEST_01",
            IncidentType = "PICKUP_ACCESS_BLOCKED",
            SafetyBlockerActive = true,
            Status = "REPORTED"
        });
        await context.SaveChangesAsync();

        var service = new PickupAccessService(context);
        var result = await service.GetAccessStatusAsync("TRIP_TEST_01", "CUSTOMER_01");

        Assert.Equal("SHUTTLING", result.PickupAccessStatus);
        Assert.Equal(750000m, result.ShuttleCostVnd);
        Assert.Equal("SHUTTLE_VEH_01", result.ShuttleVehicleId);
        Assert.Equal("PENDING", result.CustomerApprovalStatus);
        Assert.True(result.SafetyBlockerActive);
    }

    // =========================================================================
    // 3. CUSTOMER ENDPOINT TESTS
    // =========================================================================

    [Fact]
    public async Task Customer_DecideAccess_ThrowsSecurityException_WhenCallerIsNotOwner()
    {
        using var context = CreateInMemoryContext();
        await SeedTripDataAsync(context, "TRIP_TEST_01", "DRIVER_01", "CUSTOMER_01");

        var trip = await context.TripPlans.FirstAsync(t => t.TripId == "TRIP_TEST_01");
        trip.PickupAccessStatus = "RELOCATING";
        trip.CustomerApprovalStatus = "PENDING";
        await context.SaveChangesAsync();

        var service = new PickupAccessService(context);
        var dto = new PickupAccessDecisionRequestDto
        {
            Decision = "APPROVED"
        };

        // Khách hàng HACKER_CUSTOMER_99 cố tình duyệt đơn của CUSTOMER_01
        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.DecideAccessAsync("TRIP_TEST_01", dto, "HACKER_CUSTOMER_99"));

        Assert.Contains("Bạn không phải chủ nhân của đơn vận chuyển này", ex.Message);
    }

    [Fact]
    public async Task Customer_DecideAccess_Approved_ClearsBlockerAndResolvesAccess()
    {
        using var context = CreateInMemoryContext();
        await SeedTripDataAsync(context, "TRIP_TEST_01", "DRIVER_01", "CUSTOMER_01");

        var trip = await context.TripPlans.FirstAsync(t => t.TripId == "TRIP_TEST_01");
        trip.PickupAccessStatus = "RELOCATING";
        trip.CustomerApprovalStatus = "PENDING";
        trip.RelocationMeetingPointName = "Điểm hẹn ngã tư";
        trip.RelocationLatitude = 10.8255m;
        trip.RelocationLongitude = 106.6305m;

        // Tạo Incident đang kích hoạt SafetyBlocker
        context.Incidents.Add(new Incident
        {
            IncidentId = "INC_TEST_01",
            TripId = "TRIP_TEST_01",
            IncidentType = "PICKUP_ACCESS_BLOCKED",
            SafetyBlockerActive = true,
            Status = "REPORTED"
        });
        await context.SaveChangesAsync();

        var service = new PickupAccessService(context);
        var dto = new PickupAccessDecisionRequestDto
        {
            Decision = "APPROVED"
        };

        var result = await service.DecideAccessAsync("TRIP_TEST_01", dto, "CUSTOMER_01");

        Assert.Equal("RESOLVED", result.PickupAccessStatus);
        Assert.Equal("APPROVED", result.CustomerApprovalStatus);
        Assert.NotNull(result.CustomerApprovalAt);
        Assert.False(result.SafetyBlockerActive);

        var incident = await context.Incidents.FirstAsync(i => i.IncidentId == "INC_TEST_01");
        Assert.False(incident.SafetyBlockerActive);
        Assert.Equal("CONTINUE_ALLOWED", incident.Status);
        Assert.Equal("RELOCATING", incident.ResolutionType);
        Assert.Contains("Điểm hẹn ngã tư", incident.ResolutionNotes);
    }

    [Fact]
    public async Task Customer_DecideAccess_Approved_Shuttling_SetsShuttleNotesAndResolutionType()
    {
        using var context = CreateInMemoryContext();
        await SeedTripDataAsync(context, "TRIP_TEST_01", "DRIVER_01", "CUSTOMER_01");

        var trip = await context.TripPlans.FirstAsync(t => t.TripId == "TRIP_TEST_01");
        trip.PickupAccessStatus = "SHUTTLING";
        trip.CustomerApprovalStatus = "PENDING";
        trip.ShuttleVehicleId = "SHUTTLE_VEH_01";
        trip.ShuttleDriverId = "DRIVER_01";
        trip.ShuttleCostVnd = 1200000m;

        context.Incidents.Add(new Incident
        {
            IncidentId = "INC_TEST_SHUTTLE",
            TripId = "TRIP_TEST_01",
            IncidentType = "PICKUP_ACCESS_BLOCKED",
            SafetyBlockerActive = true,
            Status = "REPORTED"
        });
        await context.SaveChangesAsync();

        var service = new PickupAccessService(context);
        var dto = new PickupAccessDecisionRequestDto
        {
            Decision = "APPROVED"
        };

        var result = await service.DecideAccessAsync("TRIP_TEST_01", dto, "CUSTOMER_01");

        Assert.Equal("RESOLVED", result.PickupAccessStatus);
        Assert.Equal("APPROVED", result.CustomerApprovalStatus);
        Assert.False(result.SafetyBlockerActive);

        var incident = await context.Incidents.FirstAsync(i => i.IncidentId == "INC_TEST_SHUTTLE");
        Assert.False(incident.SafetyBlockerActive);
        Assert.Equal("CONTINUE_ALLOWED", incident.Status);
        Assert.Equal("SHUTTLING", incident.ResolutionType);
        Assert.Contains("SHUTTLE_VEH_01", incident.ResolutionNotes);
        Assert.Contains("1,200,000", incident.ResolutionNotes);
    }

    [Fact]
    public async Task Customer_DecideAccess_Rejected_RetainsBlocker()
    {
        using var context = CreateInMemoryContext();
        await SeedTripDataAsync(context, "TRIP_TEST_01", "DRIVER_01", "CUSTOMER_01");

        var trip = await context.TripPlans.FirstAsync(t => t.TripId == "TRIP_TEST_01");
        trip.PickupAccessStatus = "SHUTTLING";
        trip.CustomerApprovalStatus = "PENDING";
        trip.ShuttleCostVnd = 800000m;

        context.Incidents.Add(new Incident
        {
            IncidentId = "INC_TEST_02",
            TripId = "TRIP_TEST_01",
            IncidentType = "PICKUP_ACCESS_BLOCKED",
            SafetyBlockerActive = true,
            Status = "REPORTED"
        });
        await context.SaveChangesAsync();

        var service = new PickupAccessService(context);
        var dto = new PickupAccessDecisionRequestDto
        {
            Decision = "REJECTED",
            RejectionReason = "Chi phí trung chuyển quá cao, tôi sẽ tự dắt ngựa ra ngoài"
        };

        var result = await service.DecideAccessAsync("TRIP_TEST_01", dto, "CUSTOMER_01");

        Assert.Equal("REJECTED", result.CustomerApprovalStatus);
        Assert.True(result.SafetyBlockerActive);

        var incident = await context.Incidents.FirstAsync(i => i.IncidentId == "INC_TEST_02");
        Assert.True(incident.SafetyBlockerActive);
    }
}
