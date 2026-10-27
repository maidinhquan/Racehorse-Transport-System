using Application.DTOs;

namespace Application.Interfaces
{
    public interface ICustomerHorseService
    {
        Task<HorseCreateResponseDto> CreateHorseAsync(string ownerId, CreateHorseRequestDto request);
        Task<HorseDetailResponseDto?> UpdateHorseAsync(string ownerId, string horseId, CreateHorseRequestDto request);
        Task<List<HorseDetailResponseDto>> GetMyHorsesAsync(string ownerId);
        Task<HorseDetailResponseDto?> GetHorseByIdAsync(string ownerId, string horseId);
        Task<HorseFileUploadResponseDto> UploadHorseFileAsync(string ownerId, string horseId, string fileType, Stream fileStream, string fileName, string contentType);
        Task<(byte[] Bytes, string ContentType, string FileName)?> GetHorseFileAsync(string userId, string role, string horseId, string fileType);
        Task<List<SelectableHorseResponseDto>> GetSelectableHorsesAsync(string ownerId, string date, string? excludeRequestId);
    }
}
