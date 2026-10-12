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

        public async Task<bool> UpdateUserAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

