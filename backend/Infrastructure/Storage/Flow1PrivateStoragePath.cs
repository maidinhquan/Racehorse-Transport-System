using Application.Common.Flow1;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace Infrastructure.Storage;

public static class Flow1PrivateStoragePath
{
    public static string Resolve(string root, IHostEnvironment environment)
    {
        var path = Path.GetFullPath(root, environment.ContentRootPath);
        var webRoot = environment is IWebHostEnvironment web && !string.IsNullOrWhiteSpace(web.WebRootPath)
            ? Path.GetFullPath(web.WebRootPath) : Path.GetFullPath("wwwroot", environment.ContentRootPath);
        if (path.Equals(webRoot, StringComparison.OrdinalIgnoreCase) || path.StartsWith(webRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Flow 1 private storage must be outside wwwroot.");
        return path;
    }
}
