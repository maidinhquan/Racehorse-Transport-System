-- Ngày theo múi giờ địa phương của sân bay. NULL dành cho dữ liệu cũ chưa xác nhận lịch.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.FLIGHT_CATALOG', 'DepartureDate') IS NULL
    ALTER TABLE dbo.FLIGHT_CATALOG ADD DepartureDate DATE NULL;
IF COL_LENGTH('dbo.FLIGHT_CATALOG', 'ArrivalDate') IS NULL
    ALTER TABLE dbo.FLIGHT_CATALOG ADD ArrivalDate DATE NULL;
COMMIT;
