using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Domain.Entities;
using Domain.Enums;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Application.Services
{
    public class TokenService : ITokenService
    {
        private readonly IConfiguration _config;

        public TokenService(IConfiguration config)
        {
            _config = config;
        }

        public string GenerateAccessToken(User user)
        {
            var keyString = _config["Jwt:Key"] ?? "RaceHorseTransportSecretKey2026_SWP391_Project_SecuredKey_SuperSafe!";
            var issuer = _config["Jwt:Issuer"] ?? "RaceHorseTransportBackend";
            var audience = _config["Jwt:Audience"] ?? "RaceHorseTransportFrontend";
            var expireMinutes = int.TryParse(_config["Jwt:ExpireMinutes"], out var exp) ? exp : 1440;

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyString));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var normalizedRole = UserRoles.NormalizeRole(user.Role);

            var cleanName = System.Text.RegularExpressions.Regex.Replace(user.FullName ?? string.Empty, @"\s*\([^)]*\)", "").Trim();
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId),
                new Claim(ClaimTypes.NameIdentifier, user.UserId),
                new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
                new Claim(ClaimTypes.Name, string.IsNullOrEmpty(cleanName) ? (user.FullName ?? string.Empty) : cleanName),
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

