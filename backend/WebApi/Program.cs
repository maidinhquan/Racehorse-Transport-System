using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using WebApi.Extensions;
using WebApi.Extensions.Flow1;
using WebApi.Middlewares;

var builder = WebApplication.CreateBuilder(args);
if (builder.Environment.IsDevelopment())
    builder.Configuration.AddJsonFile(
        "App_Data/flow1/runtime-config/appsettings.Flow1Sandbox.Local.json",
        optional: true
    );
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true);
if (builder.Environment.IsDevelopment())
    builder.Configuration.AddJsonFile("appsettings.Flow1Sandbox.Local.json", optional: true);
builder.Configuration.AddEnvironmentVariables();

// The same private configuration is mounted under /app in Docker. Resolve it
// against this checkout when running the approved localhost Swagger on Windows.
if (builder.Environment.IsDevelopment() && OperatingSystem.IsWindows())
    foreach (
        var key in new[]
        {
            "Flow1:PrivateFiles:Root",
            "Flow1:Contracts:WorkRoot",
            "Flow1:LegacyImport:SourceRoot",
        }
    )   
        if (
            builder.Configuration[key] is string value
            && value.StartsWith("/app/", StringComparison.Ordinal)
        )
            builder.Configuration[key] = value[5..];

// =============================================================================
// 1. KẾT NỐI DATABASE VỚI SQL SERVER
// =============================================================================
builder.Services.AddDbContext<HorseTransportDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// =============================================================================
// 2. ĐĂNG KÝ CÁC DỊCH VỤ NỀN TẢNG (CACHE, TOKEN, EMAIL, DAO & AUTH SERVICE)
// =============================================================================
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IUserDAO, Infrastructure.DAOs.UserDAO>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICoordinatorService, CoordinatorService>();
builder.Services.AddRegistration(builder.Configuration, builder.Environment);
builder.Services.AddRequestModule(builder.Configuration, builder.Environment);
builder.Services.AddRequestModule(builder.Configuration, builder.Environment);

// =============================================================================
// 3. CẤU HÌNH CORS VĨNH VIỄN (ZERO-MAINTENANCE CORS CHO FRONTEND)
// Đảm bảo Frontend chạy bất kỳ port nào (3000, 5173, 5174, 8080...)
// và dùng bất kỳ method, header nào đều KHÔNG BAO GIỜ bị chặn.
// =============================================================================
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "AllowFrontend",
        policy =>
        {
            policy
                .SetIsOriginAllowed(_ => true) // Cho phép mọi origin từ local dev
                .AllowAnyMethod() // Cho phép mọi method: GET, POST, PUT, DELETE, PATCH, OPTIONS
                .AllowAnyHeader() // Cho phép mọi header: Content-Type, Authorization...
                .AllowCredentials() // Hỗ trợ truyền Cookie, JWT Bearer Token
                .WithExposedHeaders("Content-Disposition", "X-Pagination", "X-Total-Count");
        }
    );
});

// =============================================================================
// 4. CẤU HÌNH CONTROLLERS & JSON SERIALIZER TOÀN CỤC
// Tránh lỗi vòng lặp quan hệ EF Core khi thêm các bảng mới sau này.
// =============================================================================
builder
    .Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Chống lỗi đệ quy vòng lặp khi entity có liên kết 1-nhiều, nhiều-nhiều (Horse, Trip, User...)
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;

        // Chuẩn hóa tên trường JSON sang camelCase cho Frontend (JavaScript/TypeScript)
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;

        // Nhận diện không phân biệt hoa thường khi Frontend gửi dữ liệu lên
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;

        // Tự động chuyển đổi Enum thành chuỗi chữ thay vì số nguyên
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());

        // Bỏ qua các trường null khi trả về để JSON gọn nhẹ
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// Tự động format lỗi validation theo mẫu hợp đồng API: { success: false, message: "Validation failed", errors: { ... } }
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = actionContext =>
    {
        var errors = actionContext
            .ModelState.Where(e => e.Value?.Errors.Count > 0)
            .ToDictionary(
                kvp =>
                    string.IsNullOrEmpty(kvp.Key)
                        ? "general"
                        : char.ToLowerInvariant(kvp.Key[0]) + kvp.Key.Substring(1),
                kvp => kvp.Value!.Errors.Select(x => x.ErrorMessage).ToArray()
            );

        var errorResponse = new ApiResponse<object?>
        {
            Success = false,
            Message = "Validation failed",
            Data = null,
            Errors = errors,
        };

        return new BadRequestObjectResult(errorResponse);
    };
});

// =============================================================================
// 5. CẤU HÌNH JWT AUTHENTICATION
// =============================================================================
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "RaceHorseTransportBackend";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "RaceHorseTransportFrontend";

builder
    .Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        var jwtKey = builder.Configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
            throw new InvalidOperationException(
                "Configure a private Jwt:Key of at least 32 bytes through the environment or local configuration."
            );
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };

        // Chuẩn hóa định dạng lỗi 401 & 403 theo đúng chuẩn JSON hợp đồng
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var authHeader = context.Request.Headers.Authorization.ToString();
                if (!string.IsNullOrEmpty(authHeader))
                {
                    if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                    {
                        context.Token = authHeader.Substring("Bearer ".Length).Trim();
                    }
                    else
                    {
                        context.Token = authHeader.Trim();
                    }
                }
                return Task.CompletedTask;
            },
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";

                var response = ApiResponse<object?>.Fail("Unauthorized or invalid token");
                await context.Response.WriteAsJsonAsync(response);
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";

                var response = ApiResponse<object?>.Fail(
                    "Forbidden: You do not have permission to access this resource"
                );
                await context.Response.WriteAsJsonAsync(response);
            },
        };
    });

// =============================================================================
// 6. CẤU HÌNH SWAGGER / OPENAPI (CÓ NÚT AUTHORIZE TEST JWT)
// =============================================================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc(
        "v1",
        new OpenApiInfo
        {
            Title = "RaceHorse Transport API",
            Version = "v1",
            Description = "Cổng kết nối API giữa Frontend và Backend - RaceHorse Transport",
        }
    );
    c.OperationFilter<Flow1SwaggerExamples>();
    c.SchemaFilter<NoteDescriptions>();
    c.SchemaFilter<RequestExamples>();
    c.OperationFilter<RequestExamples>();
    c.DocumentFilter<FlowOrder>();

    c.AddSecurityDefinition(
        "Bearer",
        new OpenApiSecurityScheme
        {
            Description = "Nhập token JWT theo định dạng: Bearer {token}",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.ApiKey,
            Scheme = "Bearer",
        }
    );

    c.AddSecurityRequirement(
        new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer",
                    },
                },
                Array.Empty<string>()
            },
        }
    );
});

var app = builder.Build();

// =============================================================================
// 7. PIPELINE XỬ LÝ HTTP REQUEST (THỨ TỰ CHUẨN)
// =============================================================================

// Bắt lỗi toàn cục: Đảm bảo Backend luôn trả về JSON khi có lỗi thay vì HTML 500
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "RaceHorse Transport API v1");
        c.OrderByFlow();
        c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
        c.EnableFilter();
        c.OrderByFlow();
        c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None);
        c.EnableFilter();
    });
}

// Bật CORS cho Frontend trước Authentication và Authorization
app.UseCors("AllowFrontend");

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();

app.Run();

public partial class Program { }

