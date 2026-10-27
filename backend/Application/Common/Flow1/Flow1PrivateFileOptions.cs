namespace Application.Common.Flow1;

public sealed class Flow1PrivateFileOptions
{
    public string Root { get; set; } = "App_Data/flow1/metadata/private-bytes";
}

// Retained source is only hashed against SQL import receipts, never used as runtime business state.
public sealed class Flow1LegacyImportOptions
{
    public string SourceRoot { get; set; } = "App_Data/flow1/metadata";
}
