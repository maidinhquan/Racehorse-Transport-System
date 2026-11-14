using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Infrastructure.Data.Context;
using Application.DTOs;

namespace WebApi.Controllers
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

        [HttpGet("business-policies")]
        public async Task<IActionResult> GetBusinessPolicies()
        {
            try
            {
                var policies = await _context.BusinessPolicies
                    .OrderBy(p => p.PolicyId)
                    .ToListAsync();

                var dtos = policies.Select(MapToDto).ToList();
                return Ok(new ApiResponse<List<AdminBusinessPolicyDto>>
                {
                    Success = true,
                    Message = "Lấy danh sách thông số hệ thống thành công.",
                    Data = dtos
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = $"Lỗi khi tải thông số hệ thống: {ex.Message}",
                    Data = null
                });
            }
        }

        [HttpPut("business-policies/{id}")]
        public async Task<IActionResult> UpdateBusinessPolicy(string id, [FromBody] UpdateBusinessPolicyInput input)
        {
            try
            {
                var policy = await _context.BusinessPolicies.FirstOrDefaultAsync(p => p.PolicyId == id);
                if (policy == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = $"Không tìm thấy thông số hệ thống với mã {id}.",
                        Data = null
                    });
                }

                if (string.Equals(policy.ValueType, "NUMBER", StringComparison.OrdinalIgnoreCase))
                {
                    if (!input.NumberValue.HasValue)
                    {
                        return BadRequest(new ApiResponse<object>
                        {
                            Success = false,
                            Message = "Thông số dạng số yêu cầu phải có giá trị NumberValue.",
                            Data = null
                        });
                    }

                    if (string.Equals(policy.Unit, "PERCENT", StringComparison.OrdinalIgnoreCase))
                    {
                        if (input.NumberValue.Value < 1 || input.NumberValue.Value > 100)
                        {
                            return BadRequest(new ApiResponse<object>
                            {
                                Success = false,
                                Message = "Tỷ lệ phần trăm phải nằm trong khoảng từ 1% đến 100%.",
                                Data = null
                            });
                        }
                    }
                    else if (input.NumberValue.Value < 0)
                    {
                        return BadRequest(new ApiResponse<object>
                        {
                            Success = false,
                            Message = "Giá trị thời lượng hoặc số lượng không được nhỏ hơn 0.",
                            Data = null
                        });
                    }

                    policy.NumberValue = input.NumberValue.Value;
                }
                else if (string.Equals(policy.ValueType, "TEXT", StringComparison.OrdinalIgnoreCase))
                {
                    policy.TextValue = input.TextValue;
                }
                else if (string.Equals(policy.ValueType, "BOOLEAN", StringComparison.OrdinalIgnoreCase))
                {
                    policy.BoolValue = input.BoolValue;
                }

                if (!string.IsNullOrWhiteSpace(input.Description))
                {
                    policy.Description = input.Description.Trim();
                }

                policy.UpdatedAt = DateTime.UtcNow;

                var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

                if (!string.IsNullOrWhiteSpace(currentUserId) && await _context.Users.AnyAsync(u => u.UserId == currentUserId))
                {
                    policy.UpdatedBy = currentUserId;
                }
                else
                {
                    policy.UpdatedBy = "USER_024";
                }

                await _context.SaveChangesAsync();

                return Ok(new ApiResponse<AdminBusinessPolicyDto>
                {
                    Success = true,
                    Message = $"Cập nhật thông số {policy.Code} thành công.",
                    Data = MapToDto(policy)
                });
            }
            catch (Exception ex)
            {
                var errorMsg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = $"Lỗi khi cập nhật thông số hệ thống: {errorMsg}",
                    Data = null
                });
            }
        }

        private static string CategorizePolicy(string code) => code switch
        {
            "MIN_PREPARATION_DAYS" or "FLOW1_PREPARATION_DAYS" or "MIN_TRANSIT_DAYS" or "MAX_HORSES_PER_REQUEST" => "PREPARATION_TRANSIT",
            "DEFAULT_DEPOSIT_PERCENT" or "CONTRACT_DEADLINE_HOURS" or "FLOW1_REVIEW_BUFFER_DAYS" or "FLOW1_SIGNING_BUFFER_DAYS" or "FLOW1_CUSTOMER_RESPONSE_HOURS" => "CONTRACT_DEPOSIT",
            "SIGN_OTP_TTL_MINUTES" or "SIGN_OTP_RESEND_SECONDS" or "SIGN_OTP_MAX_ATTEMPTS" => "SECURITY_OTP",
            "FEEDBACK_WINDOW_HOURS" => "FEEDBACK",
            _ => "GENERAL"
        };

        private static AdminBusinessPolicyDto MapToDto(Domain.Entities.BusinessPolicy p) => new()
        {
            PolicyId = p.PolicyId,
            Code = p.Code,
            ValueType = p.ValueType,
            NumberValue = p.NumberValue,
            TextValue = p.TextValue,
            BoolValue = p.BoolValue,
            Unit = p.Unit,
            ScopeType = p.ScopeType,
            ScopeId = p.ScopeId,
            Description = p.Description,
            UpdatedBy = p.UpdatedBy,
            UpdatedAt = p.UpdatedAt,
            Category = CategorizePolicy(p.Code)
        };
    }

    public class AdminBusinessPolicyDto
    {
        public string PolicyId { get; set; } = "";
        public string Code { get; set; } = "";
        public string ValueType { get; set; } = "";
        public decimal? NumberValue { get; set; }
        public string? TextValue { get; set; }
        public bool? BoolValue { get; set; }
        public string? Unit { get; set; }
        public string ScopeType { get; set; } = "";
        public string? ScopeId { get; set; }
        public string Description { get; set; } = "";
        public string? UpdatedBy { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string Category { get; set; } = "";
    }

    public class UpdateBusinessPolicyInput
    {
        public decimal? NumberValue { get; set; }
        public string? TextValue { get; set; }
        public bool? BoolValue { get; set; }
        public string? Description { get; set; }
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
