import React, { useState } from 'react';
import type { SpecialistDoc, SpecialistTrip } from './specialist.types';
import { Icon } from './specialist.types';

interface RenderReviewQueuePageProps {
  docs: SpecialistDoc[];
  trips: SpecialistTrip[];
  lang: 'vi' | 'en';
  onOpenDocReview: (docId: string) => void;
  onOpenRecordCBNDoc: () => void;
}

export const RenderReviewQueuePage: React.FC<RenderReviewQueuePageProps> = ({
  docs,
  trips,
  lang,
  onOpenDocReview,
  onOpenRecordCBNDoc
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterTrip, setFilterTrip] = useState('ALL');
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [filterProvider, setFilterProvider] = useState('ALL');

  const filteredDocs = docs.filter((d) => {
    const matchesSearch =
      d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.typeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.tripId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.horseName && d.horseName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === 'ALL' || d.status === filterStatus;

    const matchesTrip =
      filterTrip === 'ALL' || d.tripId === filterTrip;

    const matchesGroup =
      filterGroup === 'ALL' || d.group === filterGroup;

    const matchesProvider =
      filterProvider === 'ALL' || d.provider === filterProvider;

    return matchesSearch && matchesStatus && matchesTrip && matchesGroup && matchesProvider;
  });

  const tripIds = Array.from(new Set(docs.map((d) => d.tripId)));

  return (
    <div className="render-review-queue-page fade-in">
      <div className="page-head">
        <div>
          <h2 className="page-title">
            {lang === 'vi' ? 'Hàng đợi thẩm định hồ sơ' : 'Document Review Queue'}
          </h2>
          <p className="subtitle">
            {lang === 'vi'
              ? 'Kiểm tra từng chứng từ khách hàng tải lên hoặc cập nhật từ cơ quan chức năng. Quyết định duyệt hoặc yêu cầu bổ sung được lưu vết theo từng phiên bản.'
              : 'Inspect every uploaded document against regulations. Decisions apply to versions and remain in history.'}
          </p>
        </div>
        <button
          type="button"
          className="btn-outline"
          onClick={onOpenRecordCBNDoc}
        >
          <Icon name="plus" />
          <span>{lang === 'vi' ? 'Ghi nhận tệp CBN phát hành' : 'Record CBN Document'}</span>
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
              placeholder={lang === 'vi' ? 'Tìm theo tên chứng từ, mã DOC, số hiệu, mã chuyến, tên ngựa...' : 'Search doc name, number, trip or horse...'}
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
              <option value="SUBMITTED">{lang === 'vi' ? 'Chờ thẩm định (SUBMITTED)' : 'Submitted'}</option>
              <option value="APPROVED">{lang === 'vi' ? 'Đã duyệt đạt (APPROVED)' : 'Approved'}</option>
              <option value="REJECTED">{lang === 'vi' ? 'Đã từ chối (REJECTED)' : 'Rejected'}</option>
              <option value="EXPIRED">{lang === 'vi' ? 'Đã hết hạn (EXPIRED)' : 'Expired'}</option>
            </select>

            <select
              className="custom-select"
              value={filterTrip}
              onChange={(e) => setFilterTrip(e.target.value)}
            >
              <option value="ALL">{lang === 'vi' ? 'Tất cả chuyến' : 'All Trips'}</option>
              {tripIds.map((tid) => (
                <option key={tid} value={tid}>
                  {tid}
                </option>
              ))}
            </select>

            <select
              className="custom-select"
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
            >
              <option value="ALL">{lang === 'vi' ? 'Tất cả phân loại' : 'All Groups'}</option>
              <option value="CUSTOMS">{lang === 'vi' ? 'Hải quan & Pháp lý' : 'Customs'}</option>
              <option value="MEDICAL">{lang === 'vi' ? 'Thú y & Sức khỏe' : 'Medical'}</option>
              <option value="QUARANTINE">{lang === 'vi' ? 'Cách ly kiểm dịch' : 'Quarantine'}</option>
            </select>

            <select
              className="custom-select"
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
            >
              <option value="ALL">{lang === 'vi' ? 'Tất cả bên cấp' : 'All Providers'}</option>
              <option value="CUSTOMER">{lang === 'vi' ? 'Khách hàng cung cấp' : 'Customer'}</option>
              <option value="CBN">{lang === 'vi' ? 'CBN làm thủ tục' : 'CBN Transport'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* QUEUE TABLE */}
      <div className="card table-card" style={{ marginTop: '16px' }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{lang === 'vi' ? 'CHỨNG TỪ & ĐỐI TƯỢNG' : 'DOCUMENT & SUBJECT'}</th>
                <th>{lang === 'vi' ? 'CHUYẾN ĐI' : 'TRIP'}</th>
                <th>{lang === 'vi' ? 'BÊN CẤP' : 'PROVIDER'}</th>
                <th>{lang === 'vi' ? 'PHIÊN BẢN' : 'VERSION'}</th>
                <th>{lang === 'vi' ? 'THỜI ĐIỂM GỬI' : 'SUBMITTED'}</th>
                <th>{lang === 'vi' ? 'KHỞI HÀNH' : 'DEPARTS'}</th>
                <th>{lang === 'vi' ? 'TRẠNG THÁI' : 'STATUS'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'THAO TÁC' : 'ACTION'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    {lang === 'vi' ? 'Không có hồ sơ nào phù hợp bộ lọc.' : 'No matching documents found.'}
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const latest = doc.versions[doc.versions.length - 1];
                  const trip = trips.find((t) => t.id === doc.tripId);
                  const isReUpload = doc.versions.length > 1;

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => onOpenDocReview(doc.id)}
                      className="clickable-row"
                    >
                      <td>
                        <div className="fw-600 doc-title-row">
                          {doc.typeName}
                          {isReUpload && (
                            <span className="pill-badge pill-purple" title="Khách nộp lại bản v2 chờ duyệt lại">
                              {lang === 'vi' ? 'Bổ sung v2' : 'v2 Re-upload'}
                            </span>
                          )}
                        </div>
                        <div className="cell-sub-muted">
                          {doc.horseName ? `Ngựa: ${doc.horseName}` : 'Toàn chuyến'} • {doc.id} • Số: {doc.number}
                        </div>
                      </td>
                      <td>
                        <b className="primary-id-text">{doc.tripId}</b>
                        {trip && <div className="cell-sub-muted font-11">{trip.origin} → {trip.destination}</div>}
                      </td>
                      <td>
                        <span className={`pill-badge ${doc.provider === 'CUSTOMER' ? 'pill-gray' : 'pill-blue'}`}>
                          {doc.provider === 'CUSTOMER' ? 'Khách hàng' : 'CBN nội bộ'}
                        </span>
                      </td>
                      <td>
                        <span className="badge-version">v{doc.versions.length}</span>
                      </td>
                      <td>
                        <div>{latest ? latest.at.slice(0, 10) : '—'}</div>
                        <div className="cell-sub-muted font-11">{latest ? latest.at.slice(11) : ''}</div>
                      </td>
                      <td>
                        <div className="fw-600">{trip ? trip.plannedDepart.slice(0, 10) : '—'}</div>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDocReview(doc.id);
                          }}
                        >
                          {lang === 'vi' ? 'Thẩm định' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer-records">
          {filteredDocs.length} {lang === 'vi' ? 'chứng từ hiển thị' : 'documents shown'}
        </div>
      </div>
    </div>
  );
};
