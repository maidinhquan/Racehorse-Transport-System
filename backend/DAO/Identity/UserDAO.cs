using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.DAO;

/// <summary>
/// Data Access Object cho bảng USER (Quản trị tài khoản, phân quyền).
/// Tương ứng bảng USER trong HorseTransportDB.sql
/// </summary>
public class UserDAO : BaseDAO<User>
{
    public UserDAO(HorseTransportDbContext context) : base(context)
    {
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username);
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<List<User>> GetByRoleAsync(string role)
    {
        return await _dbSet.AsNoTracking().Where(u => u.Role == role).ToListAsync();
    }

    public async Task<List<User>> GetActiveUsersAsync()
    {
        return await _dbSet.AsNoTracking().Where(u => u.IsActive).ToListAsync();
    }

    public async Task<User?> AuthenticateAsync(string usernameOrEmail, string passwordHash)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(u => 
            (u.Username == usernameOrEmail || u.Email == usernameOrEmail) && 
            u.PasswordHash == passwordHash && 
            u.IsActive);
    }
}
