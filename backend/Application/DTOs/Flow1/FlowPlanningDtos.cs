namespace Application.DTOs.Flow1;
public sealed record PlanVehicleInput(string VehicleId,string DriverId,string CoDriverId,string VetId,IReadOnlyList<string> HorseIds);
public sealed record PlanLegInput(string Country,string Origin,string Destination,DateTimeOffset DepartureAt,DateTimeOffset ArrivalAt,IReadOnlyList<PlanVehicleInput> Vehicles);
public sealed record FlowPlanInput(string Version,IReadOnlyList<PlanLegInput> Legs,string? FlightId=null,bool NewVersion=false);
public sealed record PlanDecision(string Version,string Reason,string? Reference=null,DateTimeOffset? InsuranceThrough=null);
public sealed record FlightInput(string Provider,string FlightNumber,string DepartureAirport,string ArrivalAirport,DateTimeOffset DepartureUtc,DateTimeOffset ArrivalUtc,int Capacity);
public sealed record PlanningDocumentReview(string PlanVersion,string RecordId,bool RequiredBeforeDeparture,bool Valid,DateTimeOffset? ExpiresAt,string Reason);
