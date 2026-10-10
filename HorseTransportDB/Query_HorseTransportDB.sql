USE HorseTransportDB;
GO

-- -----------------------------------------------------------------------------
-- PHÂN VÙNG 1: QUẢN TRỊ NGƯỜI DÙNG, TÀI SẢN & HỆ THỐNG
-- -----------------------------------------------------------------------------
SELECT * FROM [USER];
SELECT * FROM HORSE;
SELECT * FROM STAFF_DOCUMENT;
SELECT * FROM NOTIFICATION;
SELECT * FROM POLICY_AND_TERM;

-- -----------------------------------------------------------------------------
-- PHÂN VÙNG 2: ĐỐI TÁC & TRẠM DỪNG NGHỈ/Y TẾ
-- -----------------------------------------------------------------------------
SELECT * FROM PARTNER_FACILITY;
SELECT * FROM FACILITY_CONTRACT;
SELECT * FROM FACILITY_CERTIFICATION;

-- -----------------------------------------------------------------------------
-- PHÂN VÙNG 3: YÊU CẦU & KIỂM DỊCH PHÁP LÝ
-- -----------------------------------------------------------------------------
SELECT * FROM TRANSPORT_REQUEST;
SELECT * FROM REQUEST_HORSE_MAPPING;
SELECT * FROM LEGAL_MEDICAL_RECORD;
SELECT * FROM QUARANTINE_BOOKING;

-- -----------------------------------------------------------------------------
-- PHÂN VÙNG 4: LỘ TRÌNH, HẢI QUAN & HIỆN TRƯỜNG
-- -----------------------------------------------------------------------------
SELECT * FROM TRIP_PLAN;
SELECT * FROM VEHICLE;
SELECT * FROM TRIP_VEHICLE_ASSIGNMENT;
SELECT * FROM ROUTE_SEGMENT;
SELECT * FROM CUSTOMS_CLEARANCE;
SELECT * FROM HEALTH_LOG;
SELECT * FROM INCIDENT;
SELECT * FROM HANDOVER;
SELECT * FROM HANDOVER_ITEM;

-- -----------------------------------------------------------------------------
-- PHÂN VÙNG 5: HỢP ĐỒNG & TÀI CHÍNH ĐA TIỀN TỆ
-- -----------------------------------------------------------------------------
SELECT * FROM CONTRACT_TEMPLATE;
SELECT * FROM CONTRACT;
SELECT * FROM COST_ITEM;
SELECT * FROM INVOICE;
SELECT * FROM PAYMENT;
GO