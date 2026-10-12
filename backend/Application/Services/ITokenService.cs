using Domain.Entities;

namespace Application.Services
{
    public interface ITokenService
    {
        string GenerateAccessToken(User user);
    }
}

