import React, { useState } from 'react';
import type { AuditItem } from './specialist.types';
import { Icon } from './specialist.types';

interface RenderAuditHistoryPageProps {
  auditLog: AuditItem[];
  lang: 'vi' | 'en';
}

export const RenderAuditHistoryPage: React.FC<RenderAuditHistoryPageProps> = ({
  auditLog,
  lang
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');

  const filteredLog = auditLog.filter((item) => {
    const matchesSearch =
      item.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.detail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      filterRole === 'ALL' || item.role === filterRole;

    return matchesSearch && matchesRole;
  });

  const roles = Array.from(new Set(auditLog.map((item) => item.role)));

  return (
    <div className="render-audit-history-page fade-in">
      <div className="page-head">
        <div>
          <h2 className="page-title">
            {lang === 'vi' ? 'Nhật ký kiểm tra & Thao tác thẩm định' : 'Audit History'}
          </h2>
          <p className="subtitle">
            {lang === 'vi'
              ? 'Lưu vết toàn bộ quyết định phê duyệt, từ chối, yêu cầu bổ sung và ghi nhận thông quan.'
              : 'Complete immutable log of all reviews, rejection reasons, customer re-uploads and clearances.'}
          </p>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="card pad filter-toolbar-card">
        <div className="filter-toolbar-row">
          <div className="search-box-wrap">
            <Icon name="search" />
            <input
              type="text"
              className="search-input"
              placeholder={lang === 'vi' ? 'Tìm theo người thực hiện, hành động, mã chứng từ, chi tiết...' : 'Search actor, action, doc or details...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-select-group">
            <select
              className="custom-select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="ALL">{lang === 'vi' ? 'Tất cả các vai trò' : 'All Roles'}</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AUDIT TABLE */}
      <div className="card table-card" style={{ marginTop: '16px' }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{lang === 'vi' ? 'THỜI GIAN' : 'TIMESTAMP'}</th>
                <th>{lang === 'vi' ? 'NGƯỜI THỰC HIỆN' : 'ACTOR'}</th>
                <th>{lang === 'vi' ? 'HÀNH ĐỘNG' : 'ACTION'}</th>
                <th>{lang === 'vi' ? 'ĐỐI TƯỢNG HỒ SƠ' : 'RECORD'}</th>
                <th>{lang === 'vi' ? 'CHI TIẾT THAO TÁC & LÝ DO' : 'DETAIL & REMARK'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLog.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    {lang === 'vi' ? 'Không có bản ghi nhật ký nào phù hợp.' : 'No audit records found.'}
                  </td>
                </tr>
              ) : (
                filteredLog.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-600 font-12">{item.at}</div>
                    </td>
                    <td>
                      <b className="primary-id-text">{item.actor}</b>
                      <div className="cell-sub-muted font-11">{item.role}</div>
                    </td>
                    <td>
                      <span
                        className={`pill-badge ${
                          item.action.includes('Duyệt')
                            ? 'pill-green'
                            : item.action.includes('Từ chối')
                            ? 'pill-red'
                            : item.action.includes('Bổ sung')
                            ? 'pill-purple'
                            : item.action.includes('Thông quan')
                            ? 'pill-blue'
                            : 'pill-gray'
                        }`}
                      >
                        {item.action}
                      </span>
                    </td>
                    <td>
                      <b className="font-12">{item.entity}</b>
                    </td>
                    <td>
                      <div className="font-12" style={{ maxWidth: '420px', lineHeight: 1.4 }}>
                        {item.detail}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer-records">
          {filteredLog.length} {lang === 'vi' ? 'sự kiện được ghi nhận' : 'events logged'}
        </div>
      </div>
    </div>
  );
};
