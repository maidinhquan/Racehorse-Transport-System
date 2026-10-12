using Domain.Entities;
using Infrastructure.DAOs;
using System.Security.Cryptography;

namespace Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserDAO _userDao;
        private readonly IEmailService _emailService;

        public AuthService(UserDAO userDao, IEmailService emailService)
        {
            _userDao = userDao;
            _emailService = emailService;
        }

        public async Task<(bool Success, string Message)> ForgotPasswordAsync(string email)
        {
            const string genericSuccessMessage = "Nếu email tồn tại trên hệ thống, mã xác thực đã được gửi";

            if (string.IsNullOrWhiteSpace(email))
            {
                return (false, "Email không được để trống");
            }

            var cleanEmail = email.Trim();
            var user = await _userDao.GetByEmailAsync(cleanEmail);

            // 1. Kiểm tra: Email phải tồn tại và tài khoản đang kích hoạt (IsActive == true)
            // (Bảo mật) Nếu email không tồn tại hoặc tài khoản bị vô hiệu hóa, vẫn trả về JSON thành công với thông báo chung
            if (user == null || !user.IsActive)
            {
                return (true, genericSuccessMessage);
            }

            // 2. Sinh mã OTP ngẫu nhiên gồm 6 chữ số
            var otp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");

            // 3. Cập nhật vào User trong CSDL:
            // user.ResetOtpCode = otp
            // user.ResetOtpExpiry = DateTime.UtcNow.AddMinutes(5) (hết hạn sau 5 phút)
            user.ResetOtpCode = otp;
            user.ResetOtpExpiry = DateTime.UtcNow.AddMinutes(5);

            await _userDao.UpdateUserAsync(user);

            Console.ForegroundColor = ConsoleColor.Magenta;
            Console.WriteLine($"\n=======================================================");
            Console.WriteLine($"[AUTH SERVICE] MÃ OTP CỦA {user.Email}: >>> {otp} <<<");
            Console.WriteLine($"=======================================================\n");
            Console.ResetColor();

            // 4. Gửi email chứa OTP và đường link đặt lại mật khẩu cho người dùng
            var resetLink = $"http://localhost:5173/reset-password?token={otp}";
            var subject = "Mã xác thực đặt lại mật khẩu - RaceHorse Transport";
            var body = $@"<h3>Yêu cầu đặt lại mật khẩu</h3>
<p>Xin chào <strong>{user.FullName}</strong>,</p>
<p>Bạn đã gửi yêu cầu đặt lại mật khẩu cho tài khoản tại hệ thống RaceHorse Transport.</p>
<p>Mã OTP xác thực của bạn là: <strong style='font-size: 22px; color: #1a365d; letter-spacing: 2px;'>{otp}</strong></p>
<p>Hoặc bạn có thể bấm trực tiếp vào liên kết bên dưới để đặt lại mật khẩu trên website:</p>
<p><a href='{resetLink}' style='display:inline-block;padding:10px 20px;background-color:#2b6cb0;color:#ffffff;text-decoration:none;border-radius:5px;font-weight:bold;'>Đặt lại mật khẩu ngay</a></p>
<p style='color: #718096; font-size: 13px;'>Đường dẫn trực tiếp: <a href='{resetLink}'>{resetLink}</a></p>
<p>Mã OTP và liên kết này có hiệu lực trong vòng <strong>5 phút</strong>. Vui lòng không chia sẻ cho bất kỳ ai.</p>
<p>Trân trọng,<br/>Đội ngũ hỗ trợ RaceHorse Transport</p>";

            await _emailService.SendEmailAsync(user.Email ?? cleanEmail, subject, body);

            return (true, genericSuccessMessage);
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

            // 1. Kiểm tra: newPassword và confirmPassword phải trùng khớp nhau
            if (newPassword != confirmPassword)
            {
                return (false, "Mật khẩu mới và xác nhận mật khẩu không khớp");
            }

            var cleanToken = otpOrToken.Trim();
            User? user = null;

            // 2. Tìm User:
            // - Nếu Frontend / người dùng gửi email: tìm theo email
            // - Nếu Frontend chỉ gửi resetToken theo URL: tìm theo token trong DB
            if (!string.IsNullOrWhiteSpace(email))
            {
                user = await _userDao.GetByEmailAsync(email.Trim());
            }
            else
            {
                user = await _userDao.GetByResetTokenAsync(cleanToken);
            }

            if (user == null)
            {
                return (false, "Không tìm thấy người dùng hoặc mã xác thực không hợp lệ");
            }

            // 3. Kiểm tra mã xác thực (hỗ trợ cả ResetOtpCode và ForgotPasswordRequest)
            var matchesOtp = !string.IsNullOrEmpty(user.ResetOtpCode) && user.ResetOtpCode.Trim() == cleanToken;
            var matchesRequestToken = !string.IsNullOrEmpty(user.ForgotPasswordRequest) && user.ForgotPasswordRequest.Trim() == cleanToken;

            if (!matchesOtp && !matchesRequestToken)
            {
                return (false, "Mã OTP / Token không chính xác");
            }

            // 4. Kiểm tra thời gian hết hạn
            if (user.ResetOtpExpiry != null && user.ResetOtpExpiry <= DateTime.UtcNow)
            {
                return (false, "Mã OTP / Token đã hết hạn, vui lòng yêu cầu mã mới");
            }

            // 5. Gán trực tiếp mật khẩu mới: user.PasswordHash = newPassword (KHÔNG băm theo yêu cầu Test Mode)
            user.PasswordHash = newPassword;

            // 6. Xóa mã OTP sau khi đổi thành công: user.ResetOtpCode = null; user.ResetOtpExpiry = null;
            user.ResetOtpCode = null;
            user.ResetOtpExpiry = null;
            user.ForgotPasswordRequest = null;
            user.ResetPasswordRequest = cleanToken;

            // 7. Lưu thay đổi xuống CSDL thông qua UserDAO
            await _userDao.UpdateUserAsync(user);

            return (true, "Đặt lại mật khẩu thành công");
        }
    }
}

