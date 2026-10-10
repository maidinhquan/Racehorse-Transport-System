using RaceHorse_Transport_Domain.Entities;

namespace RaceHorse_Transport_Application.Services
{
    public interface ITokenService
    {
        string GenerateAccessToken(User user);
    }
}

