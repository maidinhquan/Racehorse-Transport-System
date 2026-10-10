using System.ComponentModel.DataAnnotations;

namespace RaceHorse_Transport_Application.DTOs
{
    // ==========================================
    // REQUEST DTOS
    // ==========================================

    public class LoginRequestDto
    {
        [Required(ErrorMessage = "Email không được để trống")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng")]
        public string Email { get; set; } = null!;

        [Required(ErrorMessage = "Mật khẩu không được để trống")]
        public string Password { get; set; } = null!;
    }

    public class GoogleLoginRequestDto
    {
        [Required(ErrorMessage = "idToken không được để trống")]
        public string IdToken { get; set; } = null!;
    }

    public class RegisterRequestOtpDto
    {
        [Required(ErrorMessage = "Họ và tên không được để trống")]
        public string FullName { get; set; } = null!;

        [Required(ErrorMessage = "Email không được để trống")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng")]
        public string Email { get; set; } = null!;

        [Required(ErrorMessage = "Số điện thoại không được để trống")]
        public string PhoneNumber { get; set; } = null!;

        [Required(ErrorMessage = "Mật khẩu không được để trống")]
        [MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự")]
        public string Password { get; set; } = null!;
    }

    public class RegisterVerifyOtpDto
    {
        [Required(ErrorMessage = "registrationToken không được để trống")]
        public string RegistrationToken { get; set; } = null!;

        [Required(ErrorMessage = "Mã OTP không được để trống")]
        public string Otp { get; set; } = null!;
    }

    public class RegisterResendOtpDto
    {
        [Required(ErrorMessage = "registrationToken không được để trống")]
        public string RegistrationToken { get; set; } = null!;
    }

    public class ForgotPasswordRequestDto
    {
        [Required(ErrorMessage = "Email không được để trống")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng")]
        public string Email { get; set; } = null!;
    }

    public class ResetPasswordRequestDto
    {
        [Required(ErrorMessage = "resetToken không được để trống")]
        public string ResetToken { get; set; } = null!;

        [Required(ErrorMessage = "Mật khẩu mới không được để trống")]
        [MinLength(6, ErrorMessage = "Mật khẩu mới tối thiểu 6 ký tự")]
        public string NewPassword { get; set; } = null!;

        [Required(ErrorMessage = "Xác nhận mật khẩu không được để trống")]
        [Compare("NewPassword", ErrorMessage = "Mật khẩu xác nhận không khớp")]
        public string ConfirmNewPassword { get; set; } = null!;
    }

    public class ChangePasswordRequestDto
    {
        [Required(ErrorMessage = "Mật khẩu hiện tại không được để trống")]
        public string CurrentPassword { get; set; } = null!;

        [Required(ErrorMessage = "Mật khẩu mới không được để trống")]
        [MinLength(6, ErrorMessage = "Mật khẩu mới tối thiểu 6 ký tự")]
        public string NewPassword { get; set; } = null!;

        [Required(ErrorMessage = "Xác nhận mật khẩu không được để trống")]
        [Compare("NewPassword", ErrorMessage = "Mật khẩu xác nhận không khớp")]
        public string ConfirmNewPassword { get; set; } = null!;
    }

    // ==========================================
    // RESPONSE DATA DTOS
    // ==========================================

    public class AuthResponseData
    {
        public object UserId { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string AccessToken { get; set; } = null!;
    }

    public class CurrentUserResponseData
    {
        public object UserId { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
    }

    public class RequestOtpResponseData
    {
        public string RegistrationToken { get; set; } = null!;
        public int ExpiresIn { get; set; } = 300;
    }

    public class ResendOtpResponseData
    {
        public int ExpiresIn { get; set; } = 300;
    }

    public class PendingRegistration
    {
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string PhoneNumber { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string Otp { get; set; } = null!;
    }
}

