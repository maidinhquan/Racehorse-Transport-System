import React, { useState } from 'react';
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
} from './types/japanRoute.types';

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
  onSave,
  onSubmitToAqs,
  isReadOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'module1' | 'module2' | 'module3'>('module1');

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

      {/* Tabs Chuyển 3 Phân hệ */}
      <div className="jp-tab-navigation">
        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'module1' ? 'active' : ''}`}
          onClick={() => setActiveTab('module1')}
        >
          <span>📁 Phân hệ 1:</span>
          <span>Hồ sơ & Giấy tờ đi Nhật</span>
        </button>

        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'module2' ? 'active' : ''}`}
          onClick={() => setActiveTab('module2')}
        >
          <span>🔬 Phân hệ 2:</span>
          <span>Y tế & Xét nghiệm 4 bệnh</span>
        </button>

        <button
          type="button"
          className={`jp-tab-btn ${activeTab === 'module3' ? 'active' : ''}`}
          onClick={() => setActiveTab('module3')}
        >
          <span>🚚 Phân hệ 3:</span>
          <span>Điều phối 4 chặng & Nhân sự</span>
        </button>
      </div>

      {/* Nội dung theo Tab đang chọn */}
      {activeTab === 'module1' && (
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

      {activeTab === 'module2' && (
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

      {activeTab === 'module3' && (
        <JapanLogisticsEscort
          vehicles={vehicles}
          onVehicleChange={handleVehicleChange}
          crews={crews}
          onCrewChange={handleCrewChange}
        />
      )}

      {/* Thanh nút hành động phía dưới */}
      {!isReadOnly && (
        <div className="jp-bottom-actions">
          {activeTab !== 'module1' && (
            <button
              type="button"
              className="jp-btn-secondary"
              onClick={() =>
                setActiveTab((prev) =>
                  prev === 'module3' ? 'module2' : 'module1'
                )
              }
            >
              ⬅️ Quay lại phân hệ trước
            </button>
          )}

          {activeTab !== 'module3' ? (
            <button
              type="button"
              className="jp-btn-primary"
              onClick={() =>
                setActiveTab((prev) =>
                  prev === 'module1' ? 'module2' : 'module3'
                )
              }
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
