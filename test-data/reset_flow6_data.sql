-- =============================================================================
-- SCRIPT RESET DỮ LIỆU FLOW 6: AFTERCARE, DELIVERY, SETTLEMENT & BILLING
-- Thư mục: test-data/reset_flow6_data.sql
-- Mục đích: Đưa toàn bộ dữ liệu Flow 6 về trạng thái chuẩn ban đầu (Baseline)
--          để phục vụ việc test E2E lặp lại nhiều lần mà không bị xung đột ID hay trạng thái.
--
-- Hướng dẫn chạy:
--   - Chạy trên SQL Server Management Studio (SSMS) / Azure Data Studio
--   - Hoặc chạy bằng lệnh: sqlcmd -S localhost -d HorseTransportDB -i test-data/reset_flow6_data.sql
-- =============================================================================

USE HorseTransportDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '=============================================================================';
PRINT 'BẮT ĐẦU RESET DỮ LIỆU FLOW 6 VỀ BASELINE CHUẨN...';
PRINT '=============================================================================';

BEGIN TRANSACTION;

BEGIN TRY
    -- Tạm thời vô hiệu hóa các trigger kiểm tra bất biến (immutability) để reset dữ liệu
    ALTER TABLE HANDOVER_REVISION DISABLE TRIGGER TR_F6_HandoverRevisionImmutable;
    ALTER TABLE SETTLEMENT_ADJUSTMENT DISABLE TRIGGER TR_F6_AdjustmentImmutable;
    ALTER TABLE SETTLEMENT_ADJUSTMENT DISABLE TRIGGER TR_F6_AdjustmentScope;
    ALTER TABLE HANDOVER_ITEM DISABLE TRIGGER TR_F6_HandoverItemsLocked;

    -- -------------------------------------------------------------------------
    -- 1. XÓA DỮ LIỆU PHÁT SINH TỪ CÁC LẦN TEST FLOW 6
    --    (Xóa theo thứ tự ràng buộc khóa ngoại FK ngược từ dưới lên)
    -- -------------------------------------------------------------------------

    -- 1.1 Xóa Feedback của các Settlement sinh ra trong quá trình test
    DELETE FROM CUSTOMER_FEEDBACK
    WHERE SettlementID NOT IN ('SETTLEMENT_001');
    PRINT N'  -> Đã dọn dẹp bảng CUSTOMER_FEEDBACK (giữ lại SETTLEMENT_001)';

    -- 1.2 Xóa các Customer Case (Khiếu nại / Hỗ trợ) tạo mới trong quá trình test
    DELETE FROM CUSTOMER_CASE
    WHERE CaseID NOT IN ('CUSTOMER_CASE_001');
    PRINT N'  -> Đã dọn dẹp bảng CUSTOMER_CASE (giữ lại CUSTOMER_CASE_001)';

    -- 1.3 Xóa toàn bộ điều chỉnh chi phí (SETTLEMENT_ADJUSTMENT)
    DELETE FROM SETTLEMENT_ADJUSTMENT;
    PRINT N'  -> Đã xóa sạch bảng SETTLEMENT_ADJUSTMENT';

    -- 1.4 Xóa các Settlement test phát sinh (SettlementID >= SETTLEMENT_003)
    --     (Thực hiện trước khi xóa Invoice và Revision để giải phóng khóa ngoại FK)
    DELETE FROM TRIP_SETTLEMENT
    WHERE SettlementID NOT IN ('SETTLEMENT_001', 'SETTLEMENT_002');
    PRINT N'  -> Đã dọn dẹp bảng TRIP_SETTLEMENT (giữ lại SETTLEMENT_001, SETTLEMENT_002)';

    -- 1.5 Xóa các Payment thanh toán số dư hoặc test phát sinh (PaymentID >= PAYMENT_005)
    DELETE FROM PAYMENT
    WHERE PaymentID NOT IN ('PAYMENT_001', 'PAYMENT_002', 'PAYMENT_003', 'PAYMENT_004');
    PRINT N'  -> Đã dọn dẹp bảng PAYMENT (giữ lại PAYMENT_001 đến PAYMENT_004)';

    -- 1.6 Xóa các Final Invoice tạo mới trong quá trình test (InvoiceID >= INVOICE_006)
    DELETE FROM INVOICE
    WHERE InvoiceID NOT IN ('INVOICE_001', 'INVOICE_002', 'INVOICE_003', 'INVOICE_004', 'INVOICE_005');
    PRINT N'  -> Đã dọn dẹp bảng INVOICE (giữ lại INVOICE_001 đến INVOICE_005)';

    -- 1.7 Xóa các Handover Revision phát sinh (HandoverRevisionID >= HANDOVER_REVISION_003)
    DELETE FROM HANDOVER_REVISION
    WHERE HandoverRevisionID NOT IN ('HANDOVER_REVISION_001', 'HANDOVER_REVISION_002');
    PRINT N'  -> Đã dọn dẹp bảng HANDOVER_REVISION (giữ lại HANDOVER_REVISION_001, HANDOVER_REVISION_002)';

    -- 1.8 Xóa các Handover Item của biên bản giao ngựa test
    DELETE FROM HANDOVER_ITEM
    WHERE HandoverItemID NOT IN ('HANDOVER_ITEM_001', 'HANDOVER_ITEM_002', 'HANDOVER_ITEM_003', 'HANDOVER_ITEM_004', 'HANDOVER_ITEM_005');
    PRINT N'  -> Đã dọn dẹp bảng HANDOVER_ITEM (giữ lại HANDOVER_ITEM_001 đến HANDOVER_ITEM_005)';

    -- 1.9 Xóa các Handover Delivery test phát sinh (HandoverID >= HANDOVER_006)
    DELETE FROM HANDOVER
    WHERE HandoverID NOT IN ('HANDOVER_001', 'HANDOVER_002', 'HANDOVER_003', 'HANDOVER_004', 'HANDOVER_005');
    PRINT N'  -> Đã dọn dẹp bảng HANDOVER (giữ lại HANDOVER_001 đến HANDOVER_005)';

    -- -------------------------------------------------------------------------
    -- 2. KHÔI PHỤC TRẠNG THÁI BASELINE CHUẨN CHO CÁC BẢNG LIÊN QUAN
    -- -------------------------------------------------------------------------

    -- 2.1 Khôi phục TRIP_003 sẵn sàng để TEST E2E FLOW 6 TỪ BƯỚC ĐẦU (Delivery)
    UPDATE TRANSPORT_REQUEST
    SET Status = 'IN_PROGRESS',
        DesignatedReceiverName = N'Nguyễn Quang Trường',
        DesignatedReceiverPhone = '0903334455',
        DesignatedReceiverEmail = 'quangtruong1922@gmail.com'
    WHERE RequestID = 'REQUEST_003';

    -- Đồng thời cập nhật cả REQUEST_002 phòng trường hợp test trên TRIP_002
    UPDATE TRANSPORT_REQUEST
    SET DesignatedReceiverEmail = 'quangtruong1922@gmail.com'
    WHERE RequestID = 'REQUEST_002';

    UPDATE TRIP_PLAN
    SET Status = 'IN_TRANSIT'
    WHERE TripID = 'TRIP_003';

    -- Phân công tài xế USER_007 (Hoàng Hùng) & Bác sĩ USER_009 (BS. Đỗ Hoa) để đăng nhập test nhanh
    UPDATE TRIP_VEHICLE_ASSIGNMENT
    SET DriverID = 'USER_007', EscortID = 'USER_009'
    WHERE TripID = 'TRIP_003';

    -- Đảm bảo chặng đích (DESTINATION) của TRIP_003 đã hoàn thành để đủ điều kiện lập biên bản giao nhận F6-J03
    UPDATE ROUTE_SEGMENT
    SET Status = 'COMPLETED', ActualTime = '2026-10-11 17:30:00'
    WHERE TripID = 'TRIP_003' AND SegmentType = 'DESTINATION';

    UPDATE CONTRACT
    SET ContractStatus = 'EFFECTIVE', SignedAt = '2026-10-04 15:00:00', CurrentVersionNo = 1
    WHERE ContractID = 'CONTRACT_003';

    -- Đảm bảo Contract Version có commercial.totalPrice hợp lệ để Flow 6 tính toán số dư
    UPDATE CONTRACT_VERSION
    SET VersionStatus = 'SIGNED',
        ContentSnapshot = N'{"commercial":{"totalPrice":145000000},"contractId":"CONTRACT_003","versionNo":1}'
    WHERE ContractID = 'CONTRACT_003' AND VersionNo = 1;

    -- Đảm bảo tiền cọc của TRIP_003 đã thanh toán thành công
    UPDATE INVOICE
    SET PaidAmount = 58000000.00, PaymentStatus = 'PAID'
    WHERE InvoiceID = 'INVOICE_005';

    UPDATE PAYMENT
    SET Status = 'SUCCESS', Amount = 58000000.00, FinancialReviewRequired = 0
    WHERE PaymentID = 'PAYMENT_004';

    PRINT N'  -> Đã khôi phục TRIP_003 / CONTRACT_003 về trạng thái sẵn sàng bắt đầu Flow 6';

    -- 2.2 Khôi phục SETTLEMENT_002 (Kịch bản kiểm tra thanh toán số dư & khiếu nại)
    UPDATE INVOICE
    SET PaidAmount = 0.00, PaymentStatus = 'UNPAID'
    WHERE InvoiceID = 'INVOICE_004';

    UPDATE TRIP_SETTLEMENT
    SET Status = 'AWAITING_PAYMENT',
        HandoverRevisionID = 'HANDOVER_REVISION_002',
        FinalInvoiceID = 'INVOICE_004',
        SettledBy = NULL,
        SettledAtUtc = NULL,
        ClosedAtUtc = NULL,
        FeedbackStartedAtUtc = NULL,
        FeedbackEndsAtUtc = NULL
    WHERE SettlementID = 'SETTLEMENT_002';

    UPDATE CUSTOMER_CASE
    SET Status = 'OPEN',
        ResolutionText = NULL,
        HandledBy = NULL,
        HandledAtUtc = NULL,
        ResolvedAtUtc = NULL
    WHERE CaseID = 'CUSTOMER_CASE_001';

    PRINT N'  -> Đã khôi phục SETTLEMENT_002 (AWAITING_PAYMENT, khiếu nại OPEN)';

    -- 2.3 Khôi phục SETTLEMENT_001 (Kịch bản hoàn tất tất toán & đã đóng hồ sơ)
    UPDATE CONTRACT
    SET ContractStatus = 'CLOSED'
    WHERE ContractID = 'CONTRACT_001';

    UPDATE CONTRACT_VERSION
    SET VersionStatus = 'SIGNED',
        ContentSnapshot = N'{"commercial":{"totalPrice":212500000},"contractId":"CONTRACT_001","versionNo":1}'
    WHERE ContractID = 'CONTRACT_001' AND VersionNo = 1;

    UPDATE TRIP_SETTLEMENT
    SET Status = 'CLOSED',
        HandoverRevisionID = 'HANDOVER_REVISION_001',
        FinalInvoiceID = 'INVOICE_002',
        SettledBy = 'USER_004',
        SettledAtUtc = '2026-09-18 10:15:00',
        ClosedAtUtc = '2026-09-19 10:15:00',
        FeedbackStartedAtUtc = '2026-09-18 10:15:00',
        FeedbackEndsAtUtc = '2026-09-19 10:15:00'
    WHERE SettlementID = 'SETTLEMENT_001';

    UPDATE CUSTOMER_FEEDBACK
    SET Rating = 5, Comment = N'Demo feedback only'
    WHERE FeedbackID = 'CUSTOMER_FEEDBACK_001';

    PRINT N'  -> Đã khôi phục SETTLEMENT_001 (CLOSED, feedback 5 sao)';

    -- -------------------------------------------------------------------------
    -- 3. RESET CÁC SEQUENCE CẤP PHÁT ID TỰ TĂNG VỀ GIÁ TRỊ GỐC BAN ĐẦU
    -- -------------------------------------------------------------------------
    ALTER SEQUENCE dbo.[SEQ_HANDOVER_ID] RESTART WITH 6;
    ALTER SEQUENCE dbo.[SEQ_HANDOVER_ITEM_ID] RESTART WITH 6;
    ALTER SEQUENCE dbo.[SEQ_HANDOVER_REVISION_ID] RESTART WITH 3;
    ALTER SEQUENCE dbo.[SEQ_TRIP_SETTLEMENT_ID] RESTART WITH 3;
    ALTER SEQUENCE dbo.[SEQ_SETTLEMENT_ADJUSTMENT_ID] RESTART WITH 1;
    ALTER SEQUENCE dbo.[SEQ_CUSTOMER_CASE_ID] RESTART WITH 2;
    ALTER SEQUENCE dbo.[SEQ_CUSTOMER_FEEDBACK_ID] RESTART WITH 2;
    ALTER SEQUENCE dbo.[SEQ_INVOICE_ID] RESTART WITH 6;
    ALTER SEQUENCE dbo.[SEQ_PAYMENT_ID] RESTART WITH 5;

    PRINT N'  -> Đã reset toàn bộ Sequences về giá trị xuất phát chuẩn:';
    PRINT N'     - SEQ_HANDOVER_ID             -> 6';
    PRINT N'     - SEQ_HANDOVER_ITEM_ID        -> 6';
    PRINT N'     - SEQ_HANDOVER_REVISION_ID    -> 3';
    PRINT N'     - SEQ_TRIP_SETTLEMENT_ID      -> 3';
    PRINT N'     - SEQ_SETTLEMENT_ADJUSTMENT_ID-> 1';
    PRINT N'     - SEQ_CUSTOMER_CASE_ID        -> 2';
    PRINT N'     - SEQ_CUSTOMER_FEEDBACK_ID    -> 2';
    PRINT N'     - SEQ_INVOICE_ID              -> 6';
    PRINT N'     - SEQ_PAYMENT_ID              -> 5';

    -- Bật lại toàn bộ các trigger sau khi hoàn tất reset
    ALTER TABLE HANDOVER_REVISION ENABLE TRIGGER TR_F6_HandoverRevisionImmutable;
    ALTER TABLE SETTLEMENT_ADJUSTMENT ENABLE TRIGGER TR_F6_AdjustmentImmutable;
    ALTER TABLE SETTLEMENT_ADJUSTMENT ENABLE TRIGGER TR_F6_AdjustmentScope;
    ALTER TABLE HANDOVER_ITEM ENABLE TRIGGER TR_F6_HandoverItemsLocked;

    COMMIT TRANSACTION;
    PRINT '=============================================================================';
    PRINT 'RESET THÀNH CÔNG! DỮ LIỆU FLOW 6 ĐÃ SẴN SÀNG CHO TEST E2E.';
    PRINT '=============================================================================';

END TRY
BEGIN CATCH
    -- Đảm bảo luôn bật lại trigger nếu có lỗi xảy ra
    ALTER TABLE HANDOVER_REVISION ENABLE TRIGGER TR_F6_HandoverRevisionImmutable;
    ALTER TABLE SETTLEMENT_ADJUSTMENT ENABLE TRIGGER TR_F6_AdjustmentImmutable;
    ALTER TABLE SETTLEMENT_ADJUSTMENT ENABLE TRIGGER TR_F6_AdjustmentScope;
    ALTER TABLE HANDOVER_ITEM ENABLE TRIGGER TR_F6_HandoverItemsLocked;

    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT '=============================================================================';
    PRINT 'LỖI TRONG QUÁ TRÌNH RESET DỮ LIỆU:';
    PRINT ERROR_MESSAGE();
    PRINT '=============================================================================';
    THROW;
END CATCH;
GO

-- -----------------------------------------------------------------------------
-- 4. BẢNG KIỂM TRA TỔNG QUAN SAU KHI RESET
-- -----------------------------------------------------------------------------
SELECT 'TRIP_SETTLEMENT' AS TableName, SettlementID AS RecordID, TripID, Status FROM TRIP_SETTLEMENT
UNION ALL
SELECT 'CUSTOMER_CASE', CaseID, SettlementID, Status FROM CUSTOMER_CASE
UNION ALL
SELECT 'CUSTOMER_FEEDBACK', FeedbackID, SettlementID, CAST(Rating AS VARCHAR(10)) + ' sao' FROM CUSTOMER_FEEDBACK
UNION ALL
SELECT 'INVOICE', InvoiceID, ContractID, InvoiceType + ' (' + PaymentStatus + ')' FROM INVOICE WHERE InvoiceType = 'FINAL_SETTLEMENT';
GO
