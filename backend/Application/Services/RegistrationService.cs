using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
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

public sealed class RegistrationService(
    IUserDAO users, IRegistrationStore store, IRegistrationRequestLimiter limiter,
    IPasswordHasher passwordHasher, IRegistrationEmailSender emailSender,
    TimeProvider clock, RegistrationOptions options) : IRegistrationService
{
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
                UserId = "USR_CUST_" + Guid.NewGuid().ToString("N"), Username = null,
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
