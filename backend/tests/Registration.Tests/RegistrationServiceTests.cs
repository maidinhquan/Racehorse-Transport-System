using Application.Common.Exceptions;
using Application.Common.Registration;
using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Entities;
using Domain.Exceptions;
using Domain.Interfaces.DAOs;
using Xunit;

namespace Registration.Tests;

// Unit tests instantiate only the service: no web host, EF, SQL, SMTP or real cache.
public sealed class RegistrationServiceTests
{
    [Fact]
    public async Task Request_normalizes_profile_hashes_exact_password_and_does_not_save_user()
    {
        var f = new Fixture();
        var result = await f.Service.RequestOtpAsync(Request());
        var pending = Assert.Single(f.Store.Entries).Value;
        Assert.Equal("Nguyễn Văn A", pending.FullName);
        Assert.Equal("user@example.com", pending.Email);
        Assert.Equal("0901234567", pending.PhoneNumber);
        Assert.Equal(" Pass Word123! ", Assert.Single(f.Hasher.Inputs));
        Assert.Equal(Hasher.HashValue, pending.PasswordHash);
        Assert.Equal("user@example.com", Assert.Single(f.Limiter.Emails));
        Assert.Equal(pending.Email, Assert.Single(f.Email.Deliveries).Email);
        Assert.Matches("^[0-9]{6}$", f.Code);
        Assert.Equal(pending.RegistrationToken, result.RegistrationToken);
        Assert.Equal(300, result.ExpiresIn);
        Assert.Equal(60, result.ResendAfterSeconds);
        Assert.Equal(f.Clock.GetUtcNow().AddSeconds(900), pending.SessionExpiresAt);
        Assert.Empty(f.Users.Saved);
    }

    [Theory]
    [InlineData("name")]
    [InlineData("long-name")]
    [InlineData("email")]
    [InlineData("unicode-email")]
    [InlineData("phone")]
    [InlineData("password")]
    [InlineData("utf8-password")]
    public async Task Invalid_input_is_rejected_without_external_side_effects(string field)
    {
        var f = new Fixture();
        var request = Request();
        switch (field)
        {
            case "name": request.FullName = " "; break;
            case "long-name": request.FullName = new string('a', 101); break;
            case "email": request.Email = "invalid"; break;
            case "unicode-email": request.Email = "tên@example.com"; break;
            case "phone": request.PhoneNumber = "123"; break;
            case "password": request.Password = "12345"; break;
            case "utf8-password": request.Password = new string('é', 37); break;
        }
        Assert.Equal(400, (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.RequestOtpAsync(request))).StatusCode);
        Assert.Empty(f.Limiter.Emails);
        Assert.Equal(0, f.Users.LookupCount);
        Assert.Empty(f.Hasher.Inputs);
        Assert.Empty(f.Store.Entries);
        Assert.Empty(f.Email.Deliveries);
        Assert.Empty(f.Users.Saved);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Existing_email_or_phone_prevents_issuing_a_session(bool email)
    {
        var f = new Fixture();
        f.Users.EmailExists = email;
        f.Users.PhoneExists = !email;
        Assert.Equal(409, (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.RequestOtpAsync(Request()))).StatusCode);
        Assert.Empty(f.Hasher.Inputs);
        Assert.Empty(f.Store.Entries);
        Assert.Empty(f.Email.Deliveries);
    }

    [Fact]
    public async Task Send_limit_rejection_stops_before_DAO_hashing_and_delivery()
    {
        var f = new Fixture();
        f.Limiter.Reject = true;
        Assert.Equal(429, (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.RequestOtpAsync(Request()))).StatusCode);
        Assert.Equal(0, f.Users.LookupCount);
        Assert.Empty(f.Hasher.Inputs);
        Assert.Empty(f.Store.Entries);
        Assert.Empty(f.Email.Deliveries);
    }

    [Fact]
    public async Task Failed_initial_delivery_removes_session_and_never_saves_account()
    {
        var f = new Fixture();
        f.Email.FailNext = true;
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Service.RequestOtpAsync(Request()));
        Assert.Empty(f.Store.Entries);
        Assert.Empty(f.Users.Saved);
    }

    [Fact]
    public async Task Valid_OTP_creates_active_customer_and_consumes_session_once()
    {
        var f = new Fixture();
        await f.Start();
        await f.Verify(f.Code);
        var user = Assert.Single(f.Users.Saved);
        Assert.Equal("CUSTOMER", user.Role);
        Assert.True(user.IsActive);
        Assert.Null(user.Username);
        Assert.Equal("Nguyễn Văn A", user.FullName);
        Assert.Equal("user@example.com", user.Email);
        Assert.Equal("0901234567", user.Phone);
        Assert.Equal(Hasher.HashValue, user.PasswordHash);
        Assert.Matches("^USR_CUST_[a-f0-9]{32}$", user.UserId);
        Assert.True(f.Pending.Completed);
        Assert.Empty(f.Store.Entries);
        await Assert.ThrowsAsync<BusinessRuleException>(() => f.Verify(f.Code));
        Assert.Single(f.Users.Saved);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Availability_is_rechecked_at_verification(bool email)
    {
        var f = new Fixture();
        await f.Start();
        f.Users.EmailExists = email;
        f.Users.PhoneExists = !email;
        Assert.Equal(409, (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Verify(f.Code))).StatusCode);
        Assert.Empty(f.Users.Saved);
        Assert.False(f.Pending.Completed);
    }

    [Fact]
    public async Task DAO_duplicate_race_is_translated_to_conflict_without_consuming_OTP()
    {
        var f = new Fixture();
        await f.Start();
        f.Users.WriteFailure = new DuplicateUserException();
        Assert.Equal(409, (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Verify(f.Code))).StatusCode);
        Assert.False(f.Pending.Completed);
        Assert.Single(f.Store.Entries);
        Assert.Empty(f.Users.Saved);
    }

    [Fact]
    public async Task Failed_save_allows_retry_with_same_OTP()
    {
        var f = new Fixture();
        await f.Start();
        f.Users.WriteFailure = new InvalidOperationException("Simulated save failure");
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Verify(f.Code));
        Assert.False(f.Pending.Completed);
        Assert.Single(f.Store.Entries);
        f.Users.WriteFailure = null;
        await f.Verify(f.Code);
        Assert.Single(f.Users.Saved);
        Assert.Empty(f.Store.Entries);
    }

    [Fact]
    public async Task Five_wrong_attempts_block_even_the_correct_code()
    {
        var f = new Fixture();
        await f.Start();
        var wrong = f.Code == "000000" ? "000001" : "000000";
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            var error = await Assert.ThrowsAsync<BusinessRuleException>(() => f.Verify(wrong));
            Assert.Equal(attempt == 5 ? 429 : 400, error.StatusCode);
            Assert.Equal(attempt, f.Pending.FailedAttempts);
        }
        Assert.Equal(429, (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Verify(f.Code))).StatusCode);
        Assert.Empty(f.Users.Saved);
    }

    [Fact]
    public async Task OTP_is_expired_at_its_exact_deadline_but_session_can_resend()
    {
        var f = new Fixture();
        await f.Start();
        f.Clock.Advance(300);
        Assert.Equal(400, (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Verify(f.Code))).StatusCode);
        Assert.Single(f.Store.Entries);
        await f.Resend();
        await f.Verify(f.Code);
        Assert.Single(f.Users.Saved);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Absolute_session_deadline_rejects_verify_and_resend_and_removes_session(bool verify)
    {
        var f = new Fixture();
        await f.Start();
        f.Clock.Advance(900);
        if (verify) await Assert.ThrowsAsync<BusinessRuleException>(() => f.Verify(f.Code));
        else await Assert.ThrowsAsync<BusinessRuleException>(() => f.Resend());
        Assert.Empty(f.Store.Entries);
        Assert.Empty(f.Users.Saved);
        Assert.Single(f.Email.Deliveries);
    }

    [Fact]
    public async Task Resend_at_cooldown_boundary_replaces_code_and_resets_failed_attempts()
    {
        var f = new Fixture();
        await f.Start();
        var old = f.Code;
        await Assert.ThrowsAsync<BusinessRuleException>(() => f.Verify(old == "000000" ? "000001" : "000000"));
        f.Clock.Advance(59);
        Assert.Equal(429, (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Resend())).StatusCode);
        Assert.Single(f.Email.Deliveries);
        f.Clock.Advance(1);
        var result = await f.Resend();
        Assert.NotEqual(old, f.Code);
        Assert.Equal(0, f.Pending.FailedAttempts);
        Assert.Equal(300, result.ExpiresIn);
        Assert.Equal(60, result.ResendAfterSeconds);
        await Assert.ThrowsAsync<BusinessRuleException>(() => f.Verify(old));
        await f.Verify(f.Code);
        Assert.Single(f.Users.Saved);
    }

    [Fact]
    public async Task Resend_near_session_deadline_caps_OTP_lifetime_without_extending_session()
    {
        var f = new Fixture();
        await f.Start();
        var deadline = f.Pending.SessionExpiresAt;
        f.Clock.Advance(890);
        Assert.Equal(10, (await f.Resend()).ExpiresIn);
        Assert.Equal(deadline, f.Pending.SessionExpiresAt);
        Assert.Equal(deadline, f.Pending.OtpExpiresAt);
        Assert.Equal(deadline, f.Email.Deliveries.Last().ExpiresAt);
    }

    [Fact]
    public async Task Failed_resend_keeps_previous_code_deadlines_and_attempt_count()
    {
        var f = new Fixture();
        await f.Start();
        var old = f.Code;
        var hash = f.Pending.OtpHash.ToArray();
        var expiry = f.Pending.OtpExpiresAt;
        var cooldown = f.Pending.ResendAvailableAt;
        f.Pending.FailedAttempts = 2;
        f.Clock.Advance(60);
        f.Email.FailNext = true;
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Resend());
        Assert.Equal(hash, f.Pending.OtpHash);
        Assert.Equal(expiry, f.Pending.OtpExpiresAt);
        Assert.Equal(cooldown, f.Pending.ResendAvailableAt);
        Assert.Equal(2, f.Pending.FailedAttempts);
        await f.Verify(old);
        Assert.Single(f.Users.Saved);
    }

    private static RegisterRequestOtpDto Request() => new()
    {
        FullName = "  Nguyễn Văn A  ", Email = " USER@EXAMPLE.COM ",
        PhoneNumber = " (090) 123-4567 ", Password = " Pass Word123! "
    };

    private sealed class Fixture
    {
        public UnitClock Clock { get; } = new();
        public UserDAO Users { get; } = new();
        public Store Store { get; } = new();
        public Limiter Limiter { get; } = new();
        public Hasher Hasher { get; } = new();
        public EmailSender Email { get; } = new();
        public RegistrationService Service { get; }
        public string Token { get; private set; } = "";
        public PendingRegistration Pending { get; private set; } = null!;
        public string Code => Email.Deliveries.Last().Otp;
        public Fixture() => Service = new(Users, Store, Limiter, Hasher, Email, Clock, new RegistrationOptions());
        public async Task Start()
        {
            Token = (await Service.RequestOtpAsync(Request())).RegistrationToken;
            Pending = Store.Entries[Token];
        }
        public Task Verify(string code) => Service.VerifyOtpAsync(new() { RegistrationToken = Token, Otp = code });
        public Task<ResendOtpResponseData> Resend() => Service.ResendOtpAsync(new() { RegistrationToken = Token });
    }

    private sealed class UnitClock : TimeProvider
    {
        private DateTimeOffset now = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => now;
        public void Advance(int seconds) => now = now.AddSeconds(seconds);
    }

    private sealed class Store : IRegistrationStore
    {
        public Dictionary<string, PendingRegistration> Entries { get; } = new();
        public void Create(PendingRegistration registration) => Entries.Add(registration.RegistrationToken, registration);
        public void Remove(string registrationToken) => Entries.Remove(registrationToken);
        public Task<T> ExecuteAsync<T>(string registrationToken, Func<PendingRegistration, Task<T>> action, CancellationToken cancellationToken = default)
        {
            if (!Entries.TryGetValue(registrationToken, out var pending)) throw new BusinessRuleException("Missing session");
            return action(pending);
        }
    }

    private sealed class Limiter : IRegistrationRequestLimiter
    {
        public List<string> Emails { get; } = [];
        public bool Reject { get; set; }
        public void Consume(string normalizedEmail)
        {
            if (Reject) throw new BusinessRuleException("Send limit", 429);
            Emails.Add(normalizedEmail);
        }
    }

    private sealed class Hasher : IPasswordHasher
    {
        public const string HashValue = "unit-test-password-hash";
        public List<string> Inputs { get; } = [];
        public string Hash(string password) { Inputs.Add(password); return HashValue; }
        public bool Verify(string password, string passwordHash) => throw new NotSupportedException();
    }

    private sealed class EmailSender : IRegistrationEmailSender
    {
        public List<(string Email, string Otp, DateTimeOffset ExpiresAt)> Deliveries { get; } = [];
        public bool FailNext { get; set; }
        public Task SendOtpAsync(string email, string otp, DateTimeOffset expiresAt, CancellationToken cancellationToken = default)
        {
            if (FailNext) { FailNext = false; throw new InvalidOperationException("Simulated delivery failure"); }
            Deliveries.Add((email, otp, expiresAt));
            return Task.CompletedTask;
        }
    }

    private sealed class UserDAO : IUserDAO
    {
        public bool EmailExists { get; set; }
        public bool PhoneExists { get; set; }
        public int LookupCount { get; private set; }
        public Exception? WriteFailure { get; set; }
        public List<User> Saved { get; } = [];
        public Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default)
        { LookupCount++; return Task.FromResult(EmailExists); }
        public Task<bool> ExistsByPhoneAsync(string phone, CancellationToken cancellationToken = default)
        { LookupCount++; return Task.FromResult(PhoneExists); }
        public Task<User> AddAsync(User entity, CancellationToken cancellationToken = default)
        {
            if (WriteFailure is not null) throw WriteFailure;
            Saved.Add(entity);
            return Task.FromResult(entity);
        }
        public Task<User?> GetByIdAsync(string id, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<User?> GetByPhoneAsync(string phone, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<bool> UpdateUserAsync(User user, CancellationToken cancellationToken = default) => Task.FromResult(true);
        public Task<User?> GetByResetTokenAsync(string resetToken, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
}
