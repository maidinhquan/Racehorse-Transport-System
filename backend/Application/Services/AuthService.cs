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

            // 4. Gửi email chứa OTP cho người dùng (qua IEmailService / EmailService)
            var subject = "Mã xác thực đặt lại mật khẩu - RaceHorse Transport";
            var body = $@"<h3>Yêu cầu đặt lại mật khẩu</h3>
<p>Xin chào <strong>{user.FullName}</strong>,</p>
<p>Bạn đã gửi yêu cầu đặt lại mật khẩu cho tài khoản tại hệ thống RaceHorse Transport.</p>
<p>Mã OTP xác thực của bạn là: <strong style='font-size: 22px; color: #1a365d; letter-spacing: 2px;'>{otp}</strong></p>
<p>Mã OTP này có hiệu lực trong vòng <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
<p>Trân trọng,<br/>Đội ngũ hỗ trợ RaceHorse Transport</p>";

            await _emailService.SendEmailAsync(user.Email ?? cleanEmail, subject, body);

            return (true, genericSuccessMessage);
        }

        public async Task<(bool Success, string Message)> ResetPasswordAsync(string email, string otp, string newPassword, string confirmPassword)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return (false, "Email không được để trống");
            }

            if (string.IsNullOrWhiteSpace(otp))
            {
                return (false, "Mã OTP không được để trống");
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

            var cleanEmail = email.Trim();

            // 2. Tìm User theo email trong CSDL
            var user = await _userDao.GetByEmailAsync(cleanEmail);
            if (user == null)
            {
                return (false, "Không tìm thấy người dùng với email đã cung cấp");
            }

            // 3. Kiểm tra user.ResetOtpCode == otp và user.ResetOtpExpiry > DateTime.UtcNow
            if (string.IsNullOrEmpty(user.ResetOtpCode) || user.ResetOtpCode.Trim() != otp.Trim())
            {
                return (false, "Mã OTP không chính xác");
            }

            if (user.ResetOtpExpiry == null || user.ResetOtpExpiry <= DateTime.UtcNow)
            {
                return (false, "Mã OTP đã hết hạn, vui lòng yêu cầu mã mới");
            }

            // 4. Gán trực tiếp mật khẩu mới: user.PasswordHash = newPassword (KHÔNG băm theo yêu cầu Test Mode)
            user.PasswordHash = newPassword;

            // 5. Xóa mã OTP sau khi đổi thành công: user.ResetOtpCode = null; user.ResetOtpExpiry = null;
            user.ResetOtpCode = null;
            user.ResetOtpExpiry = null;
            user.ForgotPasswordRequest = null;
            user.ResetPasswordRequest = otp;

            // 6. Lưu thay đổi xuống CSDL thông qua UserDAO
            await _userDao.UpdateUserAsync(user);

            return (true, "Đặt lại mật khẩu thành công");
        }
    }
}

