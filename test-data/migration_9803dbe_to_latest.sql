-- =================================================================================================
-- SCRIPT MIGRATION MINI: CẬP NHẬT DATABASE TỪ COMMIT 9803dbe ĐẾN HIỆN TẠI
-- Dự án: Racehorse Transport System (HorseTransportDB)
-- Phạm vi:
--   1. HORSE: Thêm cột VaccinationFileUrl, HealthCertificateFileUrl & Check constraints
--   2. HORSE DATA MIGRATION: Đồng bộ dữ liệu sổ tiêm & giấy khám từ LEGAL_MEDICAL_RECORD sang HORSE
--   3. TRANSPORT_REQUEST: Thêm cột DesignatedReceiverEmail (hỗ trợ gửi OTP giao nhận Flow 6)
--   4. TRANSPORT_REQUEST DATA MIGRATION: Bổ sung email người nhận từ Customer nếu đang NULL
--   5. BUSINESS_POLICY: Bổ sung chính sách MAX_HORSES_PER_REQUEST (BUSINESS_POLICY_019)
--   6. SEQUENCES: Tự động đồng bộ SEQ_BUSINESS_POLICY_ID và SEQ_HANDOVER_ITEM_ID tránh trùng lặp ID
--
-- Đặc điểm: Idempotent (chạy nhiều lần không lỗi), an toàn tuyệt đối, có transaction rollback.
-- =================================================================================================

USE HorseTransportDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '=================================================================================';
PRINT N'BẮT ĐẦU CẬP NHẬT DATABASE (TỪ COMMIT 9803dbe -> HIỆN TẠI)...';
PRINT '=================================================================================';

BEGIN TRANSACTION;

BEGIN TRY
    -- ---------------------------------------------------------------------------------
    -- 1. BẢNG HORSE: THÊM CỘT VACCINATION_FILE_URL VÀ HEALTH_CERTIFICATE_FILE_URL
    -- ---------------------------------------------------------------------------------
    PRINT N'==> 1. Kiểm tra và bổ sung cột cho bảng HORSE...';

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'dbo.HORSE') AND name = N'VaccinationFileUrl'
    )
    BEGIN
        ALTER TABLE dbo.HORSE ADD VaccinationFileUrl NVARCHAR(500) NULL;
        PRINT N'   + Đã thêm cột VaccinationFileUrl vào bảng HORSE.';
    END
    ELSE
    BEGIN
        PRINT N'   - Cột VaccinationFileUrl đã tồn tại.';
    END

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'dbo.HORSE') AND name = N'HealthCertificateFileUrl'
    )
    BEGIN
        ALTER TABLE dbo.HORSE ADD HealthCertificateFileUrl NVARCHAR(500) NULL;
        PRINT N'   + Đã thêm cột HealthCertificateFileUrl vào bảng HORSE.';
    END
    ELSE
    BEGIN
        PRINT N'   - Cột HealthCertificateFileUrl đã tồn tại.';
    END


    -- ---------------------------------------------------------------------------------
    -- 2. MIGRATE DỮ LIỆU CŨ CHO BẢNG HORSE TỪ LEGAL_MEDICAL_RECORD
    --    (Chỉ di chuyển các file chuẩn private/ để tuân thủ quy chuẩn lưu trữ hệ thống)
    -- ---------------------------------------------------------------------------------
    PRINT N'==> 2. Di chuyển dữ liệu y tế từ LEGAL_MEDICAL_RECORD sang hồ sơ HORSE...';

    -- 2.1 Migrate Sổ tiêm ngừa cúm (DT-3, VACCINATION, EQUINE_FLU_VAX)
    EXEC sp_executesql N'
        UPDATE h
        SET h.VaccinationFileUrl = r.UploadedFileUrl
        FROM dbo.HORSE h
        CROSS APPLY (
            SELECT TOP 1 UploadedFileUrl
            FROM dbo.LEGAL_MEDICAL_RECORD
            WHERE HorseID = h.HorseID
              AND DocumentType IN (''DT-3'', ''VACCINATION'', ''EQUINE_FLU_VAX'')
              AND UploadedFileUrl IS NOT NULL
              AND UploadedFileUrl LIKE ''private/%''
              AND LEN(UploadedFileUrl) > 8
            ORDER BY RecordID DESC
        ) r
        WHERE h.VaccinationFileUrl IS NULL;
    ';
    PRINT N'   + Đã migrate dữ liệu Sổ tiêm ngừa (VaccinationFileUrl) cho các ngựa hiện có.';

    -- 2.2 Migrate Giấy chứng nhận sức khỏe / kiểm dịch (DT-2, HEALTH_CERTIFICATE)
    EXEC sp_executesql N'
        UPDATE h
        SET h.HealthCertificateFileUrl = r.UploadedFileUrl
        FROM dbo.HORSE h
        CROSS APPLY (
            SELECT TOP 1 UploadedFileUrl
            FROM dbo.LEGAL_MEDICAL_RECORD
            WHERE HorseID = h.HorseID
              AND DocumentType IN (''DT-2'', ''HEALTH_CERTIFICATE'')
              AND UploadedFileUrl IS NOT NULL
              AND UploadedFileUrl LIKE ''private/%''
              AND LEN(UploadedFileUrl) > 8
            ORDER BY RecordID DESC
        ) r
        WHERE h.HealthCertificateFileUrl IS NULL;
    ';
    PRINT N'   + Đã migrate dữ liệu Giấy kiểm dịch / sức khỏe (HealthCertificateFileUrl) cho các ngựa hiện có.';


    -- ---------------------------------------------------------------------------------
    -- 3. TẠO RÀNG BUỘC CHECK CONSTRAINTS CHO BẢNG HORSE (SAU KHI MIGRATE DỮ LIỆU)
    -- ---------------------------------------------------------------------------------
    PRINT N'==> 3. Tạo Check Constraints cho cột mới bảng HORSE...';

    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_F1W_HORSE_VaccinationFileUrl')
    BEGIN
        EXEC sp_executesql N'
            ALTER TABLE dbo.HORSE WITH CHECK ADD CONSTRAINT [CK_F1W_HORSE_VaccinationFileUrl]
                CHECK ([VaccinationFileUrl] IS NULL OR ([VaccinationFileUrl] LIKE ''private/%'' AND LEN([VaccinationFileUrl]) > 8));
            ALTER TABLE dbo.HORSE CHECK CONSTRAINT [CK_F1W_HORSE_VaccinationFileUrl];
        ';
        PRINT N'   + Đã tạo constraint CK_F1W_HORSE_VaccinationFileUrl.';
    END
    ELSE
    BEGIN
        PRINT N'   - Constraint CK_F1W_HORSE_VaccinationFileUrl đã tồn tại.';
    END

    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_F1W_HORSE_HealthCertificateFileUrl')
    BEGIN
        EXEC sp_executesql N'
            ALTER TABLE dbo.HORSE WITH CHECK ADD CONSTRAINT [CK_F1W_HORSE_HealthCertificateFileUrl]
                CHECK ([HealthCertificateFileUrl] IS NULL OR ([HealthCertificateFileUrl] LIKE ''private/%'' AND LEN([HealthCertificateFileUrl]) > 8));
            ALTER TABLE dbo.HORSE CHECK CONSTRAINT [CK_F1W_HORSE_HealthCertificateFileUrl];
        ';
        PRINT N'   + Đã tạo constraint CK_F1W_HORSE_HealthCertificateFileUrl.';
    END
    ELSE
    BEGIN
        PRINT N'   - Constraint CK_F1W_HORSE_HealthCertificateFileUrl đã tồn tại.';
    END


    -- ---------------------------------------------------------------------------------
    -- 4. BẢNG TRANSPORT_REQUEST: THÊM CỘT DESIGNATED_RECEIVER_EMAIL
    -- ---------------------------------------------------------------------------------
    PRINT N'==> 4. Kiểm tra và bổ sung cột cho bảng TRANSPORT_REQUEST...';

    IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'dbo.TRANSPORT_REQUEST') AND name = N'DesignatedReceiverEmail'
    )
    BEGIN
        ALTER TABLE dbo.TRANSPORT_REQUEST ADD DesignatedReceiverEmail VARCHAR(254) NULL;
        PRINT N'   + Đã thêm cột DesignatedReceiverEmail vào bảng TRANSPORT_REQUEST.';
    END
    ELSE
    BEGIN
        PRINT N'   - Cột DesignatedReceiverEmail đã tồn tại.';
    END

    -- Migrate email người nhận nếu đang NULL từ Customer Email của đơn
    EXEC sp_executesql N'
        UPDATE r
        SET r.DesignatedReceiverEmail = u.Email
        FROM dbo.TRANSPORT_REQUEST r
        JOIN dbo.[USER] u ON u.UserID = r.CustomerID
        WHERE r.DesignatedReceiverEmail IS NULL AND u.Email IS NOT NULL;
    ';
    PRINT N'   + Đã cập nhật DesignatedReceiverEmail từ Customer Email cho các đơn còn trống.';


    -- ---------------------------------------------------------------------------------
    -- 5. BẢNG BUSINESS_POLICY: THÊM CHÍNH SÁCH MAX_HORSES_PER_REQUEST
    -- ---------------------------------------------------------------------------------
    PRINT N'==> 5. Cập nhật chính sách nghiệp vụ BUSINESS_POLICY...';

    IF NOT EXISTS (SELECT 1 FROM dbo.BUSINESS_POLICY WHERE Code = 'MAX_HORSES_PER_REQUEST')
    BEGIN
        INSERT INTO dbo.BUSINESS_POLICY (
            PolicyID, Code, ValueType, NumberValue, TextValue, BoolValue,
            Unit, ScopeType, ScopeID, Description, UpdatedBy, UpdatedAt
        )
        VALUES (
            'BUSINESS_POLICY_019',
            'MAX_HORSES_PER_REQUEST',
            'NUMBER',
            6,
            NULL,
            NULL,
            'HORSE',
            'GLOBAL',
            NULL,
            N'Số lượng ngựa tối đa cho phép trong một yêu cầu vận chuyển.',
            'USER_004',
            SYSUTCDATETIME()
        );
        PRINT N'   + Đã thêm chính sách BUSINESS_POLICY_019 (MAX_HORSES_PER_REQUEST = 6).';
    END
    ELSE
    BEGIN
        PRINT N'   - Chính sách MAX_HORSES_PER_REQUEST đã tồn tại.';
    END


    -- ---------------------------------------------------------------------------------
    -- 6. ĐỒNG BỘ SEQUENCES CẤP PHÁT ID ĐẢM BẢO KHÔNG TRÙNG KHÓA CHÍNH
    -- ---------------------------------------------------------------------------------
    PRINT N'==> 6. Đồng bộ Sequences tự tăng...';

    -- 6.1 Đồng bộ SEQ_BUSINESS_POLICY_ID
    DECLARE @maxPolicyNum INT = 19;
    SELECT @maxPolicyNum = ISNULL(MAX(TRY_CAST(SUBSTRING(PolicyID, 17, 10) AS INT)), 19)
    FROM dbo.BUSINESS_POLICY
    WHERE PolicyID LIKE 'BUSINESS_POLICY_%';

    DECLARE @sqlPolicySeq NVARCHAR(MAX) = N'ALTER SEQUENCE dbo.[SEQ_BUSINESS_POLICY_ID] RESTART WITH ' + CAST((@maxPolicyNum + 1) AS NVARCHAR(20)) + N';';
    EXEC sp_executesql @sqlPolicySeq;
    PRINT N'   + Đã đồng bộ SEQ_BUSINESS_POLICY_ID bắt đầu từ ' + CAST((@maxPolicyNum + 1) AS NVARCHAR(20)) + N'.';

    -- 6.2 Đồng bộ SEQ_HANDOVER_ITEM_ID
    DECLARE @maxHandoverItemNum INT = 6;
    SELECT @maxHandoverItemNum = ISNULL(MAX(TRY_CAST(SUBSTRING(HandoverItemID, 15, 10) AS INT)), 6)
    FROM dbo.HANDOVER_ITEM
    WHERE HandoverItemID LIKE 'HANDOVER_ITEM_%';

    DECLARE @sqlHandoverItemSeq NVARCHAR(MAX) = N'ALTER SEQUENCE dbo.[SEQ_HANDOVER_ITEM_ID] RESTART WITH ' + CAST((@maxHandoverItemNum + 1) AS NVARCHAR(20)) + N';';
    EXEC sp_executesql @sqlHandoverItemSeq;
    PRINT N'   + Đã đồng bộ SEQ_HANDOVER_ITEM_ID bắt đầu từ ' + CAST((@maxHandoverItemNum + 1) AS NVARCHAR(20)) + N'.';

    -- 6.3 Đồng bộ SEQ_USER_ID (fix lỗi đăng ký trùng USER_020..USER_024)
    DECLARE @maxUserNum INT = 24;
    SELECT @maxUserNum = ISNULL(MAX(TRY_CAST(SUBSTRING(UserID, 6, 20) AS INT)), 24)
    FROM dbo.[USER]
    WHERE UserID LIKE 'USER_[0-9]%';
    IF @maxUserNum < 24 SET @maxUserNum = 24;

    IF OBJECT_ID('dbo.SEQ_USER_ID', 'SO') IS NOT NULL
    BEGIN
        DECLARE @sqlUserSeq NVARCHAR(MAX) = N'ALTER SEQUENCE dbo.[SEQ_USER_ID] RESTART WITH ' + CAST((@maxUserNum + 1) AS NVARCHAR(20)) + N';';
        EXEC sp_executesql @sqlUserSeq;
        PRINT N'   + Đã đồng bộ SEQ_USER_ID bắt đầu từ ' + CAST((@maxUserNum + 1) AS NVARCHAR(20)) + N'.';
    END

    -- 6.4 Đồng bộ SEQ_STAFF_DOCUMENT_ID
    DECLARE @maxStaffDocNum INT = 11;
    SELECT @maxStaffDocNum = ISNULL(MAX(TRY_CAST(SUBSTRING(DocumentID, 16, 20) AS INT)), 11)
    FROM dbo.STAFF_DOCUMENT
    WHERE DocumentID LIKE 'STAFF_DOCUMENT_[0-9]%';
    IF @maxStaffDocNum < 11 SET @maxStaffDocNum = 11;

    IF OBJECT_ID('dbo.SEQ_STAFF_DOCUMENT_ID', 'SO') IS NOT NULL
    BEGIN
        DECLARE @sqlStaffDocSeq NVARCHAR(MAX) = N'ALTER SEQUENCE dbo.[SEQ_STAFF_DOCUMENT_ID] RESTART WITH ' + CAST((@maxStaffDocNum + 1) AS NVARCHAR(20)) + N';';
        EXEC sp_executesql @sqlStaffDocSeq;
        PRINT N'   + Đã đồng bộ SEQ_STAFF_DOCUMENT_ID bắt đầu từ ' + CAST((@maxStaffDocNum + 1) AS NVARCHAR(20)) + N'.';
    END

    -- 6.5 Đồng bộ SEQ_CONTRACT_ID
    DECLARE @maxContractNum INT = 4;
    SELECT @maxContractNum = ISNULL(MAX(TRY_CAST(SUBSTRING(ContractID, 10, 20) AS INT)), 4)
    FROM dbo.CONTRACT
    WHERE ContractID LIKE 'CONTRACT_[0-9]%';
    IF @maxContractNum < 4 SET @maxContractNum = 4;

    IF OBJECT_ID('dbo.SEQ_CONTRACT_ID', 'SO') IS NOT NULL
    BEGIN
        DECLARE @sqlContractSeq NVARCHAR(MAX) = N'ALTER SEQUENCE dbo.[SEQ_CONTRACT_ID] RESTART WITH ' + CAST((@maxContractNum + 1) AS NVARCHAR(20)) + N';';
        EXEC sp_executesql @sqlContractSeq;
        PRINT N'   + Đã đồng bộ SEQ_CONTRACT_ID bắt đầu từ ' + CAST((@maxContractNum + 1) AS NVARCHAR(20)) + N'.';
    END


    COMMIT TRANSACTION;
    PRINT '=================================================================================';
    PRINT N'CẬP NHẬT DATABASE THÀNH CÔNG RỰC RỠ!';
    PRINT '=================================================================================';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT '=================================================================================';
    PRINT N'LỖI TRONG QUÁ TRÌNH CẬP NHẬT:';
    PRINT ERROR_MESSAGE();
    PRINT '=================================================================================';
    THROW;
END CATCH;
GO

-- -------------------------------------------------------------------------------------
-- 7. KIỂM TRA NHANH KẾT QUẢ CẬP NHẬT
-- -------------------------------------------------------------------------------------
SELECT 'CHECK_HORSE_COLUMNS' AS CheckItem, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'HORSE' AND COLUMN_NAME IN ('VaccinationFileUrl', 'HealthCertificateFileUrl')
UNION ALL
SELECT 'CHECK_REQUEST_COLUMN', COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'TRANSPORT_REQUEST' AND COLUMN_NAME = 'DesignatedReceiverEmail'
UNION ALL
SELECT 'CHECK_POLICY', Code, ValueType, CAST(NumberValue AS INT)
FROM dbo.BUSINESS_POLICY
WHERE Code = 'MAX_HORSES_PER_REQUEST';
GO
