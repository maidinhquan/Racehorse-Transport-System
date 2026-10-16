using Application.DTOs;

namespace Application.Interfaces;

public interface IRegistrationService
{
    Task<RequestOtpResponseData> RequestOtpAsync(RegisterRequestOtpDto request, CancellationToken cancellationToken = default);
    Task VerifyOtpAsync(RegisterVerifyOtpDto request, CancellationToken cancellationToken = default);
    Task<ResendOtpResponseData> ResendOtpAsync(RegisterResendOtpDto request, CancellationToken cancellationToken = default);
}
