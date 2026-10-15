namespace Application.Common.Flow1;

public sealed class Flow1StorageOptions
{
    // Resolve relative to WebApi's content root, never wwwroot.
    public string MetadataRoot { get; set; } = "App_Data/flow1/metadata";
    public int MaxDocumentBytes { get; set; } = 2 * 1024 * 1024;
    public int LockTimeoutMilliseconds { get; set; } = 5000;
}
