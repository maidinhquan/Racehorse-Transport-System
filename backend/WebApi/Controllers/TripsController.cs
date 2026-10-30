using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/trips")]
    public class TripsController : BaseApiController
    {
        private readonly ICoordinatorService _coordinatorService;

        public TripsController(ICoordinatorService coordinatorService)
        {
            _coordinatorService = coordinatorService;
        }

        /// <summary>
        /// F3-J19: Lịch sử phương án, quyết định và bằng chứng
        /// </summary>
        [HttpGet("{tripId}/planning-history")]
        public async Task<IActionResult> GetPlanningHistory(string tripId)
        {
            var data = await _coordinatorService.GetPlanningHistoryAsync(tripId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J52: Tải bằng chứng planning có xác thực
        /// </summary>
        [HttpGet("{tripId}/planning-files/{fileId}")]
        public async Task<IActionResult> GetPlanningFile(string tripId, string fileId)
        {
            var file = await _coordinatorService.GetPlanningFileAsync(tripId, fileId);
            if (file == null)
            {
                return NotFoundFailure($"Không tìm thấy file đính kèm: {fileId}");
            }

            if (System.IO.File.Exists(file.StoragePath))
            {
                var bytes = await System.IO.File.ReadAllBytesAsync(file.StoragePath);
                return File(bytes, file.ContentType ?? "application/octet-stream", file.FileName);
            }

            return NotFoundFailure($"Tệp tin vật lý không tồn tại trên hệ thống lưu trữ: {file.FileName}");
        }
    }
}

