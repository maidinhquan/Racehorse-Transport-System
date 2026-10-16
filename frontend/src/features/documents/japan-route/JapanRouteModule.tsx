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
} from './types/japanRoute.types';

import { JapanMedicalTestRequisition } from './components/JapanMedicalTestRequisition';
import { JapanPreDepartureDoc } from './components/JapanPreDepartureDoc';
import { JapanMedicalQuarantine } from './components/JapanMedicalQuarantine';
import { JapanLogisticsEscort } from './components/JapanLogisticsEscort';
import { ImageZoomModal } from './components/ImageZoomModal';

interface JapanRouteModuleProps {
  initialData?: Partial<JapanRoutePackageData>;
  onSave?: (data: JapanRoutePackageData) => void;
  onSubmitToAqs?: (data: JapanRoutePackageData) => void;
  isReadOnly?: boolean;
}

export const JapanRouteModule: React.FC<JapanRouteModuleProps> = ({
  initialData,
  onSave,
  onSubmitToAqs,
  isReadOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<
    'step1_requisition' | 'step1_medical_quarantine' | 'step2_logistics' | 'step3_declaration'
  >('step1_requisition');

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

  // 0. BƯỚC 1: ĐƠN XÉT NGHIỆM Y TẾ THÚ Y (BÊN Y TẾ & ĐỐI TƯỢNG LẤY MẪU)
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
    horseName: initialData?.horseMedicalProfile?.horseName || 'Thunderbolt',
    microchipNumber: initialData?.horseMedicalProfile?.microchipNumber || '900215001234567',
    microchipLocation: initialData?.horseMedicalProfile?.microchipLocation || 'Bờ trên dây chằng cổ trái (Nuchal ligament left)',
    breed: initialData?.horseMedicalProfile?.breed || 'Thoroughbred (Thuần chủng)',
    gender: initialData?.horseMedicalProfile?.gender || 'Gelding',
    ageOrYob: initialData?.horseMedicalProfile?.ageOrYob || '6 tuổi',
    coatColorMarkings: initialData?.horseMedicalProfile?.coatColorMarkings || 'Nâu sẫm (Bay), xoáy trán hình thoi, chân sau trái tất trắng',
    bodyTemperature: initialData?.horseMedicalProfile?.bodyTemperature || '37.8 °C',
    clinicalSigns: initialData?.horseMedicalProfile?.clinicalSigns || 'Tỉnh táo, niêm mạc mắt hồng hào, không có dịch mũi hay biểu hiện sốt/bệnh truyền nhiễm',
  }));

  useEffect(() => {
    if (initialData?.horseMedicalProfile) {
      setHorseMedicalProfile((prev) => ({
        ...prev,
        ...initialData.horseMedicalProfile,
      }));
    }
    if (initialData?.veterinaryAgency) {
      setVeterinaryAgency((prev) => ({
        ...prev,
        ...initialData.veterinaryAgency,
      }));
    }
  }, [initialData]);

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

  // 1. Phân hệ 1 State
  const [flight, setFlight] = useState<FlightDetails>({
    arrivalDate: '',
    departureAirport: 'SGN',
    arrivalAirport: 'NRT',
    flightNumber: '',
  });

  const [animal, setAnimal] = useState<AnimalProfile>({
    breed: 'Thoroughbred',
    purpose: 'Racing',
    quantity: 1,
    microchipNumber: '',
    microchipLocation: 'Nuchal Ligament Left',
    identificationMarkings: '',
  });

  const [stakeholders, setStakeholders] = useState({
    exporterVN: {
      name: '',
      address: '',
      contactPerson: '',
      phone: '',
    },
    importerJP: {
      name: '',
      address: '',
      contactPerson: '',
      phone: '',
    },
    thirdPartyAgent: {
      name: '',
      address: '',
      contactPerson: '',
      phone: '',
    },
  });

  const [quarantine, setQuarantine] = useState<QuarantineBooking>({
    vnQuarantineFacility: '',
    vnQuarantineStartDate: '',
    vnQuarantineEndDate: '',
    vnCertificateFile: null,
    vnCertificateFileName: '',
    vnCertificatePreviewUrl: '',
    jpQuarantineStation: 'AQS Narita Airport Sub-station',
    jpBookingConfirmationFile: null,
    jpBookingConfirmationFileName: '',
    jpBookingConfirmationPreviewUrl: '',
  });

  // 2. Phân hệ 2 State (Y tế & 4 Bệnh)
  const [bloodTests, setBloodTests] = useState<
    Record<'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV', BloodTestItem>
  >({
    EIA: {
      diseaseKey: 'EIA',
      diseaseName: 'Thiếu máu truyền nhiễm ở ngựa (EIA - Equine Infectious Anemia)',
      status: 'Pending',
      samplingDate: '',
      laboratoryName: '',
      file: null,
      filePreviewUrl: '',
      fileName: '',
    },
    EVA: {
      diseaseKey: 'EVA',
      diseaseName: 'Viêm động mạch ở ngựa (EVA - Equine Viral Arteritis)',
      status: 'Pending',
      samplingDate: '',
      laboratoryName: '',
      file: null,
      filePreviewUrl: '',
      fileName: '',
    },
    Piroplasmosis: {
      diseaseKey: 'Piroplasmosis',
      diseaseName: 'Bệnh Ký sinh trùng đường máu (Equine Piroplasmosis)',
      status: 'Pending',
      samplingDate: '',
      laboratoryName: '',
      file: null,
      filePreviewUrl: '',
      fileName: '',
    },
    WNV: {
      diseaseKey: 'WNV',
      diseaseName: 'Sốt Tây Sông Nile (WNV - West Nile Virus)',
      status: 'Pending',
      samplingDate: '',
      laboratoryName: '',
      file: null,
      filePreviewUrl: '',
      fileName: '',
    },
  });

  const [vaccinations, setVaccinations] = useState<VaccinationEntry[]>([
    {
      id: 'vac-1',
      vaccineName: 'Equine Influenza (Cúm ngựa bắt buộc)',
      administeredDate: '',
      batchNumber: '',
      veterinarian: '',
    },
  ]);

  const [vaccinationBookImages, setVaccinationBookImages] = useState<
    { id: string; url: string; name: string }[]
  >([]);

  const [medicalApproval, setMedicalApproval] = useState<MedicalApproval>({
    isQuarantineEligible: false,
    allFourTestsPassed: false,
    officialCertIssued: false,
    officialCertNumber: '',
    officialCertFile: null,
    officialCertFileName: '',
    officialCertPreviewUrl: '',
    approvedByDoctor: '',
    approvalDate: '',
  });

  // 3. Phân hệ 3 State (Logistics & Nhân sự)
  const [vehicles, setVehicles] = useState<{
    leg1: LegVehicleInfo;
    leg2: LegVehicleInfo;
    leg3: LegVehicleInfo;
    leg4: LegVehicleInfo;
  }>({
    leg1: {
      legNumber: 1,
      legTitle: 'Nội địa xuất phát (Từ nơi cách ly ra sân bay VN)',
      vehiclePlateOrFlight: '',
      vehicleTypeOrContainer: '',
      departureTime: '',
      estimatedArrivalTime: '',
      destinationDetails: 'Sân bay Tân Sơn Nhất / Nội Bài',
    },
    leg2: {
      legNumber: 2,
      legTitle: 'Đường hàng không (Chuyến bay sang Nhật)',
      vehiclePlateOrFlight: '',
      vehicleTypeOrContainer: '',
      departureTime: '',
      estimatedArrivalTime: '',
      destinationDetails: 'Sân bay Narita / Kansai (Nhật Bản)',
    },
    leg3: {
      legNumber: 3,
      legTitle: 'Đón tại sân bay đến (Từ sân bay về khu cách ly Nhật)',
      vehiclePlateOrFlight: '',
      vehicleTypeOrContainer: '',
      departureTime: '',
      estimatedArrivalTime: '',
      destinationDetails: 'Trạm kiểm dịch động vật AQS Narita',
    },
    leg4: {
      legNumber: 4,
      legTitle: 'Giao hàng cuối (Từ trạm cách ly đến địa điểm giao)',
      vehiclePlateOrFlight: '',
      vehicleTypeOrContainer: '',
      departureTime: '',
      estimatedArrivalTime: '',
      destinationDetails: '',
    },
  });

  const [crews, setCrews] = useState<{
    leg1Crew: LegCrewInfo;
    flightCrew: LegCrewInfo;
    leg4Crew: LegCrewInfo;
  }>({
    leg1Crew: {
      driverName: '',
      driverPhone: '',
      driverLicense: '',
      healthEscortName: '',
      healthEscortPhone: '',
    },
    flightCrew: {
      flightEscortName: '',
      flightEscortPassport: '',
      flightEscortPhone: '',
    },
    leg4Crew: {
      driverName: '',
      healthEscortName: '',
    },
  });

  // HANDLERS BƯỚC 1: ĐƠN XÉT NGHIỆM Y TẾ THÚ Y
  const handleAgencyChange = (field: keyof VeterinaryAgency, value: string) => {
    setVeterinaryAgency((prev) => ({ ...prev, [field]: value }));
  };

  const handleHorseMedicalProfileChange = (
    field: keyof HorseMedicalProfile,
    value: string
  ) => {
    setHorseMedicalProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleRequisitionChange = (
    field: keyof MedicalTestRequisition,
    value: unknown
  ) => {
    setMedicalRequisition((prev) => ({ ...prev, [field]: value }));
  };

  const handleDiseaseToggle = (
    diseaseKey: 'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV'
  ) => {
    setMedicalRequisition((prev) => ({
      ...prev,
      selectedDiseases: {
        ...prev.selectedDiseases,
        [diseaseKey]: !prev.selectedDiseases[diseaseKey],
      },
    }));
  };

  // HANDLERS PHÂN HỆ 1
  const handleFlightChange = (field: keyof FlightDetails, value: string) => {
    setFlight((prev) => ({ ...prev, [field]: value }));
  };

  const handleAnimalChange = (
    field: keyof AnimalProfile,
    value: string | number
  ) => {
    setAnimal((prev) => ({ ...prev, [field]: value }));
  };

  const handleStakeholderChange = (
    party: 'exporterVN' | 'importerJP' | 'thirdPartyAgent',
    field: 'name' | 'address' | 'contactPerson' | 'phone',
    value: string
  ) => {
    setStakeholders((prev) => ({
      ...prev,
      [party]: {
        ...prev[party],
        [field]: value,
      },
    }));
  };

  const handleQuarantineChange = (
    field: keyof QuarantineBooking,
    value: string
  ) => {
    setQuarantine((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuarantineFileUpload = (
    type: 'vnCert' | 'jpBooking',
    file: File | null
  ) => {
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
  };

  // HANDLERS PHÂN HỆ 2
  const handleBloodTestChange = (
    diseaseKey: 'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV',
    field: keyof BloodTestItem,
    value: unknown
  ) => {
    setBloodTests((prev) => ({
      ...prev,
      [diseaseKey]: {
        ...prev[diseaseKey],
        [field]: value,
      },
    }));
  };

  const handleBloodTestImageUpload = (
    diseaseKey: 'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV',
    file: File | null
  ) => {
    if (!file) {
      setBloodTests((prev) => ({
        ...prev,
        [diseaseKey]: {
          ...prev[diseaseKey],
          file: null,
          fileName: '',
          filePreviewUrl: '',
        },
      }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setBloodTests((prev) => ({
      ...prev,
      [diseaseKey]: {
        ...prev[diseaseKey],
        file,
        fileName: file.name,
        filePreviewUrl: previewUrl,
      },
    }));
  };

  const handleAddVaccination = () => {
    setVaccinations((prev) => [
      ...prev,
      {
        id: `vac-${Date.now()}`,
        vaccineName: '',
        administeredDate: '',
        batchNumber: '',
        veterinarian: '',
      },
    ]);
  };

  const handleVaccinationChange = (
    id: string,
    field: keyof VaccinationEntry,
    value: string
  ) => {
    setVaccinations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleRemoveVaccination = (id: string) => {
    setVaccinations((prev) => prev.filter((v) => v.id !== id));
  };

  const handleVaccinationBookUpload = (files: FileList | null) => {
    if (!files) return;
    const newImgs = Array.from(files).map((f) => ({
      id: `img-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(f),
      name: f.name,
    }));
    setVaccinationBookImages((prev) => [...prev, ...newImgs]);
  };

  const handleRemoveVaccineImage = (id: string) => {
    setVaccinationBookImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleMedicalApprovalChange = (
    field: keyof MedicalApproval,
    value: unknown
  ) => {
    setMedicalApproval((prev) => ({ ...prev, [field]: value }));
  };

  const handleOfficialCertUpload = (file: File | null) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setMedicalApproval((prev) => ({
      ...prev,
      officialCertFile: file,
      officialCertFileName: file.name,
      officialCertPreviewUrl: previewUrl,
      officialCertIssued: true,
    }));
  };

  // HANDLERS PHÂN HỆ 3
  const handleVehicleChange = (
    legKey: 'leg1' | 'leg2' | 'leg3' | 'leg4',
    field: keyof LegVehicleInfo,
    value: string
  ) => {
    setVehicles((prev) => ({
      ...prev,
      [legKey]: {
        ...prev[legKey],
        [field]: value,
      },
    }));
  };

  const handleCrewChange = (
    crewKey: 'leg1Crew' | 'flightCrew' | 'leg4Crew',
    field: keyof LegCrewInfo,
    value: string
  ) => {
    setCrews((prev) => ({
      ...prev,
      [crewKey]: {
        ...prev[crewKey],
        [field]: value,
      },
    }));
  };

  // ZOOM MODAL OPEN
  const handleOpenZoom = (url: string, title: string) => {
    setZoomModal({
      isOpen: true,
      imageUrl: url,
      imageTitle: title,
    });
  };

  // VALIDATION & SUBMIT
  const handlePackageSubmit = () => {
    // 1. Kiểm tra 4 bệnh
    const diseases: Array<'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV'> = [
      'EIA',
      'EVA',
      'Piroplasmosis',
      'WNV',
    ];
    const hasPositive = diseases.some((d) => bloodTests[d].status === 'Positive');
    if (hasPositive) {
      alert('❌ KHÔNG THỂ GỬI HỒ SƠ: Có ít nhất 1 bệnh có kết quả DƯƠNG TÍNH. Theo tiêu chuẩn AQS Nhật Bản, cá thể này bị từ chối nhập cảnh!');
      return;
    }

    const missingTestImages = diseases.filter((d) => !bloodTests[d].filePreviewUrl);
    if (missingTestImages.length > 0) {
      alert(`⚠️ THIẾU MINH CHỨNG: Vui lòng tải lên đầy đủ ảnh chụp phiếu xét nghiệm máu thực tế của 4 bệnh (Còn thiếu: ${missingTestImages.join(', ')})!`);
      return;
    }

    // 2. Kiểm tra Chip
    if (!animal.microchipNumber || animal.microchipNumber.length !== 15) {
      alert('⚠️ LỖI ĐỊNH DANH: Mã số vi mạch (Microchip) theo chuẩn ISO 11784/11785 đi Nhật phải gồm chính xác 15 chữ số!');
      return;
    }

    const packageData: JapanRoutePackageData = {
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
    };

    if (onSubmitToAqs) {
      onSubmitToAqs(packageData);
    } else {
      alert('✅ THÀNH CÔNG: Toàn bộ bộ hồ sơ kiểm dịch và lộ trình chuyên biệt đi Nhật Bản đã được xác thực hợp lệ và sẵn sàng gửi Cơ quan Kiểm dịch Động vật Nhật Bản (AQS)!');
    }

    if (onSave) {
      onSave(packageData);
    }
  };

  return (
    <div className="jp-route-container">
      {/* Banner Tuyến Nhật Bản */}
      <div className="jp-main-banner">
        <div>
          <h1 className="jp-banner-title">
            <span>🇯🇵 ➔ 🇻🇳</span>
            <span>Hồ sơ & Kiểm dịch Tuyến Vận chuyển VIỆT NAM - NHẬT BẢN</span>
          </h1>
          <p className="jp-banner-desc">
            Phân hệ đặc thù quản lý toàn diện quy trình kiểm dịch khắt khe, xét nghiệm 4 bệnh máu bắt buộc, đặt chỗ trạm cách ly và điều phối xe chuyên dụng theo tiêu chuẩn Bộ Nông Lâm Thủy Sản Nhật Bản (MAFF & AQS).
          </p>
        </div>
        <div className="jp-flag-badge">
          Chuẩn Thú y Quốc tế OIE & AQS Japan
        </div>
      </div>

      {/* Tabs Chuyển các Phân hệ theo Luồng Nghiệp Vụ */}
      <div className="jp-tab-navigation">
        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'step1_requisition' ? 'active' : ''}`}
          onClick={() => setActiveTab('step1_requisition')}
        >
          <span>🩺 Bước 1:</span>
          <span>Đơn xét nghiệm Y tế</span>
        </button>

        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'step1_medical_quarantine' ? 'active' : ''}`}
          onClick={() => setActiveTab('step1_medical_quarantine')}
        >
          <span>🔬 Y tế & Tiêm phòng:</span>
          <span>4 Bệnh máu & Sổ tiêm</span>
        </button>

        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'step2_logistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('step2_logistics')}
        >
          <span>🚚 Bước 2:</span>
          <span>Phương tiện & Đội ngũ</span>
        </button>

        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'step3_declaration' ? 'active' : ''}`}
          onClick={() => setActiveTab('step3_declaration')}
        >
          <span>📋 Bước 3 & 4:</span>
          <span>Cách ly & Form đi Nhật</span>
        </button>
      </div>

      {/* Nội dung theo Tab đang chọn */}
      {activeTab === 'step1_requisition' && (
        <JapanMedicalTestRequisition
          agency={veterinaryAgency}
          onAgencyChange={handleAgencyChange}
          horseProfile={horseMedicalProfile}
          onHorseProfileChange={handleHorseMedicalProfileChange}
          requisition={medicalRequisition}
          onRequisitionChange={handleRequisitionChange}
          onDiseaseToggle={handleDiseaseToggle}
        />
      )}

      {activeTab === 'step1_medical_quarantine' && (
        <JapanMedicalQuarantine
          bloodTests={bloodTests}
          onBloodTestChange={handleBloodTestChange}
          onBloodTestImageUpload={handleBloodTestImageUpload}
          vaccinations={vaccinations}
          onAddVaccination={handleAddVaccination}
          onVaccinationChange={handleVaccinationChange}
          onRemoveVaccination={handleRemoveVaccination}
          vaccinationBookImages={vaccinationBookImages}
          onVaccinationBookUpload={handleVaccinationBookUpload}
          onRemoveVaccineImage={handleRemoveVaccineImage}
          medicalApproval={medicalApproval}
          onMedicalApprovalChange={handleMedicalApprovalChange}
          onOfficialCertUpload={handleOfficialCertUpload}
          onOpenZoom={handleOpenZoom}
        />
      )}

      {activeTab === 'step2_logistics' && (
        <JapanLogisticsEscort
          vehicles={vehicles}
          onVehicleChange={handleVehicleChange}
          crews={crews}
          onCrewChange={handleCrewChange}
        />
      )}

      {activeTab === 'step3_declaration' && (
        <JapanPreDepartureDoc
          flight={flight}
          onFlightChange={handleFlightChange}
          animal={animal}
          onAnimalChange={handleAnimalChange}
          stakeholders={stakeholders}
          onStakeholderChange={handleStakeholderChange}
          quarantine={quarantine}
          onQuarantineChange={handleQuarantineChange}
          onQuarantineFileUpload={handleQuarantineFileUpload}
          onOpenZoom={handleOpenZoom}
        />
      )}

      {/* Thanh nút hành động phía dưới */}
      {!isReadOnly && (
        <div className="jp-bottom-actions">
          {activeTab !== 'step1_requisition' && (
            <button
              type="button"
              className="jp-btn-secondary"
              onClick={() => {
                if (activeTab === 'step3_declaration') setActiveTab('step2_logistics');
                else if (activeTab === 'step2_logistics') setActiveTab('step1_medical_quarantine');
                else if (activeTab === 'step1_medical_quarantine') setActiveTab('step1_requisition');
              }}
            >
              ⬅️ Quay lại phân hệ trước
            </button>
          )}

          {activeTab !== 'step3_declaration' ? (
            <button
              type="button"
              className="jp-btn-primary"
              onClick={() => {
                if (activeTab === 'step1_requisition') setActiveTab('step1_medical_quarantine');
                else if (activeTab === 'step1_medical_quarantine') setActiveTab('step2_logistics');
                else if (activeTab === 'step2_logistics') setActiveTab('step3_declaration');
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
              🚀 Xác thực & Gửi Khai báo Khẩn sang Nhật Bản (Submit AQS)
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
