/*
  Nâng cấp CSDL ĐÃ TỒN TẠI sau khi bỏ chức năng PDF khỏi hợp đồng.

  Ai cần chạy: người đã tạo HorseTransportDB từ bản cũ của HorseTransportDB.sql.
  Người tạo CSDL mới từ bản hiện tại của HorseTransportDB.sql KHÔNG cần chạy file này.

  Nội dung: bỏ điều kiện "PdfUrl IS NOT NULL" khỏi 4 ràng buộc CHECK, để hợp đồng phát hành
  mà không có file PDF vẫn hợp lệ. Cột PdfUrl vẫn giữ (cho phép trống); dữ liệu cũ không đổi.
  Có thể chạy lại nhiều lần (idempotent). Chạy trong SSMS, đã chọn đúng CSDL HorseTransportDB.
*/
USE HorseTransportDB;
GO

SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- CONTRACT: ràng buộc phát hành
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_F1S_CONTRACT_Publication' AND parent_object_id = OBJECT_ID('dbo.CONTRACT'))
    ALTER TABLE dbo.CONTRACT DROP CONSTRAINT CK_F1S_CONTRACT_Publication;
ALTER TABLE dbo.CONTRACT ADD CONSTRAINT CK_F1S_CONTRACT_Publication CHECK (
    [PublishedAtUtc] IS NULL OR [PublishedBy] IS NOT NULL AND [DepositAmount] IS NOT NULL AND [CompletionDeadline] IS NOT NULL);

-- CONTRACT: ràng buộc đã ký
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_F1S_CONTRACT_Signed' AND parent_object_id = OBJECT_ID('dbo.CONTRACT'))
    ALTER TABLE dbo.CONTRACT DROP CONSTRAINT CK_F1S_CONTRACT_Signed;
ALTER TABLE dbo.CONTRACT ADD CONSTRAINT CK_F1S_CONTRACT_Signed CHECK (
    SignedAt IS NULL OR (PublishedAtUtc IS NOT NULL AND PublishedBy IS NOT NULL AND DepositAmount IS NOT NULL
        AND SignerEmail IS NOT NULL AND CompletionDeadline IS NOT NULL AND SignedAt >= PublishedAtUtc
        AND CompletionDeadline > SignedAt AND SignOtpHash IS NULL));

-- CONTRACT_VERSION: ràng buộc phát hành
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_ContractVersion_Publication' AND parent_object_id = OBJECT_ID('dbo.CONTRACT_VERSION'))
    ALTER TABLE dbo.CONTRACT_VERSION DROP CONSTRAINT CK_ContractVersion_Publication;
ALTER TABLE dbo.CONTRACT_VERSION ADD CONSTRAINT CK_ContractVersion_Publication CHECK (
    (VersionStatus NOT IN ('ISSUED', 'SUPERSEDED', 'SIGNED') AND PublishedAtUtc IS NULL)
    OR (PublishedAtUtc IS NOT NULL AND PublishedBy IS NOT NULL));

-- CONTRACT_VERSION: ràng buộc chữ ký
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_ContractVersion_Signature' AND parent_object_id = OBJECT_ID('dbo.CONTRACT_VERSION'))
    ALTER TABLE dbo.CONTRACT_VERSION DROP CONSTRAINT CK_ContractVersion_Signature;
ALTER TABLE dbo.CONTRACT_VERSION ADD CONSTRAINT CK_ContractVersion_Signature CHECK (
    (VersionStatus <> 'SIGNED' OR SignedAtUtc IS NOT NULL)
    AND (SignedAtUtc IS NULL OR (VersionStatus IN ('SIGNED', 'CANCELLED')
        AND PublishedAtUtc IS NOT NULL AND PublishedBy IS NOT NULL
        AND SignerEmail IS NOT NULL AND SignedAtUtc >= PublishedAtUtc)));

COMMIT TRANSACTION;
GO
