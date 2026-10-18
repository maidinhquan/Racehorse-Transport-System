import React, { useState } from 'react';
import type { RegulationItem, DocTypeItem, CheckpointItem } from './specialist.types';
import { Icon } from './specialist.types';

interface RenderRegulationsMasterPageProps {
  regulations: RegulationItem[];
  docTypes: DocTypeItem[];
  checkpoints: CheckpointItem[];
  lang: 'vi' | 'en';
}

export const RenderRegulationsMasterPage: React.FC<RenderRegulationsMasterPageProps> = ({
  regulations,
  docTypes,
  checkpoints,
  lang
}) => {
  const [activeTab, setActiveTab] = useState<'regs' | 'types' | 'checkpoints'>('regs');

  return (
    <div className="render-regulations-master-page fade-in">
      <div className="page-head">
        <div>
          <h2 className="page-title">
            {lang === 'vi' ? 'Quy định kiểm dịch & Danh mục Thiết lập' : 'Regulations & Master Setup'}
          </h2>
          <p className="subtitle">
            {lang === 'vi'
              ? 'Dữ liệu cấu hình nền tảng dùng để xây dựng Checklist pháp lý tự động cho từng tuyến đường vận chuyển.'
              : 'Master legal requirements, standardized doc types and authorized border checkpoints.'}
          </p>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div className="tabs-navigation-bar">
        <button
          type="button"
          className={`tab-item-btn ${activeTab === 'regs' ? 'active' : ''}`}
          onClick={() => setActiveTab('regs')}
        >
          <Icon name="list" />
          <span>{lang === 'vi' ? 'Quy định theo Quốc gia' : 'National Regulations'}</span>
          <span className="tab-counter-pill">{regulations.length}</span>
        </button>

        <button
          type="button"
          className={`tab-item-btn ${activeTab === 'types' ? 'active' : ''}`}
          onClick={() => setActiveTab('types')}
        >
          <Icon name="doc" />
          <span>{lang === 'vi' ? 'Danh mục Loại chứng từ' : 'Standard Document Types'}</span>
          <span className="tab-counter-pill">{docTypes.length}</span>
        </button>

        <button
          type="button"
          className={`tab-item-btn ${activeTab === 'checkpoints' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkpoints')}
        >
          <Icon name="flag" />
          <span>{lang === 'vi' ? 'Cửa khẩu & Trạm kiểm dịch' : 'Border Checkpoints'}</span>
          <span className="tab-counter-pill">{checkpoints.length}</span>
        </button>
      </div>

      {/* TAB 1: REGULATIONS */}
      {activeTab === 'regs' && (
        <div className="card table-card" style={{ marginTop: '16px' }}>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{lang === 'vi' ? 'QUỐC GIA' : 'COUNTRY'}</th>
                  <th>{lang === 'vi' ? 'HƯỚNG VẬN CHUYỂN' : 'DIRECTION'}</th>
                  <th>{lang === 'vi' ? 'CHỨNG TỪ BẮT BUỘC' : 'REQUIRED DOCUMENTS'}</th>
                  <th>{lang === 'vi' ? 'CĂN CỨ PHÁP LÝ & NGUỒN' : 'LEGAL SOURCE'}</th>
                  <th>{lang === 'vi' ? 'XÁC THỰC' : 'VERIFICATION'}</th>
                  <th>{lang === 'vi' ? 'CẬP NHẬT' : 'UPDATED'}</th>
                </tr>
              </thead>
              <tbody>
                {regulations.map((reg) => (
                  <tr key={reg.id}>
                    <td>
                      <b className="primary-id-text">{reg.countryName}</b>
                      <div className="cell-sub-muted font-11">({reg.country})</div>
                    </td>
                    <td>
                      <span
                        className={`pill-badge ${
                          reg.direction === 'EXPORT'
                            ? 'pill-blue'
                            : reg.direction === 'IMPORT'
                            ? 'pill-green'
                            : reg.direction === 'TRANSIT'
                            ? 'pill-purple'
                            : 'pill-gray'
                        }`}
                      >
                        {reg.direction === 'EXPORT'
                          ? 'XUẤT KHẨU'
                          : reg.direction === 'IMPORT'
                          ? 'NHẬP KHẨU'
                          : reg.direction === 'TRANSIT'
                          ? 'QUÁ CẢNH'
                          : 'NỘI ĐỊA'}
                      </span>
                    </td>
                    <td>
                      <div className="font-12 fw-600" style={{ maxWidth: '320px' }}>
                        {reg.types
                          .map((tid) => docTypes.find((d) => d.id === tid)?.name || tid)
                          .join(', ')}
                      </div>
                    </td>
                    <td>
                      <div className="font-12 fw-600">{reg.note}</div>
                      <div className="cell-sub-muted font-11">Nguồn: {reg.source}</div>
                    </td>
                    <td>
                      <span className={`pill-badge ${reg.verified ? 'pill-green' : 'pill-amber'}`}>
                        {reg.verified ? 'ĐÃ KIỂM CHỨNG' : 'CHỜ XÁC MINH'}
                      </span>
                    </td>
                    <td>
                      <div className="font-12">{reg.updated}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DOC TYPES */}
      {activeTab === 'types' && (
        <div className="card table-card" style={{ marginTop: '16px' }}>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{lang === 'vi' ? 'MÃ LOẠI' : 'CODE'}</th>
                  <th>{lang === 'vi' ? 'TÊN LOẠI CHỨNG TỪ' : 'DOCUMENT NAME'}</th>
                  <th>{lang === 'vi' ? 'NHÓM NGHIỆP VỤ' : 'GROUP'}</th>
                  <th>{lang === 'vi' ? 'PHẠM VI' : 'SCOPE'}</th>
                  <th>{lang === 'vi' ? 'GIAI ĐOẠN' : 'STAGE'}</th>
                  <th>{lang === 'vi' ? 'HIỆU LỰC MẶC ĐỊNH' : 'DEFAULT VALIDITY'}</th>
                  <th>{lang === 'vi' ? 'BÊN CUNG CẤP' : 'PROVIDER'}</th>
                </tr>
              </thead>
              <tbody>
                {docTypes.map((dt) => (
                  <tr key={dt.id}>
                    <td>
                      <b className="primary-id-text">{dt.id}</b>
                    </td>
                    <td>
                      <div className="fw-600">{dt.name}</div>
                    </td>
                    <td>
                      <span className="pill-badge pill-purple">{dt.group}</span>
                    </td>
                    <td>
                      <span className="pill-badge pill-gray">
                        {dt.scope === 'PER_HORSE' ? 'Từng cá thể ngựa' : 'Toàn chuyến đi'}
                      </span>
                    </td>
                    <td>
                      <span className="font-12">
                        {dt.category === 'IDENTITY' ? 'Hồ sơ danh tính cơ bản' : 'Hồ sơ pháp lý xuất bến'}
                      </span>
                    </td>
                    <td>
                      <div className="fw-600">
                        {dt.validityDays ? `${dt.validityDays} ngày` : 'Theo ngày hết hạn trên văn bản'}
                      </div>
                    </td>
                    <td>
                      <span className={`pill-badge ${dt.provider === 'CBN' ? 'pill-blue' : 'pill-gray'}`}>
                        {dt.provider === 'CBN' ? 'CBN làm thủ tục' : 'Khách hàng cung cấp'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CHECKPOINTS */}
      {activeTab === 'checkpoints' && (
        <div className="card table-card" style={{ marginTop: '16px' }}>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{lang === 'vi' ? 'MÃ TRẠM' : 'ID'}</th>
                  <th>{lang === 'vi' ? 'TÊN CỬA KHẨU / SÂN BAY / TRẠM CÁCH LY' : 'NAME'}</th>
                  <th>{lang === 'vi' ? 'PHÂN LOẠI' : 'TYPE'}</th>
                  <th>{lang === 'vi' ? 'QUỐC GIA' : 'COUNTRY'}</th>
                  <th>{lang === 'vi' ? 'GIỜ LÀM VIỆC KIỂM DỊCH' : 'HOURS'}</th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((cp) => (
                  <tr key={cp.id}>
                    <td>
                      <b className="primary-id-text">{cp.id}</b>
                    </td>
                    <td>
                      <div className="fw-600">{cp.name}</div>
                    </td>
                    <td>
                      <span
                        className={`pill-badge ${
                          cp.type === 'LAND_BORDER'
                            ? 'pill-blue'
                            : cp.type === 'AIRPORT'
                            ? 'pill-purple'
                            : 'pill-green'
                        }`}
                      >
                        {cp.type === 'LAND_BORDER'
                          ? 'Cửa khẩu đường bộ'
                          : cp.type === 'AIRPORT'
                          ? 'Sân bay quốc tế'
                          : 'Trạm kiểm dịch cách ly'}
                      </span>
                    </td>
                    <td>
                      <b className="font-12">{cp.country}</b>
                    </td>
                    <td>
                      <div className="font-12">{cp.hours}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
