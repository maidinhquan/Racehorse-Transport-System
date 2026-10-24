-- =============================================================================
-- BƯỚC 0: TẠO VÀ CHUYỂN VÀO CƠ SỞ DỮ LIỆU CHÍNH THỨC
-- Project: Horse Transport Management System (SWP391)
-- =============================================================================
USE master;
GO

-- Buộc ngắt mọi kết nối đang mở vào Database cũ và xóa hẳn nếu đã tồn tại
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'HorseTransportDB')
BEGIN
    ALTER DATABASE HorseTransportDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE HorseTransportDB;
END
GO

-- Tạo mới database hoàn toàn sạch sẽ
CREATE DATABASE HorseTransportDB;
GO

USE HorseTransportDB;
GO

