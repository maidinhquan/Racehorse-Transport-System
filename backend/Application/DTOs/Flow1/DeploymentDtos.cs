namespace Application.DTOs.Flow1;

public sealed record DeploymentInput(int ExpectedVersion, string? Reason = null);
public sealed record DeploymentEvent(string Key, string Hash, string Actor, string Action, string? Reason, DateTimeOffset AtUtc);
public sealed record HandoffAcknowledgement(string EventId, string Stream, string Actor, DateTimeOffset AtUtc);
public sealed record DeploymentState(string TripId, string Status, string? HandoffEventId, HandoffAcknowledgement[] Acknowledgements, DeploymentEvent LastOperation);
public sealed record DeploymentHistory(string Action, string? Reason, DateTimeOffset AtUtc);
public sealed record DeploymentView(string ContractId, string RequestId, string TripId, string Status, string TripStatus, int Version,
    bool CanConfirm, bool CanHold, bool CanResume, DeploymentHistory[] History, HandoffAcknowledgement[] Acknowledgements);
public sealed record OperationalPlan(DateOnly DepartureDate, DateOnly DeliveryDate, DateTimeOffset? PlannedDepartureAt, int PreparationDays,
    int VehicleCount, int StallsRequired, string Resources, string? DepartureGateway, string? ArrivalGateway, string GroundLegScope);
public sealed record Flow1Handoff(int SchemaVersion, string EventId, string RequestId, string TripId, string ContractId,
    int RequestVersion, int PlanVersion, int ContractVersion, string DocumentHash, OperationalPlan Plan, SubmitRequestInput Request,
    string DocumentReviewStatus, HandoffAcknowledgement[] Acknowledgements);
public sealed record HandoffAckInput(int ExpectedVersion, string EventId, string Stream);
