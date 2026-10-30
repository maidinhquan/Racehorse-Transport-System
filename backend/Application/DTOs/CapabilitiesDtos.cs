using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class PolicyDto
    {
        [JsonPropertyName("careIntervalHours")]
        public int CareIntervalHours { get; set; } = 4;

        [JsonPropertyName("minStopMinutes")]
        public int MinStopMinutes { get; set; } = 45;

        [JsonPropertyName("nightRestStart")]
        public string NightRestStart { get; set; } = "22:00";

        [JsonPropertyName("nightRestEnd")]
        public string NightRestEnd { get; set; } = "06:00";

        [JsonPropertyName("maxContinuousDriveHours")]
        public int MaxContinuousDriveHours { get; set; } = 4;

        [JsonPropertyName("speedEstimateKmH")]
        public int SpeedEstimateKmH { get; set; } = 60;

        [JsonPropertyName("quarantineBufferHours")]
        public int QuarantineBufferHours { get; set; } = 2;

        [JsonPropertyName("flightBufferHours")]
        public int FlightBufferHours { get; set; } = 3;
    }

    public class CapabilitiesDto
    {
        [JsonPropertyName("version")]
        public string Version { get; set; } = "2.0.0";

        [JsonPropertyName("implementationStatus")]
        public string ImplementationStatus { get; set; } = "AVAILABLE"; // DESIGNED_NOT_IMPLEMENTED, AVAILABLE

        [JsonPropertyName("parallelPreparation")]
        public bool ParallelPreparation { get; set; } = true;

        [JsonPropertyName("documentValidityMode")]
        public string DocumentValidityMode { get; set; } = "ASSUMED_VALID_FOR_TRIP";

        [JsonPropertyName("feasibilityRequired")]
        public bool FeasibilityRequired { get; set; } = false;

        [JsonPropertyName("timedDocumentsGate")]
        public bool TimedDocumentsGate { get; set; } = false;

        [JsonPropertyName("roadConfirmBeforeSubmit")]
        public bool RoadConfirmBeforeSubmit { get; set; } = true;

        [JsonPropertyName("airConfirmAfterBooking")]
        public bool AirConfirmAfterBooking { get; set; } = true;

        [JsonPropertyName("demoEnabled")]
        public bool DemoEnabled { get; set; } = false;

        [JsonPropertyName("routingAvailable")]
        public bool RoutingAvailable { get; set; } = true;

        [JsonPropertyName("truckRoutingAvailable")]
        public bool TruckRoutingAvailable { get; set; } = true;

        [JsonPropertyName("persistenceAvailable")]
        public bool PersistenceAvailable { get; set; } = true;

        [JsonPropertyName("policy")]
        public PolicyDto? Policy { get; set; } = new();

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = "VND";

        [JsonPropertyName("timezone")]
        public string Timezone { get; set; } = "Asia/Ho_Chi_Minh";

        [JsonPropertyName("maxHorses")]
        public int MaxHorses { get; set; } = 4;

        [JsonPropertyName("maxUploadBytes")]
        public int MaxUploadBytes { get; set; } = 10485760;
    }
}

