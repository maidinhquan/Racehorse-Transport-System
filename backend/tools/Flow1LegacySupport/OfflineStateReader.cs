using Application.Interfaces.Flow1;
using Infrastructure.Storage;
using System.Text.Json;
namespace Flow1LegacySupport;
public static class OfflineStateReader
{
    public static IReadOnlyList<Flow1StateDocument> Files(string root)=>LegacyFlow1Sources.Read(root).Select(x=>LegacyFlow1Sources.Parse(x.Key,x.Value)).ToArray();
    public static void Validate(JsonElement value)=>LegacyFlow1Sources.NoDuplicatePropertiesOrSecrets(value);
}
