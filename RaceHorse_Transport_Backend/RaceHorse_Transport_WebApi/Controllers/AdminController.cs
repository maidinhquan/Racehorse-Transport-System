using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using RaceHorse_Transport_Infrastructure.Data.Context;

namespace RaceHorse_Transport_WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly HorseTransportDbContext _context;

        public AdminController(HorseTransportDbContext context)
        {
            _context = context;
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardData()
        {
            try
            {
                // 1. Thống kê số lượng người dùng từ DB
                var totalUsers = await _context.Users.CountAsync();
                var activeUsers = await _context.Users.CountAsync(u => u.IsActive);
                var inactiveUsers = totalUsers - activeUsers;

                // 2. Thống kê từ các bảng nghiệp vụ thực tế trong DB
                int horseCount = 0;
                int requestCount = 0;
                int vehicleCount = 0;

                var conn = _context.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open)
                {
                    await conn.OpenAsync();
                }

                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
                        SELECT 
                            (SELECT COUNT(*) FROM [HORSE]) as HorseCount,
                            (SELECT COUNT(*) FROM [TRANSPORT_REQUEST]) as RequestCount,
                            (SELECT COUNT(*) FROM [VEHICLE]) as VehicleCount";
                    using var reader = await cmd.ExecuteReaderAsync();
                    if (await reader.ReadAsync())
                    {
                        horseCount = reader.IsDBNull(0) ? 0 : Convert.ToInt32(reader[0]);
                        requestCount = reader.IsDBNull(1) ? 0 : Convert.ToInt32(reader[1]);
                        vehicleCount = reader.IsDBNull(2) ? 0 : Convert.ToInt32(reader[2]);
                    }
                }

                // 3. Danh sách toàn bộ người dùng thực tế từ database
                var users = await _context.Users
                    .OrderBy(u => u.UserId)
                    .Select(u => new AdminUserDto
                    {
                        Id = u.UserId,
                        FullName = u.FullName,
                        Email = u.Email ?? "",
                        Phone = u.Phone ?? "",
                        Role = u.Role,
                        IsActive = u.IsActive
                    })
                    .ToListAsync();

                var dashboardData = new AdminDashboardDto
                {
                    Stats = new AdminStatsDto
                    {
                        TotalUsers = totalUsers,
                        ActiveUsers = activeUsers,
                        InactiveUsers = inactiveUsers,
                        TotalHorses = horseCount,
                        TotalRequests = requestCount,
                        TotalVehicles = vehicleCount,
                        DatabaseStatus = "Đã kết nối (SQL Server: HorseTransportDB)"
                    },
                    Users = users
                };

                return Ok(new ApiResponse<AdminDashboardDto>
                {
                    Success = true,
                    Message = "Lấy dữ liệu Admin từ database thành công.",
                    Data = dashboardData
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = $"Lỗi khi truy vấn database: {ex.Message}",
                    Data = null
                });
            }
        }
    }

    public class AdminDashboardDto
    {
        public AdminStatsDto Stats { get; set; } = new();
        public List<AdminUserDto> Users { get; set; } = new();
    }

    public class AdminStatsDto
    {
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int InactiveUsers { get; set; }
        public int TotalHorses { get; set; }
        public int TotalRequests { get; set; }
        public int TotalVehicles { get; set; }
        public string DatabaseStatus { get; set; } = "";
    }

    public class AdminUserDto
    {
        public string Id { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Role { get; set; } = "";
        public bool IsActive { get; set; }
    }
}
