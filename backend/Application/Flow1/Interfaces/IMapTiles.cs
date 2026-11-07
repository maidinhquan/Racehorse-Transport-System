namespace Application.Flow1.Interfaces;

public interface IMapTiles
{
    Task<byte[]> TileAsync(int z, int x, int y, CancellationToken ct);
}
