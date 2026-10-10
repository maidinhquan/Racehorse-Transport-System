using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestController : ControllerBase
    {
        // GET: api/test
        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new
            {
                success = true,
                message = "Kết nối API Backend .NET thành công!",
                serverTime = DateTime.UtcNow,
                cors = "Enabled"
            });
        }

        // POST: api/test/echo
        [HttpPost("echo")]
        public IActionResult Echo([FromBody] object data)
        {
            return Ok(new
            {
                success = true,
                message = "Backend đã nhận dữ liệu từ Frontend thành công!",
                receivedData = data,
                serverTime = DateTime.UtcNow
            });
        }
    }
}

