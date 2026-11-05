import React, { useEffect, useState } from 'react';
import type { ComplaintStatus, TransportRequest } from '../../../types';
import { useCustomer } from '../../../hooks/useCustomer';
import { canComplain, fmtDateTime } from '../../../hooks/customerRules';
import { COMPLAINT_TYPE_LABEL, ComplaintModal } from '../../../components/Modals';
import { TripStatusBadge, type BadgeTone } from '../../../components/TripStatusBadge/TripStatusBadge';
import { getDemoMode } from '../../../../../shared/context/DemoModeContext';
import { generateUuidV4 } from '../../../../../shared/utils/uuid';
import { flow6Api } from '../../../../aftercare/api/flow6Api';
import type * as T6 from '../../../../aftercare/types/flow6.types';

const STATUS: Record<ComplaintStatus, [string, BadgeTone]> = {
  OPEN: ['Mới gửi', 'warn'],
  IN_PROGRESS: ['Đang xử lý', 'info'],
  RESOLVED: ['Đã giải quyết', 'ok'],
  CLOSED: ['Đã đóng', 'muted'],
};

/** Tab Khiếu nại (CHẾ ĐỘ MOCK của teammate) */
const MockComplaintsTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="cus-card">
      <h3 className="cus-card__title">
        Khiếu nại của yêu cầu
        {canComplain(r) && (
          <button type="button" className="cus-btn cus-btn--solid cus-btn--sm" onClick={() => setOpen(true)}>
            Gửi khiếu nại
          </button>
        )}
      </h3>
      {r.complaints.length === 0 ? (
        <p className="cus-empty">
          {canComplain(r)
            ? 'Bạn có thể gửi khiếu nại trong hạn chung 24 giờ kể từ khi bàn giao.'
            : 'Chưa có khiếu nại nào.'}
        </p>
      ) : (
        <ul className="cus-complaint-list">
          {[...r.complaints].reverse().map((c) => (
            <li key={c.id}>
              <div>
                <b>{c.id} • {c.title}</b>
                <small>{COMPLAINT_TYPE_LABEL[c.type]} • {fmtDateTime(c.createdAt)}</small>
                <p>{c.description}</p>
                {c.response && <p><b style={{ display: 'inline' }}>Phản hồi:</b> {c.response}</p>}
              </div>
              <TripStatusBadge label={STATUS[c.status][0]} tone={STATUS[c.status][1]} />
            </li>
          ))}
        </ul>
      )}
      <ComplaintModal open={open} requestId={r.id} onClose={() => setOpen(false)} />
    </div>
  );
};

/** Tab Khiếu nại & Hỗ trợ (CHẾ ĐỘ BACKEND FLOW 6 THỰC TẾ) */
const RealComplaintsTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const { actions: customerActions } = useCustomer();
  const notify = (message: string) => customerActions.showToast(message);
  const [loading, setLoading] = useState(true);
  const [settlement, setSettlement] = useState<T6.Settlement | null>(null);
  const [cases, setCases] = useState<Array<T6.Case>>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isClosed = r.status === 'CLOSED';
  const defaultType: 'COMPLAINT' | 'SUPPORT' = isClosed ? 'SUPPORT' : 'COMPLAINT';

  const loadCases = async () => {
    setLoading(true);
    try {
      const settlements = await flow6Api.getCustomerSettlements();
      const tripId = r.trip?.id || (r as any).tripId;
      const contractId = (r as any).contractId || r.versions?.[0]?.contractId;
      const s = settlements.find((x) => (tripId && x.tripId === tripId) || (contractId && x.contractId === contractId)) || settlements[0];
      if (s) {
        setSettlement(s);
        const data = await flow6Api.getCustomerCases(s.id);
        setCases(data);
      }
    } catch (e) {
      console.warn('[RealComplaintsTab] Failed to load Flow 6 cases', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCases();
  }, [r.id]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlement) return;
    if (subject.trim().length < 5) {
      notify('Tiêu đề phải từ 5 ký tự trở lên.');
      return;
    }
    if (description.trim().length < 10) {
      notify('Nội dung mô tả phải từ 10 ký tự trở lên.');
      return;
    }

    setSubmitting(true);
    try {
      const key = generateUuidV4();
      await flow6Api.createCustomerCase(
        settlement.id,
        {
          type: defaultType,
          subject: subject.trim(),
          description: description.trim(),
        },
        key
      );
      setSubject('');
      setDescription('');
      setShowCreate(false);
      await loadCases();
      notify(`Đã gửi ${defaultType === 'COMPLAINT' ? 'khiếu nại' : 'yêu cầu hỗ trợ'} thành công! Quản lý sẽ sớm phản hồi.`);
    } catch (err: any) {
      notify(`Không thể gửi phiếu: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cus-card">
      <h3 className="cus-card__title">
        {isClosed ? 'Yêu cầu hỗ trợ sau khi đóng' : 'Khiếu nại sau bàn giao'}
        {settlement && !showCreate && (
          <button
            type="button"
            className="cus-btn cus-btn--solid cus-btn--sm"
            onClick={() => setShowCreate(true)}
          >
            {isClosed ? 'Tạo phiếu hỗ trợ (SUPPORT)' : 'Gửi khiếu nại (COMPLAINT)'}
          </button>
        )}
      </h3>

      {isClosed && (
        <p className="cus-muted" style={{ marginBottom: 12 }}>
          Lưu ý: Hợp đồng đã đóng. Phiếu tạo mới sẽ là dạng <b>Yêu cầu hỗ trợ (SUPPORT)</b> và không tự động mở lại hợp đồng.
        </p>
      )}

      {showCreate && (
        <form onSubmit={handleCreateCase} style={{ margin: '14px 0', padding: 14, background: 'var(--rts-surface-subtle, #f9fafb)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h4 style={{ margin: 0 }}>Gửi {defaultType === 'COMPLAINT' ? 'khiếu nại' : 'yêu cầu hỗ trợ'} mới</h4>
          <div>
            <label htmlFor="case-subj" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Tiêu đề *</label>
            <input
              id="case-subj"
              className="cus-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="VD: Cần hỗ trợ kiểm tra sức khỏe ngựa tại trại nhận"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label htmlFor="case-desc" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Mô tả chi tiết *</label>
            <textarea
              id="case-desc"
              className="cus-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi rõ tình trạng, thời gian phát sinh và mong muốn hỗ trợ..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
            />
          </div>
          <div className="cus-btn-row">
            <button type="submit" className="cus-btn cus-btn--solid" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi phiếu'}
            </button>
            <button type="button" className="cus-btn" onClick={() => setShowCreate(false)}>
              Hủy
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="cus-muted">Đang tải danh sách khiếu nại...</p>
      ) : !settlement ? (
        <p className="cus-empty">Chưa có hồ sơ tất toán cho yêu cầu này. Khiếu nại sẽ mở sau khi hoàn tất bàn giao.</p>
      ) : cases.length === 0 ? (
        <p className="cus-empty">
          {isClosed
            ? 'Chưa có yêu cầu hỗ trợ nào sau khi đóng hợp đồng.'
            : 'Chưa có khiếu nại nào được gửi.'}
        </p>
      ) : (
        <ul className="cus-complaint-list">
          {cases.map((c) => (
            <li key={c.id}>
              <div>
                <b>{c.id} • {c.subject}</b>
                <small>
                  Loại: <b>{c.type}</b> • Gửi lúc: {fmtDateTime(c.openedAtUtc)}
                  {c.resolvedAtUtc && ` • Giải quyết lúc: ${fmtDateTime(c.resolvedAtUtc)}`}
                </small>
                <p>{c.description}</p>
                {c.resolution && (
                  <p style={{ marginTop: 6, color: '#10b981' }}>
                    <b style={{ display: 'inline' }}>Kết quả giải quyết:</b> {c.resolution}
                  </p>
                )}
              </div>
              <TripStatusBadge
                label={c.status === 'RESOLVED' ? 'Đã giải quyết' : c.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Mới gửi'}
                tone={c.status === 'RESOLVED' ? 'ok' : c.status === 'IN_PROGRESS' ? 'info' : 'warn'}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const ComplaintsTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const isDemo = getDemoMode('customer');
  if (isDemo) {
    return <MockComplaintsTab request={r} />;
  }
  return <RealComplaintsTab request={r} />;
};

export default ComplaintsTab;
