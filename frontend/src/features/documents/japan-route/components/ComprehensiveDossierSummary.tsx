import React, { useState } from 'react';
import type { JapanRoutePackageData } from '../types/japanRoute.types';

interface ComprehensiveDossierSummaryProps {
  packageData: JapanRoutePackageData;
  onNavigateTab: (tab: any) => void;
  onOpenZoom?: (url: string, title: string) => void;
}

export const ComprehensiveDossierSummary: React.FC<ComprehensiveDossierSummaryProps> = ({
  packageData,
  onNavigateTab,
}) => {
  const [showFullDossierModal, setShowFullDossierModal] = useState(false);

  const { vnQuarantineDossier, vnCustomsDeclaration, jpInternationalPermits, bloodTests } = packageData;

  // Tính toán trạng thái các mục
  const checklist = [
    // 1.1 Kiểm dịch thú y
    {
      id: 'doc-1.1.1',
      group: '1. NHÓM GIẤY TỜ VIỆT NAM (1.1 Thú y)',
      name: 'Đơn đăng ký kiểm dịch động vật xuất khẩu (Mẫu 01 CCTY)',
      isComplete: Boolean(
        vnQuarantineDossier.quarantineApplication.applicantName &&
        vnQuarantineDossier.quarantineApplication.applicantPhone &&
        vnQuarantineDossier.quarantineApplication.departureOrigin &&
        vnQuarantineDossier.quarantineApplication.exportPort
      ),
      details: vnQuarantineDossier.quarantineApplication.nswApplicationCode
        ? `Mã NSW: ${vnQuarantineDossier.quarantineApplication.nswApplicationCode}`
        : 'Cần bổ sung thông tin chủ hàng và nơi xuất phát',
      targetTab: 'vn_quarantine',
    },
    {
      id: 'doc-1.1.2',
      group: '1. NHÓM GIẤY TỜ VIỆT NAM (1.1 Thú y)',
      name: 'Hộ chiếu ngựa (Equine Passport) & Sổ tiêm phòng',
      isComplete: Boolean(
        vnQuarantineDossier.passportAndVaccine.microchipNumber.length === 15 &&
        vnQuarantineDossier.passportAndVaccine.passportScans.length > 0 &&
        vnQuarantineDossier.passportAndVaccine.vaccinationHistory.length > 0
      ),
      details: `Chip: ${vnQuarantineDossier.passportAndVaccine.microchipNumber || 'Chưa đủ 15 số'} | ${vnQuarantineDossier.passportAndVaccine.passportScans.length} trang scan`,
      targetTab: 'vn_quarantine',
    },

    // 1.2 Hải quan
    {
      id: 'doc-1.2.1',
      group: '1. NHÓM GIẤY TỜ VIỆT NAM (1.2 Hải quan)',
      name: 'Thư mời tham gia giải đua từ Ban tổ chức nước ngoài',
      isComplete: Boolean(
        vnCustomsDeclaration.invitationLetter.organizerName &&
        vnCustomsDeclaration.invitationLetter.tournamentName &&
        vnCustomsDeclaration.invitationLetter.invitationFiles.length > 0
      ),
      details: vnCustomsDeclaration.invitationLetter.tournamentName || 'Cần nhập tên giải & đính kèm thư mời',
      targetTab: 'vn_customs',
    },
    {
      id: 'doc-1.2.2',
      group: '1. NHÓM GIẤY TỜ VIỆT NAM (1.2 Hải quan)',
      name: 'Xác nhận sở hữu ngựa (Chứng nhận / Khai sinh giống / Thẻ CLB)',
      isComplete: Boolean(
        vnCustomsDeclaration.ownershipConfirmation.certificateNumber &&
        vnCustomsDeclaration.ownershipConfirmation.ownershipFiles.length > 0
      ),
      details: `Số: ${vnCustomsDeclaration.ownershipConfirmation.certificateNumber || 'Chưa điền'}`,
      targetTab: 'vn_customs',
    },
    {
      id: 'doc-1.2.3',
      group: '1. NHÓM GIẤY TỜ VIỆT NAM (1.2 Hải quan)',
      name: 'Thông tin định danh chủ ngựa (CCCD hoặc ĐKKD Doanh nghiệp)',
      isComplete: Boolean(
        vnCustomsDeclaration.identityProfile.idNumberOrBusinessCode &&
        vnCustomsDeclaration.identityProfile.identityFiles.length > 0
      ),
      details: `Định danh: ${vnCustomsDeclaration.identityProfile.idNumberOrBusinessCode || 'Chưa có'}`,
      targetTab: 'vn_customs',
    },
    {
      id: 'doc-1.2.4',
      group: '1. NHÓM GIẤY TỜ VIỆT NAM (1.2 Hải quan)',
      name: 'Giấy chứng nhận Kiểm dịch động vật xuất khẩu (Bản chính CCTY Vùng)',
      isComplete: Boolean(
        vnCustomsDeclaration.exportHealthCertificate.certNumber &&
        vnCustomsDeclaration.exportHealthCertificate.isOriginalHardcopyAttached
      ),
      details: vnCustomsDeclaration.exportHealthCertificate.certNumber
        ? `Số CCTY: ${vnCustomsDeclaration.exportHealthCertificate.certNumber} (Đã có bản chính)`
        : 'Chứng từ bắt buộc để thông quan hàng hóa',
      targetTab: 'vn_customs',
    },
    {
      id: 'doc-1.2.5',
      group: '1. NHÓM GIẤY TỜ VIỆT NAM (1.2 Hải quan)',
      name: 'Chứng từ vận chuyển (Air Waybill - AWB & Lịch bay / Hợp đồng)',
      isComplete: Boolean(
        vnCustomsDeclaration.transportDocuments.airWaybillNumber &&
        vnCustomsDeclaration.transportDocuments.transportFiles.length > 0
      ),
      details: `AWB: ${vnCustomsDeclaration.transportDocuments.airWaybillNumber || 'Chưa có số vận đơn'}`,
      targetTab: 'vn_customs',
    },

    // 2. Giấy tờ quốc tế Nhật Bản
    {
      id: 'doc-2.1',
      group: '2. NHÓM GIẤY TỜ QUỐC TẾ (Nhật Bản cấp)',
      name: 'Giấy phép nhập khẩu tạm thời (Temporary Import Permit - AQS MAFF)',
      isComplete: Boolean(
        jpInternationalPermits.temporaryImportPermit.permitNumber &&
        jpInternationalPermits.temporaryImportPermit.complianceCommitmentAgreed &&
        jpInternationalPermits.temporaryImportPermit.permitFiles.length > 0
      ),
      details: `Permit: ${jpInternationalPermits.temporaryImportPermit.permitNumber || 'Chưa có giấy phép Nhật'}`,
      targetTab: 'jp_permits',
    },
    {
      id: 'doc-2.2',
      group: '2. NHÓM GIẤY TỜ QUỐC TẾ (Nhật Bản cấp)',
      name: 'Hồ sơ Y tế / Yêu cầu xét nghiệm từ Nhật (4 Bệnh Máu Bắt Buộc)',
      isComplete: Boolean(
        bloodTests.EIA.status === 'Negative' &&
        bloodTests.EVA.status === 'Negative' &&
        bloodTests.Piroplasmosis.status === 'Negative' &&
        bloodTests.WNV.status === 'Negative'
      ),
      details: 'Phải đạt kết quả Âm tính cả 4 chỉ tiêu: EIA, EVA, Piroplasmosis, WNV',
      targetTab: 'step1_medical_quarantine',
    },
  ];

  const totalDocs = checklist.length;
  const completedDocs = checklist.filter((item) => item.isComplete).length;
  const completionPercent = Math.round((completedDocs / totalDocs) * 100);

  return (
    <div className="jp-module-section">
      {/* Tiêu đề Phân hệ */}
      <div className="jp-section-header">
        <div className="jp-section-badge jp-badge-green">TỔNG HỢP TOÀN BỘ BỘ HỒ SƠ</div>
        <h2 className="jp-section-title">
          📦 Bảng Kiểm Tra Tiến Độ & Xuất Bộ Hồ Sơ Xuất Ngoại Tuyến Nhật Bản
        </h2>
        <p className="jp-section-desc">
          Đối soát tự động toàn bộ 10 thành phần hồ sơ bắt buộc thuộc Nhóm Giấy tờ Việt Nam và Nhóm Giấy tờ Quốc tế do Nhật Bản cấp, sẵn sàng cho công tác thông quan và kiểm dịch tại sân bay.
        </p>
      </div>

      {/* Tiến độ hoàn thiện */}
      <div className="jp-dossier-progress-box">
        <div className="jp-flex-between">
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>
              Tiến Độ Hoàn Tất Bộ Hồ Sơ: {completionPercent}%
            </h3>
            <span style={{ fontSize: '14px', color: '#64748b' }}>
              Đã hoàn thành <strong>{completedDocs}/{totalDocs}</strong> chứng từ bắt buộc
            </span>
          </div>
          <button
            type="button"
            className="jp-btn-primary"
            onClick={() => setShowFullDossierModal(true)}
          >
            📋 Xem Trích Yếu Toàn Bộ Hồ Sơ (Master Dossier)
          </button>
        </div>

        <div className="jp-progress-track">
          <div
            className="jp-progress-fill"
            style={{
              width: `${completionPercent}%`,
              backgroundColor: completionPercent === 100 ? '#10b981' : completionPercent > 60 ? '#2563eb' : '#f59e0b',
            }}
          />
        </div>
      </div>

      {/* Bảng Checklist 10 Thành phần */}
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">✅</span> Danh Mục 10 Thành Phần Hồ Sơ Theo Quy Chuẩn
        </h3>

        <div className="jp-table-wrapper">
          <table className="jp-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Phân nhóm tài liệu</th>
                <th>Tên thành phần chứng từ</th>
                <th>Thông tin trích lục</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {checklist.map((item, idx) => (
                <tr key={item.id} className={item.isComplete ? 'jp-row-done' : 'jp-row-pending'}>
                  <td>
                    <strong>{idx + 1}</strong>
                  </td>
                  <td>
                    <span className="jp-group-tag">{item.group}</span>
                  </td>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: '#475569' }}>{item.details}</span>
                  </td>
                  <td>
                    {item.isComplete ? (
                      <span className="jp-status-pill status-negative">✔️ Đầy đủ</span>
                    ) : (
                      <span className="jp-status-pill status-pending">⏳ Còn thiếu / Cần kiểm tra</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="jp-btn-secondary jp-btn-sm"
                      onClick={() => onNavigateTab(item.targetTab)}
                    >
                      Chỉnh sửa ➔
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TRÍCH YẾU MASTER DOSSIER */}
      {showFullDossierModal && (
        <div className="jp-modal-overlay" onClick={() => setShowFullDossierModal(false)}>
          <div className="jp-modal-container jp-modal-printable" onClick={(e) => e.stopPropagation()}>
            <div className="jp-modal-header">
              <h3>BẢN TỔNG HỢP TRÍCH YẾU BỘ HỒ SƠ XUẤT NGOẠI (VIỆT NAM ➔ NHẬT BẢN)</h3>
              <button
                type="button"
                className="jp-modal-close"
                onClick={() => setShowFullDossierModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="jp-official-paper">
              <div className="jp-paper-header-grid">
                <div className="jp-paper-org">
                  <strong>RACEHORSE TRANSPORTATION DOSSIER</strong>
                  <div style={{ fontWeight: 700 }}>HỆ THỐNG VẬN TẢI NGỰA ĐUA CHUYÊN BIỆT</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>
                    Tuyến: <strong>VIỆT NAM (SGN/HAN) ➔ NHẬT BẢN (NRT/KIX)</strong>
                  </div>
                </div>
                <div className="jp-paper-motto">
                  <strong>BẢN ĐỐI SOÁT HỒ SƠ THÔNG QUAN & KIỂM DỊCH</strong>
                  <div style={{ fontSize: '11px' }}>
                    Thời gian tạo: {new Date().toLocaleString('vi-VN')}
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    Độ hoàn thiện: <strong>{completionPercent}%</strong>
                  </div>
                </div>
              </div>

              <div className="jp-paper-body" style={{ marginTop: '16px' }}>
                <h4 style={{ color: '#b91c1c', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>
                  1. NHÓM GIẤY TỜ VIỆT NAM (CƠ QUAN TRONG NƯỚC XỬ LÝ)
                </h4>
                <div style={{ marginBottom: '12px' }}>
                  <strong>1.1. Hồ sơ Kiểm dịch Thú y (Cổng Một cửa Quốc gia & Chi cục Thú y):</strong>
                  <ul>
                    <li>
                      <strong>Đơn đăng ký kiểm dịch động vật xuất khẩu (Mẫu 01 CCTY):</strong> Mã NSW <code>{vnQuarantineDossier.quarantineApplication.nswApplicationCode || 'N/A'}</code> | Chủ hàng: {vnQuarantineDossier.quarantineApplication.applicantName} | SĐT: {vnQuarantineDossier.quarantineApplication.applicantPhone} | Loài: Ngựa (01 con) | Mục đích: {vnQuarantineDossier.quarantineApplication.exportPurpose} | Xuất phát: {vnQuarantineDossier.quarantineApplication.departureOrigin} | Cửa khẩu: {vnQuarantineDossier.quarantineApplication.exportPort}
                    </li>
                    <li>
                      <strong>Hộ chiếu ngựa & Sổ tiêm phòng:</strong> Microchip <code>{vnQuarantineDossier.passportAndVaccine.microchipNumber}</code> ({vnQuarantineDossier.passportAndVaccine.microchipLocation}) | Số Hộ chiếu: {vnQuarantineDossier.passportAndVaccine.passportNumber} | Đã có {vnQuarantineDossier.passportAndVaccine.passportScans.length} tệp scan hộ chiếu | Đã tiêm {vnQuarantineDossier.passportAndVaccine.vaccinationHistory.length} mũi vắc xin bảo hộ.
                    </li>
                    <li>
                      <strong>Yêu cầu/Quy định kiểm dịch của phía Nhật Bản:</strong> Căn cứ Giấy phép số <code>{vnQuarantineDossier.japanQuarantineRegulations.referenceTemporaryImportPermitNo}</code> để Chi cục Thú y Việt Nam lấy mẫu máu chuẩn AQS MAFF.
                    </li>
                  </ul>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <strong>1.2. Tờ khai Hải quan Tạm xuất - Tái nhập (VNACCS/VCIS & Cửa khẩu):</strong>
                  <ul>
                    <li>
                      <strong>Tờ khai Hải quan G12:</strong> Số tờ khai <code>{vnCustomsDeclaration.customsHeader.declarationCode || 'Chờ mở'}</code> | Chi cục: {vnCustomsDeclaration.customsHeader.customsBranch} | Thời hạn tái nhập dự kiến: {vnCustomsDeclaration.customsHeader.plannedReImportDate}
                    </li>
                    <li>
                      <strong>Thư mời giải đua:</strong> {vnCustomsDeclaration.invitationLetter.organizerName} mời tham gia giải <em>{vnCustomsDeclaration.invitationLetter.tournamentName}</em> ({vnCustomsDeclaration.invitationLetter.startDate} ➔ {vnCustomsDeclaration.invitationLetter.endDate}).
                    </li>
                    <li>
                      <strong>Xác nhận sở hữu ngựa:</strong> Chứng từ số <code>{vnCustomsDeclaration.ownershipConfirmation.certificateNumber}</code> cấp bởi {vnCustomsDeclaration.ownershipConfirmation.issuingBody}.
                    </li>
                    <li>
                      <strong>Định danh chủ ngựa:</strong> {vnCustomsDeclaration.identityProfile.entityType === 'EnterpriseOrClub' ? 'Doanh nghiệp/CLB' : 'Cá nhân'} - Số <code>{vnCustomsDeclaration.identityProfile.idNumberOrBusinessCode}</code> ({vnCustomsDeclaration.identityProfile.legalRepresentative}).
                    </li>
                    <li>
                      <strong>Giấy chứng nhận Kiểm dịch động vật xuất khẩu:</strong> Số <code>{vnCustomsDeclaration.exportHealthCertificate.certNumber}</code> do {vnCustomsDeclaration.exportHealthCertificate.regionalVeterinaryOffice} cấp ({vnCustomsDeclaration.exportHealthCertificate.isOriginalHardcopyAttached ? 'ĐÃ CÓ BẢN CHÍNH THÔNG QUAN' : 'CHƯA CÓ BẢN CHÍNH'}).
                    </li>
                    <li>
                      <strong>Chứng từ vận chuyển:</strong> Vận đơn AWB <code>{vnCustomsDeclaration.transportDocuments.airWaybillNumber}</code> ({vnCustomsDeclaration.transportDocuments.airlineName}) | Lịch bay: {vnCustomsDeclaration.transportDocuments.flightSchedule}.
                    </li>
                  </ul>
                </div>

                <h4 style={{ color: '#1e3a8a', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginTop: '16px' }}>
                  2. NHÓM GIẤY TỜ QUỐC TẾ (DO PHÍA NHẬT BẢN CẤP - ĐẦU VÀO)
                </h4>
                <div>
                  <ul>
                    <li>
                      <strong>Giấy phép nhập khẩu tạm thời (Temporary Import Permit):</strong> Mã <code>{jpInternationalPermits.temporaryImportPermit.permitNumber}</code> cấp bởi AQS MAFF Japan | Hiệu lực: {jpInternationalPermits.temporaryImportPermit.validFrom} đến {jpInternationalPermits.temporaryImportPermit.validUntil} | Trạm đến: {jpInternationalPermits.temporaryImportPermit.quarantineStationJP} | Cam kết tái xuất: {jpInternationalPermits.temporaryImportPermit.complianceCommitmentAgreed ? 'ĐÃ ĐỒNG Ý' : 'CHƯA KÝ'}.
                    </li>
                    <li>
                      <strong>Hồ sơ Y tế / Yêu cầu xét nghiệm từ Nhật Bản:</strong> Phác đồ OIE/MAFF chỉ định Trung tâm Chẩn đoán Thú y TW (NCVD) thực hiện trong 30 ngày | Kết quả 4 bệnh máu: EIA ({bloodTests.EIA.status}), EVA ({bloodTests.EVA.status}), Piroplasmosis ({bloodTests.Piroplasmosis.status}), WNV ({bloodTests.WNV.status}).
                    </li>
                  </ul>
                </div>
              </div>

              <div className="jp-paper-signatures">
                <div className="jp-sig-box">
                  <strong>ĐƠN VỊ ĐIỀU PHỐI VẬN TẢI QUỐC TẾ</strong>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Xác nhận tính đầy đủ của bộ hồ sơ)</div>
                  <div style={{ height: '50px' }}></div>
                  <div>Trưởng bộ phận Thủ tục Hải quan & Kiểm dịch</div>
                </div>

                <div className="jp-sig-box">
                  <strong>CHỦ HÀNG / ĐẠI DIỆN CHỦ NGỰA</strong>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký và chịu trách nhiệm pháp lý)</div>
                  <div style={{ height: '50px' }}></div>
                  <div>Chủ hàng đăng ký</div>
                </div>
              </div>
            </div>

            <div className="jp-modal-footer">
              <button
                type="button"
                className="jp-btn-secondary"
                onClick={() => setShowFullDossierModal(false)}
              >
                Đóng lại
              </button>
              <button
                type="button"
                className="jp-btn-primary"
                onClick={() => window.print()}
              >
                🖨️ In Bảng Trích Yếu Bộ Hồ Sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
