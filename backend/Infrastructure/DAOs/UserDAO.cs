using Domain.Entities;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs
{
    public class UserDAO
    {
        private readonly HorseTransportDbContext _context;

        public UserDAO(HorseTransportDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return null;
            }

            var cleanEmail = email.Trim().ToLower();
            return await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == cleanEmail);
        }

        public async Task<User?> GetByIdAsync(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return null;
            }

            return await _context.Users.FindAsync(userId);
        }

        public async Task<User?> GetByResetTokenAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return null;
            }

            var cleanToken = token.Trim();
            return await _context.Users.FirstOrDefaultAsync(u =>
                (u.ResetOtpCode != null && u.ResetOtpCode == cleanToken) ||
                (u.ForgotPasswordRequest != null && u.ForgotPasswordRequest == cleanToken));
        }

        public async Task<bool> UpdateUserAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

