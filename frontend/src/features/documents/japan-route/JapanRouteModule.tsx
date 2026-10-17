import React, { useState, useEffect } from 'react';
import './JapanRouteModule.css';
import type {
  JapanRoutePackageData,
  FlightDetails,
  AnimalProfile,
  QuarantineBooking,
  BloodTestItem,
  VaccinationEntry,
  MedicalApproval,
  LegVehicleInfo,
  LegCrewInfo,
  VeterinaryAgency,
  HorseMedicalProfile,
  MedicalTestRequisition,
  VietnamQuarantineDossierData,
  VietnamCustomsDeclarationData,
  JapanInternationalPermitsData,
} from './types/japanRoute.types';

import { VietnamQuarantineDossier } from './components/VietnamQuarantineDossier';
import { VietnamCustomsDeclaration } from './components/VietnamCustomsDeclaration';
import { JapanInternationalPermits } from './components/JapanInternationalPermits';
import { JapanMedicalTestRequisition } from './components/JapanMedicalTestRequisition';
import { JapanMedicalQuarantine } from './components/JapanMedicalQuarantine';
import { JapanLogisticsEscort } from './components/JapanLogisticsEscort';
import { JapanPreDepartureDoc } from './components/JapanPreDepartureDoc';
import { ComprehensiveDossierSummary } from './components/ComprehensiveDossierSummary';
import { ImageZoomModal } from './components/ImageZoomModal';

interface JapanRouteModuleProps {
  initialData?: Partial<JapanRoutePackageData>;
  onSave?: (data: JapanRoutePackageData) => void;
  onSubmitToAqs?: (data: JapanRoutePackageData) => void;
  isReadOnly?: boolean;
}

export type JapanRouteTab =
  | 'vn_quarantine'
  | 'vn_customs'
  | 'jp_permits'
  | 'step1_medical_quarantine'
  | 'step1_requisition'
  | 'step2_logistics'
  | 'step3_declaration'
  | 'dossier_summary';

export const JapanRouteModule: React.FC<JapanRouteModuleProps> = ({
  initialData,
  onSave,
  onSubmitToAqs,
  isReadOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<JapanRouteTab>('vn_quarantine');

  // Zoom Modal State
  const [zoomModal, setZoomModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    imageTitle: string;
  }>({
    isOpen: false,
    imageUrl: '',
    imageTitle: '',
  });

  const handleOpenZoom = (imageUrl: string, imageTitle: string) => {
    setZoomModal({
      isOpen: true,
      imageUrl,
      imageTitle,
    });
  };

  // ============================================================================
  // 1.1 NHÓM HỒ SƠ KIỂM DỊCH THÚ Y VIỆT NAM (CỔNG NSW & BẢN CỨNG CHI CỤC THÚ Y)
  // ============================================================================
  const [vnQuarantineDossier, setVnQuarantineDossier] = useState<VietnamQuarantineDossierData>(() => ({
    quarantineApplication: {
      applicantName: initialData?.vnQuarantineDossier?.quarantineApplication?.applicantName || 'Công ty TNHH Thể Thao Đua Ngựa Sài Gòn (Saigon Horse Racing Co., Ltd)',
      applicantAddress: initialData?.vnQuarantineDossier?.quarantineApplication?.applicantAddress || '521 Hoàng Văn Thụ, Phường 4, Quận Tân Bình, TP. Hồ Chí Minh',
      applicantPhone: initialData?.vnQuarantineDossier?.quarantineApplication?.applicantPhone || '0918.234.567',
      applicantEmail: initialData?.vnQuarantineDossier?.quarantineApplication?.applicantEmail || 'quarantine@saigonracehorse.vn',
      applicantTaxOrId: initialData?.vnQuarantineDossier?.quarantineApplication?.applicantTaxOrId || '0315894120',
      animalSpecies: 'Ngựa (Equus caballus)',
      horseName: initialData?.horseMedicalProfile?.horseName || initialData?.vnQuarantineDossier?.quarantineApplication?.horseName || 'Thunderbolt King',
      quantity: 1,
      gender: 'Thiến (Gelding)',
      ageOrBirthYear: '6 tuổi (Sinh năm 2020)',
      exportPurpose: 'Thi đấu thể thao, tái nhập',
      departureOrigin: initialData?.vnQuarantineDossier?.quarantineApplication?.departureOrigin || 'Trại huấn luyện ngựa đua Củ Chi, TP. Hồ Chí Minh',
      quarantineFacilityVN: initialData?.vnQuarantineDossier?.quarantineApplication?.quarantineFacilityVN || 'Trạm cách ly kiểm dịch động vật Củ Chi (Chi cục Thú y Vùng VI)',
      quarantineStartDate: initialData?.vnQuarantineDossier?.quarantineApplication?.quarantineStartDate || '2026-10-25',
      quarantineEndDate: initialData?.vnQuarantineDossier?.quarantineApplication?.quarantineEndDate || '2026-11-10',
      quarantineDurationDays: 16,
      exportPort: initialData?.vnQuarantineDossier?.quarantineApplication?.exportPort || 'Sân bay Quốc tế Tân Sơn Nhất (SGN)',
      destinationCountry: 'Nhật Bản (Japan)',
      destinationPort: initialData?.vnQuarantineDossier?.quarantineApplication?.destinationPort || 'Sân bay Quốc tế Narita (NRT)',
      submissionChannel: 'NSW_AND_HARDCOPY',
      nswApplicationCode: initialData?.vnQuarantineDossier?.quarantineApplication?.nswApplicationCode || 'NSW-VET-2026-902188',
      applicationDate: new Date().toISOString().split('T')[0],
      ...initialData?.vnQuarantineDossier?.quarantineApplication,
    },
    passportAndVaccine: {
      passportNumber: initialData?.vnQuarantineDossier?.passportAndVaccine?.passportNumber || 'VN-FEI-2022-0941',
      issuingOrganization: initialData?.vnQuarantineDossier?.passportAndVaccine?.issuingOrganization || 'Liên đoàn Thể thao Cưỡi ngựa Quốc tế (FEI) / VRA',
      issueDate: initialData?.vnQuarantineDossier?.passportAndVaccine?.issueDate || '2022-04-15',
      microchipNumber: initialData?.horseMedicalProfile?.microchipNumber || initialData?.vnQuarantineDossier?.passportAndVaccine?.microchipNumber || '900215001234567',
      microchipLocation: 'Bờ trên dây chằng gáy cổ trái (Nuchal ligament left)',
      passportScans: initialData?.vnQuarantineDossier?.passportAndVaccine?.passportScans || [
        {
          id: 'demo-scan-1',
          name: 'Equine_Passport_ID_Page.jpg',
          url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
          size: '1.2 MB',
          uploadedAt: '15/10/2026',
          pageDesc: 'Trang 1: Danh tính cá thể & số vi mạch',
        },
        {
          id: 'demo-scan-2',
          name: 'Equine_Passport_Diagram_Markings.jpg',
          url: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&auto=format&fit=crop&q=80',
          size: '950 KB',
          uploadedAt: '15/10/2026',
          pageDesc: 'Trang 2: Sơ đồ vệt lông & xoáy trán',
        },
      ],
      vaccinationHistory: initialData?.vnQuarantineDossier?.passportAndVaccine?.vaccinationHistory || [
        {
          id: 'vac-1',
          vaccineName: 'Equine Influenza (Cúm ngựa bắt buộc)',
          administeredDate: '2026-09-15',
          validUntil: '2027-03-15',
          batchNumber: 'EI-8842-FL',
          veterinarian: 'TS. BSTY. Trần Đình Quang',
          clinicAuthority: 'Chi cục Thú y Vùng VI',
        },
        {
          id: 'vac-2',
          vaccineName: 'Tetanus Toxoid (U ván bắt buộc)',
          administeredDate: '2026-08-20',
          validUntil: '2027-08-20',
          batchNumber: 'TET-9014-VN',
          veterinarian: 'TS. BSTY. Trần Đình Quang',
          clinicAuthority: 'Chi cục Thú y Vùng VI',
        },
        {
          id: 'vac-3',
          vaccineName: 'Rabies Vaccine (Vắc-xin phòng Dại)',
          administeredDate: '2026-06-10',
          validUntil: '2027-06-10',
          batchNumber: 'RAB-6721-EQ',
          veterinarian: 'BSTY. Lê Hoàng Long',
          clinicAuthority: 'Bệnh viện Thú y Quốc tế Sài Gòn',
        },
      ],
      vaccinationBookScans: initialData?.vnQuarantineDossier?.passportAndVaccine?.vaccinationBookScans || [
        {
          id: 'demo-vac-book-1',
          name: 'So_Tiem_Phong_Veterinary_Record.pdf',
          url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
          size: '840 KB',
          uploadedAt: '16/10/2026',
        },
      ],
    },
    japanQuarantineRegulations: {
      regulationTitle: initialData?.vnQuarantineDossier?.japanQuarantineRegulations?.regulationTitle || 'AQS MAFF Testing & Quarantine Protocol for Temporary Horses (Nhật Bản)',
      regulationCode: 'MAFF-HEALTH-SPEC-EQUINE-VN02',
      testingProtocolSummary: initialData?.vnQuarantineDossier?.japanQuarantineRegulations?.testingProtocolSummary || 'Lấy mẫu máu huyết thanh tách ly tâm kiểm tra 4 bệnh bắt buộc: EIA (Coggins), EVA (VN test), Piroplasmosis (cELISA/IFAT), West Nile Virus (ELISA). Mẫu phải gửi về Trung tâm Chẩn đoán Thú y TW (NCVD) thực hiện...',
      referenceTemporaryImportPermitNo: initialData?.vnQuarantineDossier?.japanQuarantineRegulations?.referenceTemporaryImportPermitNo || 'AQS-MAFF-TIP-2026-JP9902',
      guidanceFiles: initialData?.vnQuarantineDossier?.japanQuarantineRegulations?.guidanceFiles || [
        {
          id: 'demo-guide-1',
          name: 'MAFF_Japan_Equine_Quarantine_Protocol_2026.pdf',
          url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
          size: '1.8 MB',
          uploadedAt: '10/10/2026',
        },
      ],
    },
  }));

  // ============================================================================
  // 1.2 NHÓM TỜ KHAI HẢI QUAN TẠM XUẤT - TÁI NHẬP (VNACCS/VCIS & CỬA KHẨU)
  // ============================================================================
  const [vnCustomsDeclaration, setVnCustomsDeclaration] = useState<VietnamCustomsDeclarationData>(() => ({
    customsHeader: {
      declarationCode: initialData?.vnCustomsDeclaration?.customsHeader?.declarationCode || '304892182040',
      declarationType: 'G12 - Tạm xuất phương tiện, dụng cụ, súc vật dự hội chợ, thi đấu thể thao',
      customsBranch: initialData?.vnCustomsDeclaration?.customsHeader?.customsBranch || 'Chi cục Hải quan Cửa khẩu Sân bay Quốc tế Tân Sơn Nhất - Cục Hải quan TP.HCM',
      declarationDate: new Date().toISOString().split('T')[0],
      plannedReImportDate: initialData?.vnCustomsDeclaration?.customsHeader?.plannedReImportDate || '2026-12-15',
      status: 'Submitted_NSW',
      ...initialData?.vnCustomsDeclaration?.customsHeader,
    },
    invitationLetter: {
      organizerName: initialData?.vnCustomsDeclaration?.invitationLetter?.organizerName || 'Japan Racing Association (JRA) & Tokyo Racecourse',
      tournamentName: initialData?.vnCustomsDeclaration?.invitationLetter?.tournamentName || 'Japan Cup Autumn Invitational Tournament 2026',
      tournamentLocation: initialData?.vnCustomsDeclaration?.invitationLetter?.tournamentLocation || 'Tokyo Racecourse (Fuchu, Tokyo, Japan)',
      startDate: initialData?.vnCustomsDeclaration?.invitationLetter?.startDate || '2026-11-12',
      endDate: initialData?.vnCustomsDeclaration?.invitationLetter?.endDate || '2026-12-05',
      invitationFiles: initialData?.vnCustomsDeclaration?.invitationLetter?.invitationFiles || [
        {
          id: 'demo-inv-1',
          name: 'Official_Invitation_Letter_JRA_Japan_Cup_2026.pdf',
          url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80',
          size: '2.1 MB',
          uploadedAt: '12/10/2026',
        },
      ],
    },
    ownershipConfirmation: {
      ownershipDocType: 'CertificateOfOwnership',
      certificateNumber: initialData?.vnCustomsDeclaration?.ownershipConfirmation?.certificateNumber || 'SHN-2023-0891/VRA',
      issueDate: '2023-01-10',
      issuingBody: 'Hiệp hội Đua ngựa Việt Nam (VRA) & CLB Thể thao Đua ngựa Sài Gòn',
      registeredOwnerName: 'Công ty TNHH Thể Thao Đua Ngựa Sài Gòn',
      ownershipFiles: initialData?.vnCustomsDeclaration?.ownershipConfirmation?.ownershipFiles || [
        {
          id: 'demo-own-1',
          name: 'Giay_Chung_Nhan_Quyen_So_Huu_Ngua_Dua.pdf',
          url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
          size: '1.4 MB',
          uploadedAt: '14/10/2026',
        },
      ],
    },
    identityProfile: {
      entityType: 'EnterpriseOrClub',
      idNumberOrBusinessCode: initialData?.vnCustomsDeclaration?.identityProfile?.idNumberOrBusinessCode || '0315894120',
      legalRepresentative: 'Nguyễn Văn Hùng (Tổng Giám Đốc)',
      issueDate: '2019-08-15',
      issuePlace: 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh',
      identityFiles: initialData?.vnCustomsDeclaration?.identityProfile?.identityFiles || [
        {
          id: 'demo-id-1',
          name: 'Giay_Phep_DKKD_Doanh_Nghiep.pdf',
          url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
          size: '1.6 MB',
          uploadedAt: '14/10/2026',
        },
      ],
    },
    exportHealthCertificate: {
      certNumber: initialData?.vnCustomsDeclaration?.exportHealthCertificate?.certNumber || 'CCTY-V6-XK-2026/09428',
      regionalVeterinaryOffice: 'Chi cục Thú y Vùng VI (TP. Hồ Chí Minh)',
      certifiedDate: '2026-10-17',
      certifyingOfficer: 'TS. BSTY. Trần Đình Quang',
      quarantineStatus: 'Certified_Healthy',
      isOriginalHardcopyAttached: true,
      certFiles: initialData?.vnCustomsDeclaration?.exportHealthCertificate?.certFiles || [
        {
          id: 'demo-cert-1',
          name: 'Giay_Kiem_Dich_Xuat_Khau_Ban_Chinh_CCTY.pdf',
          url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
          size: '2.4 MB',
          uploadedAt: '17/10/2026',
        },
      ],
    },
    transportDocuments: {
      airWaybillNumber: initialData?.vnCustomsDeclaration?.transportDocuments?.airWaybillNumber || '131-89240182',
      airlineName: 'Japan Airlines Cargo (JL) / All Nippon Airways',
      flightNumber: 'JL752',
      flightSchedule: 'JL752 SGN (08:00) ➔ NRT (15:30) ngày 12/11/2026',
      dedicatedFlightContractNumber: 'CTR-AIR-HORSE-2026/09',
      airStallSpecification: 'IATA Certified Triple Air Stall configured for Single Horse',
      transportFiles: initialData?.vnCustomsDeclaration?.transportDocuments?.transportFiles || [
        {
          id: 'demo-awb-1',
          name: 'Air_Waybill_AWB_131-89240182.pdf',
          url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&auto=format&fit=crop&q=80',
          size: '1.1 MB',
          uploadedAt: '15/10/2026',
        },
      ],
    },
  }));

  // ============================================================================
  // 2. NHÓM GIẤY TỜ QUỐC TẾ (DO PHÍA NHẬT BẢN CẤP - ĐẦU VÀO)
  // ============================================================================
  const [jpInternationalPermits, setJpInternationalPermits] = useState<JapanInternationalPermitsData>(() => ({
    temporaryImportPermit: {
      permitNumber: initialData?.jpInternationalPermits?.temporaryImportPermit?.permitNumber || 'AQS-MAFF-TIP-2026-JP9902',
      issuingAgency: 'Animal Quarantine Service (AQS), Ministry of Agriculture, Forestry and Fisheries (MAFF) - Japan',
      issueDate: '2026-10-05',
      validFrom: '2026-11-10',
      validUntil: '2026-12-20',
      permittedPurpose: 'Temporary entry for competing in Japan Cup Autumn Invitational 2026 with mandatory re-exportation',
      quarantineStationJP: 'AQS Narita Airport Sub-station (Tokyo)',
      complianceCommitmentAgreed: true,
      permitFiles: initialData?.jpInternationalPermits?.temporaryImportPermit?.permitFiles || [
        {
          id: 'demo-jp-permit-1',
          name: 'MAFF_Temporary_Import_Permit_AQS-MAFF-TIP-2026-JP9902.pdf',
          url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
          size: '2.8 MB',
          uploadedAt: '06/10/2026',
        },
      ],
    },
    medicalAndTestingRequirements: {
      standardDocumentCode: 'MAFF-HEALTH-SPEC-EQUINE-VN02',
      designatedLaboratories: 'Trung tâm Chẩn đoán Thú y Trung ương (NCVD) / Phòng xét nghiệm tham chiếu OIE',
      samplingWindowDays: 30,
      mandatoryDiseases: [
        {
          key: 'EIA',
          diseaseNameVi: 'Thiếu máu truyền nhiễm ở ngựa (EIA)',
          diseaseNameEn: 'Equine Infectious Anemia (Coggins Test / AGID)',
          standardMethod: 'Agar Gel Immunodiffusion (AGID / Coggins) hoặc cELISA',
          requiredResult: 'Negative (Âm tính)',
          compliant: true,
        },
        {
          key: 'EVA',
          diseaseNameVi: 'Viêm động mạch ở ngựa (EVA)',
          diseaseNameEn: 'Equine Viral Arteritis (Virus Neutralization)',
          standardMethod: 'Xét nghiệm trung hòa virus (Virus Neutralization - VN test)',
          requiredResult: 'Negative (Hiệu giá < 1:4)',
          compliant: true,
        },
        {
          key: 'Piroplasmosis',
          diseaseNameVi: 'Ký sinh trùng đường máu (Piroplasmosis)',
          diseaseNameEn: 'Theileria equi & Babesia caballi (cELISA & IFAT)',
          standardMethod: 'Kỹ thuật cELISA cạnh tranh & Huỳnh quang kháng thể gián tiếp',
          requiredResult: 'Negative (Cả 2 chủng)',
          compliant: true,
        },
        {
          key: 'WNV',
          diseaseNameVi: 'Sốt Tây Sông Nile (West Nile Virus)',
          diseaseNameEn: 'West Nile Virus (IgM Capture ELISA / PRNT)',
          standardMethod: 'IgM Capture ELISA hoặc PRNT90',
          requiredResult: 'Negative (Không nhiễm virus 30 ngày)',
          compliant: true,
        },
      ],
      generalHealthRequirements: 'Ngựa hoàn toàn khỏe mạnh, không có dấu hiệu lâm sàng của bất kỳ bệnh truyền nhiễm nào trong vòng 60 ngày trước khi xuất cảnh; được nuôi giữ cách ly trong cơ sở được kiểm soát thú y nghiêm ngặt.',
      requirementFiles: initialData?.jpInternationalPermits?.medicalAndTestingRequirements?.requirementFiles || [
        {
          id: 'demo-req-1',
          name: 'MAFF_Veterinary_Health_Requirements_Protocol.pdf',
          url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
          size: '1.9 MB',
          uploadedAt: '08/10/2026',
        },
      ],
    },
  }));

  // ============================================================================
  // CÁC THÔNG TIN KẾ THỪA: ĐƠN CHỈ ĐỊNH Y TẾ, MẪU XÉT NGHIỆM, VẬN CHUYỂN
  // ============================================================================
  const [veterinaryAgency, setVeterinaryAgency] = useState<VeterinaryAgency>(() => ({
    agencyName: initialData?.veterinaryAgency?.agencyName || 'Bệnh viện Thú y Quốc tế Sài Gòn (Saigon Vet Clinic)',
    veterinarianName: initialData?.veterinaryAgency?.veterinarianName || 'TS. BSTY. Trần Đình Quang',
    licenseNumber: initialData?.veterinaryAgency?.licenseNumber || 'CCHN-TY-2024/0984-CCTY',
    phone: initialData?.veterinaryAgency?.phone || '0918.234.567',
    email: initialData?.veterinaryAgency?.email || 'quarantine.dept@saigonvet.vn',
    clinicAddress: initialData?.veterinaryAgency?.clinicAddress || '521 Hoàng Văn Thụ, Phường 4, Quận Tân Bình, TP. Hồ Chí Minh',
    notes: initialData?.veterinaryAgency?.notes || 'Đơn vị thú y được ủy quyền lấy mẫu kiểm dịch xuất khẩu',
  }));

  const [horseMedicalProfile, setHorseMedicalProfile] = useState<HorseMedicalProfile>(() => ({
    horseName: initialData?.horseMedicalProfile?.horseName || 'Thunderbolt King',
    microchipNumber: initialData?.horseMedicalProfile?.microchipNumber || '900215001234567',
    microchipLocation: initialData?.horseMedicalProfile?.microchipLocation || 'Bờ trên dây chằng cổ trái (Nuchal ligament left)',
    breed: initialData?.horseMedicalProfile?.breed || 'Thoroughbred (Thuần chủng)',
    gender: initialData?.horseMedicalProfile?.gender || 'Gelding',
    ageOrYob: initialData?.horseMedicalProfile?.ageOrYob || '6 tuổi',
    coatColorMarkings: initialData?.horseMedicalProfile?.coatColorMarkings || 'Nâu sẫm (Bay), xoáy trán hình thoi, chân sau trái tất trắng',
    bodyTemperature: initialData?.horseMedicalProfile?.bodyTemperature || '37.8 °C',
    clinicalSigns: initialData?.horseMedicalProfile?.clinicalSigns || 'Tỉnh táo, niêm mạc mắt hồng hào, không có dịch mũi hay biểu hiện sốt/bệnh truyền nhiễm',
  }));

  const [medicalRequisition, setMedicalRequisition] = useState<MedicalTestRequisition>({
    requisitionId: 'REQ-MED-2026-JP01',
    samplingDate: '2026-10-20',
    samplingTime: '08:30',
    sampleType: 'Huyết thanh (Serum) tách ly tâm',
    designatedLab: 'Trung tâm Chẩn đoán Thú y Trung ương (NCVD - Hà Nội)',
    testPurpose: 'Kiểm dịch động vật xuất khẩu sang Nhật Bản (AQS MAFF Protocol)',
    selectedDiseases: {
      EIA: true,
      EVA: true,
      Piroplasmosis: true,
      WNV: true,
    },
    specialInstructions: 'Bảo quản mẫu trong ống chân không nắp đỏ, giữ lạnh 2-8°C và chuyển phát nhanh đến Lab trong 24h.',
  });

  const [flight, setFlight] = useState<FlightDetails>({
    arrivalDate: '2026-11-12',
    departureAirport: 'SGN',
    arrivalAirport: 'NRT',
    flightNumber: 'JL752',
  });

  const [animal, setAnimal] = useState<AnimalProfile>({
    breed: 'Thoroughbred',
    purpose: 'Racing',
    quantity: 1,
    microchipNumber: '900215001234567',
    microchipLocation: 'Nuchal Ligament Left',
    identificationMarkings: 'Nâu sẫm (Bay), xoáy trán hình thoi',
  });

  const [stakeholders, setStakeholders] = useState({
    exporterVN: {
      name: 'Công ty TNHH Thể Thao Đua Ngựa Sài Gòn',
      address: '521 Hoàng Văn Thụ, Phường 4, Quận Tân Bình, TP.HCM',
      contactPerson: 'Nguyễn Văn Hùng',
      phone: '0918.234.567',
    },
    importerJP: {
      name: 'Japan Racing Association (JRA) / Tokyo Racecourse',
      address: '1-1 Hiyoshicho, Fuchu, Tokyo 183-8550, Japan',
      contactPerson: 'Kenji Takahashi',
      phone: '+81 3 3591 5251',
    },
    thirdPartyAgent: {
      name: 'CBN Global Racehorse Logistics Japan Branch',
      address: 'Narita Airport Cargo Area, Chiba Prefecture, Japan',
      contactPerson: 'Sato Hiroshi',
      phone: '+81 476 34 2200',
    },
  });

  const [quarantine, setQuarantine] = useState<QuarantineBooking>({
    vnQuarantineFacility: 'Trạm kiểm dịch Động vật Củ Chi (Chi cục Thú y Vùng VI)',
    vnQuarantineStartDate: '2026-10-25',
    vnQuarantineEndDate: '2026-11-10',
    vnCertificateFile: null,
    vnCertificateFileName: '',
    vnCertificatePreviewUrl: '',
    jpQuarantineStation: 'AQS Narita Airport Sub-station',
    jpBookingConfirmationFile: null,
    jpBookingConfirmationFileName: '',
    jpBookingConfirmationPreviewUrl: '',
  });

  const [bloodTests, setBloodTests] = useState<Record<'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV', BloodTestItem>>({
    EIA: {
      diseaseKey: 'EIA',
      diseaseName: 'Thiếu máu truyền nhiễm ở ngựa (EIA - Equine Infectious Anemia)',
      status: 'Negative',
      samplingDate: '2026-10-14',
      laboratoryName: 'Trung tâm Chẩn đoán Thú y Trung ương (NCVD)',
      file: null,
      filePreviewUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
      fileName: 'NCVD_Test_Result_EIA_Negative.pdf',
    },
    EVA: {
      diseaseKey: 'EVA',
      diseaseName: 'Viêm động mạch ở ngựa (EVA - Equine Viral Arteritis)',
      status: 'Negative',
      samplingDate: '2026-10-14',
      laboratoryName: 'Trung tâm Chẩn đoán Thú y Trung ương (NCVD)',
      file: null,
      filePreviewUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
      fileName: 'NCVD_Test_Result_EVA_Negative.pdf',
    },
    Piroplasmosis: {
      diseaseKey: 'Piroplasmosis',
      diseaseName: 'Ký sinh trùng đường máu (Equine Piroplasmosis: Theileria / Babesia)',
      status: 'Negative',
      samplingDate: '2026-10-14',
      laboratoryName: 'Trung tâm Chẩn đoán Thú y Trung ương (NCVD)',
      file: null,
      filePreviewUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
      fileName: 'NCVD_Test_Result_Piroplasmosis_Negative.pdf',
    },
    WNV: {
      diseaseKey: 'WNV',
      diseaseName: 'Sốt Tây Sông Nile (WNV - West Nile Virus)',
      status: 'Negative',
      samplingDate: '2026-10-14',
      laboratoryName: 'Trung tâm Chẩn đoán Thú y Trung ương (NCVD)',
      file: null,
      filePreviewUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
      fileName: 'NCVD_Test_Result_WNV_Negative.pdf',
    },
  });

  const [vaccinations, setVaccinations] = useState<VaccinationEntry[]>([
    {
      id: 'vac-1',
      vaccineName: 'Equine Influenza (Cúm ngựa bắt buộc)',
      administeredDate: '2026-09-15',
      batchNumber: 'EI-8842-FL',
      veterinarian: 'TS. BSTY. Trần Đình Quang',
    },
    {
      id: 'vac-2',
      vaccineName: 'Tetanus Toxoid (U ván bắt buộc)',
      administeredDate: '2026-08-20',
      batchNumber: 'TET-9014-VN',
      veterinarian: 'TS. BSTY. Trần Đình Quang',
    },
  ]);

  const [vaccinationBookImages, setVaccinationBookImages] = useState<{ id: string; url: string; name: string }[]>([
    {
      id: 'vac-img-1',
      name: 'So_Tiem_Phong_Veterinary_Record.jpg',
      url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    },
  ]);

  const [medicalApproval, setMedicalApproval] = useState<MedicalApproval>({
    isQuarantineEligible: true,
    allFourTestsPassed: true,
    officialCertIssued: true,
    officialCertNumber: 'CCTY-V6-XK-2026/09428',
    officialCertFile: null,
    officialCertFileName: 'Export_Health_Certificate_Saigon_Narita.pdf',
    officialCertPreviewUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    approvedByDoctor: 'TS. BSTY. Trần Đình Quang',
    approvalDate: '2026-10-17',
  });

  const [vehicles, setVehicles] = useState<{
    leg1: LegVehicleInfo;
    leg2: LegVehicleInfo;
    leg3: LegVehicleInfo;
    leg4: LegVehicleInfo;
  }>({
    leg1: {
      legNumber: 1,
      legTitle: 'Nội địa xuất phát (Từ nơi cách ly ra Sân bay Tân Sơn Nhất)',
      vehiclePlateOrFlight: '51C-982.34',
      vehicleTypeOrContainer: 'Xe thùng đệm hơi 2 ngựa chuyên dụng có điều hòa',
      departureTime: '2026-11-12T04:30',
      estimatedArrivalTime: '2026-11-12T05:30',
      destinationDetails: 'Kho hàng hóa TCS - Sân bay Quốc tế Tân Sơn Nhất (SGN)',
    },
    leg2: {
      legNumber: 2,
      legTitle: 'Đường hàng không (Chuyến bay SGN sang NRT Nhật Bản)',
      vehiclePlateOrFlight: 'JL752 (Boeing 787 Freighter)',
      vehicleTypeOrContainer: 'Lồng ngựa chuyên dụng IATA Air Stall Certified',
      departureTime: '2026-11-12T08:00',
      estimatedArrivalTime: '2026-11-12T15:30',
      destinationDetails: 'Sân bay Quốc tế Narita (NRT) - Trạm AQS Tokyo',
    },
    leg3: {
      legNumber: 3,
      legTitle: 'Đón tại sân bay đến (Từ Narita về Trạm kiểm dịch AQS)',
      vehiclePlateOrFlight: 'Chiba 800 A 77-21',
      vehicleTypeOrContainer: 'Horsebox chuyên dụng Nhật Bản có giảm chấn khí nén',
      departureTime: '2026-11-12T17:00',
      estimatedArrivalTime: '2026-11-12T17:45',
      destinationDetails: 'Trạm kiểm dịch Động vật AQS Narita Sub-station',
    },
    leg4: {
      legNumber: 4,
      legTitle: 'Giao ngựa đến Trường đua (Từ trạm cách ly đến Tokyo Racecourse)',
      vehiclePlateOrFlight: 'Tokyo 800 B 12-88',
      vehicleTypeOrContainer: 'Xe chuyên chở ngựa đua JRA VIP Transporter',
      departureTime: '2026-11-20T09:00',
      estimatedArrivalTime: '2026-11-20T11:00',
      destinationDetails: 'Khu chuồng trại Tokyo Racecourse (Fuchu, Tokyo)',
    },
  });

  const [crews, setCrews] = useState<{
    leg1Crew: LegCrewInfo;
    flightCrew: LegCrewInfo;
    leg4Crew: LegCrewInfo;
  }>({
    leg1Crew: {
      driverName: 'Nguyễn Văn Thành',
      driverPhone: '0903.111.222',
      driverLicense: 'D091244',
      healthEscortName: 'BSTY. Lê Hoàng Long',
      healthEscortPhone: '0918.777.888',
    },
    flightCrew: {
      flightEscortName: 'TS. BSTY. Trần Đình Quang',
      flightEscortPassport: 'C9921445',
      flightEscortPhone: '+84 918 234 567',
    },
    leg4Crew: {
      driverName: 'Kenji Takahashi',
      healthEscortName: 'Dr. Akira Sato (JRA Vet)',
    },
  });

  // Đồng bộ khi initialData thay đổi
  useEffect(() => {
    if (initialData?.horseMedicalProfile) {
      setHorseMedicalProfile((prev) => ({
        ...prev,
        ...initialData.horseMedicalProfile,
      }));
    }
  }, [initialData]);

  // Handler lưu gói dữ liệu hoàn chỉnh
  const compilePackageData = (): JapanRoutePackageData => ({
    vnQuarantineDossier,
    vnCustomsDeclaration,
    jpInternationalPermits,
    veterinaryAgency,
    horseMedicalProfile,
    medicalRequisition,
    flightDetails: flight,
    animalProfile: animal,
    stakeholders,
    quarantineBooking: quarantine,
    bloodTests,
    vaccinations,
    vaccinationBookImages,
    medicalApproval,
    vehicles,
    crews,
  });

  const handlePackageSubmit = () => {
    const fullData = compilePackageData();
    if (onSubmitToAqs) {
      onSubmitToAqs(fullData);
    } else {
      alert('🚀 Đã xác thực thành công bộ hồ sơ! Toàn bộ 10 thành phần hồ sơ Việt Nam và Nhật Bản đã sẵn sàng.');
    }
    if (onSave) {
      onSave(fullData);
    }
  };

  return (
    <div className="jp-route-container">
      {/* Banner Tuyến Nhật Bản */}
      <div className="jp-main-banner">
        <div>
          <h1 className="jp-banner-title">
            <span>🇻🇳 ➔ 🇯🇵</span>
            <span>Hồ Sơ & Kiểm Dịch Vận Chuyển Ngựa Đua: VIỆT NAM - NHẬT BẢN</span>
          </h1>
          <p className="jp-banner-desc">
            Quy trình hoàn chỉnh theo 2 nhóm giấy tờ pháp lý cốt lõi: <strong>(1) Nhóm Giấy tờ Việt Nam</strong> (Hồ sơ Kiểm dịch Thú y qua Cổng Một cửa quốc gia & Tờ khai Hải quan Tạm xuất - Tái nhập G12) và <strong>(2) Nhóm Giấy tờ Quốc tế</strong> (Giấy phép Nhập khẩu Tạm thời & Yêu cầu xét nghiệm từ MAFF Nhật Bản).
          </p>
        </div>
        <div className="jp-flag-badge">
          Chuẩn OIE • Cổng NSW • Hải quan VNACCS G12 • AQS MAFF Nhật Bản
        </div>
      </div>

      {/* Tabs Chuyển các Phân hệ theo Luồng Nghiệp Vụ Chuẩn */}
      <div className="jp-tab-navigation">
        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'vn_quarantine' ? 'active' : ''}`}
          onClick={() => setActiveTab('vn_quarantine')}
        >
          <span>🇻🇳 1.1 Thú Y:</span>
          <span>Đơn & Hộ Chiếu (Cổng NSW)</span>
        </button>

        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'vn_customs' ? 'active' : ''}`}
          onClick={() => setActiveTab('vn_customs')}
        >
          <span>🇻🇳 1.2 Hải Quan:</span>
          <span>Tạm Xuất Tái Nhập (G12)</span>
        </button>

        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'jp_permits' ? 'active' : ''}`}
          onClick={() => setActiveTab('jp_permits')}
        >
          <span>🇯🇵 2. Quốc Tế:</span>
          <span>Giấy Phép MAFF Nhật Bản</span>
        </button>

        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'step1_medical_quarantine' ? 'active' : ''}`}
          onClick={() => setActiveTab('step1_medical_quarantine')}
        >
          <span>🔬 Y Tế:</span>
          <span>4 Bệnh Máu & Sổ Tiêm</span>
        </button>

        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'step1_requisition' ? 'active' : ''}`}
          onClick={() => setActiveTab('step1_requisition')}
        >
          <span>🩺 Đơn Lab:</span>
          <span>Chỉ Định Xét Nghiệm</span>
        </button>

        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'step2_logistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('step2_logistics')}
        >
          <span>🚚 Điều Phối:</span>
          <span>Phương Tiện & Hộ Tống</span>
        </button>

        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'step3_declaration' ? 'active' : ''}`}
          onClick={() => setActiveTab('step3_declaration')}
        >
          <span>📋 Khai Báo:</span>
          <span>Pre-Departure Form</span>
        </button>

        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'dossier_summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('dossier_summary')}
        >
          <span>📦 Tổng Hợp:</span>
          <span>Master Dossier & Checklist</span>
        </button>
      </div>

      {/* =========================================================================
          NỘI DUNG THEO TAB ĐANG CHỌN
         ========================================================================= */}

      {/* 1.1 NHÓM HỒ SƠ KIỂM DỊCH THÚ Y VIỆT NAM */}
      {activeTab === 'vn_quarantine' && (
        <VietnamQuarantineDossier
          data={vnQuarantineDossier}
          onChange={setVnQuarantineDossier}
          onOpenZoom={handleOpenZoom}
          isReadOnly={isReadOnly}
        />
      )}

      {/* 1.2 NHÓM TỜ KHAI HẢI QUAN TẠM XUẤT - TÁI NHẬP */}
      {activeTab === 'vn_customs' && (
        <VietnamCustomsDeclaration
          data={vnCustomsDeclaration}
          onChange={setVnCustomsDeclaration}
          onOpenZoom={handleOpenZoom}
          isReadOnly={isReadOnly}
        />
      )}

      {/* 2. NHÓM GIẤY TỜ QUỐC TẾ DO PHÍA NHẬT BẢN CẤP */}
      {activeTab === 'jp_permits' && (
        <JapanInternationalPermits
          data={jpInternationalPermits}
          onChange={setJpInternationalPermits}
          onOpenZoom={handleOpenZoom}
          isReadOnly={isReadOnly}
        />
      )}

      {/* 4 BỆNH MÁU & SỔ TIÊM PHÒNG */}
      {activeTab === 'step1_medical_quarantine' && (
        <JapanMedicalQuarantine
          bloodTests={bloodTests}
          onBloodTestChange={(key, field, val) =>
            setBloodTests((prev) => ({ ...prev, [key]: { ...prev[key], [field]: val } }))
          }
          onBloodTestImageUpload={(key, file) => {
            if (!file) return;
            const url = URL.createObjectURL(file);
            setBloodTests((prev) => ({
              ...prev,
              [key]: { ...prev[key], file, fileName: file.name, filePreviewUrl: url },
            }));
          }}
          vaccinations={vaccinations}
          onAddVaccination={() =>
            setVaccinations((prev) => [
              ...prev,
              {
                id: `vac-${Date.now()}`,
                vaccineName: 'Equine Influenza',
                administeredDate: '',
                batchNumber: '',
                veterinarian: '',
              },
            ])
          }
          onVaccinationChange={(id, field, val) =>
            setVaccinations((prev) =>
              prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
            )
          }
          onRemoveVaccination={(id) =>
            setVaccinations((prev) => prev.filter((v) => v.id !== id))
          }
          vaccinationBookImages={vaccinationBookImages}
          onVaccinationBookUpload={(files) => {
            if (!files) return;
            const newImgs = Array.from(files).map((f) => ({
              id: `vimg-${Date.now()}-${Math.random()}`,
              name: f.name,
              url: URL.createObjectURL(f),
            }));
            setVaccinationBookImages((prev) => [...prev, ...newImgs]);
          }}
          onRemoveVaccineImage={(id) =>
            setVaccinationBookImages((prev) => prev.filter((img) => img.id !== id))
          }
          medicalApproval={medicalApproval}
          onMedicalApprovalChange={(field, val) =>
            setMedicalApproval((prev) => ({ ...prev, [field]: val }))
          }
          onOfficialCertUpload={(file) => {
            if (!file) return;
            const url = URL.createObjectURL(file);
            setMedicalApproval((prev) => ({
              ...prev,
              officialCertFile: file,
              officialCertFileName: file.name,
              officialCertPreviewUrl: url,
            }));
          }}
          onOpenZoom={handleOpenZoom}
        />
      )}

      {/* ĐƠN CHỈ ĐỊNH XÉT NGHIỆM Y TẾ THÚ Y */}
      {activeTab === 'step1_requisition' && (
        <JapanMedicalTestRequisition
          agency={veterinaryAgency}
          onAgencyChange={(f, v) => setVeterinaryAgency((prev) => ({ ...prev, [f]: v }))}
          horseProfile={horseMedicalProfile}
          onHorseProfileChange={(f, v) => setHorseMedicalProfile((prev) => ({ ...prev, [f]: v }))}
          requisition={medicalRequisition}
          onRequisitionChange={(f, v) => setMedicalRequisition((prev) => ({ ...prev, [f]: v }))}
          onDiseaseToggle={(k) =>
            setMedicalRequisition((prev) => ({
              ...prev,
              selectedDiseases: {
                ...prev.selectedDiseases,
                [k]: !prev.selectedDiseases[k],
              },
            }))
          }
        />
      )}

      {/* PHƯƠNG TIỆN & ĐỘI NGŨ HỘ TỐNG 4 CHẶNG */}
      {activeTab === 'step2_logistics' && (
        <JapanLogisticsEscort
          vehicles={vehicles}
          onVehicleChange={(legKey, field, value) =>
            setVehicles((prev) => ({
              ...prev,
              [legKey]: { ...prev[legKey], [field]: value },
            }))
          }
          crews={crews}
          onCrewChange={(crewKey, field, value) =>
            setCrews((prev) => ({
              ...prev,
              [crewKey]: { ...prev[crewKey], [field]: value },
            }))
          }
        />
      )}

      {/* FORM KHAI BÁO PRE-DEPARTURE AQS */}
      {activeTab === 'step3_declaration' && (
        <JapanPreDepartureDoc
          flight={flight}
          onFlightChange={(f, v) => setFlight((prev) => ({ ...prev, [f]: v }))}
          animal={animal}
          onAnimalChange={(f, v) => setAnimal((prev) => ({ ...prev, [f]: v }))}
          stakeholders={stakeholders}
          onStakeholderChange={(party, field, value) =>
            setStakeholders((prev) => ({
              ...prev,
              [party]: { ...prev[party], [field]: value },
            }))
          }
          quarantine={quarantine}
          onQuarantineChange={(f, v) => setQuarantine((prev) => ({ ...prev, [f]: v }))}
          onQuarantineFileUpload={(type, file) => {
            if (!file) return;
            const previewUrl = URL.createObjectURL(file);
            if (type === 'vnCert') {
              setQuarantine((prev) => ({
                ...prev,
                vnCertificateFile: file,
                vnCertificateFileName: file.name,
                vnCertificatePreviewUrl: previewUrl,
              }));
            } else {
              setQuarantine((prev) => ({
                ...prev,
                jpBookingConfirmationFile: file,
                jpBookingConfirmationFileName: file.name,
                jpBookingConfirmationPreviewUrl: previewUrl,
              }));
            }
          }}
          onOpenZoom={handleOpenZoom}
        />
      )}

      {/* BẢNG TỔNG HỢP TIẾN ĐỘ MASTER DOSSIER */}
      {activeTab === 'dossier_summary' && (
        <ComprehensiveDossierSummary
          packageData={compilePackageData()}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenZoom={handleOpenZoom}
        />
      )}

      {/* Thanh nút hành động phía dưới */}
      {!isReadOnly && (
        <div className="jp-bottom-actions">
          {activeTab !== 'vn_quarantine' && (
            <button
              type="button"
              className="jp-btn-secondary"
              onClick={() => {
                const tabs: JapanRouteTab[] = [
                  'vn_quarantine',
                  'vn_customs',
                  'jp_permits',
                  'step1_medical_quarantine',
                  'step1_requisition',
                  'step2_logistics',
                  'step3_declaration',
                  'dossier_summary',
                ];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex > 0) {
                  setActiveTab(tabs[currentIndex - 1]);
                }
              }}
            >
              ⬅️ Quay lại phân hệ trước
            </button>
          )}

          {activeTab !== 'dossier_summary' ? (
            <button
              type="button"
              className="jp-btn-primary"
              onClick={() => {
                const tabs: JapanRouteTab[] = [
                  'vn_quarantine',
                  'vn_customs',
                  'jp_permits',
                  'step1_medical_quarantine',
                  'step1_requisition',
                  'step2_logistics',
                  'step3_declaration',
                  'dossier_summary',
                ];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex < tabs.length - 1) {
                  setActiveTab(tabs[currentIndex + 1]);
                }
              }}
            >
              Tiếp tục sang phân hệ sau ➔
            </button>
          ) : (
            <button
              type="button"
              className="jp-btn-primary"
              onClick={handlePackageSubmit}
            >
              🚀 Xác Thực & Gửi Toàn Bộ Bộ Hồ Sơ Xuất Ngoại Đi Nhật (Submit AQS)
            </button>
          )}
        </div>
      )}

      {/* Modal Zoom Xem Ảnh */}
      <ImageZoomModal
        isOpen={zoomModal.isOpen}
        imageUrl={zoomModal.imageUrl}
        imageTitle={zoomModal.imageTitle}
        onClose={() => setZoomModal({ isOpen: false, imageUrl: '', imageTitle: '' })}
      />
    </div>
  );
};
