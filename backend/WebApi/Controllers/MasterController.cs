using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/master")]
    public class MasterController : BaseApiController
    {
        private readonly ICoordinatorService _coordinatorService;

        public MasterController(ICoordinatorService coordinatorService)
        {
            _coordinatorService = coordinatorService;
        }

                /// <summary>
        /// F2-J01: Khả năng triển khai và policy Flow 2
        /// </summary>
        [HttpGet("flow2-capabilities")]
        public IActionResult GetFlow2Capabilities()
        {
            var capabilities = new Flow2CapabilitiesDto();
            return Success(capabilities, "OK");
        }

        /// <summary>
        /// F3-J01: Khả năng triển khai và policy Flow 3 v2
        /// </summary>: Khả năng triển khai và policy Flow 3 v2
        /// </summary>
        [HttpGet("flow3-capabilities")]
        public async Task<IActionResult> GetFlow3Capabilities()
        {
            var capabilities = await _coordinatorService.GetFlow3CapabilitiesAsync();
            return Success(capabilities, "OK");
        }
    }
}

