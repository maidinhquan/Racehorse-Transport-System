using Microsoft.EntityFrameworkCore;
using RaceHorse_Transport_Infrastructure.Data.Context;

var builder = WebApplication.CreateBuilder(args);

// 1. KẾT NỐI DATABASE VỚI SQL SERVER
builder.Services.AddDbContext<HorseTransportDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();