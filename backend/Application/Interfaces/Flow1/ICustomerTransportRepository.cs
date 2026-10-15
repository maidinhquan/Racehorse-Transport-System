using Domain.Entities;

namespace Application.Interfaces.Flow1;

public interface ICustomerTransportRepository
{
    Task<Horse?> HorseAsync(string id, string owner, CancellationToken ct);
    Task<IReadOnlyList<Horse>> HorsesAsync(string owner, CancellationToken ct);
    Task<bool> MicrochipExistsAsync(string microchip, CancellationToken ct);
    Task<bool> OverlapsAsync(string horseId, DateTime from, DateTime to, CancellationToken ct);
    Task<TransportRequest?> RequestAsync(string id, string owner, CancellationToken ct);
    Task<(IReadOnlyList<TransportRequest> Items, int Count)> RequestsAsync(string owner, int page, int size, CancellationToken ct);
    void AddHorse(Horse horse);
    void UpdateHorse(Horse horse);
    void AddRequest(TransportRequest request);
}

public interface IFlow1LocationVerifier
{
    Task VerifyAsync(MapPoint point, CancellationToken ct);
}

public interface IFlow1PrivateFileStore
{
    Task<Application.DTOs.Flow1.PrivateFileReference> PutAsync(Application.DTOs.Flow1.UploadedFile file,
        bool photo, CancellationToken ct);
    Task<byte[]> ReadAsync(Application.DTOs.Flow1.PrivateFileReference file, CancellationToken ct);
}
