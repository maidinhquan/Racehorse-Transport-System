import React, { useState } from 'react';
import type { CheckpointClearance, QuarantineBooking, SpecialistTrip } from './specialist.types';
import { Icon } from './specialist.types';

interface RenderQuarantineCustomsPageProps {
  clearances: CheckpointClearance[];
  bookings: QuarantineBooking[];
  trips: SpecialistTrip[];
  lang: 'vi' | 'en';
  onRecordClearance: (clrId: string, result: 'PASSED' | 'HELD' | 'FAILED', ref: string, remark: string) => void;
  onConfirmBooking: (bookingId: string, ref: string) => void;
  onOpenNewBookingModal: () => void;
}

export const RenderQuarantineCustomsPage: React.FC<RenderQuarantineCustomsPageProps> = ({
  clearances,
  bookings,
  trips,
  lang,
  onRecordClearance,
  onConfirmBooking,
  onOpenNewBookingModal
}) => {
  const [activeTab, setActiveTab] = useState<'clearance' | 'quarantine'>('clearance');
  const [selectedClr, setSelectedClr] = useState<CheckpointClearance | null>(null);
  const [clrResult, setClrResult] = useState<'PASSED' | 'HELD' | 'FAILED'>('PASSED');
  const [clrRef, setClrRef] = useState('HQ-2026-XN01');
  const [clrRemark, setClrRemark] = useState('Cơ quan kiểm dịch đã kiểm tra lâm sàng và đóng dấu thông quan.');

  const [confirmingBookingId, setConfirmingBookingId] = useState<string | null>(null);
  const [bookingRefInput, setBookingRefInput] = useState('AVS-CONFIRM-9921');

  const handleSaveClearance = () => {
    if (selectedClr) {
      onRecordClearance(selectedClr.id, clrResult, clrRef, clrRemark);
      setSelectedClr(null);
    }
  };

  const handleSaveBookingConfirm = () => {
    if (confirmingBookingId) {
      onConfirmBooking(confirmingBookingId, bookingRefInput);
      setConfirmingBookingId(null);
    }
  };

  return (
    <div className="render-quarantine-customs-page fade-in">
      <div className="page-head">
        <div>
          <h2 className="page-title">
            {lang === 'vi' ? 'Kiểm dịch động vật & Thủ tục Hải quan' : 'Quarantine & Customs'}
          </h2>
          <p className="subtitle">
            {lang === 'vi'
              ? 'Theo dõi tiến độ kiểm dịch tại các trạm cách ly, cửa khẩu đường bộ và sân bay quốc tế.'
              : 'Track quarantine stations, border checkpoints and airport clearance decisions.'}
          </p>
        </div>

        {activeTab === 'quarantine' && (
          <button
            type="button"
            className="btn-solid-orange"
            onClick={onOpenNewBookingModal}
          >
            <Icon name="plus" />
            <span>{lang === 'vi' ? 'Đặt chỗ trạm kiểm dịch' : 'New Quarantine Booking'}</span>
          </button>
        )}
      </div>

      {/* TABS SWITCHER */}
      <div className="tabs-navigation-bar">
        <button
          type="button"
          className={`tab-item-btn ${activeTab === 'clearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('clearance')}
        >
          <Icon name="flag" />
          <span>{lang === 'vi' ? 'Thông quan Cửa khẩu & Sân bay' : 'Checkpoint Clearance'}</span>
          <span className="tab-counter-pill">{clearances.length}</span>
        </button>

        <button
          type="button"
          className={`tab-item-btn ${activeTab === 'quarantine' ? 'active' : ''}`}
          onClick={() => setActiveTab('quarantine')}
        >
          <Icon name="clock" />
          <span>{lang === 'vi' ? 'Đặt chỗ Trạm kiểm dịch cách ly' : 'Quarantine Bookings'}</span>
          <span className="tab-counter-pill">{bookings.length}</span>
        </button>
      </div>

      {/* TAB 1: CLEARANCES */}
      {activeTab === 'clearance' && (
        <div className="card table-card" style={{ marginTop: '16px' }}>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{lang === 'vi' ? 'CHUYẾN ĐI' : 'TRIP'}</th>
                  <th>{lang === 'vi' ? 'TRẠM KIỂM SOÁT / CỬA KHẨU' : 'CHECKPOINT'}</th>
                  <th>{lang === 'vi' ? 'THỜI ĐIỂM DỰ KIẾN' : 'PLANNED AT'}</th>
                  <th>{lang === 'vi' ? 'VỊ TRÍ TỔ XE' : 'CREW POSITION'}</th>
                  <th>{lang === 'vi' ? 'KẾT QUẢ THÔNG QUAN' : 'RESULT'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'THAO TÁC' : 'ACTION'}</th>
                </tr>
              </thead>
              <tbody>
                {clearances.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <b className="primary-id-text">{c.tripId}</b>
                      {trips.find((t) => t.id === c.tripId) && (
                        <div className="cell-sub-muted font-11">
                          {trips.find((t) => t.id === c.tripId)?.origin} → {trips.find((t) => t.id === c.tripId)?.destination}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="fw-600">{c.cpName}</div>
                      <div className="cell-sub-muted font-11">
                        {c.cpType} • {c.country}
                      </div>
                    </td>
                    <td>
                      <div className="fw-600">{c.plannedAt}</div>
                    </td>
                    <td>
                      <span
                        className={`pill-badge ${
                          c.crewPosition === 'PASSED'
                            ? 'pill-green'
                            : c.crewPosition === 'AT_CHECKPOINT'
                            ? 'pill-amber'
                            : 'pill-gray'
                        }`}
                      >
                        {c.crewPosition === 'PASSED'
                          ? 'Đã qua cổng'
                          : c.crewPosition === 'AT_CHECKPOINT'
                          ? 'Đang tại cổng'
                          : 'Chưa đến'}
                      </span>
                    </td>
                    <td>
                      {c.result && c.result !== 'NONE' ? (
                        <div>
                          <span
                            className={`pill-badge ${
                              c.result === 'PASSED'
                                ? 'pill-green'
                                : c.result === 'HELD'
                                ? 'pill-red'
                                : 'pill-red'
                            }`}
                          >
                            {c.result === 'PASSED' ? '✓ THÔNG QUAN ĐẠT' : c.result === 'HELD' ? 'TẠM GIỮ' : 'KHÔNG ĐẠT'}
                          </span>
                          {c.ref && <div className="cell-sub-muted font-11" style={{ marginTop: '2px' }}>Số: {c.ref}</div>}
                          {c.remark && <div className="font-11 text-muted">{c.remark}</div>}
                        </div>
                      ) : (
                        <span className="text-muted font-11">Chưa ghi nhận</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-sm btn-outline"
                        onClick={() => {
                          setSelectedClr(c);
                          setClrResult(c.result === 'PASSED' ? 'PASSED' : 'PASSED');
                          setClrRef(c.ref || 'HQ-2026-XN01');
                          setClrRemark(c.remark || 'Đã kiểm tra lâm sàng và đóng dấu thông quan.');
                        }}
                      >
                        {c.result && c.result !== 'NONE' ? 'Cập nhật lại' : 'Ghi nhận kết quả'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: QUARANTINE BOOKINGS */}
      {activeTab === 'quarantine' && (
        <div className="card table-card" style={{ marginTop: '16px' }}>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{lang === 'vi' ? 'MÃ ĐẶT CHỖ' : 'BOOKING ID'}</th>
                  <th>{lang === 'vi' ? 'CHUYẾN ĐI' : 'TRIP'}</th>
                  <th>{lang === 'vi' ? 'TRẠM KIỂM DỊCH' : 'QUARANTINE STATION'}</th>
                  <th>{lang === 'vi' ? 'NGÀY HẸN CÁCH LY' : 'PLANNED DATE'}</th>
                  <th>{lang === 'vi' ? 'GHI CHÚ / QUY ĐỊNH' : 'NOTES'}</th>
                  <th>{lang === 'vi' ? 'TRẠNG THÁI' : 'STATUS'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'THAO TÁC' : 'ACTION'}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const isBooked = b.status === 'BOOKED';
                  return (
                    <tr key={b.id}>
                      <td>
                        <b className="primary-id-text">{b.id}</b>
                        <div className="cell-sub-muted font-11">Ref: {b.ref || 'Chưa có'}</div>
                      </td>
                      <td>
                        <b className="primary-id-text">{b.tripId}</b>
                      </td>
                      <td>
                        <div className="fw-600">{b.cpName}</div>
                      </td>
                      <td>
                        <div className="fw-600">{b.slot}</div>
                      </td>
                      <td>
                        <div className="truncate-text" style={{ maxWidth: '300px' }}>
                          {b.notes || '—'}
                        </div>
                      </td>
                      <td>
                        <span className={`pill-badge ${isBooked ? 'pill-green' : 'pill-amber'}`}>
                          {isBooked ? 'ĐÃ XÁC NHẬN CHỖ' : 'ĐANG CHỜ PHẢN HỒI'}
                        </span>
                        {b.confirmedAt && <div className="cell-sub-muted font-11">{b.confirmedAt}</div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!isBooked ? (
                          <button
                            type="button"
                            className="btn-sm btn-solid-orange"
                            onClick={() => {
                              setConfirmingBookingId(b.id);
                              setBookingRefInput(b.ref || 'AVS-CONFIRM-9921');
                            }}
                          >
                            Xác nhận booking
                          </button>
                        ) : (
                          <span className="text-green font-11">✓ Đã giữ chỗ</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD CLEARANCE MODAL */}
      {selectedClr && (
        <div className="modal-backdrop fade-in" onClick={() => setSelectedClr(null)}>
          <div className="modal-card pad" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: 0, marginBottom: '16px' }}>
              <h3 className="modal-title">Ghi nhận thông quan: {selectedClr.cpName}</h3>
              <button type="button" className="btn-close-sm" onClick={() => setSelectedClr(null)}>
                ✕
              </button>
            </div>
            <p className="cell-sub-muted">Chuyến: {selectedClr.tripId} • {selectedClr.cpType}</p>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Kết quả quyết định của Cơ quan chức năng:</label>
              <select
                className="custom-select"
                value={clrResult}
                onChange={(e) => setClrResult(e.target.value as any)}
              >
                <option value="PASSED">✓ Đạt yêu cầu — Cho phép thông quan (PASSED)</option>
                <option value="HELD">⚠️ Tạm giữ phương tiện/ngựa để kiểm tra thêm (HELD)</option>
                <option value="FAILED">❌ Không đạt — Yêu cầu quay đầu hoặc cách ly đặc biệt (FAILED)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Số biên bản / Số tờ khai hải quan:</label>
              <input
                type="text"
                className="custom-input"
                value={clrRef}
                onChange={(e) => setClrRef(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Ghi chú & Tình trạng cá thể ngựa:</label>
              <textarea
                rows={3}
                className="custom-textarea"
                value={clrRemark}
                onChange={(e) => setClrRemark(e.target.value)}
              />
            </div>

            <div className="reject-form-btn-row" style={{ marginTop: '18px' }}>
              <button type="button" className="btn-ghost" onClick={() => setSelectedClr(null)}>
                Hủy
              </button>
              <button type="button" className="btn-solid-orange" onClick={handleSaveClearance}>
                Lưu kết quả thông quan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM BOOKING MODAL */}
      {confirmingBookingId && (
        <div className="modal-backdrop fade-in" onClick={() => setConfirmingBookingId(null)}>
          <div className="modal-card pad" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: 0, marginBottom: '14px' }}>
              <h3 className="modal-title">Ghi nhận xác nhận đặt chỗ cách ly</h3>
              <button type="button" className="btn-close-sm" onClick={() => setConfirmingBookingId(null)}>
                ✕
              </button>
            </div>

            <div className="form-group">
              <label className="form-lbl">Mã xác nhận / Số Reference từ cơ quan kiểm dịch:</label>
              <input
                type="text"
                className="custom-input"
                value={bookingRefInput}
                onChange={(e) => setBookingRefInput(e.target.value)}
              />
            </div>

            <div className="reject-form-btn-row" style={{ marginTop: '16px' }}>
              <button type="button" className="btn-ghost" onClick={() => setConfirmingBookingId(null)}>
                Hủy
              </button>
              <button type="button" className="btn-solid-green" onClick={handleSaveBookingConfirm}>
                Xác nhận đã giữ chỗ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
