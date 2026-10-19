using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace Domain.Flow1;

[Table("FLOW3_PLAN")]
public sealed class FlowPlan
{
    [Key,Column(TypeName="varchar(50)")] public string PlanID {get;set;}=null!;
    [Column(TypeName="varchar(50)")] public string TripID {get;set;}=null!;
    public int PlanVersion {get;set;}
    [Column(TypeName="varchar(30)")] public string Status {get;set;}="DRAFT";
    public bool IsCurrent {get;set;}=true;
    [Column(TypeName="varchar(50)")] public string? FlightID {get;set;}
    public bool OperationsReady {get;set;}
    public bool DocumentsReady {get;set;}
    public DateTime? InsuranceThroughUtc {get;set;}
    [Column(TypeName="nvarchar(200)")] public string? InsuranceReference {get;set;}
    [Column(TypeName="nvarchar(200)")] public string? BookingReference {get;set;}
    public bool DepartureAuthorized {get;set;}
    [Column(TypeName="nvarchar(1000)")] public string? Decision {get;set;}
    [Column(TypeName="varchar(50)")] public string UpdatedBy {get;set;}=null!;
    public DateTime UpdatedAtUtc {get;set;}
    [Timestamp] public byte[] RowVersion {get;set;}=null!;
}
[Table("FLOW3_LEG")]
public sealed class FlowPlanLeg
{
    [Key,Column(TypeName="varchar(50)")] public string LegID {get;set;}=null!;
    [Column(TypeName="varchar(50)")] public string PlanID {get;set;}=null!;
    public int Sequence {get;set;}
    [Column(TypeName="varchar(2)")] public string Country {get;set;}=null!;
    [Column(TypeName="nvarchar(500)")] public string Origin {get;set;}=null!;
    [Column(TypeName="nvarchar(500)")] public string Destination {get;set;}=null!;
    public DateTime DepartureUtc {get;set;}
    public DateTime ArrivalUtc {get;set;}
}
[Table("FLOW3_ASSIGNMENT")]
public sealed class FlowPlanAssignment
{
    [Key,Column(TypeName="varchar(50)")] public string AssignmentID {get;set;}=null!;
    [Column(TypeName="varchar(50)")] public string LegID {get;set;}=null!;
    [Column(TypeName="varchar(50)")] public string VehicleID {get;set;}=null!;
    [Column(TypeName="varchar(50)")] public string DriverID {get;set;}=null!;
    [Column(TypeName="varchar(50)")] public string CoDriverID {get;set;}=null!;
    [Column(TypeName="varchar(50)")] public string VetID {get;set;}=null!;
}
[Table("FLOW3_HORSE_ASSIGNMENT")]
public sealed class FlowPlanHorse
{
    [Key,Column(TypeName="varchar(50)")] public string ID {get;set;}=null!;
    [Column(TypeName="varchar(50)")] public string AssignmentID {get;set;}=null!;
    [Column(TypeName="varchar(50)")] public string HorseID {get;set;}=null!;
}
[Table("FLOW3_FLIGHT")]
public sealed class FlowFlight
{
    [Key,Column(TypeName="varchar(50)")] public string FlightID {get;set;}=null!;
    [Column(TypeName="nvarchar(200)")] public string Provider {get;set;}=null!;
    [Column(TypeName="nvarchar(100)")] public string FlightNumber {get;set;}=null!;
    [Column(TypeName="nvarchar(500)")] public string DepartureAirport {get;set;}=null!;
    [Column(TypeName="nvarchar(500)")] public string ArrivalAirport {get;set;}=null!;
    public DateTime DepartureUtc {get;set;}
    public DateTime ArrivalUtc {get;set;}
    public int Capacity {get;set;}
    [Column(TypeName="varchar(20)")] public string Status {get;set;}="AVAILABLE";
}
// Scalar mappings of existing catalog tables; no fictitious countries or credentials.
[Table("VEHICLE")]
public sealed class FlowVehicle
{
    [Key,Column(TypeName="varchar(50)")]public string VehicleID {get;set;}=null!;
    [Column(TypeName="varchar(50)")]public string? Type {get;set;}
    public int? CapacityStalls {get;set;}
    [Column(TypeName="varchar(50)")]public string? Status {get;set;}
    [Column(TypeName="varchar(2)")]public string? OperatingCountry {get;set;}
}
[Table("STAFF_DOCUMENT")]
public sealed class FlowStaffCredential
{
    [Key,Column("DocumentID",TypeName="varchar(50)")]public string DocumentID {get;set;}=null!;
    [Column("UserID",TypeName="varchar(50)")]public string UserID {get;set;}=null!;
    [Column(TypeName="nvarchar(100)")]public string? DocType {get;set;}
    [Column(TypeName="nvarchar(500)")]public string? ValidForCountries {get;set;}
    public DateTime? ExpiryDate {get;set;}
    [Column(TypeName="nvarchar(50)")]public string? Status {get;set;}
}
