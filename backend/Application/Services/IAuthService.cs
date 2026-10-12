namespace Application.Services
{
    public interface IAuthService
    {
        Task<(bool Success, string Message)> ForgotPasswordAsync(string email);
        Task<(bool Success, string Message)> ResetPasswordAsync(
            string email,
            string otpOrToken,
            string newPassword,
            string confirmPassword);
    }
}
