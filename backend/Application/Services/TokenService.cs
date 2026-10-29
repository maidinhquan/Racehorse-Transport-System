using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Domain.Entities;
using Domain.Enums;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Application.Services
{
    public class TokenService : ITokenService
    {
        private static readonly string DevelopmentFallbackKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        private readonly IConfiguration _config;

        public TokenService(IConfiguration config)
        {
            _config = config;
        }

        public static string ResolveJwtKey(IConfiguration config, bool isDevelopment = true)
        {
            var configuredKey = config["Jwt:Key"] ?? config["JWT_SECRET_KEY"];
            if (!string.IsNullOrWhiteSpace(configuredKey) && !configuredKey.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase))
            {
                return configuredKey;
            }

            if (!isDevelopment)
            {
                throw new InvalidOperationException("Chưa cấu hình khóa bí mật JWT ('Jwt:Key' hoặc biến môi trường 'JWT_SECRET_KEY').");
            }

            return DevelopmentFallbackKey;
        }

        public string GenerateAccessToken(User user)
        {
            var keyString = ResolveJwtKey(_config);
            var issuer = string.IsNullOrWhiteSpace(_config["Jwt:Issuer"]) ? "RaceHorseTransportBackend" : _config["Jwt:Issuer"]!;
            var audience = string.IsNullOrWhiteSpace(_config["Jwt:Audience"]) ? "RaceHorseTransportFrontend" : _config["Jwt:Audience"]!;
            var expireMinutes = int.TryParse(_config["Jwt:ExpireMinutes"], out var exp) ? exp : 1440;

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyString));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var normalizedRole = UserRoles.NormalizeRole(user.Role);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId),
                new Claim(ClaimTypes.NameIdentifier, user.UserId),
                new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
                new Claim(ClaimTypes.Name, user.FullName ?? string.Empty),
                new Claim(ClaimTypes.Role, normalizedRole),
                new Claim("role", normalizedRole),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expireMinutes),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}

