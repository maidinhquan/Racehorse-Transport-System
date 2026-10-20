export type SupportedCountry =
  | 'Việt Nam' | 'Trung Quốc' | 'Lào' | 'Campuchia' | 'Thái Lan'
  | 'Singapore' | 'Nhật Bản' | 'Hàn Quốc' | 'UAE' | 'Hồng Kông';

export interface Horse {
  horseId: string;
  ownerId: string;
  name: string;
  microchipIso: string; // BR-HORSE-01: Duy nhất & bắt buộc (15 số ISO)
  feiPassportNo: string;
  breed: string;
  sex: 'Đực' | 'Cái' | 'Thiến';
  weight: number;
  status: 'Ready' | 'InTransit' | 'Quarantine';
}

export interface TransportRequest {
  requestId: string;
  customerId: string;
  departureCountry: SupportedCountry; // BR-SCOPE-01
  pickupAddress: string;
  destinationCountry: SupportedCountry;
  deliveryAddress: string;
  purpose: 'Thi đấu' | 'Nhân giống' | 'Nghỉ dưỡng';
  transportType: 'Đường bộ' | 'Hàng không';
  expectedDate: string;
  committedDeadline: string; // Hạn chót tính OTD (BR-TIME-07)
  designatedReceiverName: string;
  designatedReceiverPhone: string;
  commercialValueUsd: number;
  horseIds: string[];
  specialCareNotes?: string;
  status: 'Pending' | 'Quoting' | 'Approved' | 'Rejected' | 'ReadyToDepart' | 'InTransit' | 'Completed';
  quotedPrice?: number;
  floorPrice?: number; // BR-QUO-03: Giá sàn = Chi phí dự kiến + Biên lợi nhuận tối thiểu
  contractSigned?: boolean;
  depositPaid?: boolean;
}

export interface LegalMedicalRecord {
  recordId: string;
  requestId: string;
  horseId: string;
  documentType: 'FEI Passport' | 'Coggins Test (EIA)' | 'Equine Influenza Vaccine' | 'ATA Carnet' | 'Export Health Cert';
  documentStatus: 'Pending' | 'Approved' | 'Rejected' | 'Expired';
  expiryDate: string; // BR-DOC-03: Phải còn hạn sau CommittedDeadline
  rejectionReason?: string; // BR-DOC-02: Từ chối bắt buộc có lý do
  digitalCopyUploaded: boolean; // Bản mềm scan trên hệ thống
  physicalCopyReceived: boolean; // Bản gốc cứng kẹp vào Flight Bag
}

export interface RouteSegment {
  segmentId: string;
  tripId: string;
  orderIndex: number;
  locationName: string;
  segmentType: 'Pickup' | 'Rest_Stop' | 'Customs_BCP' | 'Quarantine_Station' | 'Delivery';
  expectedEta: string;
  actualTime?: string;
  status: 'Pending' | 'Completed';
}