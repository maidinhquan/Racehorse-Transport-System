using System.Net.Http.Headers;
using System.Text.Json;
using Application.DTOs.Flow1;

namespace Flow1.Tests;

public static class CustomerTransportTests
{
    internal static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    internal static HorseInput Horse() => new("Demo", "123456789012345", "DEMO-PASSPORT", "Thoroughbred", "GELDING", 450, new(2020, 1, 1),"Fixture issuer",new(2021,1,1),new(2035,1,1),100000000,"Sensitive to loud noise");
    internal static byte[] Png => Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=");
    internal static MultipartFormDataContent HorseBody(HorseInput? input = null, bool invalidPhoto = false)
    {
        var body = new MultipartFormDataContent();
        body.Add(new StringContent(JsonSerializer.Serialize(input ?? Horse(), Json)), "payload");
        var photo = new ByteArrayContent(invalidPhoto ? new byte[30] : Png);
        photo.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        body.Add(photo, "photo", "photo.png");
        body.Add(new ByteArrayContent(System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\nDemo passport test only\n%%EOF")), "passportScan", "passport.pdf");
        body.Add(new ByteArrayContent(System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\nFixture ownership certificate\n%%EOF")), "ownershipCertificate", "ownership.pdf");
        return body;
    }
}
