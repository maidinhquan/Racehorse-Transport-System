-- =============================================================================
-- MODULE 08: DỮ LIỆU MẪU KIỂM THỬ (SEED DATA / MOCK DATA)
-- Phân vùng: Dữ liệu mẫu hoàn chỉnh cho tất cả các luồng Flow 1 đến Flow 6
-- =============================================================================
USE HorseTransportDB;
GO

-- =============================================================================
-- PHÂN VÙNG 1: QUẢN TRỊ NGƯỜI DÙNG, TÀI SẢN & PHÁP LÝ HỆ THỐNG
-- =============================================================================

-- 1. Bảng USER: Đầy đủ các Actor theo phân quyền (có cả tài khoản hoạt động và bị khóa)
INSERT INTO [USER] (UserID, Username, PasswordHash, Role, FullName, Email, Phone, ForgotPasswordRequest, ResetPasswordRequest, IsActive) VALUES
('USR_CUST_01', 'nguyenvana',     'HASH_SECURE_01', 'Customer',   N'Nguyễn Văn A (CLB Hà Nội)',         'vana.horse@gmail.com',        '0901234567', NULL, NULL, 1),
('USR_CUST_02', 'tranvanb',      'HASH_SECURE_02', 'Customer',   N'Trần Văn B (Trang trại Sài Gòn)',   'tranb.racing@gmail.com',      '0908889999', NULL, NULL, 1),
('USR_CUST_03', 'lethic_locked', 'HASH_SECURE_03', 'Customer',   N'Lê Thị C (Khách vi phạm)',          'lethic.locked@gmail.com',     '0911223344', NULL, NULL, 0),
('USR_MGR_01',  'manager_linh',  'HASH_SECURE_04', 'Manager',    N'Trần Thị Linh (Logistics Manager)', 'linh.manager@cbntransport.com','0912345678', NULL, NULL, 1),
('USR_SPEC_01', 'spec_tuan',     'HASH_SECURE_05', 'Specialist', N'Lê Tuấn (Thẩm định pháp lý/thú y)', 'tuan.specialist@cbntransport.com','0923456789', NULL, NULL, 1),
('USR_COORD_01','coord_hai',     'HASH_SECURE_06', 'Coordinator',N'Phạm Hải (Điều phối xe & tuyến)',   'hai.coord@cbntransport.com',  '0934567890', NULL, NULL, 1),
('USR_DRV_01',  'driver_hung',   'HASH_SECURE_07', 'Driver',     N'Hoàng Hùng (Tài xế quốc tế 1)',     'hung.driver@cbntransport.com','0945678901', NULL, NULL, 1),
('USR_DRV_02',  'driver_thanh',  'HASH_SECURE_08', 'Driver',     N'Vũ Thành (Tài xế quốc tế 2)',       'thanh.driver@cbntransport.com','0946789012', NULL, NULL, 1),
('USR_ESC_01',  'escort_hoa',    'HASH_SECURE_09', 'Escort',     N'BS. Đỗ Hoa (Bác sĩ thú y áp tải)', 'hoa.escort@cbntransport.com', '0956789012', NULL, NULL, 1),
('USR_ESC_02',  'escort_nam',    'HASH_SECURE_10', 'Escort',     N'BS. Phan Nam (Kỹ thuật viên ngựa)',  'nam.escort@cbntransport.com', '0957890123', NULL, NULL, 1),
('USR_DRV_JP_01','driver_kenji', 'HASH_SECURE_11', 'Driver',     N'Kenji Sato (Tài xế quốc tế Tokyo)', 'kenji.driver@cbntransport.jp', '0981112233', NULL, NULL, 1),
('USR_DRV_JP_02','driver_daiki', 'HASH_SECURE_12', 'Driver',     N'Daiki Tanaka (Phụ lái Nhật Bản)',   'daiki.driver@cbntransport.jp', '0982223344', NULL, NULL, 1),
('USR_ESC_JP_01','vet_yumi',     'HASH_SECURE_13', 'Escort',     N'BS. Yumi Mori (Bác sĩ thú y Tokyo)','yumi.vet@cbntransport.jp',     '0983334455', NULL, NULL, 1);
GO

-- 2. Bảng HORSE: Đa dạng cá thể (Ngựa đực Stallion, Ngựa cái Mare, Ngựa thiến Gelding)
INSERT INTO HORSE (HorseID, OwnerID, Microchip_ISO, FEI_Passport_No, Name, Breed, Sex, ReproductiveStatus, Weight, DOB) VALUES
('HRS_001', 'USR_CUST_01', '981098102938475', 'VN_FEI_2026_01', N'Tia Chớp Đỏ (Red Lightning)', N'Thoroughbred', 'Stallion', 'Intact',       520.50, '2020-04-15'),
('HRS_002', 'USR_CUST_01', '981098102938476', 'VN_FEI_2026_02', N'Bão Táp Xanh (Blue Storm)',   N'Arabian',      'Mare',     'Non-Pregnant', 485.00, '2021-06-20'),
('HRS_003', 'USR_CUST_02', '981098102938477', 'VN_FEI_2026_03', N'Bạch Mã Hoàng Tử (Prince)',  N'Thoroughbred', 'Gelding',  'Gelded',       540.00, '2019-09-10'),
('HRS_004', 'USR_CUST_02', '981098102938478', 'VN_FEI_2026_04', N'Nữ Hoàng Cát (Desert Queen)', N'Warmblood',    'Mare',     'Pregnant',     510.00, '2020-11-05'),
('HRS_005', 'USR_CUST_03', '981098102938479', 'VN_FEI_2026_05', N'Chiến Binh Đen (Black Knight)',N'Friesian',    'Stallion', 'Intact',       560.00, '2018-03-12');
GO

-- 3. Bảng STAFF_DOCUMENT: Giấy phép, Hộ chiếu, Visa nhân sự (Có hồ sơ hợp lệ và hồ sơ sắp hết hạn)
INSERT INTO STAFF_DOCUMENT (DocumentID, UserID, DocType, CountryOfIssue, ValidForCountries, IssueDate, ExpiryDate, DocumentUrl, Status) VALUES
('DOC_STF_01', 'USR_DRV_01', 'PASSPORT',        'VNM', 'LAO, THA, KHM', '2023-01-10', '2033-01-10', 'https://storage.cbntransport.com/docs/pass_hung.pdf', 'VALID'),
('DOC_STF_02', 'USR_DRV_01', 'DRIVING_LICENSE', 'VNM', 'VNM, LAO',      '2022-05-15', '2027-05-15', 'https://storage.cbntransport.com/docs/lic_hung.pdf',  'VALID'),
('DOC_STF_03', 'USR_ESC_01', 'PASSPORT',        'VNM', 'LAO, THA',      '2024-02-01', '2034-02-01', 'https://storage.cbntransport.com/docs/pass_hoa.pdf',  'VALID'),
('DOC_STF_04', 'USR_DRV_02', 'PASSPORT',        'VNM', 'KHM, THA',      '2022-08-10', '2032-08-10', 'https://storage.cbntransport.com/docs/pass_thanh.pdf', 'VALID'),
('DOC_STF_05', 'USR_ESC_02', 'PASSPORT',        'VNM', 'KHM, LAO',      '2021-03-01', '2026-10-25', 'https://storage.cbntransport.com/docs/pass_nam.pdf',   'EXPIRING_SOON'),
('DOC_STF_06', 'USR_DRV_JP_01', 'DRIVING_LICENSE', 'JPN', 'JPN, VNM',  '2023-04-01', '2028-04-01', 'https://storage.cbntransport.com/docs/lic_kenji.pdf',  'VALID'),
('DOC_STF_07', 'USR_ESC_JP_01', 'PASSPORT',        'JPN', 'JPN, VNM',  '2024-01-15', '2034-01-15', 'https://storage.cbntransport.com/docs/pass_yumi.pdf',   'VALID');
GO

-- 4. Bảng NOTIFICATION: Lịch sử thông báo hệ thống gửi qua App/Email/SMS
INSERT INTO NOTIFICATION (NotificationID, UserID, ReferenceID, Type, Channel, Title, Message, IsRead, SentAt) VALUES
('NOTIF_001', 'USR_CUST_01', 'REQ_2026_001', 'ORDER_STATUS', 'APP_PUSH', N'Yêu cầu vận chuyển được duyệt',   N'Đơn REQ_2026_001 của bạn đã được phê duyệt.', 1, '2026-10-01 08:30:00'),
('NOTIF_002', 'USR_DRV_01',  'TRIP_2026_001', 'TRIP_ASSIGN',  'SMS',      N'Lệnh điều xe mới',                 N'Bạn được phân công làm tài xế chính chuyến TRIP_2026_001.', 1, '2026-10-03 09:00:00'),
('NOTIF_003', 'USR_CUST_02', 'INC_002',       'INCIDENT',     'EMAIL',    N'Cảnh báo sự cố hiện trường',      N'Xe vận chuyển gặp sự cố nổ lốp nhẹ, lộ trình chậm 1h30m.', 1, '2026-10-06 11:00:00'),
('NOTIF_004', 'USR_SPEC_01', 'REC_006',       'DOC_WARNING',  'WEB_ALERT',N'Hồ sơ xét nghiệm bị từ chối',     N'Mã xét nghiệm Coggins của ngựa HRS_005 đã quá 6 tháng.', 0, '2026-10-08 14:00:00');
GO

-- 5. Bảng POLICY_AND_TERM: Quản lý điều khoản và chính sách áp dụng
INSERT INTO POLICY_AND_TERM (PolicyID, PolicyType, Title, Content, Version, EffectiveDate, IsActive, CreatedBy, CreatedAt) VALUES
('POL_001', 'TERMS_OF_SERVICE', N'Điều khoản Vận chuyển Động vật Sống Xuyên Biên giới', N'<p>Quy định chi tiết về quyền bồi thường bảo hiểm, phí lưu chuồng trạm kiểm dịch...</p>', 'v1.0', '2026-01-01', 1, 'USR_MGR_01', '2026-01-01 00:00:00'),
('POL_002', 'TRANSPORT_RULE',   N'Quy chế Dinh dưỡng và Nghỉ ngơi cho Ngựa Đua',         N'<p>Bắt buộc dừng nghỉ mỗi 4-6 giờ đường bộ, cho uống nước bù điện giải định kỳ.</p>',       'v1.1', '2026-03-01', 1, 'USR_SPEC_01','2026-03-01 00:00:00');
GO

-- 6. Bảng CONTRACT_TEMPLATE: Biểu mẫu hợp đồng chuẩn hóa
INSERT INTO CONTRACT_TEMPLATE (TemplateID, TemplateName, LanguageCode, BodyContent, Version, IsActive, CreatedAt) VALUES
('TMPL_001', N'Mẫu Hợp Đồng Vận Tải Ngựa Quốc Tế (Đường Bộ)', 'VI', N'<article>Nội dung mẫu hợp đồng giao nhận ngựa chuyên dụng...</article>', 'v2.0', 1, '2026-01-01 00:00:00'),
('TMPL_002', N'International Racehorse Transport Agreement',   'EN', N'<article>Terms and conditions for cross-border equine transport...</article>', 'v2.0', 1, '2026-01-01 00:00:00');
GO

-- =============================================================================
-- PHÂN VÙNG 2: ĐỐI TÁC & TRẠM DỪNG NGHỈ/Y TẾ (PARTNER & FACILITY)
-- =============================================================================

-- 7. Bảng PARTNER_FACILITY: Các trạm dừng nghỉ, phòng khám thú y đối tác (Place v2)
INSERT INTO PARTNER_FACILITY (FacilityID, Name, FacilityType, Purposes, CountryCode, State_Province, City, Address, Coordinates, Latitude, Longitude, TimeZone, OperatingHours, SupportsOvernight, HasTruckParking, HasLoadingArea, HasStabling, HasWaterFeed, CapacityStalls, ContactPerson, ContactPhone, TaxID_BusinessCode, Status) VALUES
('FAC_001', N'Trạm Kiểm Dịch & Nghỉ Chân Cầu Treo', 'REST_STATION', N'REST,QUARANTINE,BORDER', 'VN', N'Hà Tĩnh',   N'Hương Sơn',   N'Cửa khẩu Quốc tế Cầu Treo, Hà Tĩnh', '18.3976,105.1842', 18.397600, 105.184200, 'UTC+7', '24/7', 1, 1, 1, 1, 1, 8,  N'Lê Văn Bình',   '0988112233', '2801928374', 'ACTIVE'),
('FAC_002', N'Bệnh Viện Thú Y & Kiểm Dịch Vientiane', 'VET_CLINIC', N'REST,QUARANTINE', 'LA', N'Vientiane', N'Vientiane', N'Km 12 Thadeua Road, Vientiane',       '17.9254,102.6645', 17.925400, 102.664500, 'UTC+7', '06:00-22:00', 0, 1, 1, 1, 1, 12, N'Dr. Somchai',   '+8562055667788', 'LA99281726', 'ACTIVE'),
('FAC_003', N'Trạm Dịch Vụ Nghỉ Chân Mộc Bài',      'REST_STATION', N'REST,FUEL,BORDER', 'VN', N'Tây Ninh',  N'Bến Cầu',     N'Khu Kinh tế Cửa khẩu Mộc Bài',       '11.0650,106.1720', 11.065000, 106.172000, 'UTC+7', '24/7', 1, 1, 1, 1, 1, 6,  N'Trần Minh Tâm', '0918776655', '3901827364', 'ACTIVE'),
('FAC_004', N'Trung Tâm Thú Y Hoàng Gia Phnom Penh', 'VET_CLINIC',  N'REST,QUARANTINE', 'KH', N'Phnom Penh',N'Phnom Penh',  N'St. 271, Sangkat Boeung Tumpun',     '11.5560,104.9280', 11.556000, 104.928000, 'UTC+7', '06:00-21:00', 0, 1, 1, 1, 1, 10, N'Dr. Chea Rath', '+85512345678', 'KH88192837', 'ACTIVE'),
('FAC_005', N'Trạm Nghỉ Chuyên Dụng Đà Nẵng',       'REST_STATION', N'REST,FUEL', 'VN', N'Đà Nẵng',   N'Hòa Vang',    N'Km 24 Đường Tránh Nam Hải Vân',      '16.0544,108.2022', 16.054400, 108.202200, 'UTC+7', '24/7', 1, 1, 1, 1, 1, 8,  N'Đặng Quốc Bảo', '0905123123', '0401928381', 'ACTIVE');
GO

-- 8. Bảng FACILITY_CONTRACT: Hợp đồng nguyên tắc biểu phí lưu chuồng và dịch vụ
INSERT INTO FACILITY_CONTRACT (FacilityContractID, FacilityID, ContractCode, ValidFrom, ValidTo, RestFeePerHorse_Day, BasicMedicalCheckFee, DocumentUrl, Status) VALUES
('FC_001', 'FAC_001', 'FC_CAUTREO_2026',   '2026-01-01', '2026-12-31', 45.00, 25.00, 'https://storage.cbntransport.com/contracts/fc_cautreo.pdf',   'ACTIVE'),
('FC_002', 'FAC_002', 'FC_VIENTIANE_2026', '2026-01-01', '2026-12-31', 60.00, 40.00, 'https://storage.cbntransport.com/contracts/fc_vientiane.pdf', 'ACTIVE'),
('FC_003', 'FAC_003', 'FC_MOCBAI_2026',    '2026-01-01', '2026-12-31', 40.00, 20.00, 'https://storage.cbntransport.com/contracts/fc_mocbai.pdf',    'ACTIVE'),
('FC_004', 'FAC_004', 'FC_PHNOMPENH_2026', '2026-01-01', '2026-12-31', 55.00, 35.00, 'https://storage.cbntransport.com/contracts/fc_phnompenh.pdf', 'ACTIVE');
GO

-- 9. Bảng FACILITY_CERTIFICATION: Chứng chỉ tiêu chuẩn vệ sinh thú y của trạm
INSERT INTO FACILITY_CERTIFICATION (CertID, FacilityID, CertName, IssuedBy, CountryOfIssue, IsInternationalStandard, IssueDate, ExpiryDate, DocumentUrl) VALUES
('CERT_001', 'FAC_001', N'Chứng nhận Kiểm dịch Thú y Cửa khẩu', N'Cục Thú Y Việt Nam', 'VN', 1, '2025-01-10', '2027-01-10', 'https://storage.cbntransport.com/certs/cautreo_cert.pdf'),
('CERT_002', 'FAC_002', N'Chứng chỉ Tiêu chuẩn OIE Vientiane',  N'Bộ Nông nghiệp Lào', 'LA', 1, '2024-05-20', '2027-05-20', 'https://storage.cbntransport.com/certs/lao_cert.pdf'),
('CERT_003', 'FAC_004', N'ASEAN Equine Biosecurity Accredited', N'Bộ Nông Lâm Campuchia', 'KH', 1, '2025-03-15', '2028-03-15', 'https://storage.cbntransport.com/certs/kh_cert.pdf');
GO

-- =============================================================================
-- PHÂN VÙNG 3: YÊU CẦU & KIỂM DỊCH PHÁP LÝ (REQUEST & LEGAL)
-- =============================================================================

-- 10. Bảng TRANSPORT_REQUEST: 4 đơn đại diện cho 4 tình huống khác nhau
INSERT INTO TRANSPORT_REQUEST (RequestID, CustomerID, Departure, Destination, Purpose, TransportType, ExpectedDate, CommittedDeadline, DesignatedReceiverName, DesignatedReceiverPhone, BaseCost, Status) VALUES
('REQ_2026_001', 'USR_CUST_01', N'Trang trại Sóc Sơn, Hà Nội', N'CLB Đua Ngựa Hoàng Gia Bangkok, Thái Lan', N'Thi đấu Cúp Hoàng Gia', 'ROAD_CROSS_BORDER', '2026-09-15 06:00:00', '2026-09-18 18:00:00', N'Mr. Kraisak',   '+66812345678', 8500.00, 'COMPLETED'),
('REQ_2026_002', 'USR_CUST_02', N'Trại ngựa Củ Chi, TP.HCM',   N'Trường đua Chroy Changvar, Phnom Penh',   N'Giao lưu huấn luyện',   'ROAD_CROSS_BORDER', '2026-10-05 05:00:00', '2026-10-06 17:00:00', N'Sokha Heng',    '+85598765432', 4200.00, 'COMPLETED_LATE'),
('REQ_2026_003', 'USR_CUST_01', N'Trang trại Sóc Sơn, Hà Nội', N'Trại ngựa Phú Thọ, TP.HCM',             N'Nhân giống thuần chủng', 'ROAD_DOMESTIC',     '2026-10-08 07:00:00', '2026-10-11 20:00:00', N'Nguyễn Hoàng', '0903334455',   5800.00, 'IN_PROGRESS'),
('REQ_2026_004', 'USR_CUST_03', N'Khu huấn luyện Ba Vì, Hà Nội',N'Trường đua Thể thao Singapore',          N'Bán chuyển nhượng',     'MULTIMODAL_INTL',   '2026-10-20 08:00:00', '2026-10-24 16:00:00', N'David Tan',    '+6591112222',  12000.00,'REJECTED');
GO

-- 11. Bảng REQUEST_HORSE_MAPPING: Gán các cá thể ngựa vào từng yêu cầu
INSERT INTO REQUEST_HORSE_MAPPING (RequestHorseID, RequestID, HorseID) VALUES
('RHM_001', 'REQ_2026_001', 'HRS_001'),
('RHM_002', 'REQ_2026_001', 'HRS_002'),
('RHM_003', 'REQ_2026_002', 'HRS_003'),
('RHM_004', 'REQ_2026_003', 'HRS_001'),
('RHM_005', 'REQ_2026_004', 'HRS_005');
GO

-- 12. Bảng LEGAL_MEDICAL_RECORD: Giấy tờ thú y (Đủ điều kiện, Đang chờ duyệt, Bị từ chối do hết hạn)
INSERT INTO LEGAL_MEDICAL_RECORD (RecordID, HorseID, RequestID, VerifiedBy, DocumentType, RequirementStatus, DocumentStatus, UploadedFileUrl, ExpiryDate) VALUES
('REC_001', 'HRS_001', 'REQ_2026_001', 'USR_SPEC_01', 'COGGINS_TEST',   'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/coggins_hrs1.pdf', '2026-12-01'),
('REC_002', 'HRS_001', 'REQ_2026_001', 'USR_SPEC_01', 'EQUINE_FLU_VAX', 'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/flu_hrs1.pdf',     '2027-01-15'),
('REC_003', 'HRS_002', 'REQ_2026_001', 'USR_SPEC_01', 'COGGINS_TEST',   'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/coggins_hrs2.pdf', '2026-12-01'),
('REC_004', 'HRS_003', 'REQ_2026_002', 'USR_SPEC_01', 'COGGINS_TEST',   'MANDATORY', 'VERIFIED', 'https://storage.cbntransport.com/docs/coggins_hrs3.pdf', '2026-11-20'),
('REC_005', 'HRS_001', 'REQ_2026_003', 'USR_SPEC_01', 'DOMESTIC_VET_PASS','MANDATORY','VERIFIED', 'https://storage.cbntransport.com/docs/vet_dom_hrs1.pdf','2027-05-10'),
('REC_006', 'HRS_005', 'REQ_2026_004', 'USR_SPEC_01', 'COGGINS_TEST',   'MANDATORY', 'EXPIRED',  'https://storage.cbntransport.com/docs/coggins_exp_hrs5.pdf','2026-08-01');
GO

-- 13. Bảng QUARANTINE_BOOKING: Đặt lịch cách ly tiền xuất/hậu nhập cảnh
INSERT INTO QUARANTINE_BOOKING (BookingID, RequestID, FacilityID, StationName, Country, ExpectedStartDate, ExpectedEndDate, ConfirmationNumber, Status) VALUES
('QBK_001', 'REQ_2026_001', 'FAC_002', N'Bệnh Viện Thú Y & Kiểm Dịch Vientiane', 'Lào',        '2026-09-16 14:00:00', '2026-09-17 08:00:00', 'CFM_LAO_99881', 'COMPLETED'),
('QBK_002', 'REQ_2026_002', 'FAC_004', N'Trung Tâm Thú Y Hoàng Gia Phnom Penh', 'Campuchia', '2026-10-05 16:00:00', '2026-10-06 08:00:00', 'CFM_KHM_11223', 'COMPLETED');
GO

-- =============================================================================
-- PHÂN VÙNG 4: LỘ TRÌNH, HẢI QUAN & HIỆN TRƯỜNG (OPERATIONS & CUSTOMS)
-- =============================================================================

-- 14. Bảng TRIP_PLAN: Kế hoạch các chuyến đi (bao gồm chuyến chờ duyệt, chuyến bị trả về và chuyến hoàn thành)
INSERT INTO TRIP_PLAN (TripID, RequestID, TotalDistance_km, T_Total_Hours, TotalCost, Status, RejectionReason, ResourcesConfirmedAt, ResourcesConfirmedBy, EarliestDepartureDate, DocumentExpiryDate, SpecialistLegalNote) VALUES
('TRIP_2026_001', 'REQ_2026_001', 1250.00, 36.50, 6200.00, 'COMPLETED',        NULL, '2026-09-14 10:00:00', N'Phạm Hải (Coordinator)', NULL, NULL, NULL),
('TRIP_2026_002', 'REQ_2026_002', 240.00,  8.00,  3100.00, 'COMPLETED',        NULL, '2026-10-04 15:00:00', N'Phạm Hải (Coordinator)', NULL, NULL, NULL),
('TRIP_2026_003', 'REQ_2026_003', 1720.00, 42.00, 4300.00, 'IN_TRANSIT',       NULL, '2026-10-08 09:00:00', N'Phạm Hải (Coordinator)', NULL, NULL, NULL),
('TRIP_2026_004', 'REQ_2026_004', 3200.00, 28.00, 9500.00, 'PENDING_APPROVAL', NULL, '2026-10-18 10:30:00', N'Phạm Hải (Coordinator)', '2026-10-19 06:00:00', '2026-10-24 23:59:59', N'Giấy Coggins test và tiêm phòng Cúm đủ điều kiện từ 19/10, hết hạn ngày 24/10. Lưu ý giờ qua Nội Bài trước 23h ngày 24/10.'),
('TRIP_2026_005', 'REQ_2026_001', 4350.00, 35.00, 14200.00, 'RETURNED',        N'Cần đổi tài xế chặng 1 vì giấy phép sắp hết hạn; điều chỉnh lại thời gian dừng tại sân bay đón', '2026-10-17 14:00:00', N'Phạm Hải (Coordinator)', '2026-10-24 00:00:00', '2026-10-30 23:59:59', N'Hồ sơ xuất cảnh có hiệu lực từ 24/10 đến 30/10.');
GO

-- 15. Bảng VEHICLE: Đội xe chuyên dụng chở ngựa đua (Việt Nam & Quốc tế - Truck Spec v2)
INSERT INTO VEHICLE (VehicleID, Type, CapacityStalls, MaxRange_km, FuelCost_Per_Km, Status, OperatingCountry, PlateNumber, Height_m, Width_m, Length_m, Gross_Weight_Tons, Axle_Weight_Tons) VALUES
('VEH_BOX_01', 'HORSEBOX_3_STALLS', 3, 900.00,  1.20, 'AVAILABLE',   'VN', N'51C-101.45', 3.80, 2.50, 10.00, 18.00, 4.00),
('VEH_BOX_02', 'HORSEBOX_6_STALLS', 6, 1200.00, 1.80, 'ON_TRIP',     'VN', N'51C-202.88', 3.90, 2.55, 12.00, 24.00, 6.00),
('VEH_BOX_03', 'HORSEBOX_2_STALLS', 2, 750.00,  1.00, 'MAINTENANCE', 'VN', N'29B-303.12', 3.40, 2.30,  7.50, 10.00, 3.50),
('VEH_JP_01',  'HORSEBOX_3_STALLS', 3, 1000.00, 2.50, 'AVAILABLE',   'JP', N'品川 300 あ 12-34', 3.80, 2.50, 10.00, 18.00, 4.00),
('VEH_JP_02',  'HORSEBOX_6_STALLS', 6, 1300.00, 3.20, 'AVAILABLE',   'JP', N'成田 500 い 56-78', 3.90, 2.55, 12.00, 24.00, 6.00);
GO

-- 16. Bảng TRIP_VEHICLE_ASSIGNMENT: Phân công xe và kíp lái theo từng chặng độc lập (Chặng 1 & Chặng 2)
INSERT INTO TRIP_VEHICLE_ASSIGNMENT (AssignmentID, TripID, LegNumber, LegType, VehicleID, DriverID, CoDriverID, VeterinarianID, EscortID) VALUES
('TVA_001', 'TRIP_2026_001', 1, 'OUTBOUND', 'VEH_BOX_01', 'USR_DRV_01', 'USR_DRV_02', 'USR_ESC_01', 'USR_ESC_01'),
('TVA_002', 'TRIP_2026_002', 1, 'OUTBOUND', 'VEH_BOX_03', 'USR_DRV_02', 'USR_DRV_01', 'USR_ESC_02', 'USR_ESC_02'),
('TVA_003', 'TRIP_2026_003', 1, 'OUTBOUND', 'VEH_BOX_02', 'USR_DRV_01', 'USR_DRV_02', 'USR_ESC_01', 'USR_ESC_01'),
-- Chuyến TRIP_2026_004: Chặng 1 tại VN & Chặng 2 tại Nhật Bản (2 chặng độc lập, đủ 3 nhân sự mỗi chặng)
('TVA_004', 'TRIP_2026_004', 1, 'OUTBOUND', 'VEH_BOX_01', 'USR_DRV_01', 'USR_DRV_02', 'USR_ESC_01', 'USR_ESC_01'),
('TVA_005', 'TRIP_2026_004', 2, 'INBOUND',  'VEH_JP_01',  'USR_DRV_JP_01', 'USR_DRV_JP_02', 'USR_ESC_JP_01', 'USR_ESC_JP_01'),
-- Chuyến TRIP_2026_005: Chặng 1 tại VN & Chặng 2 tại Nhật Bản
('TVA_006', 'TRIP_2026_005', 1, 'OUTBOUND', 'VEH_BOX_02', 'USR_DRV_02', 'USR_DRV_01', 'USR_ESC_02', 'USR_ESC_02'),
('TVA_007', 'TRIP_2026_005', 2, 'INBOUND',  'VEH_JP_02',  'USR_DRV_JP_01', 'USR_DRV_JP_02', 'USR_ESC_JP_01', 'USR_ESC_JP_01');
GO

-- 17. Bảng FLIGHT_BOOKING: Đặt dịch vụ vận chuyển hàng không mẫu
SET IDENTITY_INSERT FLIGHT_BOOKING ON;
INSERT INTO FLIGHT_BOOKING (FlightBookingID, TripID, BookingVersion, RouteVersionID, ProviderName, Airline, FlightNumber, DepartureAirportCheckpointId, ArrivalAirportCheckpointId, DepartureAt, ArrivalAt, DirectFlight, BookingReference, BookingConfirmed, HorseIds, Note, CreatedAt) VALUES
(300, 'TRIP_2026_001', 1, 120, N'Nippon Cargo Airlines', N'NCA Airlines', 'KZ-102', 101, 201, '2026-11-20 05:00:00', '2026-11-20 11:00:00', 1, 'NCA-SGN-NRT-2026', 1, '["HRS_001","HRS_002"]', N'Chuyến bay thẳng chuyên chở động vật thể thao SGN -> NRT', '2026-10-01 08:00:00');
SET IDENTITY_INSERT FLIGHT_BOOKING OFF;
GO

-- 18. Bảng ROUTE_SEGMENT: Phân đoạn lộ trình của các chuyến đi
INSERT INTO ROUTE_SEGMENT (SegmentID, TripID, SequenceOrder, FacilityID, LocationName, SegmentType, TransportMode, CarrierName, Flight_Voyage_No, PlannedTime, ExpectedETA, ActualTime, Status) VALUES
-- Tuyến 1: Hà Nội -> Bangkok
('SEG_101', 'TRIP_2026_001', 1, 'FAC_001', N'Sóc Sơn -> Cửa khẩu Cầu Treo',       'REST_STOP',       'ROAD', NULL, NULL, '2026-09-15 06:00:00', '2026-09-15 15:00:00', '2026-09-15 14:50:00', 'COMPLETED'),
('SEG_102', 'TRIP_2026_001', 2, 'FAC_002', N'Cầu Treo -> Trạm Thú Y Vientiane',   'QUARANTINE_STOP', 'ROAD', NULL, NULL, '2026-09-16 08:00:00', '2026-09-16 13:00:00', '2026-09-16 13:10:00', 'COMPLETED'),
('SEG_103', 'TRIP_2026_001', 3, NULL,      N'Vientiane -> CLB Hoàng Gia Bangkok', 'DESTINATION',     'ROAD', NULL, NULL, '2026-09-17 07:00:00', '2026-09-17 18:00:00', '2026-09-17 17:30:00', 'COMPLETED'),
-- Tuyến 2: TP.HCM -> Phnom Penh
('SEG_201', 'TRIP_2026_002', 1, 'FAC_003', N'Củ Chi -> Cửa khẩu Mộc Bài',         'BORDER_CHECK',    'ROAD', NULL, NULL, '2026-10-05 05:00:00', '2026-10-05 08:30:00', '2026-10-05 09:15:00', 'COMPLETED'),
('SEG_202', 'TRIP_2026_002', 2, 'FAC_004', N'Mộc Bài -> Trường đua Phnom Penh',   'DESTINATION',     'ROAD', NULL, NULL, '2026-10-05 10:00:00', '2026-10-05 16:00:00', '2026-10-05 18:30:00', 'COMPLETED'),
-- Tuyến 3: Hà Nội -> TP.HCM (Đang chạy, vừa qua trạm Đà Nẵng)
('SEG_301', 'TRIP_2026_003', 1, 'FAC_005', N'Hà Nội -> Trạm Nghỉ Đà Nẵng',       'REST_STOP',       'ROAD', NULL, NULL, '2026-10-08 07:00:00', '2026-10-09 10:00:00', '2026-10-09 10:30:00', 'COMPLETED'),
('SEG_302', 'TRIP_2026_003', 2, NULL,      N'Đà Nẵng -> Trại Phú Thọ TP.HCM',     'DESTINATION',     'ROAD', NULL, NULL, '2026-10-09 14:00:00', '2026-10-11 18:00:00', NULL,                  'IN_PROGRESS'),
-- Tuyến 4 (TRIP_2026_004): Hà Nội -> Tokyo qua Sân bay Nội Bài & Narita (Đa chặng, phù hợp Flow 3)
('SEG_401', 'TRIP_2026_004', 1, NULL,      N'Khu huấn luyện Ba Vì -> Sân bay Nội Bài',  'PICKUP',      'ROAD', NULL, NULL, '2026-10-20 05:00:00', '2026-10-20 07:30:00', NULL,                  'PENDING'),
('SEG_402', 'TRIP_2026_004', 2, NULL,      N'Sân bay Nội Bài -> Sân bay Narita (NRT)',  'AIRPORT',     'AIR',  N'NCA Airlines', 'KZ-102', '2026-10-20 09:30:00', '2026-10-20 16:00:00', NULL, 'PENDING'),
('SEG_403', 'TRIP_2026_004', 3, NULL,      N'Sân bay Narita -> Trường đua Tokyo Fuchu', 'DESTINATION', 'ROAD', NULL, NULL, '2026-10-20 17:30:00', '2026-10-20 20:00:00', NULL,                 'PENDING');
GO

-- 19. Bảng CUSTOMS_CLEARANCE: Thủ tục thông quan biên giới
INSERT INTO CUSTOMS_CLEARANCE (ClearanceID, TripID, SegmentID, BorderCrossingName, CustomsAgentName, DocumentType, DeclarationNumber, Status, ClearedAt) VALUES
('CST_001', 'TRIP_2026_001', 'SEG_101', N'Cửa khẩu Quốc tế Cầu Treo', N'Đại lý HQ Miền Trung', 'ATA_CARNET', 'VN-CARNET-2026-088', 'CLEARED', '2026-09-15 17:00:00'),
('CST_002', 'TRIP_2026_002', 'SEG_201', N'Cửa khẩu Quốc tế Mộc Bài',  N'Đại lý Tân Cảng',       'EXPORT',     'TK-XNK-VN-9928172',   'CLEARED', '2026-10-05 10:30:00');
GO

-- 20. Bảng HEALTH_LOG: Nhật ký sinh hiệu sức khỏe cá thể ngựa (Insert-Only)
INSERT INTO HEALTH_LOG (LogID, TripID, HorseID, EscortID, LogType, LogTime, Temperature, HeartRate, HealthStatus, Description, MediaUrl) VALUES
('LOG_001', 'TRIP_2026_001', 'HRS_001', 'USR_ESC_01', 'TRANSIT_CHECK', '2026-09-15 10:30:00', 38.1, 42, N'Ổn định',       N'Ngựa uống 15L nước, ăn cỏ khô tốt.', 'https://storage.cbntransport.com/logs/log1.jpg'),
('LOG_002', 'TRIP_2026_001', 'HRS_002', 'USR_ESC_01', 'TRANSIT_CHECK', '2026-09-15 10:30:00', 38.2, 44, N'Ổn định',       N'Thể trạng bình thường, mắt lanh lợi.', 'https://storage.cbntransport.com/logs/log2.jpg'),
('LOG_003', 'TRIP_2026_002', 'HRS_003', 'USR_ESC_02', 'TRANSIT_CHECK', '2026-10-05 14:00:00', 39.2, 58, N'Căng thẳng/Sốt',N'Ngựa đổ mồ hôi nhiều lúc qua phà, đã truyền điện giải.', 'https://storage.cbntransport.com/logs/log3.jpg'),
('LOG_004', 'TRIP_2026_003', 'HRS_001', 'USR_ESC_01', 'TRANSIT_CHECK', '2026-10-09 11:00:00', 38.0, 40, N'Rất tốt',      N'Dừng nghỉ tại Đà Nẵng, vận động nhẹ 30 phút.', 'https://storage.cbntransport.com/logs/log4.jpg');
GO

-- 21. Bảng INCIDENT: Sự cố phát sinh khẩn cấp trên đường
INSERT INTO INCIDENT (IncidentID, TripID, ApprovedBy, IncidentType, LocationCoordinates, Description, ImageUrl, AdditionalCost, Status) VALUES
('INC_001', 'TRIP_2026_001', 'USR_MGR_01', 'TIRE_PUNCTURE', '18.4123,105.2011', N'Xe bị thủng lốp sau trên QL8A, thay lốp phụ mất 40 phút.', 'https://storage.cbntransport.com/incidents/tire1.jpg', 80.00,  'RESOLVED'),
('INC_002', 'TRIP_2026_002', 'USR_MGR_01', 'EQUINE_STRESS', '11.2312,105.8821', N'Ngựa HRS_003 bị sốt nhẹ do nắng nóng, phải dừng xe hạ nhiệt mất 1h30m.', 'https://storage.cbntransport.com/incidents/vet2.jpg', 150.00, 'RESOLVED');
GO

-- 22. Bảng HANDOVER: Biên bản tiếp nhận (Pickup) và giao ngựa (Delivery)
INSERT INTO HANDOVER (HandoverID, TripID, HandedByUserID, Type, LocationName, ReceiverName, ReceiverPhone, IsAuthorized, Status) VALUES
('HO_PU_001', 'TRIP_2026_001', 'USR_DRV_01', 'PICKUP',   N'Trang trại Sóc Sơn, Hà Nội', N'Nguyễn Văn A', '0901234567', 1, 'CONFIRMED'),
('HO_DL_001', 'TRIP_2026_001', 'USR_DRV_01', 'DELIVERY', N'CLB Hoàng Gia Bangkok',     N'Mr. Kraisak',   '+66812345678',1, 'CONFIRMED'),
('HO_PU_002', 'TRIP_2026_002', 'USR_DRV_02', 'PICKUP',   N'Trại ngựa Củ Chi, TP.HCM',   N'Trần Văn B',   '0908889999', 1, 'CONFIRMED'),
('HO_DL_002', 'TRIP_2026_002', 'USR_DRV_02', 'DELIVERY', N'Trường đua Phnom Penh',      N'Sokha Heng',    '+85598765432',1, 'CONFIRMED'),
('HO_PU_003', 'TRIP_2026_003', 'USR_DRV_01', 'PICKUP',   N'Trang trại Sóc Sơn, Hà Nội', N'Nguyễn Văn A', '0901234567', 1, 'CONFIRMED');
GO

-- 23. Bảng HANDOVER_ITEM: Đối soát mã chip và thể trạng lúc giao nhận
INSERT INTO HANDOVER_ITEM (HandoverItemID, HandoverID, HorseID, MicrochipVerified, ConditionStatus, AssetCheck, PhotoUrl) VALUES
('HOI_001', 'HO_PU_001', 'HRS_001', 1, N'Khỏe mạnh',    N'01 bộ yên cương, 02 chăn đắp ngựa', 'https://storage.cbntransport.com/ho/pu_hrs1.jpg'),
('HOI_002', 'HO_PU_001', 'HRS_002', 1, N'Khỏe mạnh',    N'01 hộp thuốc dinh dưỡng',           'https://storage.cbntransport.com/ho/pu_hrs2.jpg'),
('HOI_003', 'HO_DL_001', 'HRS_001', 1, N'Thể trạng tốt',N'Bàn giao đầy đủ yên cương và chăn', 'https://storage.cbntransport.com/ho/dl_hrs1.jpg'),
('HOI_004', 'HO_DL_001', 'HRS_002', 1, N'Thể trạng tốt',N'Bàn giao nguyên trạng',             'https://storage.cbntransport.com/ho/dl_hrs2.jpg'),
('HOI_005', 'HO_DL_002', 'HRS_003', 1, N'Mệt mỏi nhẹ',  N'Đã bàn giao thuốc bổ sung',         'https://storage.cbntransport.com/ho/dl_hrs3.jpg');
GO

-- =============================================================================
-- PHÂN VÙNG 5: HỢP ĐỒNG & TÀI CHÍNH ĐA TIỀN TỆ (CONTRACT & BILLING)
-- =============================================================================

-- 24. Bảng CONTRACT: 3 hợp đồng vận chuyển
INSERT INTO CONTRACT (ContractID, TripID, CustomerID, ContractCode, CurrencyCode, ExchangeRateToLocal, TotalQuotedPrice, BaseContractPrice_P, DepositRateStandard, ActualGrossProfit_AGP, SignedAt, ContractStatus) VALUES
('CTR_2026_001', 'TRIP_2026_001', 'USR_CUST_01', 'HD-CBN-2026-001', 'USD', 25450.0000, 8500.00, 8500.00, 0.40, 2300.00, '2026-09-02 14:00:00', 'SETTLED'),
('CTR_2026_002', 'TRIP_2026_002', 'USR_CUST_02', 'HD-CBN-2026-002', 'USD', 25450.0000, 4200.00, 4200.00, 0.40, 950.00,  '2026-09-28 10:00:00', 'SETTLED'),
('CTR_2026_003', 'TRIP_2026_003', 'USR_CUST_01', 'HD-CBN-2026-003', 'VND', 1.0000,     145000000.00, 145000000.00, 0.40, NULL, '2026-10-06 09:30:00', 'EXECUTING');
GO

-- 25. Bảng COST_ITEM: Các mục chi phí dự toán và phát sinh
INSERT INTO COST_ITEM (CostItemID, ContractID, CategoryName, SubcodeName, Bearer, CurrencyCode, TotalMoney, EvidenceUrl) VALUES
('CST_01', 'CTR_2026_001', N'Nhiên liệu',       N'Xăng dầu xe chuyên dụng',      'COMPANY',  'USD', 1500.00, 'https://storage.cbntransport.com/bills/fuel1.pdf'),
('CST_02', 'CTR_2026_001', N'Phí dịch vụ trạm', N'Lưu chuồng cách ly Vientiane', 'CUSTOMER', 'USD', 200.00,  'https://storage.cbntransport.com/bills/vet_lao.pdf'),
('CST_03', 'CTR_2026_001', N'Sự cố phát sinh',  N'Sửa vá lốp khẩn cấp',          'COMPANY',  'USD', 80.00,   'https://storage.cbntransport.com/bills/tire1.jpg'),
('CST_04', 'CTR_2026_002', N'Chi phí thú y',    N'Khám cấp cứu sốt ngựa',        'CUSTOMER', 'USD', 150.00,  'https://storage.cbntransport.com/bills/vet_khm.jpg');
GO

-- 26. Bảng INVOICE: Các đợt hóa đơn (Đã trả xong, Đang nợ, Quá hạn)
INSERT INTO INVOICE (InvoiceID, ContractID, InvoiceType, CurrencyCode, TotalPayableAmount, PaidAmount, DueDate, PaymentStatus) VALUES
-- Hợp đồng 1: Đã thanh toán 100%
('INV_101', 'CTR_2026_001', 'DEPOSIT_40',    'USD', 3400.00, 3400.00, '2026-09-05 23:59:59', 'PAID'),
('INV_102', 'CTR_2026_001', 'FINAL_60',      'USD', 5100.00, 5100.00, '2026-09-20 23:59:59', 'PAID'),
-- Hợp đồng 2: Đợt cọc đã trả, đợt quyết toán còn nợ
('INV_201', 'CTR_2026_002', 'DEPOSIT_40',    'USD', 1680.00, 1680.00, '2026-10-01 23:59:59', 'PAID'),
('INV_202', 'CTR_2026_002', 'FINAL_60_INC',  'USD', 2670.00, 0.00,    '2026-10-10 23:59:59', 'UNPAID'),
-- Hợp đồng 3: Vừa nộp tiền cọc
('INV_301', 'CTR_2026_003', 'DEPOSIT_40',    'VND', 58000000.00, 58000000.00, '2026-10-07 23:59:59', 'PAID');
GO

-- 27. Bảng PAYMENT: Giao dịch đối soát thực tế qua Cổng thanh toán hoặc Chuyển khoản
INSERT INTO PAYMENT (PaymentID, InvoiceID, ConfirmedByUserID, CurrencyCode, Amount, Method, TransactionCode, Status, PaymentDate) VALUES
('PAY_001', 'INV_101', 'USR_MGR_01', 'USD', 3400.00,     'STRIPE_GATEWAY', 'TXN_STRIPE_001829', 'SUCCESS', '2026-09-04 15:30:00'),
('PAY_002', 'INV_102', 'USR_MGR_01', 'USD', 5100.00,     'BANK_TRANSFER',  'TXN_VCB_8829102938', 'SUCCESS', '2026-09-18 10:15:00'),
('PAY_003', 'INV_201', 'USR_MGR_01', 'USD', 1680.00,     'STRIPE_GATEWAY', 'TXN_STRIPE_001994', 'SUCCESS', '2026-09-30 09:20:00'),
('PAY_004', 'INV_301', 'USR_MGR_01', 'VND', 58000000.00, 'VNPAY_GATEWAY',  'VNPAY_20261007_019', 'SUCCESS', '2026-10-07 14:45:00');
GO

-- =============================================================================
-- PHÂN VÙNG 6: DỮ LIỆU MẪU ĐỐI TÁC BAY & LỊCH CHUYẾN BAY (FLOW 3 V2)
-- =============================================================================

-- 28. Bảng AIR_PARTNER: Đối tác vận tải hàng không mẫu (Flow 3 v2)
INSERT INTO AIR_PARTNER (PartnerID, PartnerName, CountryCode, ContactEmail, ContactPhone, Status) VALUES
('PARTNER_NCA', N'Nippon Cargo Airlines', 'JP', 'charter@nca.aero', '+81355551234', 'ACTIVE'),
('PARTNER_KLINE', N'K-Line Air Service', 'JP', 'cargo@kline.co.jp', '+81355555678', 'ACTIVE'),
('PARTNER_VN_CARGO', N'Vietnam Airlines Cargo', 'VN', 'cargo@vietnamairlines.com', '19001100', 'ACTIVE');
GO

-- 29. Bảng FLIGHT_CATALOG: Lịch bay chở ngựa đối tác cung cấp (Flow 3 v2)
INSERT INTO FLIGHT_CATALOG (ServiceID, PartnerID, ProviderFlightCode, Airline, OriginAirportPlaceId, DestAirportPlaceId, DepartureTime, ArrivalTime, DepartureTimeZone, ArrivalTimeZone, PriceVND, CapacityHorses, CareProvider, DirectFlight, IsActive) VALUES
('SVC_NCA_102', 'PARTNER_NCA', 'KZ-102', N'NCA Airlines', 'AP_SGN', 'AP_NRT', '05:00', '11:00', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 125000000.00, 4, 'AIRLINE', 1, 1),
('SVC_NCA_104', 'PARTNER_NCA', 'KZ-104', N'NCA Airlines', 'AP_HAN', 'AP_HND', '08:00', '14:30', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 135000000.00, 4, 'AIRLINE', 1, 1),
('SVC_VNA_801', 'PARTNER_VN_CARGO', 'VN-801', N'Vietnam Airlines', 'AP_SGN', 'AP_NRT', '06:00', '12:15', 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 115000000.00, 2, 'AIRLINE', 1, 1);
GO

