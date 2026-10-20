namespace Application.DTOs
{
    public class StaffDto
    {
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // Driver, Escort
        public string LicenseClass { get; set; } = "FC";
        public DateTime? LicenseExpiry { get; set; }
        public List<string> CanDriveCountries { get; set; } = new() { "VN" };
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsAvailable { get; set; } = true;
        public string Specialization { get; set; } = string.Empty; // "Tài xế quốc tế", "Bác sĩ thú y áp tải"
    }

    public class StaffRoleItemDto
    {
        public string UserId { get; set; } = string.Empty;
        public string AssignmentRole { get; set; } = "MAIN_DRIVER";
    }
}

