namespace Application.DTOs
{
    public class CheckpointDto
    {
        public int CheckpointId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Country { get; set; } = "VN";
        public string Type { get; set; } = "AIRPORT"; // AIRPORT, QUARANTINE_STATION, LAND_BORDER
        public decimal? Lat { get; set; }
        public decimal? Lng { get; set; }
        public bool Active { get; set; } = true;
    }
}

