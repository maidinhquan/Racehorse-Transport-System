
namespace Application.Flow1.Interfaces;

public interface IOtpSecurity
{
    string NewCode();
    string Digest(string purpose, string value);
    bool Matches(string expected, string actual);
}
