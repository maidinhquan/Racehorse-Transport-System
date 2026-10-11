using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using RaceHorse_Transport_Infrastructure.Data.Context;

namespace RaceHorse_Transport_WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly HorseTransportDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(
            HorseTransportDbContext context,
            IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        /* ========================
           POST /api/auth/login
        ======================== */
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Email và mật khẩu không được để trống.",
                    Data = null
                });
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
            {
                return Unauthorized(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Email hoặc mật khẩu không đúng.",
                    Data = null
                });
            }

            if (!user.IsActive)
            {
                return Unauthorized(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Tài khoản đã bị khóa.",
                    Data = null
                });
            }

            // Verify password with BCrypt
            bool isPasswordValid;
            try
            {
                isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            }
            catch
            {
                // If the hash in DB is not a valid BCrypt hash (e.g. placeholder data),
                // fall back to plain text comparison for development
                isPasswordValid = user.PasswordHash == request.Password;
            }

            if (!isPasswordValid)
            {
                return Unauthorized(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Email hoặc mật khẩu không đúng.",
                    Data = null
                });
            }

            // Map DB role to frontend role format
            var frontendRole = MapRole(user.Role);

            // Generate JWT token
            var accessToken = GenerateJwtToken(user.UserId, user.Email!, user.FullName, frontendRole);

            return Ok(new ApiResponse<LoginData>
            {
                Success = true,
                Message = "Đăng nhập thành công.",
                Data = new LoginData
                {
                    UserId = user.UserId,
                    FullName = user.FullName,
                    Email = user.Email!,
                    Role = frontendRole,
                    AccessToken = accessToken
                }
            });
        }

        /* ========================
           GET /api/auth/me
        ======================== */
        [HttpGet("me")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = User.FindFirstValue("UserId");
            if (userId == null)
            {
                return Unauthorized(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Không tìm thấy thông tin người dùng.",
                    Data = null
                });
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Người dùng không tồn tại.",
                    Data = null
                });
            }

            return Ok(new ApiResponse<CurrentUserData>
            {
                Success = true,
                Message = "Lấy thông tin thành công.",
                Data = new CurrentUserData
                {
                    UserId = user.UserId,
                    FullName = user.FullName,
                    Email = user.Email!,
                    Role = MapRole(user.Role)
                }
            });
        }

        // ---- Helper Methods ----

        private string GenerateJwtToken(string userId, string email, string fullName, string role)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSettings["Key"]!));

            var claims = new[]
            {
                new Claim("UserId", userId),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Name, fullName),
                new Claim(ClaimTypes.Role, role)
            };

            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static string MapRole(string dbRole)
        {
            return dbRole.ToUpper() switch
            {
                "CUSTOMER" => "CUSTOMER",
                "COORDINATOR" => "FLEET_ROUTE_COORDINATOR",
                "DRIVER" => "DRIVER_ESCORT",
                "LOGISTICS_MANAGER" or "MANAGER" => "LOGISTICS_MANAGER",
                "TRANSPORT_SPECIALIST" or "SPECIALIST" => "TRANSPORT_SPECIALIST",
                _ => dbRole.ToUpper()
            };
        }
    }

    // ---- DTOs ----

    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = "";
        public T? Data { get; set; }
    }

    public class LoginRequest
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class LoginData
    {
        public string UserId { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Role { get; set; } = "";
        public string AccessToken { get; set; } = "";
    }

    public class CurrentUserData
    {
        public string UserId { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Role { get; set; } = "";
    }
}
