export type BloodTestStatus = 'Negative' | 'Positive' | 'Pending';

export interface BloodTestItem {
  diseaseKey: 'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV';
  diseaseName: string;
  status: BloodTestStatus;
  samplingDate: string;
  laboratoryName: string;
  file?: File | null;
  filePreviewUrl?: string;
  fileName?: string;
}

export interface VaccinationEntry {
  id: string;
  vaccineName: string;
  administeredDate: string;
  batchNumber: string;
  veterinarian: string;
  validUntil?: string;
  clinicOrAuthority?: string;
}

export interface FlightDetails {
  arrivalDate: string;
  departureAirport: string;
  arrivalAirport: string;
  flightNumber: string;
}

export interface AnimalProfile {
  breed: string;
  purpose: 'Racing' | 'Breeding' | 'Commercial' | 'Other';
  quantity: number;
  microchipNumber: string;
  microchipLocation: string;
  identificationMarkings: string;
}

export interface StakeholderParty {
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
}

export interface Stakeholders {
  exporterVN: StakeholderParty;
  importerJP: StakeholderParty;
  thirdPartyAgent: StakeholderParty;
}

export interface QuarantineBooking {
  vnQuarantineFacility: string;
  vnQuarantineStartDate: string;
  vnQuarantineEndDate: string;
  vnCertificateFile?: File | null;
  vnCertificateFileName?: string;
  vnCertificatePreviewUrl?: string;
  jpQuarantineStation: string;
  jpBookingConfirmationFile?: File | null;
  jpBookingConfirmationFileName?: string;
  jpBookingConfirmationPreviewUrl?: string;
}

export interface MedicalApproval {
  isQuarantineEligible: boolean;
  allFourTestsPassed: boolean;
  officialCertIssued: boolean;
  officialCertNumber: string;
  officialCertFile?: File | null;
  officialCertFileName?: string;
  officialCertPreviewUrl?: string;
  approvedByDoctor: string;
  approvalDate: string;
}

export interface LegVehicleInfo {
  legNumber: 1 | 2 | 3 | 4;
  legTitle: string;
  vehiclePlateOrFlight: string;
  vehicleTypeOrContainer: string;
  departureTime: string;
  estimatedArrivalTime: string;
  destinationDetails: string;
}

export interface LegCrewInfo {
  driverName?: string;
  driverPhone?: string;
  driverLicense?: string;
  healthEscortName?: string;
  healthEscortPhone?: string;
  flightEscortName?: string;
  flightEscortPassport?: string;
  flightEscortPhone?: string;
  destinationFarmCode?: string;
}

export interface VeterinaryAgency {
  agencyName: string;
  veterinarianName: string;
  licenseNumber: string;
  phone: string;
  email: string;
  clinicAddress: string;
  notes?: string;
}

export interface HorseMedicalProfile {
  horseName: string;
  microchipNumber: string;
  microchipLocation: string;
  breed: string;
  gender: 'Stallion' | 'Mare' | 'Gelding' | '';
  ageOrYob: string;
  coatColorMarkings: string;
  bodyTemperature: string;
  clinicalSigns: string;
}

export interface MedicalTestRequisition {
  requisitionId: string;
  samplingDate: string;
  samplingTime: string;
  sampleType: string;
  designatedLab: string;
  testPurpose: string;
  selectedDiseases: {
    EIA: boolean;
    EVA: boolean;
    Piroplasmosis: boolean;
    WNV: boolean;
  };
  specialInstructions: string;
}

// ============================================================================
// 1. NHÓM GIẤY TỜ VIỆT NAM (Dành cho cơ quan trong nước xử lý)
// ============================================================================

export interface DocumentAttachment {
  id: string;
  name: string;
  url: string;
  uploadedAt?: string;
  size?: string;
  pageDesc?: string;
}

/**
 * 1.1. Các thành phần của nhóm Hồ sơ Kiểm dịch Thú y
 * (Nộp qua Cổng Một cửa quốc gia & Bản cứng trực tiếp)
 */
export interface VietnamQuarantineDossierData {
  // 1.1.1. Đơn đăng ký kiểm dịch động vật xuất khẩu (Mẫu 01 Cục Thú y / NSW)
  quarantineApplication: {
    applicantName: string;
    applicantAddress: string;
    applicantPhone: string;
    applicantEmail: string;
    applicantTaxOrId: string;
    animalSpecies: string; // Tên loài: Ngựa (Equus caballus)
    horseName: string;
    quantity: number; // 01 con
    gender: 'Thiến (Gelding)' | 'Đực (Stallion)' | 'Cái (Mare)';
    ageOrBirthYear: string;
    exportPurpose: string; // "Thi đấu thể thao, tái nhập"
    departureOrigin: string; // Nơi xuất phát (Chuồng trại tại VN)
    quarantineFacilityVN: string; // Trạm/cơ sở cách ly kiểm dịch tại VN
    quarantineStartDate: string;
    quarantineEndDate: string;
    quarantineDurationDays: number;
    exportPort: string; // Cửa khẩu xuất hàng (Sân bay Tân Sơn Nhất / Nội Bài)
    destinationCountry: string; // Nước đến: Nhật Bản
    destinationPort: string; // Cửa khẩu đến: Sân bay Narita / Kansai
    submissionChannel: 'NSW_AND_HARDCOPY' | 'NSW_ONLY' | 'HARDCOPY_ONLY';
    nswApplicationCode: string; // Mã hồ sơ Cổng Một cửa quốc gia (NSW)
    applicationDate: string;
  };

  // 1.1.2. Hộ chiếu ngựa (Equine Passport) & Sổ tiêm phòng
  passportAndVaccine: {
    passportNumber: string;
    issuingOrganization: string; // FEI / VRA / Hiệp hội Đua ngựa
    issueDate: string;
    microchipNumber: string; // Chuỗi 15 số ISO 11784/11785
    microchipLocation: string; // Bờ trên dây chằng gáy cổ trái
    passportScans: DocumentAttachment[];
    vaccinationHistory: {
      id: string;
      vaccineName: string; // Cúm ngựa (Equine Influenza), U ván (Tetanus), Dại...
      administeredDate: string;
      validUntil: string;
      batchNumber: string;
      veterinarian: string;
      clinicAuthority: string;
    }[];
    vaccinationBookScans: DocumentAttachment[];
  };

  // 1.1.3. Yêu cầu / Quy định kiểm dịch của phía Nhật Bản
  japanQuarantineRegulations: {
    regulationTitle: string; // Bản hướng dẫn xét nghiệm MAFF AQS
    regulationCode: string;
    testingProtocolSummary: string; // Căn cứ để Thú y Việt Nam lấy mẫu máu đúng chuẩn Nhật
    referenceTemporaryImportPermitNo: string;
    guidanceFiles: DocumentAttachment[];
  };
}

/**
 * 1.2. Các thành phần của nhóm Tờ khai Hải quan Tạm xuất - Tái nhập
 * (Nộp qua hệ thống VNACCS/VCIS & xuất trình bản cứng tại cửa khẩu)
 */
export interface VietnamCustomsDeclarationData {
  customsHeader: {
    declarationCode: string; // Số tờ khai tạm xuất VNACCS
    declarationType: string; // G12 - Tạm xuất tái nhập miễn thuế thi đấu
    customsBranch: string; // Chi cục Hải quan Cửa khẩu Sân bay Quốc tế Tân Sơn Nhất / Nội Bài
    declarationDate: string;
    plannedReImportDate: string; // Thời gian tái nhập dự kiến
    status: 'Draft' | 'Submitted_NSW' | 'Customs_Cleared' | 'Pending_Inspection';
  };

  // 1.2.1. Thư mời tham gia giải đua từ ban tổ chức nước ngoài
  invitationLetter: {
    organizerName: string; // Japan Racing Association (JRA) / National Association of Racing (NAR)
    tournamentName: string; // Tên giải đua
    tournamentLocation: string; // Địa điểm thi đấu tại Nhật
    startDate: string; // Thời gian diễn ra đi
    endDate: string; // Thời gian về
    invitationFiles: DocumentAttachment[];
  };

  // 1.2.2. Xác nhận sở hữu ngựa
  ownershipConfirmation: {
    ownershipDocType: 'CertificateOfOwnership' | 'PedigreeStudBook' | 'ClubMembership' | 'All';
    certificateNumber: string;
    issueDate: string;
    issuingBody: string; // CLB Đua ngựa hoặc Hiệp hội nhân giống
    registeredOwnerName: string;
    ownershipFiles: DocumentAttachment[];
  };

  // 1.2.3. Thông tin định danh chủ thể
  identityProfile: {
    entityType: 'Individual' | 'EnterpriseOrClub';
    idNumberOrBusinessCode: string; // CCCD/Hộ chiếu hoặc GP ĐKKD / MST
    legalRepresentative: string;
    issueDate: string;
    issuePlace: string;
    identityFiles: DocumentAttachment[];
  };

  // 1.2.4. Giấy chứng nhận kiểm dịch động vật xuất khẩu (Bản chính Chi cục Thú y vùng cấp)
  exportHealthCertificate: {
    certNumber: string;
    regionalVeterinaryOffice: string; // Chi cục Thú y Vùng VI / Vùng II / Vùng I
    certifiedDate: string;
    certifyingOfficer: string;
    quarantineStatus: 'Certified_Healthy' | 'Pending_Release' | 'Quarantine_Passed';
    isOriginalHardcopyAttached: boolean; // Chứng từ bắt buộc xuất trình để thông quan
    certFiles: DocumentAttachment[];
  };

  // 1.2.5. Chứng từ vận chuyển
  transportDocuments: {
    airWaybillNumber: string; // Vận đơn AWB hàng không
    airlineName: string;
    flightNumber: string;
    flightSchedule: string; // Lịch trình bay SGN -> NRT
    dedicatedFlightContractNumber: string; // Hợp đồng thuê máy bay chuyên dụng
    airStallSpecification: string; // Lồng ngựa chuyên dụng IATA
    transportFiles: DocumentAttachment[];
  };
}

// ============================================================================
// 2. NHÓM GIẤY TỜ QUỐC TẾ (Do phía Nhật Bản cấp - Khách hàng phải có sẵn làm đầu vào)
// ============================================================================

export interface JapanInternationalPermitsData {
  // 2.1. Giấy phép nhập khẩu tạm thời (Temporary Import Permit)
  temporaryImportPermit: {
    permitNumber: string;
    issuingAgency: string; // Animal Quarantine Service (AQS), MAFF Japan
    issueDate: string;
    validFrom: string;
    validUntil: string;
    permittedPurpose: string; // Tham gia giải đua & tái xuất về Việt Nam
    quarantineStationJP: string; // AQS Narita / Kansai
    complianceCommitmentAgreed: boolean; // Cam kết tái xuất nguyên trạng
    permitFiles: DocumentAttachment[];
  };

  // 2.2. Hồ sơ Y tế / Yêu cầu xét nghiệm từ Nhật Bản
  medicalAndTestingRequirements: {
    standardDocumentCode: string; // MAFF Health Protocol Spec
    designatedLaboratories: string; // NCVD Trung ương hoặc Lab quốc tế được công nhận
    samplingWindowDays: number; // Trong vòng 30 ngày trước chuyến bay
    mandatoryDiseases: {
      key: 'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV';
      diseaseNameVi: string;
      diseaseNameEn: string;
      standardMethod: string;
      requiredResult: string;
      compliant: boolean;
    }[];
    generalHealthRequirements: string; // Không triệu chứng lâm sàng, cách ly tiền xuất cảnh
    requirementFiles: DocumentAttachment[];
  };
}

// ============================================================================
// TOÀN BỘ GÓI HỒ SƠ TUYẾN VIỆT NAM - NHẬT BẢN
// ============================================================================

export interface JapanRoutePackageData {
  // 1. Nhóm Giấy tờ Việt Nam
  vnQuarantineDossier: VietnamQuarantineDossierData;
  vnCustomsDeclaration: VietnamCustomsDeclarationData;

  // 2. Nhóm Giấy tờ Quốc tế do Nhật Bản cấp
  jpInternationalPermits: JapanInternationalPermitsData;

  // Các phân hệ bổ trợ & kế thừa
  veterinaryAgency?: VeterinaryAgency;
  horseMedicalProfile?: HorseMedicalProfile;
  medicalRequisition?: MedicalTestRequisition;
  flightDetails: FlightDetails;
  animalProfile: AnimalProfile;
  stakeholders: Stakeholders;
  quarantineBooking: QuarantineBooking;
  bloodTests: Record<'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV', BloodTestItem>;
  vaccinations: VaccinationEntry[];
  vaccinationBookImages: { id: string; url: string; name: string }[];
  medicalApproval: MedicalApproval;
  vehicles: {
    leg1: LegVehicleInfo;
    leg2: LegVehicleInfo;
    leg3: LegVehicleInfo;
    leg4: LegVehicleInfo;
  };
  crews: {
    leg1Crew: LegCrewInfo;
    flightCrew: LegCrewInfo;
    leg4Crew: LegCrewInfo;
  };
}
