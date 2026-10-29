using System.Net.Mail;
using System.Threading.RateLimiting;
using Application.Common.Registration;
using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Interfaces.DAOs;
using Infrastructure.DAOs.Identity;
using Infrastructure.ExternalServices.Email;
using Infrastructure.Registration;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace WebApi.Extensions;

public static class RegistrationServiceExtensions
{
    public static IServiceCollection AddRegistration(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        services.AddScoped<IUserDAO, UserDAO>();
        services.AddScoped<IRegistrationService, RegistrationService>();
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddSingleton(TimeProvider.System);
        services.AddOptions<RegistrationOptions>().Bind(configuration.GetSection("Registration"))
            .Validate(o => o.OtpLifetimeSeconds > 0 && o.SessionLifetimeSeconds >= o.OtpLifetimeSeconds &&
                o.ResendCooldownSeconds > 0 && o.ResendCooldownSeconds < o.SessionLifetimeSeconds &&
                o.MaxFailedAttempts > 0 && o.MaxEmailsPerWindow > 0 && o.EmailWindowSeconds > 0,
                "Invalid registration configuration.").ValidateOnStart();
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<RegistrationOptions>>().Value);
        services.AddSingleton<IRegistrationStore, MemoryRegistrationStore>();
        services.AddSingleton<IRegistrationRequestLimiter, MemoryRegistrationRequestLimiter>();

        var emailMode = configuration["RegistrationEmail:Mode"] ?? (environment.IsDevelopment() ? "Development" : "Smtp");
        var hasSmtpCredentials = !string.IsNullOrWhiteSpace(configuration["RegistrationEmail:Smtp:Host"]) &&
                                 !string.IsNullOrWhiteSpace(configuration["RegistrationEmail:Smtp:From"]) &&
                                 !string.IsNullOrWhiteSpace(configuration["RegistrationEmail:Smtp:Password"]);

        if (environment.IsDevelopment() && (emailMode == "Development" || !hasSmtpCredentials))
            services.AddSingleton<IRegistrationEmailSender, DevelopmentRegistrationEmailSender>();
        else if (emailMode == "Smtp")
        {
            services.AddOptions<RegistrationSmtpOptions>().Bind(configuration.GetSection("RegistrationEmail:Smtp"))
                .Validate(o => !string.IsNullOrWhiteSpace(o.Host) && o.Port is > 0 and <= 65535 && MailAddress.TryCreate(o.From, out _),
                    "Configure RegistrationEmail:Smtp:Host, Port and From.").ValidateOnStart();
            services.AddSingleton<IRegistrationEmailSender, SmtpRegistrationEmailSender>();
        }
        else throw new InvalidOperationException("Registration OTP logging is only allowed in Development; use RegistrationEmail:Mode=Smtp elsewhere.");

        services.AddRateLimiter(options =>
        {
            options.AddPolicy("registration", context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true
                }));
            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.HttpContext.Response.Headers.RetryAfter = "60";
                await context.HttpContext.Response.WriteAsJsonAsync(ApiResponse<object?>.Fail("Quá nhiều yêu cầu. Vui lòng thử lại sau."), cancellationToken);
            };
        });
        return services;
    }
}
