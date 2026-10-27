-- =============================================================================
-- FIX MOJIBAKE / ENCODING ISSUES IN HORSE TRANSPORT SYSTEM DATABASE
-- Script chuẩn hóa lại tiếng Việt Unicode (N'...') cho toàn bộ tài khoản
-- Chạy script này trên SQL Server Management Studio (SSMS) để sửa lỗi font chữ
-- =============================================================================

USE [HorseTransportDB];
GO

-- 1. Chuẩn hóa bảng USER
UPDATE [USER] SET FullName = N'Nguyễn Văn A' WHERE UserID IN ('USER_001', 'USR_CUST_01') OR Email = 'vana.horse@gmail.com';
UPDATE [USER] SET FullName = N'Trần Văn B' WHERE UserID IN ('USER_002', 'USR_CUST_02') OR Email = 'tranb.racing@gmail.com';
UPDATE [USER] SET FullName = N'Lê Thị C' WHERE UserID IN ('USER_003', 'USR_CUST_03') OR Email = 'lethic.locked@gmail.com';
UPDATE [USER] SET FullName = N'Trần Thị Linh' WHERE UserID IN ('USER_004', 'USR_MGR_01') OR Email = 'linh.manager@cbntransport.com';
UPDATE [USER] SET FullName = N'Lê Tuấn' WHERE UserID IN ('USER_005', 'USR_SPEC_01') OR Email = 'tuan.specialist@cbntransport.com';
UPDATE [USER] SET FullName = N'Phạm Hải' WHERE UserID IN ('USER_006', 'USR_COORD_01') OR Email = 'hai.coord@cbntransport.com';
UPDATE [USER] SET FullName = N'Hoàng Hùng' WHERE UserID IN ('USER_007', 'USR_DRV_01') OR Email = 'hung.driver@cbntransport.com';
UPDATE [USER] SET FullName = N'Vũ Thành' WHERE UserID IN ('USER_008', 'USR_DRV_02') OR Email = 'thanh.driver@cbntransport.com';
UPDATE [USER] SET FullName = N'Đỗ Hoa' WHERE UserID IN ('USER_009', 'USR_ESC_01') OR Email = 'hoa.escort@cbntransport.com';
UPDATE [USER] SET FullName = N'Phan Nam' WHERE UserID IN ('USER_010', 'USR_ESC_02') OR Email = 'nam.escort@cbntransport.com';
UPDATE [USER] SET FullName = N'Kenji Sato' WHERE UserID = 'USR_DRV_JP_01' OR Email = 'kenji.driver@cbntransport.jp';
UPDATE [USER] SET FullName = N'Daiki Tanaka' WHERE UserID = 'USR_DRV_JP_02' OR Email = 'daiki.driver@cbntransport.jp';
UPDATE [USER] SET FullName = N'Yumi Mori' WHERE UserID = 'USR_ESC_JP_01' OR Email = 'yumi.vet@cbntransport.jp';
GO

-- 2. Chuẩn hóa bảng HORSE (Ngựa)
UPDATE HORSE SET Name = N'Tia Chớp Đỏ' WHERE HorseID = 'HORSE_001';
UPDATE HORSE SET Name = N'Bạch Mã Hoàng Tử' WHERE HorseID = 'HORSE_002';
UPDATE HORSE SET Name = N'Hắc Phong' WHERE HorseID = 'HORSE_003';
UPDATE HORSE SET Name = N'Xích Thố Vương' WHERE HorseID = 'HORSE_004';
UPDATE HORSE SET Name = N'Phi Yến' WHERE HorseID = 'HORSE_005';
GO

PRINT N'Hoàn tất cập nhật và chuẩn hóa tiếng Việt cho toàn bộ tài khoản và ngựa!';
GO
