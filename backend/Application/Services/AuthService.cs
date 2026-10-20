using Domain.Entities;
using Domain.Interfaces.DAOs;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;

namespace Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserDAO _userDao;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _config;

        public AuthService(IUserDAO userDao, IEmailService emailService, IConfiguration config)
        {
            _userDao = userDao;
            _emailService = emailService;
            _config = config;
        }

        public async Task<(bool Success, string Message)> ForgotPasswordAsync(string email)
        {
            const string successMessage = "Liên kết đặt lại mật khẩu đã được gửi đến hòm thư của bạn.";

            if (string.IsNullOrWhiteSpace(email))
            {
                return (false, "Email không được để trống");
            }

            var cleanEmail = email.Trim().ToLower();
            var user = await _userDao.GetByEmailAsync(cleanEmail);

            // 1. Kiểm tra: Email phải tồn tại và tài khoản đang kích hoạt (IsActive == true)
            if (user == null)
            {
                return (false, "Email của bạn không tồn tại trên hệ thống");
            }

            if (!user.IsActive)
            {
                return (false, "Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt");
            }

            // 2. Sinh mã token ngẫu nhiên bảo mật (URL-safe hex token)
            var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

            // 3. Cập nhật vào User trong CSDL:
            user.ForgotPasswordRequest = token;
            user.ResetOtpExpiry = DateTime.UtcNow.AddMinutes(15); // Hết hạn sau 15 phút

            await _userDao.UpdateUserAsync(user);

            // 4. Tạo đường dẫn liên kết đặt lại mật khẩu dẫn tới frontend
            var clientUrl = _config["ClientUrl"] ?? "http://localhost:5173";
            var resetLink = $"{clientUrl.TrimEnd('/')}/reset-password?token={token}";

            Console.ForegroundColor = ConsoleColor.Magenta;
            Console.WriteLine($"\n=======================================================");
            Console.WriteLine($"[AUTH SERVICE] LIÊN KẾT ĐẶT LẠI MẬT KHẨU CỦA {user.Email}:");
            Console.WriteLine($">>> {resetLink} <<<");
            Console.WriteLine($"=======================================================\n");
            Console.ResetColor();

            // 5. Gửi email chứa liên kết đặt lại mật khẩu cho người dùng
            var subject = "Yêu cầu đặt lại mật khẩu - RaceHorse Transport";
            var body = $@"<h3>Yêu cầu đặt lại mật khẩu</h3>
<p>Xin chào <strong>{user.FullName}</strong>,</p>
<p>Bạn đã gửi yêu cầu đặt lại mật khẩu cho tài khoản tại hệ thống RaceHorse Transport.</p>
<p>Vui lòng bấm vào nút bên dưới để tiến hành đặt lại mật khẩu mới:</p>
<p style='margin: 20px 0;'>
    <a href='{resetLink}' style='background-color: #f59e0b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Đặt lại mật khẩu</a>
</p>
<p>Hoặc truy cập trực tiếp bằng đường dẫn sau:<br/>
<a href='{resetLink}'>{resetLink}</a></p>
<p>Liên kết này có hiệu lực trong vòng <strong>15 phút</strong>. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
<p>Trân trọng,<br/>Đội ngũ hỗ trợ RaceHorse Transport</p>";

            await _emailService.SendEmailAsync(user.Email ?? cleanEmail, subject, body);

            return (true, successMessage);
        }

        public async Task<(bool Success, string Message)> ResetPasswordAsync(string token, string newPassword, string confirmPassword)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return (false, "Liên kết đặt lại mật khẩu không hợp lệ.");
            }

            if (string.IsNullOrWhiteSpace(newPassword))
            {
                return (false, "Mật khẩu mới không được để trống");
            }

            if (newPassword.Length < 6)
            {
                return (false, "Mật khẩu mới phải có tối thiểu 6 ký tự");
            }

            // 1. Kiểm tra: newPassword và confirmPassword phải trùng khớp nhau
            if (newPassword != confirmPassword)
            {
                return (false, "Mật khẩu mới và xác nhận mật khẩu không khớp");
            }

            var cleanToken = token.Trim();

            // 2. Tìm User theo token trong CSDL
            var user = await _userDao.GetByResetTokenAsync(cleanToken);
            if (user == null)
            {
                return (false, "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã qua sử dụng");
            }

            // 3. Kiểm tra user.ResetOtpExpiry > DateTime.UtcNow
            if (user.ResetOtpExpiry == null || user.ResetOtpExpiry <= DateTime.UtcNow)
            {
                return (false, "Liên kết đặt lại mật khẩu đã hết hạn, vui lòng yêu cầu liên kết mới");
            }

            // 4. Gán mật khẩu mới
            user.PasswordHash = newPassword;

            // 5. Vô hiệu hóa token sau khi đổi thành công
            user.ForgotPasswordRequest = null;
            user.ResetOtpExpiry = null;
            user.ResetOtpCode = null;
            user.ResetPasswordRequest = "COMPLETED";

            // 6. Lưu thay đổi xuống CSDL thông qua UserDAO
            await _userDao.UpdateUserAsync(user);

            return (true, "Đặt lại mật khẩu thành công");
        }
    }
}

