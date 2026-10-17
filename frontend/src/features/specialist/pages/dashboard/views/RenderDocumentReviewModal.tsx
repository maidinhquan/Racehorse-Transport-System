import React, { useState } from 'react';
import type { SpecialistDoc, SpecialistTrip } from './specialist.types';
import { Icon } from './specialist.types';

interface RenderDocumentReviewModalProps {
  doc: SpecialistDoc;
  trip?: SpecialistTrip;
  lang: 'vi' | 'en';
  onClose: () => void;
  onApprove: (docId: string, remark: string) => void;
  onRejectAndRequestSupplement: (docId: string, reason: string, dueDate: string) => void;
  onTogglePhysicalCopy: (docId: string) => void;
}

export const RenderDocumentReviewModal: React.FC<RenderDocumentReviewModalProps> = ({
  doc,
  trip,
  lang,
  onClose,
  onApprove,
  onRejectAndRequestSupplement,
  onTogglePhysicalCopy
}) => {
  const [activeVersionIdx, setActiveVersionIdx] = useState<number>(doc.versions.length - 1);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState(
    doc.rejectReason || 'Bản chụp bị mờ, không rõ con dấu hoặc chữ ký của Cơ quan thú y có thẩm quyền. Vui lòng tải lại bản scan màu rõ nét.'
  );
  const [dueDate, setDueDate] = useState('2026-10-12');
  const [approvalRemark, setApprovalRemark] = useState('Hồ sơ hợp lệ, đã đối chiếu đầy đủ với quy định kiểm dịch.');
  const [showApproveForm, setShowApproveForm] = useState(false);

  const curVersion = doc.versions[activeVersionIdx] || doc.versions[0];
  const isLatestVersion = activeVersionIdx === doc.versions.length - 1;

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối để gửi thông báo đến khách hàng.');
      return;
    }
    onRejectAndRequestSupplement(doc.id, rejectReason, dueDate);
    setShowRejectForm(false);
  };

  const handleConfirmApprove = () => {
    onApprove(doc.id, approvalRemark);
    setShowApproveForm(false);
  };

  return (
    <div className="modal-backdrop fade-in" onClick={onClose}>
      <div className="modal-card doc-review-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="modal-header">
          <div>
            <div className="modal-title-row">
              <h3 className="modal-title">{doc.typeName}</h3>
              <span
                className={`pill-badge ${
                  doc.status === 'APPROVED'
                    ? 'pill-green'
                    : doc.status === 'REJECTED'
                    ? 'pill-red'
                    : doc.status === 'EXPIRED'
                    ? 'pill-red'
                    : 'pill-amber'
                }`}
              >
                {doc.status}
              </span>
              {doc.versions.length > 1 && (
                <span className="pill-badge pill-purple">
                  {lang === 'vi' ? `Đã có ${doc.versions.length} phiên bản` : `${doc.versions.length} versions`}
                </span>
              )}
            </div>
            <p className="modal-subtitle">
              Mã chứng từ: <b>{doc.id}</b> • Chuyến: <b>{doc.tripId}</b>
              {doc.horseName && ` • Ngựa: ${doc.horseName}`} • Nhóm: <b>{doc.group}</b>
            </p>
          </div>

          <div className="modal-actions-right">
            {doc.status !== 'APPROVED' && (
              <>
                <button
                  type="button"
                  className="btn-outline-danger"
                  onClick={() => {
                    setShowRejectForm(true);
                    setShowApproveForm(false);
                  }}
                >
                  <Icon name="x" />
                  <span>{lang === 'vi' ? 'Từ chối & Yêu cầu bổ sung' : 'Reject & Request'}</span>
                </button>
                <button
                  type="button"
                  className="btn-solid-green"
                  onClick={() => {
                    setShowApproveForm(true);
                    setShowRejectForm(false);
                  }}
                >
                  <Icon name="check" />
                  <span>{lang === 'vi' ? 'Duyệt chứng từ' : 'Approve'}</span>
                </button>
              </>
            )}

            {doc.status === 'APPROVED' && (
              <span className="approved-stamp-badge">
                ✓ ĐÃ PHÊ DUYỆT BỞI CHUYÊN VIÊN
              </span>
            )}

            <button type="button" className="btn-close-icon" onClick={onClose}>
              <Icon name="x" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (2 COLUMNS: DOCUMENT SCAN PREVIEW + AUDIT/VERSION PANEL) */}
        <div className="modal-body doc-review-grid">
          {/* LEFT: SCAN PREVIEW & METADATA */}
          <div className="review-left-col">
            {/* VERSION SWITCHER PILLS */}
            {doc.versions.length > 1 && (
              <div className="version-tabs-bar">
                <span className="version-tabs-lbl">{lang === 'vi' ? 'Chọn phiên bản xem:' : 'Select version:'}</span>
                {doc.versions.map((ver, idx) => (
                  <button
                    key={ver.v}
                    type="button"
                    className={`version-tab-btn ${activeVersionIdx === idx ? 'active' : ''}`}
                    onClick={() => setActiveVersionIdx(idx)}
                  >
                    Phiên bản v{ver.v} {idx === doc.versions.length - 1 ? '(Mới nhất)' : '(Trước đó)'}
                  </button>
                ))}
              </div>
            )}

            {/* SCAN FILE PREVIEW BOX */}
            <div className="doc-preview-container">
              <div className="preview-top-bar">
                <div className="preview-file-title">
                  <Icon name="file" />
                  <b>{curVersion.file}</b>
                  <span className="file-size-tag">
                    {isLatestVersion ? 'Mới nhất (v' + curVersion.v + ')' : 'Lưu trữ (v' + curVersion.v + ')'} • PDF
                  </span>
                </div>
                <div className="preview-controls">
                  <span className="zoom-btn">🔍 100%</span>
                  <a
                    href="#download"
                    className="link-download-preview"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Đang tải tệp mẫu: ${curVersion.file}`);
                    }}
                  >
                    ⬇ Tải xuống
                  </a>
                </div>
              </div>

              {/* MOCK SCAN CERTIFICATE VISUAL */}
              <div className="mock-scan-sheet">
                <div className="scan-watermark">CBN OFFICIAL DOCUMENT</div>
                <div className="scan-header-emblem">
                  <div className="emblem-circle">🇻🇳</div>
                  <div className="scan-dept-title">
                    <h4>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
                    <h5>CỤC THÚ Y - BỘ NÔNG NGHIỆP VÀ PHÁT TRIỂN NÔNG THÔN</h5>
                    <div className="scan-cert-name">{doc.typeName.toUpperCase()}</div>
                    <div className="scan-cert-no">Số hiệu: {doc.number}</div>
                  </div>
                </div>

                <div className="scan-body-content">
                  <div className="scan-row">
                    <span>Đối tượng cá thể:</span>
                    <b>{doc.horseName || 'Ngựa đua thi đấu'}</b>
                  </div>
                  <div className="scan-row">
                    <span>Số vi chip điện tử (Microchip ISO):</span>
                    <b>{trip?.horses.find((h) => h.id === doc.horseId)?.chip || '982001928374'}</b>
                  </div>
                  <div className="scan-row">
                    <span>Cơ quan cấp chứng từ:</span>
                    <b>{doc.issuer || 'Chi cục Thú y Vùng VI'}</b>
                  </div>
                  <div className="scan-row">
                    <span>Ngày cấp:</span>
                    <b>{doc.issuedAt || '01/10/2026'}</b>
                    <span style={{ marginLeft: '16px' }}>Hiệu lực đến:</span>
                    <b>{doc.expiry || '11/10/2026'}</b>
                  </div>

                  <div className="scan-box-conditions">
                    <b>KẾT QUẢ KIỂM TRA LÂM SÀNG & XÉT NGHIỆM:</b>
                    <p>
                      • Cá thể không có triệu chứng lâm sàng của các bệnh truyền nhiễm nguy hiểm ở loài ngựa (Cúm ngựa, Viêm phổi truyền nhiễm, Bệnh dịch ngựa Châu Phi AHS).
                      <br />
                      • Âm tính với xét nghiệm Coggins Test (EIA) thực hiện tại phòng thử nghiệm đạt chuẩn ISO/IEC 17025.
                      <br />
                      • Đủ điều kiện thể lực và y tế phục vụ vận chuyển quốc tế an toàn.
                    </p>
                  </div>

                  {curVersion.v === 1 && doc.rejectReason && (
                    <div className="scan-reject-stamp">
                      ❌ BẢN CHỤP THIẾU CHỮ KÝ HỢP LỆ VÀ MỘC TRÒN
                    </div>
                  )}

                  {curVersion.v >= 2 && (
                    <div className="scan-official-stamp-box">
                      <div className="red-seal-box">
                        <div className="red-seal-circle">★ ĐÃ KIỂM DỊCH XUẤT CẢNH ★</div>
                      </div>
                      <div className="signature-box">
                        <div className="sig-handwritten">Dr. Nguyen Duc Minh</div>
                        <div className="sig-role">Bác sĩ Thú y Trưởng Trạm</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* METADATA FORM / FIELDS */}
            <div className="card pad doc-meta-card" style={{ marginTop: '16px' }}>
              <h4 className="meta-card-title">Thông tin hồ sơ & Trách nhiệm</h4>
              <div className="meta-kv-grid">
                <div className="kv-cell">
                  <span className="kv-lbl">Số hiệu văn bản:</span>
                  <span className="kv-val">{doc.number}</span>
                </div>
                <div className="kv-cell">
                  <span className="kv-lbl">Cơ quan cấp:</span>
                  <span className="kv-val">{doc.issuer || '—'}</span>
                </div>
                <div className="kv-cell">
                  <span className="kv-lbl">Ngày cấp:</span>
                  <span className="kv-val">{doc.issuedAt || '—'}</span>
                </div>
                <div className="kv-cell">
                  <span className="kv-lbl">Ngày hết hạn:</span>
                  <span className="kv-val">{doc.expiry || 'Vô thời hạn'}</span>
                </div>
                <div className="kv-cell">
                  <span className="kv-lbl">Bên chịu trách nhiệm:</span>
                  <span className="kv-val">{doc.provider === 'CUSTOMER' ? 'Khách hàng nộp' : 'CBN thực hiện'}</span>
                </div>
                <div className="kv-cell">
                  <span className="kv-lbl">Bản cứng gốc:</span>
                  <label className="checkbox-pill-label" style={{ marginTop: '2px' }}>
                    <input
                      type="checkbox"
                      checked={!!doc.physicalCopyReceived}
                      onChange={() => onTogglePhysicalCopy(doc.id)}
                    />
                    <span>{doc.physicalCopyReceived ? 'Đã nhận bàn giao bản cứng' : 'Chưa nhận bản cứng gốc'}</span>
                  </label>
                </div>
              </div>

              {curVersion.notes && (
                <div className="customer-note-callout" style={{ marginTop: '12px' }}>
                  <b>Ghi chú từ người gửi:</b> {curVersion.notes}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: DECISION ACTIONS & TIMELINE */}
          <div className="review-right-col">
            {/* REJECT & REQUEST FORM */}
            {showRejectForm && (
              <div className="card pad reject-form-card fade-in">
                <div className="reject-form-head">
                  <h4 className="reject-title">❌ Từ chối & Cho khách bổ sung</h4>
                  <button
                    type="button"
                    className="btn-close-sm"
                    onClick={() => setShowRejectForm(false)}
                  >
                    ✕
                  </button>
                </div>
                <p className="reject-desc">
                  Hệ thống sẽ gửi thông báo và mở luồng nộp lại (v{doc.versions.length + 1}) cho khách hàng kèm theo lý do chi tiết dưới đây:
                </p>

                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label className="form-lbl">Lý do từ chối cụ thể:</label>
                  <textarea
                    rows={4}
                    className="custom-textarea"
                    placeholder="Nhập chi tiết lỗi (ví dụ: Chữ ký không rõ, thiếu trang tiêm phòng, hết hạn...)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label className="form-lbl">Hạn chót khách hàng phải bổ sung lại:</label>
                  <input
                    type="date"
                    className="custom-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div className="reject-form-btn-row">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setShowRejectForm(false)}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="btn-solid-red"
                    onClick={handleConfirmReject}
                  >
                    Xác nhận từ chối & Gửi yêu cầu
                  </button>
                </div>
              </div>
            )}

            {/* APPROVE FORM */}
            {showApproveForm && (
              <div className="card pad approve-form-card fade-in">
                <div className="reject-form-head">
                  <h4 className="approve-title">✅ Xác nhận Phê duyệt chứng từ</h4>
                  <button
                    type="button"
                    className="btn-close-sm"
                    onClick={() => setShowApproveForm(false)}
                  >
                    ✕
                  </button>
                </div>
                <p className="approve-desc">
                  Chứng từ sẽ chuyển trạng thái <b>APPROVED</b>, cập nhật vào tiến độ sẵn sàng khởi hành của chuyến {doc.tripId}.
                </p>

                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label className="form-lbl">Nhận xét thẩm định của Chuyên viên:</label>
                  <textarea
                    rows={3}
                    className="custom-textarea"
                    value={approvalRemark}
                    onChange={(e) => setApprovalRemark(e.target.value)}
                  />
                </div>

                <div className="reject-form-btn-row">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setShowApproveForm(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn-solid-green"
                    onClick={handleConfirmApprove}
                  >
                    Xác nhận duyệt đạt
                  </button>
                </div>
              </div>
            )}

            {/* VERSION TIMELINE */}
            <div className="card pad timeline-card">
              <h4 className="timeline-title">Lịch sử các phiên bản nộp</h4>
              <ul className="version-timeline-list">
                {doc.versions.map((ver, idx) => (
                  <li key={ver.v} className={`timeline-item ${idx === activeVersionIdx ? 'active-ver' : ''}`}>
                    <div className="timeline-dot" />
                    <div className="timeline-body">
                      <b>Phiên bản v{ver.v} — {ver.file}</b>
                      <div className="cell-sub-muted">
                        Nộp bởi: {ver.by} • {ver.at}
                      </div>
                      {ver.notes && <div className="ver-note-box">{ver.notes}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* DECISION AUDIT HISTORY */}
            <div className="card pad timeline-card" style={{ marginTop: '16px' }}>
              <h4 className="timeline-title">Nhật ký quyết định thẩm định</h4>
              {doc.reviews.length === 0 ? (
                <p className="cell-sub-muted font-12" style={{ margin: '8px 0 0' }}>
                  Chưa có lượt thẩm định nào được ghi nhận cho chứng từ này.
                </p>
              ) : (
                <ul className="version-timeline-list">
                  {doc.reviews.map((rev, i) => (
                    <li key={i} className={`timeline-item ${rev.decision === 'APPROVED' ? 'green-ver' : 'red-ver'}`}>
                      <div className={`timeline-dot ${rev.decision === 'APPROVED' ? 'dot-green' : 'dot-red'}`} />
                      <div className="timeline-body">
                        <b>
                          {rev.decision === 'APPROVED' ? '✅ ĐÃ DUYỆT ĐẠT' : '❌ ĐÃ TỪ CHỐI'} (v{rev.v})
                        </b>
                        <div className="cell-sub-muted">
                          Thực hiện bởi: {rev.by} • {rev.at}
                        </div>
                        <div className="rev-remark-box">{rev.remark}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
