import React, { useState, type ChangeEvent } from 'react';
import type {
  VietnamCustomsDeclarationData,
  DocumentAttachment,
} from '../types/japanRoute.types';

interface VietnamCustomsDeclarationProps {
  data: VietnamCustomsDeclarationData;
  onChange: (updater: (prev: VietnamCustomsDeclarationData) => VietnamCustomsDeclarationData) => void;
  onOpenZoom: (url: string, title: string) => void;
  isReadOnly?: boolean;
  activeRole?: 'customer' | 'staff' | 'all';
}

export const VietnamCustomsDeclaration: React.FC<VietnamCustomsDeclarationProps> = ({
  data,
  onChange,
  onOpenZoom,
  isReadOnly = false,
  activeRole = 'all',
}) => {
  const [showVnaccsPreview, setShowVnaccsPreview] = useState(false);

  // Helper upload file tổng quát
  const handleFileUpload = (
    sectionKey: 'invitationLetter' | 'ownershipConfirmation' | 'identityProfile' | 'exportHealthCertificate' | 'transportDocuments',
    fileListKey: 'invitationFiles' | 'ownershipFiles' | 'identityFiles' | 'certFiles' | 'transportFiles',
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: DocumentAttachment[] = Array.from(files).map((file, idx) => ({
      id: `${sectionKey}-${Date.now()}-${idx}`,
      name: file.name,
      url: URL.createObjectURL(file),
      size: `${(file.size / 1024).toFixed(1)} KB`,
      uploadedAt: new Date().toLocaleDateString('vi-VN'),
    }));

    onChange((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [fileListKey]: [...(prev[sectionKey] as any)[fileListKey], ...newAttachments],
      },
    }));
  };

  const handleRemoveFile = (
    sectionKey: 'invitationLetter' | 'ownershipConfirmation' | 'identityProfile' | 'exportHealthCertificate' | 'transportDocuments',
    fileListKey: 'invitationFiles' | 'ownershipFiles' | 'identityFiles' | 'certFiles' | 'transportFiles',
    fileId: string
  ) => {
    onChange((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [fileListKey]: (prev[sectionKey] as any)[fileListKey].filter((f: DocumentAttachment) => f.id !== fileId),
      },
    }));
  };

  const { customsHeader, invitationLetter, ownershipConfirmation, identityProfile, exportHealthCertificate, transportDocuments } = data;

  return (
    <div className="jp-module-section">
      {/* Tiêu đề Phân hệ */}
      <div className="jp-section-header">
        <div className="jp-section-badge jp-badge-blue">MỤC 1.2 - HẢI QUAN CỬA KHẨU</div>
        <h2 className="jp-section-title">
          🇻🇳 Tờ khai Hải quan Tạm xuất - Tái nhập (VNACCS/VCIS & Hồ sơ Cửa khẩu)
        </h2>
        <p className="jp-section-desc">
          Bộ hồ sơ hải quan chuyên biệt cho ngựa đua đi thi đấu quốc tế theo mã loại hình G12 (Tạm xuất miễn thuế), đảm bảo thông quan thuận lợi tại Cửa khẩu Sân bay Quốc tế và bảo lưu điều kiện tái nhập nguyên trạng.
        </p>
      </div>

      {/* Banner & Khối thông tin Tờ khai Hải quan (Chỉ dành cho Nhân viên hoặc Xem toàn bộ) */}
      {activeRole === 'customer' ? (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '14px', padding: '18px 22px', marginBottom: '22px' }}>
          <strong style={{ color: '#166534', fontSize: '15.5px' }}>👤 HỒ SƠ PHÁP LÝ TỜ KHAI TẠM XUẤT (G12) - PHẦN KHÁCH HÀNG:</strong>
          <p style={{ margin: '8px 0 0 0', color: '#15803d', fontSize: '14px', lineHeight: '1.55' }}>
            Quý khách chỉ cần hoàn tất 4 mục chứng từ bên dưới: <strong>1.2.1 Thư mời thi đấu</strong>, <strong>1.2.2 Xác nhận sở hữu</strong>, <strong>1.2.3 Thông tin định danh</strong> và <strong>1.2.4 Giấy kiểm dịch xuất khẩu</strong>. Khi bấm gửi, thông tin sẽ được tự động chuyển cho <strong>Nhân viên hải quan</strong> để lập Tờ khai VNACCS và Vận đơn AWB chuyên dụng.
          </p>
        </div>
      ) : (
        <>
          {/* Banner Thao tác xem Tờ khai VNACCS */}
          <div className="jp-action-banner-card jp-banner-blue">
            <div className="jp-action-banner-text">
              <span className="jp-banner-icon">🛃</span>
              <div>
                <strong>Tờ khai Hải Quan Tạm Xuất Hàng Hóa (Mã G12 - VNACCS/VCIS)</strong>
                <p>
                  Số tờ khai: <strong>{customsHeader.declarationCode || 'Chưa mở tờ khai'}</strong> | Cơ quan tiếp nhận: {customsHeader.customsBranch}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="jp-btn-primary jp-btn-lg"
              onClick={() => setShowVnaccsPreview(true)}
            >
              📄 Xem Tờ khai Hải quan Điện tử VNACCS
            </button>
          </div>

          {/* 1. KHỐI THÔNG TIN TỜ KHAI HẢI QUAN */}
          <div className="jp-card">
            <h3 className="jp-card-title">
              <span className="jp-icon">⚙️</span> Thông tin Tờ khai Hải quan (Customs Header - Nhân viên phụ trách)
            </h3>
            <div className="jp-grid-3">
              <div className="jp-form-group">
                <label className="jp-label">Mã số Tờ khai VNACCS:</label>
                <input
                  type="text"
                  className="jp-input"
                  placeholder="VD: 304892182040"
                  value={customsHeader.declarationCode}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      customsHeader: { ...prev.customsHeader, declarationCode: e.target.value },
                    }))
                  }
                  disabled={isReadOnly}
                />
              </div>

              <div className="jp-form-group">
                <label className="jp-label">Mã loại hình:</label>
                <input
                  type="text"
                  className="jp-input jp-input-readonly"
                  value={customsHeader.declarationType}
                  readOnly
                />
              </div>

              <div className="jp-form-group">
                <label className="jp-label">Thời hạn Tái nhập nguyên trạng dự kiến: <span className="jp-required">*</span></label>
                <input
                  type="date"
                  className="jp-input"
                  value={customsHeader.plannedReImportDate}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      customsHeader: { ...prev.customsHeader, plannedReImportDate: e.target.value },
                    }))
                  }
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="jp-form-group">
              <label className="jp-label">Chi cục Hải quan cửa khẩu làm thủ tục: <span className="jp-required">*</span></label>
              <select
                className="jp-select"
                value={customsHeader.customsBranch}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    customsHeader: { ...prev.customsHeader, customsBranch: e.target.value },
                  }))
                }
                disabled={isReadOnly}
              >
                <option value="Chi cục Hải quan Cửa khẩu Sân bay Quốc tế Tân Sơn Nhất - Cục Hải quan TP.HCM">
                  Chi cục Hải quan Cửa khẩu Sân bay Quốc tế Tân Sơn Nhất - Cục Hải quan TP.HCM
                </option>
                <option value="Chi cục Hải quan Cửa khẩu Sân bay Quốc tế Nội Bài - Cục Hải quan TP. Hà Nội">
                  Chi cục Hải quan Cửa khẩu Sân bay Quốc tế Nội Bài - Cục Hải quan TP. Hà Nội
                </option>
                <option value="Chi cục Hải quan Cửa khẩu Sân bay Quốc tế Đà Nẵng">
                  Chi cục Hải quan Cửa khẩu Sân bay Quốc tế Đà Nẵng
                </option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* 2. THƯ MỜI THAM GIA GIẢI ĐUA TỪ BAN TỔ CHỨC NƯỚC NGOÀI */}
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">💌</span> 1.2.1. Thư Mời Tham Gia Giải Đua Nước Ngoài (Official Invitation Letter)
        </h3>
        <p className="jp-card-subtitle">
          Thư mời từ Ban tổ chức giải đua hoặc Hiệp hội đua ngựa Nhật Bản (ghi rõ tên giải, thời gian diễn ra đi và về làm căn cứ tạm xuất tái nhập).
        </p>

        <div className="jp-grid-2">
          <div className="jp-form-group">
            <label className="jp-label">
              Tên Ban tổ chức nước ngoài / Hiệp hội đua ngựa: <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Japan Racing Association (JRA) / National Association of Racing (NAR)"
              value={invitationLetter.organizerName}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  invitationLetter: { ...prev.invitationLetter, organizerName: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Tên giải đua / Sự kiện thể thao tại Nhật Bản: <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Japan Cup Autumn Invitational 2026 / Tokyo Equine Cup"
              value={invitationLetter.tournamentName}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  invitationLetter: { ...prev.invitationLetter, tournamentName: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">
              Địa điểm thi đấu tại Nhật Bản:
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Tokyo Racecourse (Fuchu, Tokyo)"
              value={invitationLetter.tournamentLocation}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  invitationLetter: { ...prev.invitationLetter, tournamentLocation: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Thời gian bắt đầu / Ngày xuất cảnh (Đi): <span className="jp-required">*</span>
            </label>
            <input
              type="date"
              className="jp-input"
              value={invitationLetter.startDate}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  invitationLetter: { ...prev.invitationLetter, startDate: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Thời gian kết thúc giải / Tái nhập (Về): <span className="jp-required">*</span>
            </label>
            <input
              type="date"
              className="jp-input"
              value={invitationLetter.endDate}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  invitationLetter: { ...prev.invitationLetter, endDate: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>
        </div>

        {/* Upload Thư mời */}
        <div className="jp-subcard">
          <div className="jp-subcard-header">
            <h4>Bản scan Thư mời chính thức (Official Invitation Letter Scans)</h4>
            {!isReadOnly && (
              <label className="jp-btn-upload">
                📤 Tải lên bản scan Thư mời
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => handleFileUpload('invitationLetter', 'invitationFiles', e)}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {invitationLetter.invitationFiles.length === 0 ? (
            <div className="jp-empty-upload-box">
              Chưa có file scan thư mời đính kèm.
            </div>
          ) : (
            <div className="jp-tag-list">
              {invitationLetter.invitationFiles.map((doc) => (
                <span key={doc.id} className="jp-file-tag" onClick={() => onOpenZoom(doc.url, doc.name)}>
                  📜 {doc.name} ({doc.size})
                  {!isReadOnly && (
                    <button
                      type="button"
                      className="jp-tag-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile('invitationLetter', 'invitationFiles', doc.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. XÁC NHẬN SỞ HỮU NGỰA */}
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">🏆</span> 1.2.2. Xác Nhận Sở Hữu Ngựa (Proof of Ownership)
        </h3>
        <p className="jp-card-subtitle">
          Giấy chứng nhận quyền sở hữu ngựa, giấy khai sinh giống ngựa hoặc thẻ hội viên câu lạc bộ đua ngựa hợp pháp tại Việt Nam.
        </p>

        <div className="jp-grid-2">
          <div className="jp-form-group">
            <label className="jp-label">Loại chứng từ sở hữu: <span className="jp-required">*</span></label>
            <select
              className="jp-select"
              value={ownershipConfirmation.ownershipDocType}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  ownershipConfirmation: {
                    ...prev.ownershipConfirmation,
                    ownershipDocType: e.target.value as any,
                  },
                }))
              }
              disabled={isReadOnly}
            >
              <option value="CertificateOfOwnership">Giấy chứng nhận quyền sở hữu ngựa (Certificate of Ownership)</option>
              <option value="PedigreeStudBook">Giấy khai sinh giống ngựa / Phả hệ (Pedigree / Stud Book)</option>
              <option value="ClubMembership">Thẻ hội viên câu lạc bộ đua ngựa hợp pháp tại VN</option>
              <option value="All">Toàn bộ các chứng từ trên</option>
            </select>
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Số giấy chứng nhận / Thẻ hội viên: <span className="jp-required">*</span></label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: SHN-2023-0891 / PED-THOR-VN77"
              value={ownershipConfirmation.certificateNumber}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  ownershipConfirmation: { ...prev.ownershipConfirmation, certificateNumber: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">Cơ quan / Câu lạc bộ cấp:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Câu lạc bộ Thể thao Đua ngựa Sài Gòn / Hiệp hội VRA"
              value={ownershipConfirmation.issuingBody}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  ownershipConfirmation: { ...prev.ownershipConfirmation, issuingBody: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Họ tên chủ sở hữu trên giấy tờ:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="Tên cá nhân / Doanh nghiệp"
              value={ownershipConfirmation.registeredOwnerName}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  ownershipConfirmation: { ...prev.ownershipConfirmation, registeredOwnerName: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Ngày cấp chứng nhận:</label>
            <input
              type="date"
              className="jp-input"
              value={ownershipConfirmation.issueDate}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  ownershipConfirmation: { ...prev.ownershipConfirmation, issueDate: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>
        </div>

        {/* Upload giấy tờ sở hữu */}
        <div className="jp-subcard">
          <div className="jp-subcard-header">
            <h4>Bản scan Giấy chứng nhận sở hữu / Khai sinh giống / Thẻ CLB</h4>
            {!isReadOnly && (
              <label className="jp-btn-upload">
                📤 Tải lên tài liệu sở hữu
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => handleFileUpload('ownershipConfirmation', 'ownershipFiles', e)}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {ownershipConfirmation.ownershipFiles.length === 0 ? (
            <div className="jp-empty-upload-box">
              Chưa có chứng từ sở hữu đính kèm.
            </div>
          ) : (
            <div className="jp-tag-list">
              {ownershipConfirmation.ownershipFiles.map((doc) => (
                <span key={doc.id} className="jp-file-tag" onClick={() => onOpenZoom(doc.url, doc.name)}>
                  📜 {doc.name} ({doc.size})
                  {!isReadOnly && (
                    <button
                      type="button"
                      className="jp-tag-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile('ownershipConfirmation', 'ownershipFiles', doc.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. THÔNG TIN ĐỊNH DANH CHỦ THỂ */}
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">🪪</span> 1.2.3. Thông Tin Định Danh Chủ Ngựa (Identity Verification)
        </h3>
        <p className="jp-card-subtitle">
          Bản sao CCCD/Hộ chiếu (nếu chủ ngựa là cá nhân) hoặc Giấy phép đăng ký kinh doanh (nếu chủ ngựa là doanh nghiệp/tổ chức/câu lạc bộ).
        </p>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">Chủ thể đứng tên: <span className="jp-required">*</span></label>
            <select
              className="jp-select"
              value={identityProfile.entityType}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  identityProfile: { ...prev.identityProfile, entityType: e.target.value as any },
                }))
              }
              disabled={isReadOnly}
            >
              <option value="EnterpriseOrClub">Doanh nghiệp / Tổ chức / CLB (Nộp GPĐKKD & MST)</option>
              <option value="Individual">Chủ ngựa là Cá nhân (Nộp bản sao CCCD / Hộ chiếu)</option>
            </select>
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              {identityProfile.entityType === 'Individual' ? 'Số CCCD / Hộ chiếu:' : 'Mã số Doanh nghiệp / Số GPĐKKD:'} <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: 079xxxxxxxxx hoặc 0315xxxxxx"
              value={identityProfile.idNumberOrBusinessCode}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  identityProfile: { ...prev.identityProfile, idNumberOrBusinessCode: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Người đại diện theo pháp luật / Họ tên:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="Họ và tên đầy đủ"
              value={identityProfile.legalRepresentative}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  identityProfile: { ...prev.identityProfile, legalRepresentative: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="jp-grid-2">
          <div className="jp-form-group">
            <label className="jp-label">Ngày cấp:</label>
            <input
              type="date"
              className="jp-input"
              value={identityProfile.issueDate}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  identityProfile: { ...prev.identityProfile, issueDate: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Nơi cấp:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Sở KH&ĐT TP.HCM hoặc Cục Cảnh sát QLHC về TTXH"
              value={identityProfile.issuePlace}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  identityProfile: { ...prev.identityProfile, issuePlace: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>
        </div>

        {/* Upload CCCD / ĐKKD */}
        <div className="jp-subcard">
          <div className="jp-subcard-header">
            <h4>Bản sao CCCD / Hộ chiếu hoặc Giấy phép ĐKKD đính kèm</h4>
            {!isReadOnly && (
              <label className="jp-btn-upload">
                📤 Tải lên giấy tờ định danh
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => handleFileUpload('identityProfile', 'identityFiles', e)}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {identityProfile.identityFiles.length === 0 ? (
            <div className="jp-empty-upload-box">
              Chưa có file định danh đính kèm.
            </div>
          ) : (
            <div className="jp-tag-list">
              {identityProfile.identityFiles.map((doc) => (
                <span key={doc.id} className="jp-file-tag" onClick={() => onOpenZoom(doc.url, doc.name)}>
                  🪪 {doc.name} ({doc.size})
                  {!isReadOnly && (
                    <button
                      type="button"
                      className="jp-tag-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile('identityProfile', 'identityFiles', doc.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. GIẤY CHỨNG NHẬN KIỂM DỊCH ĐỘNG VẬT XUẤT KHẨU (BẢN CHÍNH DO CHI CỤC THÚ Y VÙNG CẤP) */}
      <div className="jp-card">
        <div className="jp-card-header-flex">
          <div>
            <h3 className="jp-card-title">
              <span className="jp-icon">🛡️</span> 1.2.4. Giấy Chứng Nhận Kiểm Dịch Động Vật Xuất Khẩu
            </h3>
            <p className="jp-card-subtitle">
              Bản chính chứng nhận do Chi cục Thú y Vùng cấp sau khi kiểm tra xong (<strong>Chứng từ bắt buộc phải đính kèm để thông quan hàng hóa</strong>).
            </p>
          </div>
          <span className="jp-badge-mandatory">BẮT BUỘC THÔNG QUAN</span>
        </div>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">Số Giấy chứng nhận Kiểm dịch: <span className="jp-required">*</span></label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: CCTY-V6-XK-2026/09428"
              value={exportHealthCertificate.certNumber}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  exportHealthCertificate: { ...prev.exportHealthCertificate, certNumber: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Chi cục Thú y Vùng cấp: <span className="jp-required">*</span></label>
            <select
              className="jp-select"
              value={exportHealthCertificate.regionalVeterinaryOffice}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  exportHealthCertificate: { ...prev.exportHealthCertificate, regionalVeterinaryOffice: e.target.value },
                }))
              }
              disabled={isReadOnly}
            >
              <option value="Chi cục Thú y Vùng VI (TP. Hồ Chí Minh)">Chi cục Thú y Vùng VI (TP. Hồ Chí Minh)</option>
              <option value="Chi cục Thú y Vùng I (Hà Nội)">Chi cục Thú y Vùng I (Hà Nội)</option>
              <option value="Chi cục Thú y Vùng II (Hải Phòng)">Chi cục Thú y Vùng II (Hải Phòng)</option>
              <option value="Chi cục Thú y Vùng IV (Đà Nẵng)">Chi cục Thú y Vùng IV (Đà Nẵng)</option>
            </select>
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Ngày cấp chứng nhận kiểm dịch: <span className="jp-required">*</span></label>
            <input
              type="date"
              className="jp-input"
              value={exportHealthCertificate.certifiedDate}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  exportHealthCertificate: { ...prev.exportHealthCertificate, certifiedDate: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="jp-form-group">
          <label className="jp-checkbox-label">
            <input
              type="checkbox"
              checked={exportHealthCertificate.isOriginalHardcopyAttached}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  exportHealthCertificate: {
                    ...prev.exportHealthCertificate,
                    isOriginalHardcopyAttached: e.target.checked,
                  },
                }))
              }
              disabled={isReadOnly}
            />
            <span>
              <strong>Cam kết đã có bản chính:</strong> Đã có bản chính Giấy chứng nhận kiểm dịch xuất khẩu của Chi cục Thú y vùng để xuất trình trực tiếp cho công chức Hải quan cửa khẩu.
            </span>
          </label>
        </div>

        {/* Upload file Giấy kiểm dịch */}
        <div className="jp-subcard">
          <div className="jp-subcard-header">
            <h4>Bản scan Giấy chứng nhận Kiểm dịch Xuất Khẩu (Bản chính)</h4>
            {!isReadOnly && (
              <label className="jp-btn-upload">
                📤 Tải lên bản scan Giấy kiểm dịch
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => handleFileUpload('exportHealthCertificate', 'certFiles', e)}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {exportHealthCertificate.certFiles.length === 0 ? (
            <div className="jp-empty-upload-box jp-empty-danger">
              ⚠️ Chưa tải lên bản scan Giấy kiểm dịch xuất khẩu. Đây là chứng từ bắt buộc để thông quan tờ khai G12!
            </div>
          ) : (
            <div className="jp-tag-list">
              {exportHealthCertificate.certFiles.map((doc) => (
                <span key={doc.id} className="jp-file-tag jp-file-tag-success" onClick={() => onOpenZoom(doc.url, doc.name)}>
                  📜 {doc.name} ({doc.size})
                  {!isReadOnly && (
                    <button
                      type="button"
                      className="jp-tag-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile('exportHealthCertificate', 'certFiles', doc.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. CHỨNG TỪ VẬN CHUYỂN (Chỉ dành cho Nhân viên phụ trách) */}
      {activeRole !== 'customer' && (
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">✈️</span> 1.2.5. Chứng Từ Vận Chuyển (Transport & Booking Documents - Nhân viên phụ trách)
        </h3>
        <p className="jp-card-subtitle">
          Lịch trình chuyến bay, hợp đồng thuê máy bay chuyên dụng hoặc Booking vận chuyển lồng ngựa (Air Waybill - AWB).
        </p>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">Số Vận đơn Hàng không (Air Waybill - AWB): <span className="jp-required">*</span></label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: 131-89240182"
              value={transportDocuments.airWaybillNumber}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  transportDocuments: { ...prev.transportDocuments, airWaybillNumber: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Hãng hàng không vận chuyển:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Japan Airlines Cargo / All Nippon Airways"
              value={transportDocuments.airlineName}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  transportDocuments: { ...prev.transportDocuments, airlineName: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Số hiệu chuyến bay & Lịch trình:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: JL752 SGN ➔ NRT (Khởi hành 08:30)"
              value={transportDocuments.flightSchedule}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  transportDocuments: { ...prev.transportDocuments, flightSchedule: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="jp-grid-2">
          <div className="jp-form-group">
            <label className="jp-label">Số hợp đồng thuê bao chuyến (Charter Flight) hoặc Booking:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: CTR-AIR-HORSE-2026/09"
              value={transportDocuments.dedicatedFlightContractNumber}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  transportDocuments: { ...prev.transportDocuments, dedicatedFlightContractNumber: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Quy cách Lồng ngựa chuyên dụng (Air Stall):</label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Lồng ngựa IATA Certified Horse Stall (3-horse stall configured for 1)"
              value={transportDocuments.airStallSpecification}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  transportDocuments: { ...prev.transportDocuments, airStallSpecification: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>
        </div>

        {/* Upload AWB / Hợp đồng */}
        <div className="jp-subcard">
          <div className="jp-subcard-header">
            <h4>Bản scan Vận đơn Hàng không AWB / Hợp đồng thuê máy bay chuyên dụng</h4>
            {!isReadOnly && (
              <label className="jp-btn-upload">
                📤 Tải lên AWB & Hợp đồng vận chuyển
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => handleFileUpload('transportDocuments', 'transportFiles', e)}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {transportDocuments.transportFiles.length === 0 ? (
            <div className="jp-empty-upload-box">
              Chưa có file vận đơn AWB hoặc hợp đồng vận chuyển.
            </div>
          ) : (
            <div className="jp-tag-list">
              {transportDocuments.transportFiles.map((doc) => (
                <span key={doc.id} className="jp-file-tag" onClick={() => onOpenZoom(doc.url, doc.name)}>
                  ✈️ {doc.name} ({doc.size})
                  {!isReadOnly && (
                    <button
                      type="button"
                      className="jp-tag-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile('transportDocuments', 'transportFiles', doc.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* MODAL XEM TRƯỚC TỜ KHAI HẢI QUAN VNACCS G12 */}
      {showVnaccsPreview && (
        <div className="jp-modal-overlay" onClick={() => setShowVnaccsPreview(false)}>
          <div className="jp-modal-container jp-modal-printable" onClick={(e) => e.stopPropagation()}>
            <div className="jp-modal-header">
              <h3>BẢN XEM TRƯỚC: TỜ KHAI HẢI QUAN HÀNG HÓA TẠM XUẤT (VNACCS / VCIS)</h3>
              <button
                type="button"
                className="jp-modal-close"
                onClick={() => setShowVnaccsPreview(false)}
              >
                ✕
              </button>
            </div>

            <div className="jp-official-paper">
              <div className="jp-paper-header-grid">
                <div className="jp-paper-org">
                  <strong>TỔNG CỤC HẢI QUAN VIỆT NAM</strong>
                  <div>HỆ THỐNG THÔNG QUAN ĐIỆN TỬ VNACCS/VCIS</div>
                  <div style={{ marginTop: '4px', fontSize: '11px' }}>
                    Số tờ khai: <strong>{customsHeader.declarationCode || 'CHƯA ĐĂNG KÝ'}</strong>
                  </div>
                </div>
                <div className="jp-paper-motto">
                  <strong>TỜ KHAI HÀNG HÓA TẠM XUẤT - TÁI NHẬP</strong>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>Mã loại hình: <strong>G12 (Tạm xuất thể thao/hội chợ)</strong></div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>
                    Ngày đăng ký: {customsHeader.declarationDate || new Date().toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              <div className="jp-paper-body" style={{ marginTop: '16px' }}>
                <table className="jp-official-customs-table">
                  <tbody>
                    <tr>
                      <td style={{ width: '50%' }}>
                        <strong>1. Người xuất khẩu:</strong> {identityProfile.legalRepresentative || 'Chủ sở hữu ngựa'}<br />
                        MST/CCCD: {identityProfile.idNumberOrBusinessCode}<br />
                        Nơi cấp: {identityProfile.issuePlace}
                      </td>
                      <td style={{ width: '50%' }}>
                        <strong>2. Cơ quan Hải quan tiếp nhận:</strong><br />
                        {customsHeader.customsBranch}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>3. Cửa khẩu xuất:</strong> Sân bay Tân Sơn Nhất / Nội Bài<br />
                        <strong>Nước đến:</strong> Nhật Bản (Sân bay Narita / Kansai)
                      </td>
                      <td>
                        <strong>4. Thời hạn tái nhập nguyên trạng:</strong><br />
                        <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                          {customsHeader.plannedReImportDate || 'Chưa ấn định'}
                        </span> (Phải tái nhập trước ngày này để miễn thuế nhập khẩu)
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2}>
                        <strong>5. Mục đích tạm xuất:</strong> Tham gia giải đua <em>{invitationLetter.tournamentName || 'Giải đua ngựa quốc tế'}</em> do <strong>{invitationLetter.organizerName || 'Ban tổ chức Nhật Bản'}</strong> mời từ ngày {invitationLetter.startDate} đến {invitationLetter.endDate}.
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2}>
                        <strong>6. Mô tả hàng hóa đặc thù:</strong><br />
                        - Tên hàng: Cá thể ngựa đua thuần chủng (Live Horse - Equus caballus)<br />
                        - Số lượng: 01 con<br />
                        - Chứng từ sở hữu: Số {ownershipConfirmation.certificateNumber} cấp bởi {ownershipConfirmation.issuingBody}<br />
                        - Vận chuyển: Vận đơn AWB số {transportDocuments.airWaybillNumber} ({transportDocuments.airlineName})
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ backgroundColor: '#f8fafc' }}>
                        <strong>7. Chứng từ kèm theo bắt buộc (Kiểm tra điều kiện thông quan):</strong><br />
                        ✔️ <strong>Giấy chứng nhận Kiểm dịch động vật xuất khẩu:</strong> Số <code>{exportHealthCertificate.certNumber || 'Chờ đính kèm'}</code> do {exportHealthCertificate.regionalVeterinaryOffice} cấp (Đã có bản chính xuất trình).<br />
                        ✔️ <strong>Thư mời thi đấu ban tổ chức Nhật Bản:</strong> {invitationLetter.invitationFiles.length > 0 ? 'Đã đính kèm tệp scan' : 'Chưa đính kèm'}<br />
                        ✔️ <strong>Vận đơn AWB / Hợp đồng máy bay chuyên dụng:</strong> {transportDocuments.transportFiles.length > 0 ? 'Đã đính kèm tệp scan' : 'Chưa đính kèm'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="jp-paper-signatures">
                <div className="jp-sig-box">
                  <strong>XÁC NHẬN CỦA HẢI QUAN CỬA KHẨU</strong>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Đã kiểm tra hồ sơ, đối chiếu động vật thực tế)</div>
                  <div className="jp-sig-stamp-simulated">
                    <span>TỔNG CỤC HẢI QUAN</span>
                    <span>★ HẢI QUAN CỬA KHẨU ★</span>
                    <span>G12 - TẠM XUẤT</span>
                    <span>ĐÃ THÔNG QUAN</span>
                  </div>
                  <div>Công chức Hải quan thông quan</div>
                </div>

                <div className="jp-sig-box">
                  <strong>NGƯỜI KHAI HẢI QUAN / CHỦ HÀNG</strong>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký điện tử / Đóng dấu)</div>
                  <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <em style={{ color: '#0369a1', fontFamily: 'cursive', fontSize: '18px' }}>Chữ ký số đã xác thực</em>
                  </div>
                  <strong>{identityProfile.legalRepresentative || 'Chủ thể khai báo'}</strong>
                </div>
              </div>
            </div>

            <div className="jp-modal-footer">
              <button
                type="button"
                className="jp-btn-secondary"
                onClick={() => setShowVnaccsPreview(false)}
              >
                Đóng lại
              </button>
              <button
                type="button"
                className="jp-btn-primary"
                onClick={() => window.print()}
              >
                🖨️ In Tờ Khai VNACCS G12
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
