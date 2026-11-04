-- =============================================================================
-- MODULE 02: FLOW 1 - TIẾP NHẬN YÊU CẦU & KHẢO SÁT VẬN CHUYỂN
-- Phân vùng: Yêu cầu của khách hàng và danh sách ngựa tham gia chuyến đi
-- =============================================================================
USE HorseTransportDB;
GO

-- 1. Bảng TRANSPORT_REQUEST: Yêu cầu vận chuyển từ khách hàng
CREATE TABLE TRANSPORT_REQUEST (
    RequestID VARCHAR(50) NOT NULL,
    CustomerID VARCHAR(50) NOT NULL,
    Departure NVARCHAR(255) NOT NULL,
    Destination NVARCHAR(255) NOT NULL,
    Purpose NVARCHAR(100) NULL,
    TransportType VARCHAR(50) NULL,
    ExpectedDate DATETIME NULL,
    CommittedDeadline DATETIME NULL,
    DesignatedReceiverName NVARCHAR(100) NULL,
    DesignatedReceiverPhone VARCHAR(20) NULL,
    BaseCost DECIMAL(12, 2) NULL,
    Status VARCHAR(50) NOT NULL,
    -- Thông tin bổ sung & Tọa độ kinh/vĩ độ (Flow 1 & Flow 3)
    PickupLatitude DECIMAL(9,6) NULL,
    PickupLongitude DECIMAL(9,6) NULL,
    DeliveryLatitude DECIMAL(9,6) NULL,
    DeliveryLongitude DECIMAL(9,6) NULL,
    DistanceKm DECIMAL(10,2) NULL,
    PickupStableName NVARCHAR(200) NULL,
    PickupPostalCode NVARCHAR(20) NULL,
    PickupInstructions NVARCHAR(1000) NULL,
    DeliveryStableName NVARCHAR(200) NULL,
    DeliveryPostalCode NVARCHAR(20) NULL,
    DeliveryInstructions NVARCHAR(1000) NULL,
    CareInstructions NVARCHAR(2000) NULL,
    DeclaredValueVnd DECIMAL(18,2) NULL,
    OriginCountry VARCHAR(2) NULL,
    DestinationCountry VARCHAR(2) NULL,
    PreparationDays INT NULL,
    CONSTRAINT PK_TransportRequest PRIMARY KEY (RequestID),
    CONSTRAINT FK_TransportRequest_Customer FOREIGN KEY (CustomerID) REFERENCES [USER](UserID),
    CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Pickup CHECK ([PickupLatitude] IS NULL AND [PickupLongitude] IS NULL OR [PickupLatitude] IS NOT NULL AND [PickupLongitude] IS NOT NULL AND ([PickupLatitude]>=(-90) AND [PickupLatitude]<=(90)) AND ([PickupLongitude]>=(-180) AND [PickupLongitude]<=(180))),
    CONSTRAINT CK_F1S_TRANSPORT_REQUEST_Delivery CHECK ([DeliveryLatitude] IS NULL AND [DeliveryLongitude] IS NULL OR [DeliveryLatitude] IS NOT NULL AND [DeliveryLongitude] IS NOT NULL AND ([DeliveryLatitude]>=(-90) AND [DeliveryLatitude]<=(90)) AND ([DeliveryLongitude]>=(-180) AND [DeliveryLongitude]<=(180)))
);
GO

-- 2. Bảng REQUEST_HORSE_MAPPING: Gán các cá thể ngựa vào từng yêu cầu vận chuyển
CREATE TABLE REQUEST_HORSE_MAPPING (
    RequestHorseID VARCHAR(50) NOT NULL,
    RequestID VARCHAR(50) NOT NULL,
    HorseID VARCHAR(50) NOT NULL,
    CONSTRAINT PK_RequestHorseMapping PRIMARY KEY (RequestHorseID),
    CONSTRAINT FK_RHM_Request FOREIGN KEY (RequestID) REFERENCES TRANSPORT_REQUEST(RequestID),
    CONSTRAINT FK_RHM_Horse FOREIGN KEY (HorseID) REFERENCES HORSE(HorseID)
);
GO

