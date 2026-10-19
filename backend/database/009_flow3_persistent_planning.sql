-- Empty operational tables. No demo catalog is inserted. Run after 008.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.VEHICLE','OperatingCountry') IS NULL
 ALTER TABLE dbo.VEHICLE ADD OperatingCountry varchar(2) NULL CONSTRAINT CK_F3_VehicleCountry CHECK(OperatingCountry IS NULL OR OperatingCountry IN ('VN','JP'));
IF OBJECT_ID('dbo.FLOW3_FLIGHT','U') IS NULL
CREATE TABLE dbo.FLOW3_FLIGHT(FlightID varchar(50) PRIMARY KEY,Provider nvarchar(200) NOT NULL,FlightNumber nvarchar(100) NOT NULL,
 DepartureAirport nvarchar(500) NOT NULL,ArrivalAirport nvarchar(500) NOT NULL,DepartureUtc datetime2 NOT NULL,ArrivalUtc datetime2 NOT NULL,Capacity int NOT NULL,Status varchar(20) NOT NULL,
 CONSTRAINT CK_F3_Flight CHECK(ArrivalUtc>DepartureUtc AND Capacity>0 AND Status IN ('AVAILABLE','CANCELLED')));
IF OBJECT_ID('dbo.FLOW3_PLAN','U') IS NULL
CREATE TABLE dbo.FLOW3_PLAN(PlanID varchar(50) PRIMARY KEY,TripID varchar(50) NOT NULL REFERENCES dbo.TRIP_PLAN(TripID),PlanVersion int NOT NULL,Status varchar(30) NOT NULL,IsCurrent bit NOT NULL,
 FlightID varchar(50) NULL REFERENCES dbo.FLOW3_FLIGHT(FlightID),OperationsReady bit NOT NULL,DocumentsReady bit NOT NULL,InsuranceThroughUtc datetime2 NULL,InsuranceReference nvarchar(200) NULL,BookingReference nvarchar(200) NULL,
 DepartureAuthorized bit NOT NULL,Decision nvarchar(1000) NULL,UpdatedBy varchar(50) NOT NULL,UpdatedAtUtc datetime2 NOT NULL,RowVersion rowversion,
 CONSTRAINT CK_F3_Plan CHECK(Status IN ('DRAFT','CHANGES_REQUESTED','FEASIBILITY_REVIEW','PENDING_APPROVAL','APPROVED','SUPERSEDED') AND PlanVersion>0 AND (DepartureAuthorized=0 OR (Status='APPROVED' AND OperationsReady=1 AND DocumentsReady=1))),
 CONSTRAINT UQ_F3_Version UNIQUE(TripID,PlanVersion));
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.FLOW3_PLAN') AND name='UX_F3_Current')
CREATE UNIQUE INDEX UX_F3_Current ON dbo.FLOW3_PLAN(TripID) WHERE IsCurrent=1;
IF OBJECT_ID('dbo.FLOW3_LEG','U') IS NULL
CREATE TABLE dbo.FLOW3_LEG(LegID varchar(50) PRIMARY KEY,PlanID varchar(50) NOT NULL REFERENCES dbo.FLOW3_PLAN(PlanID),Sequence int NOT NULL,Country varchar(2) NOT NULL,Origin nvarchar(500) NOT NULL,Destination nvarchar(500) NOT NULL,
 DepartureUtc datetime2 NOT NULL,ArrivalUtc datetime2 NOT NULL,CONSTRAINT CK_F3_Leg CHECK(ArrivalUtc>DepartureUtc AND Sequence IN (1,2) AND Country IN ('VN','JP')),CONSTRAINT UQ_F3_Leg UNIQUE(PlanID,Sequence));
IF OBJECT_ID('dbo.FLOW3_ASSIGNMENT','U') IS NULL
CREATE TABLE dbo.FLOW3_ASSIGNMENT(AssignmentID varchar(50) PRIMARY KEY,LegID varchar(50) NOT NULL REFERENCES dbo.FLOW3_LEG(LegID),VehicleID varchar(50) NOT NULL REFERENCES dbo.VEHICLE(VehicleID),
 DriverID varchar(50) NOT NULL REFERENCES dbo.[USER](UserID),CoDriverID varchar(50) NOT NULL REFERENCES dbo.[USER](UserID),VetID varchar(50) NOT NULL REFERENCES dbo.[USER](UserID),
 CONSTRAINT UQ_F3_Vehicle UNIQUE(LegID,VehicleID),CONSTRAINT CK_F3_Crew CHECK(DriverID<>CoDriverID AND DriverID<>VetID AND CoDriverID<>VetID));
IF OBJECT_ID('dbo.FLOW3_HORSE_ASSIGNMENT','U') IS NULL
CREATE TABLE dbo.FLOW3_HORSE_ASSIGNMENT(ID varchar(50) PRIMARY KEY,AssignmentID varchar(50) NOT NULL REFERENCES dbo.FLOW3_ASSIGNMENT(AssignmentID),HorseID varchar(50) NOT NULL REFERENCES dbo.HORSE(HorseID),CONSTRAINT UQ_F3_Horse UNIQUE(AssignmentID,HorseID));
COMMIT;
