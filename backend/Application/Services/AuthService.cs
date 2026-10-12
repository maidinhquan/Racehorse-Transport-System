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

            if (user == null)
            {
                return (false, "Email của bạn không tồn tại trên hệ thống");
            }

            if (!user.IsActive)
            {
                return (false, "Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt");
            }

            var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

            user.ForgotPasswordRequest = token;
            user.ResetOtpExpiry = DateTime.UtcNow.AddMinutes(15);

            await _userDao.UpdateUserAsync(user);

            var clientUrl = _config["ClientUrl"] ?? "http://localhost:5173";
            var resetLink = $"{clientUrl.TrimEnd('/')}/reset-password?token={token}";
            var subject = "Mã xác thực đặt lại mật khẩu - RaceHorse Transport";
            var body = $@"<h3>Yêu cầu đặt lại mật khẩu</h3>
<p>Xin chào <strong>{user.FullName}</strong>,</p>
<p>Bạn đã gửi yêu cầu đặt lại mật khẩu cho tài khoản tại hệ thống RaceHorse Transport.</p>
<p>Bấm vào liên kết bên dưới để đặt lại mật khẩu trên website:</p>
<p><a href='{resetLink}' style='display:inline-block;padding:10px 20px;background-color:#2b6cb0;color:#ffffff;text-decoration:none;border-radius:5px;font-weight:bold;'>Đặt lại mật khẩu ngay</a></p>
<p style='color: #718096; font-size: 13px;'>Đường dẫn trực tiếp: <a href='{resetLink}'>{resetLink}</a></p>
<p>Liên kết này có hiệu lực trong vòng <strong>15 phút</strong>. Vui lòng không chia sẻ cho bất kỳ ai.</p>
<p>Trân trọng,<br/>Đội ngũ hỗ trợ RaceHorse Transport</p>";

            await _emailService.SendEmailAsync(user.Email ?? cleanEmail, subject, body);

            return (true, successMessage);
        }

        public async Task<(bool Success, string Message)> ResetPasswordAsync(string email, string otpOrToken, string newPassword, string confirmPassword)
        {
            if (string.IsNullOrWhiteSpace(otpOrToken))
            {
                return (false, "Mã OTP / Reset Token không được để trống");
            }

            if (string.IsNullOrWhiteSpace(newPassword))
            {
                return (false, "Mật khẩu mới không được để trống");
            }

            if (newPassword.Length < 6)
            {
                return (false, "Mật khẩu mới phải có tối thiểu 6 ký tự");
            }

            if (newPassword != confirmPassword)
            {
                return (false, "Mật khẩu mới và xác nhận mật khẩu không khớp");
            }

            var cleanToken = otpOrToken.Trim();
            User? user = null;

            if (!string.IsNullOrWhiteSpace(email))
            {
                user = await _userDao.GetByEmailAsync(email.Trim().ToLowerInvariant());
            }
            else
            {
                user = await _userDao.GetByResetTokenAsync(cleanToken);
            }

            if (user == null)
            {
                return (false, "Không tìm thấy người dùng hoặc mã xác thực không hợp lệ");
            }

            var matchesOtp = !string.IsNullOrEmpty(user.ResetOtpCode) && user.ResetOtpCode.Trim() == cleanToken;
            var matchesRequestToken = !string.IsNullOrEmpty(user.ForgotPasswordRequest) && user.ForgotPasswordRequest.Trim() == cleanToken;

            if (!matchesOtp && !matchesRequestToken)
            {
                return (false, "Mã OTP / Token không chính xác");
            }

            if (user.ResetOtpExpiry != null && user.ResetOtpExpiry <= DateTime.UtcNow)
            {
                return (false, "Mã OTP / Token đã hết hạn, vui lòng yêu cầu mã mới");
            }

            user.PasswordHash = newPassword;

            user.ResetOtpCode = null;
            user.ResetOtpExpiry = null;
            user.ForgotPasswordRequest = null;
            user.ResetPasswordRequest = cleanToken;

            await _userDao.UpdateUserAsync(user);

            return (true, "Đặt lại mật khẩu thành công");
        }
    }
}
