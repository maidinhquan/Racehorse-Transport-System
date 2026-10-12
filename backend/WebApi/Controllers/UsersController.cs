using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Application.DTOs;
using Domain.Entities;
using Infrastructure.Data.Context;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly HorseTransportDbContext _context;

        public UsersController(HorseTransportDbContext context)
        {
            _context = context;
        }

        // GET: api/users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers()
        {
            var users = await _context.Users
                .Select(u => new UserDto
                {
                    UserId = u.UserId,
                    Username = u.Username,
                    Role = u.Role,
                    FullName = u.FullName,
                    Email = u.Email,
                    Phone = u.Phone,
                    ForgotPasswordRequest = u.ForgotPasswordRequest,
                    ResetPasswordRequest = u.ResetPasswordRequest,
                    IsActive = u.IsActive
                })
                .ToListAsync();

            return Ok(users);
        }

        // GET: api/users/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<UserDto>> GetUser(string id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound(new { message = $"Không tìm thấy người dùng với ID: {id}" });
            }

            var userDto = new UserDto
            {
                UserId = user.UserId,
                Username = user.Username,
                Role = user.Role,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                ForgotPasswordRequest = user.ForgotPasswordRequest,
                ResetPasswordRequest = user.ResetPasswordRequest,
                IsActive = user.IsActive
            };

            return Ok(userDto);
        }

        // GET: api/users/by-email/{email}
        [HttpGet("by-email/{email}")]
        public async Task<ActionResult<UserDto>> GetUserByEmail(string email)
        {
            var cleanEmail = email?.Trim() ?? string.Empty;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == cleanEmail || u.Username == cleanEmail);

            if (user == null)
            {
                return NotFound(new { message = $"Không tìm thấy người dùng với Email: {cleanEmail}" });
            }

            var userDto = new UserDto
            {
                UserId = user.UserId,
                Username = user.Username,
                Role = user.Role,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                ForgotPasswordRequest = user.ForgotPasswordRequest,
                ResetPasswordRequest = user.ResetPasswordRequest,
                IsActive = user.IsActive
            };

            return Ok(userDto);
        }

        // POST: api/users
        [HttpPost]
        public async Task<ActionResult<UserDto>> CreateUser([FromBody] CreateUserDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName))
            {
                return BadRequest(new { message = "Họ và tên không được để trống." });
            }

            // Tạo mã User mới nếu chưa có
            var newUser = new User
            {
                UserId = "USR_" + Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper(),
                Username = dto.Username,
                PasswordHash = dto.Password, // Lưu trực tiếp mật khẩu bình thường (plain text)
                Role = dto.Role ?? "Customer",
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.Phone,
                ForgotPasswordRequest = dto.ForgotPasswordRequest,
                ResetPasswordRequest = dto.ResetPasswordRequest,
                IsActive = true
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            var userDto = new UserDto
            {
                UserId = newUser.UserId,
                Username = newUser.Username,
                Role = newUser.Role,
                FullName = newUser.FullName,
                Email = newUser.Email,
                Phone = newUser.Phone,
                ForgotPasswordRequest = newUser.ForgotPasswordRequest,
                ResetPasswordRequest = newUser.ResetPasswordRequest,
                IsActive = newUser.IsActive
            };

            return CreatedAtAction(nameof(GetUser), new { id = newUser.UserId }, userDto);
        }

        // PUT: api/users/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = $"Không tìm thấy người dùng với ID: {id}" });
            }

            user.FullName = dto.FullName;
            user.Username = dto.Username;
            user.Role = dto.Role;
            user.Email = dto.Email;
            user.Phone = dto.Phone;
            if (dto.ForgotPasswordRequest != null) user.ForgotPasswordRequest = dto.ForgotPasswordRequest;
            if (dto.ResetPasswordRequest != null) user.ResetPasswordRequest = dto.ResetPasswordRequest;
            user.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật thông tin thành công.",
                data = new UserDto
                {
                    UserId = user.UserId,
                    Username = user.Username,
                    Role = user.Role,
                    FullName = user.FullName,
                    Email = user.Email,
                    Phone = user.Phone,
                    ForgotPasswordRequest = user.ForgotPasswordRequest,
                    ResetPasswordRequest = user.ResetPasswordRequest,
                    IsActive = user.IsActive
                }
            });
        }

        // DELETE: api/users/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = $"Không tìm thấy người dùng với ID: {id}" });
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa người dùng thành công." });
        }
    }
}

