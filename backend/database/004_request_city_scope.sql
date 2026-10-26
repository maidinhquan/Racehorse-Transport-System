-- Additive only. Apply to the configured Flow 1 database before deploying this feature.
-- External Geoapify IDs are references, not internal primary keys; no new city master table.
IF COL_LENGTH('dbo.TRANSPORT_REQUEST', 'PickupCityId') IS NULL
    ALTER TABLE dbo.TRANSPORT_REQUEST ADD PickupCityId varchar(1024) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST', 'DeliveryCityId') IS NULL
    ALTER TABLE dbo.TRANSPORT_REQUEST ADD DeliveryCityId varchar(1024) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST', 'PickupCityName') IS NULL
    ALTER TABLE dbo.TRANSPORT_REQUEST ADD PickupCityName nvarchar(255) NULL;
IF COL_LENGTH('dbo.TRANSPORT_REQUEST', 'DeliveryCityName') IS NULL
    ALTER TABLE dbo.TRANSPORT_REQUEST ADD DeliveryCityName nvarchar(255) NULL;
