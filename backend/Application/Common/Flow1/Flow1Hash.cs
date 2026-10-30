using System.Security.Cryptography;
using System.Text.Json;
namespace Application.Common.Flow1;
public static class Flow1Hash
{
 public static string Of<T>(T value)=>Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(value,new JsonSerializerOptions(JsonSerializerDefaults.Web))));
}
