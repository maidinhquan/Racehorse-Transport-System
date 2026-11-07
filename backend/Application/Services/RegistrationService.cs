using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Exceptions;
using Application.Common.Registration;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Exceptions;
using Domain.Interfaces.DAOs;

namespace Application.Services;

public sealed class RegistrationService : IRegistrationService
{
    private readonly IUserDAO users;
    private readonly IRegistrationStore store;
    private readonly IRegistrationRequestLimiter limiter;
    private readonly IPasswordHasher passwordHasher;
    private readonly IRegistrationEmailSender emailSender;
    private readonly TimeProvider clock;
    private readonly RegistrationOptions options;
    private readonly EmailValidationOptions validationOptions;
    private readonly HttpClient? httpClient;

    public RegistrationService(
        IUserDAO users,
        IRegistrationStore store,
        IRegistrationRequestLimiter limiter,
        IPasswordHasher passwordHasher,
        IRegistrationEmailSender emailSender,
        TimeProvider clock,
        RegistrationOptions options)
        : this(users, store, limiter, passwordHasher, emailSender, clock, options, new EmailValidationOptions(), null)
    {
    }

    public RegistrationService(
        IUserDAO users,
        IRegistrationStore store,
        IRegistrationRequestLimiter limiter,
        IPasswordHasher passwordHasher,
        IRegistrationEmailSender emailSender,
        TimeProvider clock,
        RegistrationOptions options,
        EmailValidationOptions validationOptions,
        HttpClient? httpClient = null)
    {
        this.users = users;
        this.store = store;
        this.limiter = limiter;
        this.passwordHasher = passwordHasher;
        this.emailSender = emailSender;
        this.clock = clock;
        this.options = options;
        this.validationOptions = validationOptions;
        this.httpClient = httpClient;
    }

    public async Task<RequestOtpResponseData> RequestOtpAsync(RegisterRequestOtpDto request, CancellationToken cancellationToken = default)
    {
        var fullName = request.FullName?.Trim() ?? "";
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var phone = Regex.Replace(request.PhoneNumber?.Trim() ?? "", @"[\s()\-]", "");
        if (fullName.Length is < 1 or > 100) throw new BusinessRuleException("Họ tên phải có từ 1 đến 100 ký tự.");
        if (email.Length is < 1 or > 100 || !new EmailAddressAttribute().IsValid(email) || email.Any(c => c > 127))
            throw new BusinessRuleException("Email không hợp lệ hoặc vượt quá 100 ký tự.");
        if (!Regex.IsMatch(phone, @"^\+?[0-9]{8,15}$"))
            throw new BusinessRuleException("Số điện thoại cần 8 đến 15 chữ số, có thể bắt đầu bằng +.");
        // Match the existing six-character policy; BCrypt's upper bound is UTF-8 bytes.
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6 || Encoding.UTF8.GetByteCount(request.Password) > 72)
            throw new BusinessRuleException("Mật khẩu cần ít nhất 6 ký tự và không vượt quá 72 byte UTF-8.");

        limiter.Consume(email);
        await EnsureAvailableAsync(email, phone, cancellationToken);
        var now = clock.GetUtcNow();
        var otp = GenerateOtp();
        var pending = new PendingRegistration
        {
            RegistrationToken = Guid.NewGuid().ToString("N"), FullName = fullName, Email = email, PhoneNumber = phone,
            PasswordHash = passwordHasher.Hash(request.Password), SessionExpiresAt = now.AddSeconds(options.SessionLifetimeSeconds),
            OtpHash = HashOtp(otp), OtpExpiresAt = now.AddSeconds(options.OtpLifetimeSeconds),
            ResendAvailableAt = now.AddSeconds(options.ResendCooldownSeconds)
        };
        store.Create(pending);
        try { await emailSender.SendOtpAsync(email, otp, pending.OtpExpiresAt, cancellationToken); }
        catch { store.Remove(pending.RegistrationToken); throw; }
        return new RequestOtpResponseData
        {
            RegistrationToken = pending.RegistrationToken,
            ExpiresIn = SecondsRemaining(pending.OtpExpiresAt),
            ResendAfterSeconds = SecondsRemaining(pending.ResendAvailableAt)
        };
    }

    public async Task VerifyOtpAsync(RegisterVerifyOtpDto request, CancellationToken cancellationToken = default)
    {
        ValidateToken(request.RegistrationToken);
        if (request.Otp is null || !Regex.IsMatch(request.Otp, "^[0-9]{6}$"))
            throw new BusinessRuleException("OTP phải gồm đúng 6 chữ số.");
        await store.ExecuteAsync(request.RegistrationToken, async pending =>
        {
            EnsureActive(pending);
            if (pending.FailedAttempts >= options.MaxFailedAttempts)
                throw new BusinessRuleException("Đã vượt số lần nhập sai. Vui lòng gửi lại OTP.", 429);
            if (clock.GetUtcNow() >= pending.OtpExpiresAt)
                throw new BusinessRuleException("OTP đã hết hạn. Vui lòng gửi lại OTP.");
            if (!CryptographicOperations.FixedTimeEquals(HashOtp(request.Otp), pending.OtpHash))
            {
                pending.FailedAttempts++;
                throw new BusinessRuleException("OTP không đúng.", pending.FailedAttempts >= options.MaxFailedAttempts ? 429 : 400);
            }
            await EnsureAvailableAsync(pending.Email, pending.PhoneNumber, cancellationToken);
            var user = new User
            {
                Username = null,
                FullName = pending.FullName, Email = pending.Email, Phone = pending.PhoneNumber,
                PasswordHash = pending.PasswordHash, Role = UserRoles.Customer, IsActive = true
            };
            try { await users.AddAsync(user, cancellationToken); }
            catch (DuplicateUserException) { throw new BusinessRuleException("Email hoặc số điện thoại đã được sử dụng.", 409); }
            // DB failure does not consume the code. Successful writes do, under the same lock.
            pending.Completed = true;
            store.Remove(pending.RegistrationToken);
            return true;
        }, cancellationToken);
    }

    public Task<ResendOtpResponseData> ResendOtpAsync(RegisterResendOtpDto request, CancellationToken cancellationToken = default)
    {
        ValidateToken(request.RegistrationToken);
        return store.ExecuteAsync(request.RegistrationToken, async pending =>
        {
            EnsureActive(pending);
            var now = clock.GetUtcNow();
            if (now < pending.ResendAvailableAt) throw new BusinessRuleException("Chưa đến thời gian được gửi lại OTP.", 429);
            limiter.Consume(pending.Email);
            await EnsureAvailableAsync(pending.Email, pending.PhoneNumber, cancellationToken);
            string otp;
            // A resend must never issue the same code as the previous one.
            do { otp = GenerateOtp(); } while (CryptographicOperations.FixedTimeEquals(HashOtp(otp), pending.OtpHash));
            var expiresAt = now.AddSeconds(options.OtpLifetimeSeconds);
            if (expiresAt > pending.SessionExpiresAt) expiresAt = pending.SessionExpiresAt;
            await emailSender.SendOtpAsync(pending.Email, otp, expiresAt, cancellationToken);
            pending.OtpHash = HashOtp(otp);
            pending.OtpExpiresAt = expiresAt;
            pending.ResendAvailableAt = now.AddSeconds(options.ResendCooldownSeconds);
            pending.FailedAttempts = 0;
            return new ResendOtpResponseData
            {
                ExpiresIn = SecondsRemaining(expiresAt), ResendAfterSeconds = SecondsRemaining(pending.ResendAvailableAt)
            };
        }, cancellationToken);
    }

    public async Task<ValidateEmailResponseData> ValidateEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var cleanedEmail = email?.Trim().ToLowerInvariant() ?? "";

        // 1. Kiểm tra định dạng cú pháp cơ bản
        if (string.IsNullOrWhiteSpace(cleanedEmail) || cleanedEmail.Length > 100 || !new EmailAddressAttribute().IsValid(cleanedEmail) || cleanedEmail.Any(c => c > 127))
        {
            return new ValidateEmailResponseData
            {
                IsValid = false,
                ExistsInSystem = false,
                Message = "Định dạng email không hợp lệ hoặc vượt quá 100 ký tự."
            };
        }

        // 2. Kiểm tra trùng lặp trong hệ thống
        if (await users.ExistsByEmailAsync(cleanedEmail, cancellationToken))
        {
            return new ValidateEmailResponseData
            {
                IsValid = false,
                ExistsInSystem = true,
                Message = "Email này đã được sử dụng trong hệ thống."
            };
        }

        // 3. Kiểm tra sự tồn tại của tên miền qua DNS
        var atIndex = cleanedEmail.IndexOf('@');
        var domain = atIndex > 0 ? cleanedEmail[(atIndex + 1)..] : "";
        try
        {
            var hostEntry = await System.Net.Dns.GetHostEntryAsync(domain, cancellationToken);
            if (hostEntry == null || hostEntry.AddressList.Length == 0)
            {
                return new ValidateEmailResponseData
                {
                    IsValid = false,
                    ExistsInSystem = false,
                    Message = "Tên miền email không tồn tại trên Internet."
                };
            }
        }
        catch (System.Net.Sockets.SocketException)
        {
            return new ValidateEmailResponseData
            {
                IsValid = false,
                ExistsInSystem = false,
                Message = "Tên miền email không tồn tại hoặc không thể nhận thư."
            };
        }
        catch
        {
            // Bỏ qua lỗi timeout DNS cục bộ, chuyển sang kiểm tra API
        }

        // 4. Kiểm tra với AbstractAPI (theo yêu cầu demo/kiểm tra thủ công)
        var apiKey = validationOptions.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return new ValidateEmailResponseData
            {
                IsValid = true,
                ExistsInSystem = false,
                Message = "Email hợp lệ (đã kiểm tra cú pháp, tên miền và hệ thống)."
            };
        }

        try
        {
            using var client = httpClient != null ? httpClient : new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            var url = $"https://emailreputation.abstractapi.com/v1/?api_key={apiKey}&email={Uri.EscapeDataString(cleanedEmail)}";
            using var response = await client.GetAsync(url, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                string errorDetail = "mã HTTP " + (int)response.StatusCode;
                try
                {
                    using var doc = JsonDocument.Parse(body);
                    if (doc.RootElement.TryGetProperty("error", out var errProp) &&
                        errProp.TryGetProperty("message", out var msgProp))
                    {
                        errorDetail = msgProp.GetString() ?? errorDetail;
                    }
                }
                catch { }

                return new ValidateEmailResponseData
                {
                    IsValid = false,
                    ExistsInSystem = false,
                    Message = $"Dịch vụ AbstractAPI báo: {errorDetail}. Vui lòng kiểm tra lại API key hoặc email kích hoạt."
                };
            }

            using var json = JsonDocument.Parse(body);
            var root = json.RootElement;

            // AbstractAPI Email Reputation: email_deliverability.{status,is_smtp_valid}, email_quality.is_disposable
            JsonElement deliv = default;
            bool hasDeliv = root.TryGetProperty("email_deliverability", out deliv) && deliv.ValueKind == JsonValueKind.Object;
            string? deliverability = hasDeliv && deliv.TryGetProperty("status", out var delProp) ? delProp.GetString() : null;
            bool? isSmtpValid = hasDeliv && deliv.TryGetProperty("is_smtp_valid", out var smtpProp) && smtpProp.ValueKind is JsonValueKind.True or JsonValueKind.False ? smtpProp.GetBoolean() : null;
            bool isDisposable = root.TryGetProperty("email_quality", out var quality) && quality.ValueKind == JsonValueKind.Object &&
                                quality.TryGetProperty("is_disposable", out var dispProp) && dispProp.ValueKind == JsonValueKind.True;

            if (isDisposable)
            {
                return new ValidateEmailResponseData
                {
                    IsValid = false,
                    ExistsInSystem = false,
                    Deliverability = deliverability,
                    IsSmtpValid = isSmtpValid,
                    Message = "Đây là email tạm thời (rác), không được phép đăng ký."
                };
            }

            if (string.Equals(deliverability, "DELIVERABLE", StringComparison.OrdinalIgnoreCase) || isSmtpValid == true)
            {
                return new ValidateEmailResponseData
                {
                    IsValid = true,
                    ExistsInSystem = false,
                    Deliverability = deliverability,
                    IsSmtpValid = isSmtpValid,
                    Message = "Hộp thư có thật và có thể nhận thư."
                };
            }

            if (string.Equals(deliverability, "UNDELIVERABLE", StringComparison.OrdinalIgnoreCase) || isSmtpValid == false)
            {
                return new ValidateEmailResponseData
                {
                    IsValid = false,
                    ExistsInSystem = false,
                    Deliverability = deliverability,
                    IsSmtpValid = isSmtpValid,
                    Message = "Địa chỉ email không tồn tại trên thực tế hoặc không thể nhận thư."
                };
            }

            return new ValidateEmailResponseData
            {
                IsValid = true,
                ExistsInSystem = false,
                Deliverability = deliverability,
                IsSmtpValid = isSmtpValid,
                Message = $"Email hợp lệ (trạng thái: {deliverability ?? "Hợp lệ"})."
            };
        }
        catch (Exception ex)
        {
            return new ValidateEmailResponseData
            {
                IsValid = false,
                ExistsInSystem = false,
                Message = $"Lỗi kết nối dịch vụ kiểm tra: {ex.Message}"
            };
        }
    }

    private async Task EnsureAvailableAsync(string email, string phone, CancellationToken cancellationToken)
    {
        if (await users.ExistsByEmailAsync(email, cancellationToken) || await users.ExistsByPhoneAsync(phone, cancellationToken))
            throw new BusinessRuleException("Email hoặc số điện thoại đã được sử dụng.", 409);
    }

    private void EnsureActive(PendingRegistration pending)
    {
        if (pending.Completed) throw new BusinessRuleException("Phiên đăng ký đã hoàn tất.");
        if (clock.GetUtcNow() >= pending.SessionExpiresAt)
        {
            store.Remove(pending.RegistrationToken);
            throw new BusinessRuleException("Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.");
        }
    }

    private int SecondsRemaining(DateTimeOffset deadline) => Math.Max(0, (int)Math.Ceiling((deadline - clock.GetUtcNow()).TotalSeconds));
    private static void ValidateToken(string? token)
    {
        if (!Guid.TryParseExact(token, "N", out _)) throw new BusinessRuleException("Mã phiên đăng ký không hợp lệ.");
    }
    private static string GenerateOtp() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6", CultureInfo.InvariantCulture);
    private static byte[] HashOtp(string otp) => SHA256.HashData(Encoding.UTF8.GetBytes(otp));
}
