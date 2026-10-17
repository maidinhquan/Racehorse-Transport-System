import React, { useState } from 'react';
import type { DocumentPackage, SpecialistTrip } from './specialist.types';
import { Icon } from './specialist.types';

interface RenderDocumentPackagesPageProps {
  packages: DocumentPackage[];
  trips: SpecialistTrip[];
  lang: 'vi' | 'en';
  onMarkReady: (pkgId: string) => void;
  onHandOver: (pkgId: string, recipientName: string) => void;
  onOpenNewPackageModal: () => void;
}

export const RenderDocumentPackagesPage: React.FC<RenderDocumentPackagesPageProps> = ({
  packages,
  trips,
  lang,
  onMarkReady,
  onHandOver,
  onOpenNewPackageModal
}) => {
  const [handoverPkgId, setHandoverPkgId] = useState<string | null>(null);
  const [recipientInput, setRecipientInput] = useState('Nguyễn Văn Hùng (Tài xế chính)');

  const handleConfirmHandover = () => {
    if (handoverPkgId && recipientInput.trim()) {
      onHandOver(handoverPkgId, recipientInput);
      setHandoverPkgId(null);
    }
  };

  return (
    <div className="render-document-packages-page fade-in">
      <div className="page-head">
        <div>
          <h2 className="page-title">
            {lang === 'vi' ? 'Gói hồ sơ đi đường bàn giao Tổ xe' : 'Document Packages'}
          </h2>
          <p className="subtitle">
            {lang === 'vi'
              ? 'Tập hợp các bản cứng gốc và bản sao công chứng hợp lệ để Tài xế / Escort mang theo xe khi xuất bến.'
              : 'Physical and approved documents carried by the transport crew for trip checkpoints.'}
          </p>
        </div>
        <button
          type="button"
          className="btn-solid-orange"
          onClick={onOpenNewPackageModal}
        >
          <Icon name="plus" />
          <span>{lang === 'vi' ? 'Tạo gói hồ sơ mới' : 'New Package'}</span>
        </button>
      </div>

      {/* PACKAGES TABLE */}
      <div className="card table-card" style={{ marginTop: '16px' }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{lang === 'vi' ? 'GÓI HỒ SƠ' : 'PACKAGE'}</th>
                <th>{lang === 'vi' ? 'CHUYẾN ĐI' : 'TRIP'}</th>
                <th>{lang === 'vi' ? 'CỬA KHẨU / PHẠM VI' : 'CHECKPOINT / SCOPE'}</th>
                <th>{lang === 'vi' ? 'DANH MỤC CHỨNG TỪ GỐC' : 'DOCUMENTS INCLUDED'}</th>
                <th>{lang === 'vi' ? 'TRẠNG THÁI' : 'STATUS'}</th>
                <th>{lang === 'vi' ? 'NHẬT KÝ BÀN GIAO' : 'RELEASE INFO'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'THAO TÁC' : 'ACTION'}</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => {
                const trip = trips.find((t) => t.id === pkg.tripId);
                const isHanded = pkg.status === 'HANDED_OVER';
                const isReady = pkg.status === 'READY';

                return (
                  <tr key={pkg.id}>
                    <td>
                      <b className="primary-id-text">{pkg.title}</b>
                      <div className="cell-sub-muted font-11">Mã gói: {pkg.id}</div>
                    </td>
                    <td>
                      <b className="primary-id-text">{pkg.tripId}</b>
                      {trip && <div className="cell-sub-muted font-11">{trip.origin} → {trip.destination}</div>}
                    </td>
                    <td>
                      <div className="fw-600">{pkg.cpName || 'Toàn bộ hành trình'}</div>
                    </td>
                    <td>
                      <div className="fw-600 text-purple font-13">
                        📁 {pkg.docsCount} chứng từ đã niêm phong
                      </div>
                      <div className="cell-sub-muted font-11 truncate-text" style={{ maxWidth: '280px' }} title={pkg.docSummary}>
                        {pkg.docSummary}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`pill-badge ${
                          isHanded
                            ? 'pill-green'
                            : isReady
                            ? 'pill-blue'
                            : 'pill-gray'
                        }`}
                      >
                        {isHanded ? 'ĐÃ BÀN GIAO CHO TỔ XE' : isReady ? 'SẴN SÀNG XUẤT PHÁT' : 'BẢN THẢO'}
                      </span>
                    </td>
                    <td>
                      {isHanded ? (
                        <div>
                          <div className="fw-600 font-12 text-green">✓ {pkg.releasedTo}</div>
                          <div className="cell-sub-muted font-11">Lúc: {pkg.releasedAt}</div>
                        </div>
                      ) : (
                        <span className="text-muted font-11">Chưa bàn giao</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {pkg.status === 'DRAFT_PACKAGE' && (
                        <button
                          type="button"
                          className="btn-sm btn-outline"
                          onClick={() => onMarkReady(pkg.id)}
                        >
                          Đánh dấu sẵn sàng
                        </button>
                      )}
                      {pkg.status === 'READY' && (
                        <button
                          type="button"
                          className="btn-sm btn-solid-orange"
                          onClick={() => setHandoverPkgId(pkg.id)}
                        >
                          Bàn giao cho tổ xe
                        </button>
                      )}
                      {isHanded && (
                        <span className="text-green font-11">✓ Đã giao bản cứng</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* HANDOVER MODAL */}
      {handoverPkgId && (
        <div className="modal-backdrop fade-in" onClick={() => setHandoverPkgId(null)}>
          <div className="modal-card pad" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: 0, marginBottom: '14px' }}>
              <h3 className="modal-title">Bàn giao gói chứng từ gốc cho Tổ xe</h3>
              <button type="button" className="btn-close-sm" onClick={() => setHandoverPkgId(null)}>
                ✕
              </button>
            </div>
            <p className="cell-sub-muted font-12">
              Xác nhận bàn giao túi hồ sơ niêm phong cho Trưởng đoàn / Tài xế chính trước khi xe lăn bánh:
            </p>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Họ tên nhân sự nhận bàn giao:</label>
              <input
                type="text"
                className="custom-input"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
              />
            </div>

            <div className="reject-form-btn-row" style={{ marginTop: '18px' }}>
              <button type="button" className="btn-ghost" onClick={() => setHandoverPkgId(null)}>
                Hủy
              </button>
              <button type="button" className="btn-solid-green" onClick={handleConfirmHandover}>
                Xác nhận đã bàn giao
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
