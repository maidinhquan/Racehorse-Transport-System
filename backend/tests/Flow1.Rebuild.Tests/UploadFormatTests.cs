using Application.DTOs.Flow1;
using Application.Common.Exceptions;
using Infrastructure.Flow1.Files;
using Xunit;

namespace Flow1.Rebuild.Tests;

public sealed class UploadFormatTests
{
    [Theory]
    [InlineData("image.jpg")]
    [InlineData("image.png")]
    public async Task Png_bytes_are_stored_and_served_as_png_even_with_jpg_name(string name)
    {
        var root = Path.Combine(Path.GetTempPath(), "UploadFormat-" + Guid.NewGuid().ToString("N"));
        try
        {
            var bytes = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4n8AAAAASUVORK5CYII=");
            var store = new LocalFileStore(root);
            var key = await store.PutAsync(new UploadedFile(bytes, name), true, default);
            Assert.EndsWith(".png", key);
            var file = await store.ReadAsync(key, default);
            Assert.Equal("image/png", file.ContentType);
            Assert.Equal(bytes, file.Bytes);
            var error = await Assert.ThrowsAsync<BusinessRuleException>(() => store.PutAsync(
                new UploadedFile("%PDF-1.7 not an image"u8.ToArray(), "fake.jpg"), false, default));
            Assert.Equal("INVALID_FILE_TYPE", error.ErrorCode);
        }
        finally { if (Directory.Exists(root)) Directory.Delete(root, true); }
    }
}
