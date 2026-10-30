import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportRequest } from '../../../types';
import { useCustomer } from '../../../hooks/useCustomer';
import { isActive, openSupplements } from '../../../hooks/customerRules';
import { RequestDocuments } from '../../../components/DocumentList/DocumentList';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { Note } from '../../../components/Common/Common';

const COMPANY_DOC_LABEL = { NOT_STARTED: 'Chưa bắt đầu', PROCESSING: 'Đang xử lý', COMPLETED: 'Hoàn tất' } as const;
const COMPANY_DOC_TONE = { NOT_STARTED: 'muted', PROCESSING: 'warn', COMPLETED: 'ok' } as const;

/**
 * Tab Giấy tờ: giấy tờ chung + hồ sơ từng ngựa. Khách hàng tải lại tệp ngay trên từng giấy tờ;
 * Specialist yêu cầu bổ sung kèm lý do. Giấy tờ do CBN Transport xử lý chỉ để xem.
 */
export const DocumentsTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const { docsOf } = useCustomer();
  const docs = docsOf(r);
  const reviewing = ['ACTIVATED', 'SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'CLOSED'].includes(r.status);
  const inWizard = ['DRAFT', 'CHANGES_REQUESTED'].includes(r.status);

  return (
    <div className="cus-grid-main">
      <div className="cus-stack">
        <div className="cus-card">
          <h3 className="cus-card__title">Giấy tờ của khách hàng</h3>
          <p className="cus-subtitle" style={{ marginTop: -6, marginBottom: 14 }}>
            {reviewing
              ? 'Transport Specialist kiểm duyệt từng giấy tờ. Tệp vừa gửi không tự động được duyệt.'
              : 'Việc kiểm duyệt giấy tờ chỉ bắt đầu sau khi hợp đồng được ký và yêu cầu được kích hoạt.'}
          </p>
          {inWizard && <Note tone="blue" title="Đang khai báo">Bạn có thể cập nhật giấy tờ ở đây hoặc trong bước “Ngựa & hồ sơ” của wizard.</Note>}
          <div style={{ marginTop: inWizard ? 14 : 0 }}>
            <RequestDocuments requestId={r.id} shared={docs.shared} perHorse={docs.perHorse} editable={isActive(r)}
              supplements={openSupplements(r)} backTo={`/customer/requests/${r.id}/documents`} />
          </div>
          {inWizard && (
            <button type="button" className="cus-btn" style={{ marginTop: 14 }} onClick={() => navigate(`/customer/requests/${r.id}/wizard/${Math.max(1, Math.min(2, r.wizardStep))}`)}>
              Mở wizard khai báo
            </button>
          )}
        </div>
        {r.companyDocs.length > 0 && (
          <div className="cus-card">
            <h3 className="cus-card__title">CBN Transport xử lý</h3>
            <p className="cus-subtitle" style={{ marginTop: -6, marginBottom: 10 }}>Không cần bạn cung cấp thêm.</p>
            <div className="cus-docs">
              {r.companyDocs.map((d) => (
                <div key={d.name} className="cus-doc"><div className="cus-doc__top"><b>{d.name}</b><TripStatusBadge label={COMPANY_DOC_LABEL[d.status]} tone={COMPANY_DOC_TONE[d.status]} /></div></div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="cus-stack">
        <div className="cus-card">
          <div className="cus-eyebrow">Quy tắc giấy tờ</div>
          <ul className="cus-rule-list" style={{ marginTop: 8 }}>
            <li>Trước khi gửi yêu cầu cần có: số microchip, số hộ chiếu, bản scan hộ chiếu và chứng nhận sở hữu của từng ngựa.</li>
            <li>Giấy tờ bị từ chối hiển thị lý do; tải tệp mới sẽ gửi lại cho Specialist kiểm duyệt.</li>
            <li>Khi Specialist yêu cầu bổ sung, nộp đúng giấy tờ được yêu cầu để đóng yêu cầu bổ sung.</li>
            <li>Tệp tải lên cho ngựa cũng được lưu vào “Ngựa của tôi” nếu hồ sơ ngựa chưa có.</li>
          </ul>
        </div>
        <DemoPanel request={r} />
      </div>
    </div>
  );
};

export default DocumentsTab;
