using Application.Interfaces.Flow4;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers.Flow4;

[ApiController]
[Route("api/master")]
public class MasterExecutionController : BaseApiController
{
    private readonly IFlow4CoordinatorService _coordinatorService;

    public MasterExecutionController(IFlow4CoordinatorService coordinatorService)
    {
        _coordinatorService = coordinatorService;
    }

    /// <summary>
    /// F4-J01: Đọc capability và policy theo dõi hành trình Flow 4
    /// </summary>
    [HttpGet("flow4-capabilities")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCapabilities()
    {
        var result = await _coordinatorService.GetFlow4CapabilitiesAsync();
        return Success(result);
    }
}

