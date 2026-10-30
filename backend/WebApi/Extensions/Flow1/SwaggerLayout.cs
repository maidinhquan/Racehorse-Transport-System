using System.Text;
using Swashbuckle.AspNetCore.SwaggerUI;

namespace WebApi.Extensions.Flow1;

public static class SwaggerLayout
{
    public static void OrderByFlow(this SwaggerUIOptions options)
    {
        var originalIndex = options.IndexStream;
        options.IndexStream = () =>
        {
            using var stream = originalIndex();
            using var reader = new StreamReader(stream);
            var html = reader.ReadToEnd();
            const string anchor = "const ui = SwaggerUIBundle(configObject);";
            const string sorters = """
                // Display-only ordering: does not change request paths, methods or authentication.
                configObject.operationsSorter = function (a, b) {
                    var left = a.get("operation").get("x-flow-order");
                    var right = b.get("operation").get("x-flow-order");
                    if (left == null && right == null) return 0;
                    return (left == null ? Number.MAX_SAFE_INTEGER : left) -
                        (right == null ? Number.MAX_SAFE_INTEGER : right);
                };
                configObject.tagsSorter = function (a, b) {
                    function rank(name) {
                        if (name === "Auth") return 0;
                        var match = /^Flow 1 · (\d+)\./.exec(name);
                        return match ? Number(match[1]) : 1000;
                    }
                    return rank(a) - rank(b);
                };
                """;
            if (!html.Contains(anchor, StringComparison.Ordinal))
                throw new InvalidOperationException("Swagger UI initializer changed; update the Flow 1 display-order hook.");
            return new MemoryStream(Encoding.UTF8.GetBytes(html.Replace(anchor, sorters + "\n" + anchor, StringComparison.Ordinal)));
        };
    }
}
