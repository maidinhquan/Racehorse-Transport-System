namespace Application.Services
{
    public interface IAuthService
    {
        Task<(bool Success, string Message)> ForgotPasswordAsync(string email);
        Task<(bool Success, string Message)> ResetPasswordAsync(string token, string newPassword, string confirmPassword);
    }
}

