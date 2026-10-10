using Application.Interfaces;

namespace Infrastructure.Registration;

public sealed class BCryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
    public bool Verify(string password, string passwordHash) => BCrypt.Net.BCrypt.Verify(password, passwordHash);
}
