using System.Security.Cryptography;
using System.Text;

namespace Infrastructure.Storage;

// Inventory only: hash retained source bytes without interpreting or serving business payloads.
public static class Flow1RetainedSources
{
    public static string? Fingerprint(string? root)
    {
        if(string.IsNullOrWhiteSpace(root)||!Directory.Exists(root))return null;
        root=Path.GetFullPath(root);NoLinks(root);var entries=new List<string>();long total=0;
        foreach(var path in Files(root).Order(StringComparer.Ordinal))
        {
            var relative=Path.GetRelativePath(root,path).Replace('\\','/');
            if(relative.StartsWith("private-bytes/",StringComparison.Ordinal))continue;
            NoLinks(path);
            if(Path.GetExtension(path).Equals(".tmp",StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("INCOMPLETE_RETAINED_SOURCE");
            if(!Path.GetExtension(path).Equals(".json",StringComparison.OrdinalIgnoreCase))continue;
            var info=new FileInfo(path);total+=info.Length;
            if(info.Length>2*1024*1024||total>128L*1024*1024||entries.Count>=10000)throw new InvalidDataException("RETAINED_SOURCE_LIMIT");
            var bytes=File.ReadAllBytes(path);if(bytes.LongLength!=info.Length)throw new InvalidDataException("RETAINED_SOURCE_CHANGED");
            entries.Add(relative+":"+Convert.ToHexString(SHA256.HashData(bytes)));
        }
        return entries.Count==0?null:Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(string.Join("\n",entries))));
    }
    private static IEnumerable<string> Files(string root)
    {
        NoLinks(root);
        foreach(var path in Directory.EnumerateFiles(root))yield return path;
        foreach(var dir in Directory.EnumerateDirectories(root).Order(StringComparer.Ordinal))
        {
            NoLinks(dir);if(Path.GetFileName(dir)=="private-bytes")continue;
            foreach(var path in Files(dir))yield return path;
        }
    }
    private static void NoLinks(string path)
    {
        for(var current=Path.GetFullPath(path);current is not null;current=Path.GetDirectoryName(current))
            if((File.Exists(current)||Directory.Exists(current))&&(File.GetAttributes(current)&FileAttributes.ReparsePoint)!=0)
                throw new InvalidDataException("RETAINED_SOURCE_LINK");
    }
}
