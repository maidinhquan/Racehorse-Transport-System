import React, { useState } from 'react';
import type { DocRequest, SpecialistTrip } from './specialist.types';
import { Icon } from './specialist.types';

interface RenderDocumentRequestsPageProps {
  requests: DocRequest[];
  trips: SpecialistTrip[];
  lang: 'vi' | 'en';
  onOpenCreateRequestModal: () => void;
  onOpenDocReview: (docId: string) => void;
  onMarkFulfilled: (requestId: string) => void;
}

export const RenderDocumentRequestsPage: React.FC<RenderDocumentRequestsPageProps> = ({
  requests,
  trips,
  lang,
  onOpenCreateRequestModal,
  onOpenDocReview,
  onMarkFulfilled
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tripId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.typeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.horseName && r.horseName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === 'ALL' || r.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="render-doc-requests-page fade-in">
      <div className="page-head">
        <div>
          <h2 className="page-title">
            {lang === 'vi' ? 'Yêu cầu bổ sung hồ sơ gửi khách hàng' : 'Document Requests'}
          </h2>
          <p className="subtitle">
            {lang === 'vi'
              ? 'Yêu cầu khách hàng nộp bổ sung giấy tờ bị thiếu, sai thông tin, bị từ chối hoặc đã hết hạn trước chuyến đi.'
              : 'Ask customers for missing, incorrect, rejected or expired documents. Fulfill when approved.'}
          </p>
        </div>
        <button
          type="button"
          className="btn-solid-orange"
          onClick={onOpenCreateRequestModal}
        >
          <Icon name="plus" />
          <span>{lang === 'vi' ? 'Tạo yêu cầu bổ sung mới' : 'New Request'}</span>
        </button>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="card pad filter-toolbar-card">
        <div className="filter-toolbar-row">
          <div className="search-box-wrap">
            <Icon name="search" />
            <input
              type="text"
              className="search-input"
              placeholder={lang === 'vi' ? 'Tìm theo mã yêu cầu, chuyến, loại chứng từ, lý do...' : 'Search request, trip, doc type or reason...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-select-group">
            <select
              className="custom-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">{lang === 'vi' ? 'Tất cả trạng thái' : 'All Statuses'}</option>
              <option value="OPEN">{lang === 'vi' ? 'Đang chờ khách nộp (OPEN)' : 'Open'}</option>
              <option value="SUBMITTED">{lang === 'vi' ? 'Khách đã nộp lại (SUBMITTED)' : 'Submitted v2'}</option>
              <option value="FULFILLED">{lang === 'vi' ? 'Đã hoàn tất (FULFILLED)' : 'Fulfilled'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* REQUESTS TABLE */}
      <div className="card table-card" style={{ marginTop: '16px' }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{lang === 'vi' ? 'MÃ YÊU CẦU' : 'REQUEST'}</th>
                <th>{lang === 'vi' ? 'CHUYẾN ĐI' : 'TRIP'}</th>
                <th>{lang === 'vi' ? 'CHỨNG TỪ & ĐỐI TƯỢNG' : 'DOCUMENT'}</th>
                <th>{lang === 'vi' ? 'LÝ DO YÊU CẦU BỔ SUNG' : 'REASON FOR REQUEST'}</th>
                <th>{lang === 'vi' ? 'HẠN CHÓT' : 'DUE DATE'}</th>
                <th>{lang === 'vi' ? 'TRẠNG THÁI' : 'STATUS'}</th>
                <th>{lang === 'vi' ? 'PHẢN HỒI CỦA KHÁCH HÀNG' : 'CUSTOMER UPLOAD'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'THAO TÁC' : 'ACTION'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    {lang === 'vi' ? 'Không có yêu cầu bổ sung nào phù hợp.' : 'No requests found.'}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((rq) => {
                  const trip = trips.find((t) => t.id === rq.tripId);
                  const isSubmitted = rq.status === 'SUBMITTED';
                  const isFulfilled = rq.status === 'FULFILLED';

                  return (
                    <tr key={rq.id}>
                      <td>
                        <b className="primary-id-text">{rq.id}</b>
                        <div className="cell-sub-muted">{rq.createdAt}</div>
                      </td>
                      <td>
                        <b className="primary-id-text">{rq.tripId}</b>
                        {trip && <div className="cell-sub-muted font-11">{trip.origin} → {trip.destination}</div>}
                      </td>
                      <td>
                        <div className="fw-600">{rq.typeName}</div>
                        {rq.horseName && <div className="cell-sub-muted font-11">🐴 {rq.horseName}</div>}
                      </td>
                      <td>
                        <div className="truncate-text" style={{ maxWidth: '300px' }} title={rq.reason}>
                          {rq.reason}
                        </div>
                      </td>
                      <td>
                        <div className="fw-600">{rq.dueAt}</div>
                      </td>
                      <td>
                        <span
                          className={`pill-badge ${
                            isFulfilled
                              ? 'pill-green'
                              : isSubmitted
                              ? 'pill-purple'
                              : 'pill-amber'
                          }`}
                        >
                          {isFulfilled ? 'HOÀN TẤT' : isSubmitted ? 'ĐÃ NỘP LẠI (v2)' : 'CHỜ KHÁCH NỘP'}
                        </span>
                      </td>
                      <td>
                        {rq.latestFile ? (
                          <div>
                            <button
                              type="button"
                              className="link-file-text"
                              onClick={() => {
                                // Find matching doc
                                onOpenDocReview('DOC-105');
                              }}
                            >
                              📄 {rq.latestFile} (v{rq.latestVersionUploaded})
                            </button>
                            <div className="cell-sub-muted font-11">Khách đã nộp tệp đính kèm</div>
                          </div>
                        ) : (
                          <span className="text-muted">Chưa có phản hồi</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isSubmitted ? (
                          <button
                            type="button"
                            className="btn-sm btn-solid-orange"
                            onClick={() => onOpenDocReview('DOC-105')}
                          >
                            {lang === 'vi' ? 'Duyệt lại' : 'Review v2'}
                          </button>
                        ) : !isFulfilled ? (
                          <button
                            type="button"
                            className="btn-sm btn-ghost"
                            onClick={() => onMarkFulfilled(rq.id)}
                          >
                            {lang === 'vi' ? 'Đóng yêu cầu' : 'Mark Done'}
                          </button>
                        ) : (
                          <span className="text-green font-11">✓ Đã giải quyết</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer-records">
          {filteredRequests.length} {lang === 'vi' ? 'yêu cầu hiển thị' : 'requests shown'}
        </div>
      </div>
    </div>
  );
};
