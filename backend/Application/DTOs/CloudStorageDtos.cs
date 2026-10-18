namespace Application.DTOs
{
    public class CloudinarySettings
    {
        public string CloudName { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string ApiSecret { get; set; } = string.Empty;
        public string FolderPrefix { get; set; } = "racehorse_system";
    }

    public class CloudUploadResult
    {
        public bool Success { get; set; } = true;
        public string SecureUrl { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
        public string Format { get; set; } = string.Empty;
        public long Bytes { get; set; }
        public string ResourceType { get; set; } = "image"; // "image" or "raw"
        public string OriginalFileName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class CloudDeleteResult
    {
        public bool Success { get; set; }
        public string Result { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
    }

    public class FileUploadResponseDto
    {
        public string Url { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string Folder { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
