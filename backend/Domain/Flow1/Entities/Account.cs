namespace Domain.Flow1.Entities;

public sealed class Account
{
    public string UserID { get; set; } = null!;
    public string? Username { get; set; }
    public string PasswordHash { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? ForgotPasswordRequest { get; set; }
    public string? ResetPasswordRequest { get; set; }
    public string? ResetOtpCode { get; set; }
    public DateTime? ResetOtpExpiry { get; set; }
    public bool IsActive { get; set; }
}
