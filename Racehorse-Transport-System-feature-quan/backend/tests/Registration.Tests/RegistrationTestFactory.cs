using System.Collections.Concurrent;
using Application.Interfaces;
using Domain.Entities;
using Domain.Exceptions;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace Registration.Tests;

public sealed class TestClock : TimeProvider
{
    private DateTimeOffset now = DateTimeOffset.UtcNow;
    public override DateTimeOffset GetUtcNow() => now;
    public void Advance(int seconds) => now = now.AddSeconds(seconds);
}

public sealed class CapturingEmailSender : IRegistrationEmailSender
{
    public ConcurrentDictionary<string, string> Codes { get; } = new();
    public bool FailNextSend { get; set; }
    public Task SendOtpAsync(string email, string otp, DateTimeOffset expiresAt, CancellationToken cancellationToken = default)
    {
        if (FailNextSend) { FailNextSend = false; throw new InvalidOperationException("Simulated email failure"); }
        Codes[email] = otp;
        return Task.CompletedTask;
    }
}

public sealed class FakeUserDAO : IUserDAO
{
    public List<User> Users { get; } = [];
    public bool FailNextWrite { get; set; }
    private readonly object gate = new();
    public Task<User?> GetByIdAsync(string id, CancellationToken cancellationToken = default) =>
        Task.FromResult(Users.FirstOrDefault(u => u.UserId == id));
    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        Task.FromResult(Users.FirstOrDefault(u => u.Email?.Trim().ToLowerInvariant() == email));
    public Task<User?> GetByPhoneAsync(string phone, CancellationToken cancellationToken = default) =>
        Task.FromResult(Users.FirstOrDefault(u => u.Phone == phone));
    public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default) =>
        Task.FromResult(Users.FirstOrDefault(u => u.Username == username));
    public async Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        await GetByEmailAsync(email, cancellationToken) is not null;
    public async Task<bool> ExistsByPhoneAsync(string phone, CancellationToken cancellationToken = default) =>
        await GetByPhoneAsync(phone, cancellationToken) is not null;
    public Task<bool> UpdateUserAsync(User user, CancellationToken cancellationToken = default)
    {
        var existing = Users.FirstOrDefault(u => u.UserId == user.UserId);
        if (existing != null) Users.Remove(existing);
        Users.Add(user);
        return Task.FromResult(true);
    }
    public async Task<User> AddAsync(User entity, CancellationToken cancellationToken = default)
    {
        await Task.Delay(20, cancellationToken);
        lock (gate)
        {
            if (FailNextWrite) { FailNextWrite = false; throw new InvalidOperationException("Simulated DB failure"); }
            if (Users.Any(u => u.Email == entity.Email || u.Phone == entity.Phone)) throw new DuplicateUserException();
            Users.Add(entity);
            return entity;
        }
    }
}

public sealed class RegistrationTestFactory(string? sqlConnection = null) : WebApplicationFactory<Program>
{
    public TestClock Clock { get; } = new();
    public CapturingEmailSender Email { get; } = new();
    public FakeUserDAO Users { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
            services.RemoveAll<IRegistrationEmailSender>();
            services.AddSingleton<IRegistrationEmailSender>(Email);
            if (sqlConnection is null)
            {
                services.RemoveAll<IUserDAO>();
                services.AddSingleton<IUserDAO>(Users);
            }
            else
            {
                services.RemoveAll<DbContextOptions<HorseTransportDbContext>>();
                services.AddDbContext<HorseTransportDbContext>(options => options.UseSqlServer(sqlConnection));
            }
        });
    }

    public HttpClient CreateApiClient() => CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false
    });
}
