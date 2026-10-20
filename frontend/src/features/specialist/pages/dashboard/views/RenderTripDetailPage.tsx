import React from 'react';
import type {
  SpecialistTrip,
  SpecialistDoc,
  DocRequest,
  CheckpointClearance,
  QuarantineBooking,
  DocumentPackage,
  RegulationItem
} from './specialist.types';
import { Icon } from './specialist.types';

interface RenderTripDetailPageProps {
  trip: SpecialistTrip;
  docs: SpecialistDoc[];
  requests: DocRequest[];
  clearances: CheckpointClearance[];
  bookings: QuarantineBooking[];
  packages: DocumentPackage[];
  regulations: RegulationItem[];
  lang: 'vi' | 'en';
  onBack: () => void;
  onOpenDocReview: (docId: string) => void;
  onOpenCreateRequest: (tripId: string, docTypeId?: string, horseId?: string) => void;
  onOpenRecordCBNDoc: (tripId: string) => void;
  onOpenNewBooking: (tripId: string) => void;
  onTogglePhysicalCopy: (docId: string) => void;
  onExportZip: (tripId: string) => void;
}

export const RenderTripDetailPage: React.FC<RenderTripDetailPageProps> = ({
  trip,
  docs,
  requests,
  clearances,
  bookings,
  packages,
  regulations,
  lang,
  onBack,
  onOpenDocReview,
  onOpenCreateRequest,
  onOpenRecordCBNDoc,
  onOpenNewBooking,
  onTogglePhysicalCopy,
  onExportZip
}) => {
  const tripDocs = docs.filter((d) => d.tripId === trip.id);
  const tripRequests = requests.filter((r) => r.tripId === trip.id);
  const tripClearances = clearances.filter((c) => c.tripId === trip.id);
  const tripBookings = bookings.filter((b) => b.tripId === trip.id);
  const tripPackages = packages.filter((p) => p.tripId === trip.id);

  // Group docs into Section A (Identity) and Section B (Operational/Regulatory)
  const identityDocs = tripDocs.filter((d) => d.category === 'IDENTITY');
  const operationalDocs = tripDocs.filter((d) => d.category === 'OPERATIONAL');

  const approvedCount = tripDocs.filter((d) => d.status === 'APPROVED').length;
  const totalCount = Math.max(tripDocs.length, trip.checklist.total);
  const isReady = approvedCount === totalCount && totalCount > 0;
  const progressPct = totalCount ? Math.round((approvedCount / totalCount) * 100) : 0;

  // Identify blocking issues
  const blockingIssues: string[] = [];
  const rejectedDocs = tripDocs.filter((d) => d.status === 'REJECTED');
  const expiredDocs = tripDocs.filter((d) => d.status === 'EXPIRED');
  const pendingDocs = tripDocs.filter((d) => d.status === 'SUBMITTED');
  const unconfirmedBookings = tripBookings.filter((b) => b.status === 'REQUESTED');
  const physicalMissing = tripDocs.filter((d) => d.status === 'APPROVED' && !d.physicalCopyReceived);

  if (rejectedDocs.length > 0) {
    blockingIssues.push(`${rejectedDocs.length} chứng từ bị từ chối — Đang chờ khách hàng nộp phiên bản sửa đổi.`);
  }
  if (expiredDocs.length > 0) {
    blockingIssues.push(`${expiredDocs.length} chứng từ đã hết hạn trước ngày khởi hành — Cần làm mới.`);
  }
  if (pendingDocs.length > 0) {
    blockingIssues.push(`${pendingDocs.length} chứng từ mới nộp — Cần chuyên viên hoàn tất thẩm định.`);
  }
  if (unconfirmedBookings.length > 0) {
    blockingIssues.push('Đặt chỗ trạm kiểm dịch cách ly chưa được cơ quan chức năng xác nhận mã booking.');
  }
  if (physicalMissing.length > 0) {
    blockingIssues.push(`${physicalMissing.length} chứng từ đã duyệt online nhưng chưa nhận bản cứng gốc để bàn giao cho tài xế.`);
  }

  return (
    <div className="render-trip-detail-page fade-in">
      {/* BACK BUTTON */}
      <button type="button" className="btn-back-link" onClick={onBack}>
        <Icon name="arrow-left" />
        <span>{lang === 'vi' ? 'Quay lại danh sách chuyến được phân công' : 'Back to Assigned Trips'}</span>
      </button>

      {/* HEADER SECTION */}
      <div className="detail-header-card card pad">
        <div className="detail-header-top">
          <div>
            <div className="detail-title-row">
              <h2 className="detail-title">{trip.id}</h2>
              <span className={`pill-badge ${trip.status === 'IN_TRANSIT' ? 'pill-blue' : trip.status === 'READY_TO_DEPART' ? 'pill-green' : 'pill-amber'}`}>
                {trip.status === 'IN_TRANSIT'
                  ? 'Đang vận chuyển'
                  : trip.status === 'READY_TO_DEPART'
                  ? 'Sẵn sàng khởi hành'
                  : 'Đang chuẩn bị hồ sơ'}
              </span>
              <span className="pill-badge pill-gray">
                {trip.mode === 'AIR' ? '✈️ Đường bay quốc tế' : '🚛 Đường bộ xuyên biên giới'}
              </span>
            </div>
            <p className="subtitle" style={{ margin: '6px 0 0' }}>
              Mã yêu cầu: <b>{trip.requestId}</b> • Khách hàng: <b>{trip.customerName}</b> • Tuyến:{' '}
              <b>{trip.origin} → {trip.destination}</b>
              {trip.transit && trip.transit.length > 0 && ` (Quá cảnh ${trip.transit.join(', ')})`}
            </p>
            <p className="cell-sub-muted" style={{ margin: '4px 0 0' }}>
              Khởi hành: <b>{trip.plannedDepart}</b> • Dự kiến đến: <b>{trip.eta}</b> • Số lượng ngựa: <b>{trip.horses.length} cá thể</b>
            </p>
          </div>

          <div className="detail-header-actions">
            <button
              type="button"
              className="btn-outline"
              onClick={() => onOpenCreateRequest(trip.id)}
            >
              <Icon name="plus" />
              <span>{lang === 'vi' ? 'Yêu cầu bổ sung' : 'Request Doc'}</span>
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => onOpenRecordCBNDoc(trip.id)}
            >
              <Icon name="doc" />
              <span>{lang === 'vi' ? 'Ghi nhận tệp CBN' : 'Record CBN Doc'}</span>
            </button>
            <button
              type="button"
              className="btn-solid-orange"
              onClick={() => onExportZip(trip.id)}
            >
              <Icon name="download" />
              <span>{lang === 'vi' ? 'Xuất gói ZIP đi đường' : 'Export Road ZIP'}</span>
            </button>
          </div>
        </div>

        {/* PROGRESS BAR & BLOCKING ISSUES */}
        <div className="progress-overview-box">
          <div className="progress-overview-head">
            <div>
              <span className="progress-overview-title">
                {lang === 'vi' ? 'Tiến độ hoàn tất Checklist pháp lý & kiểm dịch' : 'Legal & Medical Checklist Progress'}
              </span>
              <span className="progress-count-pill">
                {approvedCount} / {totalCount} {lang === 'vi' ? 'hồ sơ đã duyệt' : 'approved'}
              </span>
            </div>
            <span className={`pill-badge ${isReady ? 'pill-green' : 'pill-amber'}`}>
              {isReady ? 'HOÀN TẤT (READY)' : 'CHƯA ĐỦ ĐIỀU KIỆN (INCOMPLETE)'}
            </span>
          </div>

          <div className="large-progress-track">
            <div className={`large-progress-fill ${isReady ? 'fill-green' : 'fill-amber'}`} style={{ width: `${progressPct}%` }} />
          </div>

          {blockingIssues.length > 0 ? (
            <div className="blocking-alert-banner">
              <div className="blocking-alert-icon">⚠️</div>
              <div className="blocking-alert-body">
                <b>{lang === 'vi' ? 'Các vấn đề pháp lý chưa giải quyết (Chặn khởi hành):' : 'Blocking Issues:'}</b>
                <ul>
                  {blockingIssues.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="success-alert-banner">
              ✅ Bộ hồ sơ pháp lý & kiểm dịch đã đầy đủ 100%. Đạt chuẩn để Logistics Manager duyệt lệnh xuất bến.
            </div>
          )}
        </div>
      </div>

      {/* TABLE A: BASIC HORSE IDENTITY DOCUMENTS */}
      <div className="card table-card" style={{ marginTop: '20px' }}>
        <div className="card-header-between">
          <div>
            <h3 className="card-heading">
              {lang === 'vi' ? 'A. Hồ sơ danh tính cá thể cơ bản' : 'A. Basic Horse Identity Documents'}
            </h3>
            <span className="card-sub-count">
              {identityDocs.filter((d) => d.status === 'APPROVED').length}/{identityDocs.length} {lang === 'vi' ? 'đã duyệt' : 'approved'}
            </span>
          </div>
          <span className="section-stage-badge">
            {lang === 'vi' ? 'Khách nộp theo yêu cầu ban đầu' : 'Customer Request Stage'}
          </span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{lang === 'vi' ? 'LOẠI HỒ SƠ' : 'DOCUMENT'}</th>
                <th>{lang === 'vi' ? 'CÁ THỂ NGỰA' : 'HORSE'}</th>
                <th>{lang === 'vi' ? 'BÊN CẤP' : 'PARTY'}</th>
                <th>{lang === 'vi' ? 'TỆP ĐÍNH KÈM' : 'FILE'}</th>
                <th>{lang === 'vi' ? 'NGÀY CẤP / HẾT HẠN' : 'VALIDITY'}</th>
                <th>{lang === 'vi' ? 'BẢN CỨNG GỐC' : 'PHYSICAL'}</th>
                <th>{lang === 'vi' ? 'TRẠNG THÁI' : 'STATUS'}</th>
                <th>{lang === 'vi' ? 'GHI CHÚ / THẨM ĐỊNH' : 'REVIEW NOTE'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'THAO TÁC' : 'ACTION'}</th>
              </tr>
            </thead>
            <tbody>
              {identityDocs.map((doc) => {
                const latest = doc.versions[doc.versions.length - 1];
                const lastRev = doc.reviews[doc.reviews.length - 1];
                return (
                  <tr key={doc.id}>
                    <td>
                      <b className="primary-id-text">{doc.typeName}</b>
                      <div className="cell-sub-muted">{doc.id} • Số: {doc.number}</div>
                    </td>
                    <td>
                      <div className="fw-600">{doc.horseName || 'Chung'}</div>
                      <div className="cell-sub-muted font-11">Chip: {trip.horses.find(h => h.id === doc.horseId)?.chip || 'N/A'}</div>
                    </td>
                    <td>
                      <span className="pill-badge pill-gray">{doc.provider}</span>
                    </td>
                    <td>
                      {latest ? (
                        <div>
                          <button
                            type="button"
                            className="link-file-text"
                            onClick={() => onOpenDocReview(doc.id)}
                          >
                            📄 {latest.file}
                          </button>
                          <div className="cell-sub-muted">v{latest.v} • {latest.at.slice(0, 10)}</div>
                        </div>
                      ) : (
                        <span className="text-muted">Chưa có tệp</span>
                      )}
                    </td>
                    <td>
                      <div>Cấp: {doc.issuedAt || '—'}</div>
                      <div className="cell-sub-muted">Hết hạn: {doc.expiry || 'Vô thời hạn'}</div>
                    </td>
                    <td>
                      <label className="checkbox-pill-label">
                        <input
                          type="checkbox"
                          checked={!!doc.physicalCopyReceived}
                          onChange={() => onTogglePhysicalCopy(doc.id)}
                        />
                        <span>{doc.physicalCopyReceived ? 'Đã nhận' : 'Chưa nhận'}</span>
                      </label>
                    </td>
                    <td>
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
                    </td>
                    <td>
                      <div className="review-remark-cell">
                        {lastRev ? (
                          <>
                            <b>{lastRev.by}:</b> {lastRev.remark}
                          </>
                        ) : doc.rejectReason ? (
                          <span className="text-red"><b>Lý do từ chối:</b> {doc.rejectReason}</span>
                        ) : (
                          'Chưa có nhận xét'
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-sm btn-solid-orange"
                        onClick={() => onOpenDocReview(doc.id)}
                      >
                        {lang === 'vi' ? 'Thẩm định' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE B: OPERATIONAL, REGULATORY, VETERINARY, QUARANTINE & CUSTOMS */}
      <div className="card table-card" style={{ marginTop: '20px' }}>
        <div className="card-header-between">
          <div>
            <h3 className="card-heading">
              {lang === 'vi' ? 'B. Hồ sơ pháp lý, kiểm dịch thú y & thông quan' : 'B. Veterinary, Quarantine & Customs Documents'}
            </h3>
            <span className="card-sub-count">
              {operationalDocs.filter((d) => d.status === 'APPROVED').length}/{operationalDocs.length} {lang === 'vi' ? 'đã duyệt' : 'approved'}
            </span>
          </div>
          <span className="section-stage-badge">
            {lang === 'vi' ? 'Giai đoạn chuẩn bị xuất bến' : 'Pre-Departure Stage'}
          </span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{lang === 'vi' ? 'LOẠI HỒ SƠ' : 'DOCUMENT'}</th>
                <th>{lang === 'vi' ? 'ĐỐI TƯỢNG' : 'SUBJECT'}</th>
                <th>{lang === 'vi' ? 'PHÂN LOẠI' : 'CATEGORY'}</th>
                <th>{lang === 'vi' ? 'BÊN CẤP' : 'PROVIDER'}</th>
                <th>{lang === 'vi' ? 'TỆP ĐÍNH KÈM' : 'FILE'}</th>
                <th>{lang === 'vi' ? 'HIỆU LỰC' : 'VALIDITY'}</th>
                <th>{lang === 'vi' ? 'BẢN GỐC' : 'ORIGINAL'}</th>
                <th>{lang === 'vi' ? 'TRẠNG THÁI' : 'STATUS'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'THAO TÁC' : 'ACTION'}</th>
              </tr>
            </thead>
            <tbody>
              {operationalDocs.map((doc) => {
                const latest = doc.versions[doc.versions.length - 1];
                return (
                  <tr key={doc.id}>
                    <td>
                      <b className="primary-id-text">{doc.typeName}</b>
                      <div className="cell-sub-muted">{doc.id} • {doc.issuer || 'Cơ quan có thẩm quyền'}</div>
                    </td>
                    <td>{doc.horseName ? doc.horseName : 'Toàn chuyến'}</td>
                    <td>
                      <span className="pill-badge pill-purple">{doc.group}</span>
                    </td>
                    <td>
                      <span className={`pill-badge ${doc.provider === 'CBN' ? 'pill-blue' : 'pill-gray'}`}>
                        {doc.provider === 'CBN' ? 'CBN lo thủ tục' : 'Khách cung cấp'}
                      </span>
                    </td>
                    <td>
                      {latest ? (
                        <div>
                          <button
                            type="button"
                            className="link-file-text"
                            onClick={() => onOpenDocReview(doc.id)}
                          >
                            📄 {latest.file}
                          </button>
                          <div className="cell-sub-muted">v{latest.v} • {latest.at.slice(0, 10)}</div>
                        </div>
                      ) : (
                        <span className="text-muted">Chưa đính kèm</span>
                      )}
                    </td>
                    <td>
                      <div>{doc.issuedAt ? `Cấp: ${doc.issuedAt}` : 'Chưa cấp'}</div>
                      <div className="cell-sub-muted">{doc.expiry ? `Hết hạn: ${doc.expiry}` : ''}</div>
                    </td>
                    <td>
                      <label className="checkbox-pill-label">
                        <input
                          type="checkbox"
                          checked={!!doc.physicalCopyReceived}
                          onChange={() => onTogglePhysicalCopy(doc.id)}
                        />
                        <span>{doc.physicalCopyReceived ? 'Có' : 'Chưa'}</span>
                      </label>
                    </td>
                    <td>
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
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-sm btn-solid-orange"
                        onClick={() => onOpenDocReview(doc.id)}
                      >
                        {lang === 'vi' ? 'Thẩm định' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-COLUMN LOWER CARDS: REGULATIONS & BOOKINGS & CHECKPOINTS */}
      <div className="grid2-row" style={{ marginTop: '20px' }}>
        {/* Left Sub-Card: Quarantine Bookings & Checkpoints */}
        <div className="card pad sub-panel-card">
          <div className="card-header-between" style={{ padding: 0, marginBottom: '14px' }}>
            <h4 className="sub-panel-title">
              <Icon name="flag" />
              <span>{lang === 'vi' ? 'Đặt chỗ trạm kiểm dịch & Thông quan' : 'Quarantine & Border Clearance'}</span>
            </h4>
            <button
              type="button"
              className="btn-sm btn-ghost"
              onClick={() => onOpenNewBooking(trip.id)}
            >
              + Đặt chỗ kiểm dịch
            </button>
          </div>

          <div className="sub-section-group">
            <b className="sub-section-lbl">Trạm kiểm dịch cách ly (Quarantine Stations):</b>
            {tripBookings.length === 0 ? (
              <p className="cell-sub-muted font-12" style={{ margin: '6px 0 12px' }}>
                Chuyến này không có đặt chỗ cách ly bắt buộc.
              </p>
            ) : (
              tripBookings.map((b) => (
                <div key={b.id} className="row-item-box">
                  <div>
                    <div className="fw-600 font-13">{b.cpName}</div>
                    <div className="cell-sub-muted font-11">
                      Mã: {b.id} • Ngày hẹn: <b>{b.slot}</b> {b.ref && `• Số ref: ${b.ref}`}
                    </div>
                    {b.notes && <div className="font-11 text-muted" style={{ marginTop: '2px' }}>{b.notes}</div>}
                  </div>
                  <span className={`pill-badge ${b.status === 'BOOKED' ? 'pill-green' : 'pill-amber'}`}>
                    {b.status === 'BOOKED' ? 'ĐÃ XÁC NHẬN' : 'CHỜ DUYỆT'}
                  </span>
                </div>
              ))
            )}

            <b className="sub-section-lbl" style={{ marginTop: '14px', display: 'block' }}>
              Trạm kiểm soát cửa khẩu / sân bay trên hành trình:
            </b>
            {tripClearances.length === 0 ? (
              <p className="cell-sub-muted font-12" style={{ margin: '6px 0' }}>
                Chưa có dữ liệu trạm trên lộ trình.
              </p>
            ) : (
              tripClearances.map((c) => (
                <div key={c.id} className="row-item-box">
                  <div>
                    <div className="fw-600 font-13">{c.cpName}</div>
                    <div className="cell-sub-muted font-11">
                      {c.cpType} • {c.country} • Dự kiến: {c.plannedAt}
                    </div>
                    {c.remark && <div className="font-11 text-muted" style={{ marginTop: '2px' }}>{c.remark}</div>}
                  </div>
                  <span
                    className={`pill-badge ${
                      c.result === 'PASSED'
                        ? 'pill-green'
                        : c.result === 'HELD'
                        ? 'pill-red'
                        : 'pill-gray'
                    }`}
                  >
                    {c.result === 'PASSED' ? 'THÔNG QUAN ĐẠT' : c.result === 'HELD' ? 'TẠM GIỮ' : 'CHỜ XE ĐẾN'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Sub-Card: Document Requests & Packages */}
        <div className="card pad sub-panel-card">
          <div className="card-header-between" style={{ padding: 0, marginBottom: '14px' }}>
            <h4 className="sub-panel-title">
              <Icon name="book" />
              <span>{lang === 'vi' ? 'Gói hồ sơ đi đường & Yêu cầu bổ sung' : 'Doc Packages & Supplement Requests'}</span>
            </h4>
            <button
              type="button"
              className="btn-sm btn-ghost"
              onClick={() => onOpenCreateRequest(trip.id)}
            >
              + Tạo yêu cầu mới
            </button>
          </div>

          <div className="sub-section-group">
            <b className="sub-section-lbl">Gói hồ sơ bàn giao cho Tổ xe (Document Packages):</b>
            {tripPackages.length === 0 ? (
              <p className="cell-sub-muted font-12" style={{ margin: '6px 0 12px' }}>
                Chưa có gói hồ sơ được tạo cho chuyến này.
              </p>
            ) : (
              tripPackages.map((p) => (
                <div key={p.id} className="row-item-box">
                  <div>
                    <div className="fw-600 font-13">{p.title}</div>
                    <div className="cell-sub-muted font-11">
                      Mã: {p.id} • Bao gồm {p.docsCount} chứng từ đã niêm phong
                    </div>
                    <div className="font-11 text-muted" style={{ marginTop: '2px' }}>
                      Nội dung: {p.docSummary}
                    </div>
                    {p.releasedTo && (
                      <div className="font-11 text-green" style={{ marginTop: '2px' }}>
                        ✓ Đã bàn giao cho: <b>{p.releasedTo}</b> ({p.releasedAt})
                      </div>
                    )}
                  </div>
                  <span
                    className={`pill-badge ${
                      p.status === 'HANDED_OVER'
                        ? 'pill-green'
                        : p.status === 'READY'
                        ? 'pill-blue'
                        : 'pill-gray'
                    }`}
                  >
                    {p.status === 'HANDED_OVER' ? 'ĐÃ BÀN GIAO' : p.status === 'READY' ? 'SẴN SÀNG' : 'BẢN THẢO'}
                  </span>
                </div>
              ))
            )}

            <b className="sub-section-lbl" style={{ marginTop: '14px', display: 'block' }}>
              Yêu cầu bổ sung hồ sơ gửi khách hàng:
            </b>
            {tripRequests.length === 0 ? (
              <p className="cell-sub-muted font-12" style={{ margin: '6px 0' }}>
                Không có yêu cầu bổ sung nào đang mở.
              </p>
            ) : (
              tripRequests.map((r) => (
                <div key={r.id} className="row-item-box">
                  <div>
                    <div className="fw-600 font-13">{r.typeName}</div>
                    <div className="cell-sub-muted font-11">
                      Mã: {r.id} • Hạn chót: <b>{r.dueAt}</b>
                    </div>
                    <div className="font-11 text-muted" style={{ marginTop: '2px' }}>
                      Lý do: {r.reason}
                    </div>
                    {r.latestFile && (
                      <div className="font-11 text-purple" style={{ marginTop: '2px' }}>
                        📎 Tệp phản hồi: <b>{r.latestFile}</b> (v{r.latestVersionUploaded})
                      </div>
                    )}
                  </div>
                  <span
                    className={`pill-badge ${
                      r.status === 'FULFILLED'
                        ? 'pill-green'
                        : r.status === 'SUBMITTED'
                        ? 'pill-purple'
                        : 'pill-amber'
                    }`}
                  >
                    {r.status === 'FULFILLED' ? 'HOÀN TẤT' : r.status === 'SUBMITTED' ? 'ĐÃ NỘP LẠI' : 'CHỜ KHÁCH NỘP'}
                  </span>
                </div>
              ))
            )}
            <b className="sub-section-lbl" style={{ marginTop: '14px', display: 'block' }}>
              Quy định áp dụng cho tuyến đường này:
            </b>
            {regulations.slice(0, 2).map((rg) => (
              <div key={rg.id} className="row-item-box">
                <div>
                  <div className="fw-600 font-13">{rg.countryName} • {rg.direction}</div>
                  <div className="cell-sub-muted font-11">{rg.note}</div>
                </div>
                <span className={`pill-badge ${rg.verified ? 'pill-green' : 'pill-amber'}`}>
                  {rg.verified ? 'ĐÃ XÁC THỰC' : 'CHỜ DUYỆT'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
