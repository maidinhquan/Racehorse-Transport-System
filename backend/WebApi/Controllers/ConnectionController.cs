using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Data.Context;

namespace WebApi.Controllers
{
    /// <summary>
    /// Controller chuyên dụng để kiểm tra và duy trì kết nối giữa Frontend và Backend.
    /// Frontend có thể gọi các endpoint này bất kỳ lúc nào để xác định tình trạng kết nối.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class ConnectionController : ControllerBase
    {
        private readonly HorseTransportDbContext _dbContext;
        private readonly IWebHostEnvironment _env;

        public ConnectionController(HorseTransportDbContext dbContext, IWebHostEnvironment env)
        {
            _dbContext = dbContext;
            _env = env;
        }

        /// <summary>
        /// 1. Kiểm tra kết nối mạng & CORS (Frontend -> Backend).
        /// Không phụ thuộc Database, luôn trả về thành công nếu Backend đang chạy.
        /// GET /api/connection/ping
        /// </summary>
        [HttpGet("ping")]
        public IActionResult Ping()
        {
            return Ok(new
            {
                success = true,
                status = "Connected",
                message = "Kết nối giữa Frontend và Backend .NET thành công 100%!",
                environment = _env.EnvironmentName,
                serverTimeUtc = DateTime.UtcNow,
                cors = "Enabled (Mọi origin, method, header đều được cho phép)"
            });
        }

        /// <summary>
        /// 2. Kiểm tra kết nối từ Backend tới SQL Server Database.
        /// GET /api/connection/database
        /// </summary>
        [HttpGet("database")]
        public async Task<IActionResult> CheckDatabase()
        {
            try
            {
                bool canConnect = await _dbContext.Database.CanConnectAsync();

                if (!canConnect)
                {
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                    {
                        success = false,
                        status = "Database Disconnected",
                        message = "Không thể kết nối tới cơ sở dữ liệu SQL Server."
                    });
                }

                // Đếm số lượng bảng và kiểm tra dữ liệu mẫu trong bảng USER
                int userCount = await _dbContext.Users.CountAsync();

                return Ok(new
                {
                    success = true,
                    status = "Database Connected",
                    databaseName = _dbContext.Database.GetDbConnection().Database,
                    userCount = userCount,
                    message = "Kết nối Database thành công và sẵn sàng phục vụ dữ liệu!"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    status = "Database Error",
                    message = "Lỗi khi kiểm tra kết nối Database.",
                    detail = ex.Message
                });
            }
        }

        /// <summary>
        /// 3. Kiểm tra gửi nhận dữ liệu 2 chiều (Frontend gửi dữ liệu lên -> Backend nhận và trả về nguyên vẹn).
        /// POST /api/connection/echo
        /// </summary>
        [HttpPost("echo")]
        public IActionResult Echo([FromBody] object payload)
        {
            return Ok(new
            {
                success = true,
                message = "Backend đã nhận dữ liệu từ Frontend thành công!",
                receivedData = payload,
                receivedAt = DateTime.UtcNow
            });
        }
    }
}

