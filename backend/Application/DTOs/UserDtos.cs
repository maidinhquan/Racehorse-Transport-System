namespace Application.DTOs
{
    public class UserDto
    {
        public string UserId { get; set; } = null!;
        public string? Username { get; set; }
        public string Role { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? ForgotPasswordRequest { get; set; }
        public string? ResetPasswordRequest { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateUserDto
    {
        public string? Username { get; set; }
        public string Password { get; set; } = null!;
        public string Role { get; set; } = "Customer";
        public string FullName { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? ForgotPasswordRequest { get; set; }
        public string? ResetPasswordRequest { get; set; }
    }

    public class UpdateUserDto
    {
        public string? Username { get; set; }
        public string Role { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? ForgotPasswordRequest { get; set; }
        public string? ResetPasswordRequest { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class LoginDto
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
    }
}

