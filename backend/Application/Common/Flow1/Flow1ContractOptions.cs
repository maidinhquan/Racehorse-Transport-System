namespace Application.Common.Flow1;

public sealed class Flow1ContractOptions
{
    public string BrowserExecutablePath { get; set; } = "";
    public string LibreOfficePath { get; set; } = "";
    public int TimeoutSeconds { get; set; } = 90;
    public string WorkRoot { get; set; } = "App_Data/flow1/conversion";
    // Values come from server configuration, never from Customer input.
    public Dictionary<string, string> Issuer { get; set; } = new();
}
