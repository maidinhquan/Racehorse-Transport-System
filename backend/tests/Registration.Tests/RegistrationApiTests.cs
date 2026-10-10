using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Application.Common.Exceptions;
using Application.Interfaces;
using Domain.Entities;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Registration.Tests;

public sealed class RegistrationApiTests
{
    internal const string Prefix = "/api/auth/register/";
    internal const string Password = "Pass Word123!";

    internal static Task<HttpResponseMessage> Request(HttpClient client, string email = "user@example.com", string phone = "0901234567") =>
        client.PostAsJsonAsync(Prefix + "request-otp", new { fullName = "  Nguyễn Văn A  ", email, phoneNumber = phone, password = Password, role = "MANAGER" });

    internal static async Task<string> Token(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        return json.GetProperty("data").GetProperty("registrationToken").GetString()!;
    }

    internal static Task<HttpResponseMessage> Verify(HttpClient client, string token, string otp) =>
        client.PostAsJsonAsync(Prefix + "verify-otp", new { registrationToken = token, otp });

    internal static Task<HttpResponseMessage> Resend(HttpClient client, string token) =>
        client.PostAsJsonAsync(Prefix + "resend-otp", new { registrationToken = token });

    [Fact]
    public async Task Registration_creates_only_customer_after_verification_and_never_returns_password_or_otp()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        var response = await Request(client, "USER@EXAMPLE.COM", "090-123-4567");
        var token = await Token(response);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(Password, body);
        Assert.DoesNotContain(factory.Email.Codes["user@example.com"], body);
        Assert.Empty(factory.Users.Users);
        var store = factory.Services.GetRequiredService<IRegistrationStore>();
        var hash = await store.ExecuteAsync(token, pending => Task.FromResult(pending.PasswordHash));
        Assert.True(BCrypt.Net.BCrypt.Verify(Password, hash));
        Assert.Equal(HttpStatusCode.OK, (await Verify(client, token, factory.Email.Codes["user@example.com"])).StatusCode);
        var user = Assert.Single(factory.Users.Users);
        Assert.Equal("CUSTOMER", user.Role);
        Assert.Equal("Nguyễn Văn A", user.FullName);
        Assert.Equal("user@example.com", user.Email);
        Assert.Equal("0901234567", user.Phone);
        Assert.True(user.IsActive);
        Assert.True(user.UserId.Length <= 50);
        Assert.True(BCrypt.Net.BCrypt.Verify(Password, user.PasswordHash));
        Assert.Equal(HttpStatusCode.BadRequest, (await Verify(client, token, factory.Email.Codes["user@example.com"])).StatusCode);
    }

    [Fact]
    public async Task Invalid_body_and_malformed_json_return_validation_envelopes()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        foreach (var body in new[] { "", "{", "{}", "null" })
        {
            var response = await client.PostAsync(Prefix + "request-otp", new StringContent(body, Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.False(json.GetProperty("success").GetBoolean());
        }
    }

    [Theory]
    [InlineData("", "good@example.com", "0901234567", "Password123!")]
    [InlineData("Name", "bad-email", "0901234567", "Password123!")]
    [InlineData("Name", "good@example.com", "abc", "Password123!")]
    [InlineData("Name", "good@example.com", "0901234567", "12345")]
    [InlineData("Name", "good@example.com", "0901234567", "      ")]
    public async Task Invalid_registration_input_creates_no_session_or_user(string name, string email, string phone, string password)
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        var response = await client.PostAsJsonAsync(Prefix + "request-otp", new { fullName = name, email, phoneNumber = phone, password });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(factory.Email.Codes);
        Assert.Empty(factory.Users.Users);
    }

    [Fact]
    public async Task Password_over_bcrypt_byte_limit_is_rejected_without_truncation()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        var response = await client.PostAsJsonAsync(Prefix + "request-otp", new
        {
            fullName = "Name", email = "good@example.com", phoneNumber = "0901234567", password = new string('ế', 25)
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(factory.Email.Codes);
    }

    [Fact]
    public async Task Wrong_code_is_limited_and_cannot_create_user()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        var token = await Token(await Request(client));
        var code = factory.Email.Codes["user@example.com"];
        var wrong = code == "000000" ? "999999" : "000000";
        for (var i = 0; i < 5; i++)
            Assert.Equal(i == 4 ? HttpStatusCode.TooManyRequests : HttpStatusCode.BadRequest, (await Verify(client, token, wrong)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Verify(client, token, code)).StatusCode);
        Assert.Empty(factory.Users.Users);
    }

    [Fact]
    public async Task Expired_otp_cannot_create_user_and_resend_invalidates_old_code()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        var token = await Token(await Request(client));
        var old = factory.Email.Codes["user@example.com"];
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Resend(client, token)).StatusCode);
        factory.Clock.Advance(301);
        Assert.Equal(HttpStatusCode.BadRequest, (await Verify(client, token, old)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Resend(client, token)).StatusCode);
        var current = factory.Email.Codes["user@example.com"];
        Assert.NotEqual(old, current);
        Assert.Equal(HttpStatusCode.BadRequest, (await Verify(client, token, old)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Verify(client, token, current)).StatusCode);
    }

    [Fact]
    public async Task Session_has_absolute_expiration_even_after_resend()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        var token = await Token(await Request(client));
        factory.Clock.Advance(850);
        var resent = await Resend(client, token);
        Assert.Equal(HttpStatusCode.OK, resent.StatusCode);
        var data = await resent.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(50, data.GetProperty("data").GetProperty("expiresIn").GetInt32());
        factory.Clock.Advance(51);
        Assert.Equal(HttpStatusCode.BadRequest, (await Verify(client, token, factory.Email.Codes["user@example.com"])).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Resend(client, token)).StatusCode);
    }

    [Fact]
    public async Task Concurrent_verification_consumes_the_session_once()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        var token = await Token(await Request(client));
        var responses = await Task.WhenAll(Verify(client, token, factory.Email.Codes["user@example.com"]), Verify(client, token, factory.Email.Codes["user@example.com"]));
        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.BadRequest);
        Assert.Single(factory.Users.Users);
    }

    [Fact]
    public async Task Duplicate_email_or_phone_is_checked_before_send_and_again_before_commit()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        var token = await Token(await Request(client));
        factory.Users.Users.Add(new User { UserId = "existing", Email = "user@example.com", Phone = "0912345678" });
        Assert.Equal(HttpStatusCode.Conflict, (await Verify(client, token, factory.Email.Codes["user@example.com"])).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Request(client, "USER@EXAMPLE.COM", "0999999999")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Request(client, "other@example.com", "0912345678")).StatusCode);
        Assert.Single(factory.Users.Users);
    }

    [Fact]
    public async Task Database_failure_keeps_verified_code_retryable()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        var token = await Token(await Request(client));
        factory.Users.FailNextWrite = true;
        Assert.Equal(HttpStatusCode.InternalServerError, (await Verify(client, token, factory.Email.Codes["user@example.com"])).StatusCode);
        Assert.Empty(factory.Users.Users);
        Assert.Equal(HttpStatusCode.OK, (await Verify(client, token, factory.Email.Codes["user@example.com"])).StatusCode);
    }

    [Fact]
    public async Task Failed_resend_preserves_the_old_code()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        var token = await Token(await Request(client));
        var code = factory.Email.Codes["user@example.com"];
        factory.Clock.Advance(61);
        factory.Email.FailNextSend = true;
        Assert.Equal(HttpStatusCode.InternalServerError, (await Resend(client, token)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Verify(client, token, code)).StatusCode);
    }

    [Fact]
    public async Task Repeated_new_tokens_cannot_bypass_the_email_send_limit()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        for (var i = 0; i < 5; i++) Assert.Equal(HttpStatusCode.OK, (await Request(client)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Request(client, "USER@EXAMPLE.COM")).StatusCode);
    }

    [Fact]
    public async Task Ip_limit_returns_429_envelope()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        for (var i = 0; i < 20; i++) await Verify(client, Guid.NewGuid().ToString("N"), "000000");
        var response = await Verify(client, Guid.NewGuid().ToString("N"), "000000");
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.False((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("success").GetBoolean());
    }

    [Fact]
    public async Task Failed_initial_delivery_removes_the_pending_registration()
    {
        using var factory = new RegistrationTestFactory();
        using var client = factory.CreateApiClient();
        factory.Email.FailNextSend = true;
        Assert.Equal(HttpStatusCode.InternalServerError, (await Request(client)).StatusCode);
        Assert.Empty(factory.Email.Codes);
        Assert.Empty(factory.Users.Users);
        // A fresh request can proceed; there is no account reserved by failed delivery.
        await Token(await Request(client));
    }
}
