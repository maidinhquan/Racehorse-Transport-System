-- ==================================================================================
-- SCRIPT GIEO DỮ LIỆU TEST E2E FLOW 1 & FLOW 6 (IDEMPOTENT & CHUẨN ĐỊNH DANH ID_NAME_RULE)
-- Dự án: Racehorse Transport System (HorseTransportDB)
-- Quy chuẩn mã: Mọi ID tuân thủ nghiêm ngặt theo RULE/ID_NAME_RULE.md:
--   - REQUEST_801, REQUEST_806 (Khớp regex ^REQUEST_\d{3,}$)
--   - HORSE_801, HORSE_802, HORSE_803 (Khớp regex ^HORSE_\d{3,}$)
--   - TRIP_806 (Khớp regex ^TRIP_\d{3,}$)
--   - CONTRACT_806 (Khớp regex ^CONTRACT_\d{3,}$)
--   - INVOICE_806 (Khớp regex ^INVOICE_\d{3,}$)
--   - PAYMENT_806 (Khớp regex ^PAYMENT_\d{3,}$)
--   - VEHICLE_801, VEHICLE_802 (Khớp regex ^VEHICLE_\d{3,}$)
--   - HEALTH_LOG_801 (Khớp regex ^HEALTH_LOG_\d{3,}$)
-- ==================================================================================

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;
BEGIN TRANSACTION;

BEGIN TRY

    PRINT N'==> BẮT ĐẦU DỌN DẸP BẢN GHI TEST CŨ (NẾU CÓ)...';

    -- 1. Dọn dẹp Flow 6
    DELETE FROM CUSTOMER_FEEDBACK WHERE SettlementID IN (SELECT SettlementID FROM TRIP_SETTLEMENT WHERE SettlementID LIKE '%_80%' OR SettlementID LIKE '%_E2E%');
    DELETE FROM CUSTOMER_CASE WHERE SettlementID IN (SELECT SettlementID FROM TRIP_SETTLEMENT WHERE SettlementID LIKE '%_80%' OR SettlementID LIKE '%_E2E%');
    DELETE FROM SETTLEMENT_ADJUSTMENT WHERE SettlementID IN (SELECT SettlementID FROM TRIP_SETTLEMENT WHERE SettlementID LIKE '%_80%' OR SettlementID LIKE '%_E2E%');
    DELETE FROM TRIP_SETTLEMENT WHERE SettlementID LIKE '%_80%' OR SettlementID LIKE '%_E2E%';
    
    DELETE FROM HANDOVER_ITEM WHERE HandoverID LIKE '%_80%' OR HandoverID LIKE '%_E2E%';
    DELETE FROM HANDOVER_REVISION WHERE HandoverID LIKE '%_80%' OR HandoverID LIKE '%_E2E%';
    DELETE FROM HANDOVER WHERE HandoverID LIKE '%_80%' OR HandoverID LIKE '%_E2E%';

    -- 2. Dọn dẹp Trip, Milestone, Route, Health, Vehicle Assignment
    DELETE FROM TRIP_MILESTONE WHERE TripID IN ('TRIP_806') OR TripID LIKE '%_E2E%';
    DELETE FROM ROUTE_SEGMENT WHERE TripID IN ('TRIP_806') OR TripID LIKE '%_E2E%';
    DELETE FROM HEALTH_LOG WHERE TripID IN ('TRIP_806') OR TripID LIKE '%_E2E%';
    DELETE FROM TRIP_VEHICLE_ASSIGNMENT WHERE TripID IN ('TRIP_806') OR TripID LIKE '%_E2E%';
    
    -- 3. Dọn dẹp Payment, Invoice, Contract
    DELETE FROM PAYMENT WHERE PaymentID IN ('PAYMENT_806') OR PaymentID LIKE '%_E2E%';
    DELETE FROM INVOICE WHERE InvoiceID IN ('INVOICE_806') OR InvoiceID LIKE '%_E2E%';
    UPDATE CONTRACT SET CurrentVersionNo = NULL WHERE ContractID IN ('CONTRACT_806') OR ContractID LIKE '%_E2E%';
    DELETE FROM CONTRACT_VERSION WHERE ContractID IN ('CONTRACT_806') OR ContractID LIKE '%_E2E%';
    DELETE FROM CONTRACT WHERE ContractID IN ('CONTRACT_806') OR ContractID LIKE '%_E2E%';
    DELETE FROM TRIP_PLAN WHERE TripID IN ('TRIP_806') OR TripID LIKE '%_E2E%';

    -- 4. Dọn dẹp Request, Review, Checklist, Mapping
    DELETE FROM REQUEST_SCHEDULE_OPTION WHERE ReviewID IN (SELECT ReviewID FROM REQUEST_REVIEW WHERE RequestID IN ('REQUEST_801', 'REQUEST_806') OR RequestID LIKE '%_E2E%');
    DELETE FROM REQUEST_REVIEW WHERE RequestID IN ('REQUEST_801', 'REQUEST_806') OR RequestID LIKE '%_E2E%';
    DELETE FROM LEGAL_MEDICAL_RECORD WHERE RequestID IN ('REQUEST_801', 'REQUEST_806') OR RequestID LIKE '%_E2E%';
    DELETE FROM REQUEST_HORSE_MAPPING WHERE RequestID IN ('REQUEST_801', 'REQUEST_806') OR RequestID LIKE '%_E2E%';
    DELETE FROM TRANSPORT_REQUEST WHERE RequestID IN ('REQUEST_801', 'REQUEST_806') OR RequestID LIKE '%_E2E%';

    -- 5. Dọn dẹp Ngựa, Xe, Chuyến bay, Đối tác
    DELETE FROM HORSE WHERE HorseID IN ('HORSE_801', 'HORSE_802', 'HORSE_803') OR HorseID LIKE 'HORSE_E2E_%';
    DELETE FROM VEHICLE WHERE VehicleID IN ('VEHICLE_801', 'VEHICLE_802') OR VehicleID LIKE 'VEHICLE_E2E_%';
    DELETE FROM FLIGHT_CATALOG WHERE ServiceID IN ('FLIGHT_801', 'FLIGHT_802') OR ServiceID LIKE 'FLIGHT_E2E_%';
    DELETE FROM AIR_PARTNER WHERE PartnerID IN ('PARTNER_801') OR PartnerID LIKE 'PARTNER_E2E_%';

    PRINT N'==> DỌN DẸP DỮ LIỆU CŨ THÀNH CÔNG.';

    -- ==================================================================================
    -- PHẦN 1: GIEO TÀI NGUYÊN DÙNG CHUNG (XE & CHUYẾN BAY CHO ĐIỀU PHỐI VIÊN THẨM ĐỊNH)
    -- ==================================================================================
    PRINT N'==> 1. TẠO TÀI NGUYÊN XE VÀ CHUYẾN BAY...';

    -- Xe 1: Tại Việt Nam (VN), Sẵn sàng, 4 ô
    INSERT INTO VEHICLE (VehicleID, Type, PlateNumber, OperatingCountry, Status, CapacityStalls)
    VALUES ('VEHICLE_801', 'ROAD', '29B-99888', 'VN', 'READY', 4);

    -- Xe 2: Tại Nhật Bản (JP), Sẵn sàng, 4 ô
    INSERT INTO VEHICLE (VehicleID, Type, PlateNumber, OperatingCountry, Status, CapacityStalls)
    VALUES ('VEHICLE_802', 'ROAD', 'JP-77665', 'JP', 'READY', 4);

    -- Đối tác Hàng không
    INSERT INTO AIR_PARTNER (PartnerID, PartnerName, CountryCode, ContactEmail, ContactPhone, Status)
    VALUES ('PARTNER_801', N'Vietnam Airlines Cargo Logistics', 'VN', 'cargo@vietnamairlines.com', '+842438320320', 'ACTIVE');

    -- Chuyến bay 1: SGN -> NRT (Bay hằng ngày, quanh năm, 6 ngựa)
    INSERT INTO FLIGHT_CATALOG (ServiceID, PartnerID, ProviderFlightCode, Airline, OriginAirportPlaceId, DestAirportPlaceId, DepartureTime, ArrivalTime, DepartureDate, ArrivalDate, DepartureTimeZone, ArrivalTimeZone, PriceVND, CapacityHorses, CareProvider, DirectFlight, IsActive)
    VALUES ('FLIGHT_801', 'PARTNER_801', 'VN300', 'Vietnam Airlines Cargo', 'SGN', 'NRT', '08:00', '16:00', NULL, NULL, 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 85000000.00, 6, 'AIRLINE', 1, 1);

    -- Chuyến bay 2: HAN -> NRT (Lịch cố định ngày 21/11/2026, 4 ngựa)
    INSERT INTO FLIGHT_CATALOG (ServiceID, PartnerID, ProviderFlightCode, Airline, OriginAirportPlaceId, DestAirportPlaceId, DepartureTime, ArrivalTime, DepartureDate, ArrivalDate, DepartureTimeZone, ArrivalTimeZone, PriceVND, CapacityHorses, CareProvider, DirectFlight, IsActive)
    VALUES ('FLIGHT_802', 'PARTNER_801', 'JL752', 'Japan Airlines', 'HAN', 'NRT', '23:30', '06:30', '2026-11-21', '2026-11-22', 'Asia/Ha_Noi', 'Asia/Tokyo', 92000000.00, 4, 'AIRLINE', 1, 1);

    -- ==================================================================================
    -- PHẦN 2: BỘ DỮ LIỆU CHO FLOW 1 (TẠO ĐƠN & THẨM ĐỊNH & HỢP ĐỒNG & THANH TOÁN)
    -- ==================================================================================
    PRINT N'==> 2. TẠO DỮ LIỆU CHO FLOW 1...';

    -- Ngựa A (HORSE_801): Hoàn toàn rảnh rỗi (Selectable = true) để tự test Tạo đơn từ A -> Z trên Web UI!
    INSERT INTO HORSE (
        HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB,
        PhotoUrl, PassportScanUrl, OwnershipCertificateFileUrl, ValuationDocumentFileUrl, DeclaredValueVnd,
        SpecialHealthNotes, PassportIssuedBy, PassportIssuedDate, PassportExpiryDate
    )
    VALUES (
        'HORSE_801', 'USER_001', '981098109999801', 'VN_FEI_801', N'Chiến Thần Đỏ (Red Champion)', N'Thoroughbred',
        'STALLION', 'INTACT', 525.00, '2020-05-15',
        'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png',
        'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf',
        'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png',
        'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf',
        500000000.00, N'Ngựa đua chuyên nghiệp, thể trạng hoàn hảo.', N'Hiệp hội Ngựa Thể thao Việt Nam',
        '2021-01-01', '2030-01-01'
    );

    -- Ngựa B (HORSE_802): Gắn vào đơn REQUEST_801 (chờ thẩm định sẵn)
    INSERT INTO HORSE (
        HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB,
        PhotoUrl, PassportScanUrl, OwnershipCertificateFileUrl, ValuationDocumentFileUrl, DeclaredValueVnd,
        SpecialHealthNotes, PassportIssuedBy, PassportIssuedDate, PassportExpiryDate
    )
    VALUES (
        'HORSE_802', 'USER_001', '981098109999802', 'VN_FEI_802', N'Bạch Long Mã (White Pearl)', N'Arabian',
        'MARE', 'NOT_PREGNANT', 495.00, '2021-08-20',
        'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png',
        'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf',
        'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png',
        'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf',
        450000000.00, N'Dịu dàng, phản xạ thính giác tốt.', N'Hiệp hội Ngựa Thể thao Việt Nam',
        '2021-01-01', '2030-01-01'
    );

    -- Đơn hàng REQUEST_801: Trạng thái PENDING_REVIEW (sẵn sàng để Manager phân công và Điều phối/Chuyên viên thẩm định)
    INSERT INTO TRANSPORT_REQUEST (
        RequestID, CustomerID, Departure, Destination, Purpose, TransportType,
        CreatedAtUtc, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, DesignatedReceiverEmail,
        BaseCost, Status, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude,
        DistanceKm, PickupContactName, PickupContactPhone, OriginCountry, DestinationCountry,
        PreparationDays, DeclaredValueVnd
    )
    VALUES (
        'REQUEST_801', 'USER_001',
        N'Đường S2, Phường Tây Thạnh, Thành phố Hồ Chí Minh, 72009, Việt Nam',
        N'Tokyo Racecourse, Fuchu, Tokyo, Japan',
        N'Tham dự giải đua Tokyo Autumn Cup', 'AIR',
        SYSUTCDATETIME(), '2026-11-21 08:00:00', '2026-11-23 18:00:00',
        N'Yuki Tanaka', '+81312345678', 'yuki.tanaka@tokyorace.jp', 125000000.00, 'PENDING_REVIEW',
        10.806500, 106.628500, 35.666000, 139.485000,
        4350.00, N'Nguyễn Văn A', '+84901234567', 'VN', 'JP',
        2, 450000000.00
    );

    INSERT INTO REQUEST_HORSE_MAPPING (RequestID, HorseID, CareInstructions)
    VALUES ('REQUEST_801', 'HORSE_802', N'Cho uống nước điện giải trước khi lên máy bay.');

    -- Hồ sơ y tế kèm theo cho HORSE_802
    INSERT INTO LEGAL_MEDICAL_RECORD (RecordID, HorseID, RequestID, DocumentType, RequirementStatus, DocumentStatus, UploadedFileUrl)
    VALUES ('RECORD_801', 'HORSE_802', 'REQUEST_801', 'PASSPORT', 'VALID', 'VERIFIED', 'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf');

    INSERT INTO LEGAL_MEDICAL_RECORD (RecordID, HorseID, RequestID, DocumentType, RequirementStatus, DocumentStatus, UploadedFileUrl)
    VALUES ('RECORD_802', 'HORSE_802', 'REQUEST_801', 'HEALTH_CERTIFICATE', 'VALID', 'PENDING', 'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf');

    -- ==================================================================================
    -- PHẦN 3: BỘ DỮ LIỆU CHO FLOW 6 (ĐÃ ĐẾN NƠI -> SẴN SÀNG BÀN GIAO, TẤT TOÁN, PHẢN HỒI)
    -- ==================================================================================
    PRINT N'==> 3. TẠO DỮ LIỆU CHO FLOW 6 (TRIP IN_TRANSIT ĐÃ ĐẾN ĐÍCH)...';

    -- Ngựa C (HORSE_803): Gắn vào chuyến xe Flow 6
    INSERT INTO HORSE (
        HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB,
        PhotoUrl, PassportScanUrl, OwnershipCertificateFileUrl, ValuationDocumentFileUrl, DeclaredValueVnd,
        SpecialHealthNotes, PassportIssuedBy, PassportIssuedDate, PassportExpiryDate
    )
    VALUES (
        'HORSE_803', 'USER_001', '981098109999803', 'VN_FEI_803', N'Hắc Báo (Black Panther)', N'Thoroughbred',
        'GELDING', 'GELDED', 510.00, '2019-10-10',
        'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png',
        'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf',
        'private/e57ef0f3ee1e1213dfcdf70f412cf923a17972590b0e8e9a730b829c04437ae3.png',
        'private/7f8f1e6c21f9e89ecb8b6f445e5eb2538ff6e42be497b8930a0be9beebdfe090.pdf',
        600000000.00, N'Thể lực sung mãn, tiền sử kiểm dịch sạch sẽ.', N'Hiệp hội Ngựa Thể thao Việt Nam',
        '2020-01-01', '2030-01-01'
    );

    -- Đơn hàng REQUEST_806: Đang thực hiện (IN_PROGRESS)
    INSERT INTO TRANSPORT_REQUEST (
        RequestID, CustomerID, Departure, Destination, Purpose, TransportType,
        CreatedAtUtc, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, DesignatedReceiverEmail,
        BaseCost, Status, PickupLatitude, PickupLongitude, DeliveryLatitude, DeliveryLongitude,
        DistanceKm, PickupContactName, PickupContactPhone, OriginCountry, DestinationCountry,
        PreparationDays, DeclaredValueVnd
    )
    VALUES (
        'REQUEST_806', 'USER_001',
        N'Trại ngựa Sóc Sơn, Hà Nội, Việt Nam',
        N'Trại ngựa Phú Thọ, Quận 11, TP. Hồ Chí Minh, Việt Nam',
        N'Vận chuyển thi đấu giải Quốc gia', 'ROAD',
        DATEADD(day, -5, SYSUTCDATETIME()), DATEADD(day, -3, SYSUTCDATETIME()), DATEADD(day, -1, SYSUTCDATETIME()),
        N'Nguyễn Quang Trường', '0901234567', 'quangtruong1922@gmail.com', 100000000.00, 'IN_PROGRESS',
        21.280000, 105.850000, 10.768000, 106.654000,
        1720.00, N'Nguyễn Văn A', '+84901234567', 'VN', 'VN',
        2, 600000000.00
    );

    INSERT INTO REQUEST_HORSE_MAPPING (RequestID, HorseID, CareInstructions)
    VALUES ('REQUEST_806', 'HORSE_803', N'Giao dây dắt kèm theo ngựa.');

    -- Chuyến xe TRIP_806: IN_TRANSIT, Phân công đầy đủ
    INSERT INTO TRIP_PLAN (
        TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status,
        DeploymentStatus, DeploymentReason, DeploymentBy, DeploymentAtUtc, HandoffEventId,
        AssignedSpecialistId, AssignedCoordinatorId
    )
    VALUES (
        'TRIP_806', 'REQUEST_806', 1720.00, 36.00, 100000000.00, 'IN_TRANSIT',
        'CONFIRMED', N'Đã hoàn thành toàn bộ hành trình; xe đã cập bến đích, sẵn sàng bàn giao.',
        'USER_004', DATEADD(day, -4, SYSUTCDATETIME()), 'HANDOFF_EVENT_806',
        'USER_005', 'USER_006'
    );

    -- Phân công Tài xế USER_007 (Hoàng Hùng) & Bác sĩ áp tải USER_009 (BS. Đỗ Hoa)
    INSERT INTO TRIP_VEHICLE_ASSIGNMENT (AssignmentID, TripID, VehicleID, DriverID, EscortID)
    VALUES ('TRIP_ASSIGNMENT_806', 'TRIP_806', 'VEHICLE_801', 'USER_007', 'USER_009');

    -- Chặng lộ trình: Điểm nhận đã xong, Điểm giao DESTINATION đã COMPLETED và có ActualTime (Đủ điều kiện kích hoạt Flow 6!)
    INSERT INTO ROUTE_SEGMENT (SegmentID, TripID, SequenceOrder, FacilityID, LocationName, SegmentType, TransportMode, PlannedTime, ActualTime, Status)
    VALUES ('ROUTE_SEGMENT_801', 'TRIP_806', 1, NULL, N'Xuất phát từ Hà Nội', 'PICKUP', 'ROAD', DATEADD(day, -3, SYSUTCDATETIME()), DATEADD(day, -3, SYSUTCDATETIME()), 'COMPLETED');

    INSERT INTO ROUTE_SEGMENT (SegmentID, TripID, SequenceOrder, FacilityID, LocationName, SegmentType, TransportMode, PlannedTime, ActualTime, Status)
    VALUES ('ROUTE_SEGMENT_802', 'TRIP_806', 2, NULL, N'Đến Trại Phú Thọ TP.HCM', 'DESTINATION', 'ROAD', DATEADD(day, -1, SYSUTCDATETIME()), SYSUTCDATETIME(), 'COMPLETED');

    -- Mốc hành trình FINAL_ARRIVED đã COMPLETED
    INSERT INTO TRIP_MILESTONE (MilestoneID, TripID, Leg, MilestoneKind, SequenceOrder, Label, Status, PlannedTime, OccurredAt, RecordedAt, RecordedBy, Revision, RequiresHealthCheck)
    VALUES ('MILESTONE_801', 'TRIP_806', 'road', 'FINAL_ARRIVED', 1, N'Đã đến điểm giao TP.HCM', 'COMPLETED', DATEADD(day, -1, SYSUTCDATETIME()), SYSUTCDATETIME(), SYSUTCDATETIME(), 'USER_007', 1, 0);

    -- Nhật ký sức khỏe lúc kết thúc chuyến
    INSERT INTO HEALTH_LOG (LogID, TripID, HorseID, EscortID, LogType, LogTime, Temperature, HeartRate, HealthStatus, Description, MediaUrl)
    VALUES ('HEALTH_LOG_801', 'TRIP_806', 'HORSE_803', 'USER_009', 'OBSERVATION', SYSUTCDATETIME(), 38.0, 38, N'Tốt', N'Khám sức khỏe khi xe đến điểm giao: ngựa tỉnh táo, không chấn thương.', 'https://storage.cbntransport.com/logs/e2e.jpg');

    -- Hợp đồng CONTRACT_806: EFFECTIVE, Đã ký, Giá 100.000.000 VND, Cọc 40% = 40.000.000 VND
    -- Bước 1: Tạo CONTRACT với CurrentVersionNo = NULL để tránh xung đột FK vòng với CONTRACT_VERSION
    INSERT INTO CONTRACT (
        ContractID, TripID, RequestID, CustomerID, CurrencyCode, TotalQuotedPrice, DepositRateStandard,
        DepositAmount, ContractStatus, SignedAt, SignerEmail, CurrentVersionNo, PublishedAtUtc, PublishedBy, CompletionDeadline, PdfUrl
    )
    VALUES (
        'CONTRACT_806', 'TRIP_806', 'REQUEST_806', 'USER_001', 'VND', 100000000.00, 40.00,
        40000000.00, 'EFFECTIVE', DATEADD(day, -4, SYSUTCDATETIME()), 'vana.horse@gmail.com',
        NULL, DATEADD(day, -5, SYSUTCDATETIME()), 'USER_004', DATEADD(day, 10, SYSUTCDATETIME()),
        'private/demo/contract_806.pdf'
    );

    -- Bước 2: Tạo CONTRACT_VERSION (v1) đã ký
    INSERT INTO CONTRACT_VERSION (
        ContractID, VersionNo, VersionStatus, ContentSnapshot, PdfUrl,
        CreatedBy, CreatedAtUtc, PublishedBy, PublishedAtUtc, TermsAcceptedAtUtc, SignedAtUtc, SignerEmail
    )
    VALUES (
        'CONTRACT_806', 1, 'SIGNED',
        N'{"commercial":{"totalPrice":100000000,"depositPercent":40,"depositAmount":40000000},"scope":{"origin":"Hà Nội","destination":"TP.HCM"}}',
        N'private/demo/contract_806.pdf', 'USER_004', DATEADD(day, -5, SYSUTCDATETIME()),
        'USER_004', DATEADD(day, -5, SYSUTCDATETIME()), DATEADD(day, -4, SYSUTCDATETIME()),
        DATEADD(day, -4, SYSUTCDATETIME()), 'vana.horse@gmail.com'
    );

    -- Bước 3: Cập nhật CurrentVersionNo = 1
    UPDATE CONTRACT
    SET CurrentVersionNo = 1
    WHERE ContractID = 'CONTRACT_806';

    -- Hóa đơn tiền cọc đã PAID
    INSERT INTO INVOICE (
        InvoiceID, ContractID, ContractVersionNo, InvoiceType, CurrencyCode,
        TotalPayableAmount, PaidAmount, DueDate, PaymentStatus
    )
    VALUES (
        'INVOICE_806', 'CONTRACT_806', 1, 'DEPOSIT', 'VND',
        40000000.00, 40000000.00, DATEADD(day, -4, SYSUTCDATETIME()), 'PAID'
    );

    -- Giao dịch thanh toán cọc VNPAY thành công (SUCCESS)
    INSERT INTO PAYMENT (
        PaymentID, InvoiceID, CurrencyCode, Amount, Method, Status, PaymentDate, TransactionCode
    )
    VALUES (
        'PAYMENT_806', 'INVOICE_806', 'VND', 40000000.00,
        'VNPAY', 'SUCCESS', DATEADD(day, -4, SYSUTCDATETIME()), 'VNPAY_REF_806'
    );

    PRINT N'==> GIEO DỮ LIỆU E2E FLOW 1 & FLOW 6 HOÀN TẤT THÀNH CÔNG!';

    COMMIT TRANSACTION;

    PRINT N'';
    PRINT N'==================================================================================';
    PRINT N'TÓM TẮT DỮ LIỆU ĐÃ TẠO SẴN:';
    PRINT N'1. FLOW 1:';
    PRINT N'   - Ngựa mới hoàn toàn rảnh: HORSE_801 (Dùng để tự tạo đơn mới từ A -> Z)';
    PRINT N'   - Đơn mẫu chờ phân công: REQUEST_801 (Ngựa HORSE_802, tuyến SGN -> NRT, AIR)';
    PRINT N'   - Xe sẵn sàng: VEHICLE_801 (VN), VEHICLE_802 (JP)';
    PRINT N'   - Chuyến bay sẵn sàng: FLIGHT_801 (SGN -> NRT hằng ngày), FLIGHT_802 (HAN -> NRT)';
    PRINT N'';
    PRINT N'2. FLOW 6:';
    PRINT N'   - Chuyến xe sẵn sàng bàn giao: TRIP_806 (Request REQUEST_806, Hợp đồng CONTRACT_806)';
    PRINT N'   - Tài xế chính: USER_007 (Hoàng Hùng) - Mật khẩu: Password123!';
    PRINT N'   - Bác sĩ áp tải: USER_009 (BS. Đỗ Hoa)';
    PRINT N'   - Khách hàng: USER_001 (Nguyễn Văn A)';
    PRINT N'   - Quản lý: USER_004 (Trần Thị Linh)';
    PRINT N'   - Trạng thái chuyến: IN_TRANSIT, Đã đến điểm đích TP.HCM (DESTINATION completed)';
    PRINT N'   - Tiền cọc: Đã nộp 40.000.000 VND / 100.000.000 VND (Số dư còn lại khi tất toán: 60.000.000 VND)';
    PRINT N'==================================================================================';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT N'LỖI KHI THỰC THI SCRIPT: ' + ERROR_MESSAGE();
    THROW;
END CATCH;
