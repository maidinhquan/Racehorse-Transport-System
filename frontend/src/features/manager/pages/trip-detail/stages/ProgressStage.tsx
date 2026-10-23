import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import { Note } from '../../../components/Common/Common';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { useManager } from '../../../hooks/useManager';
import type { Trip } from '../../../types';
import {
  INCIDENT_TYPE_LABEL,
  MILESTONE_LABEL,
  STOP_TYPE_LABEL,
  arrived,
  fmtDateTime,
  lastMilestone,
  milestoneText,
  nextMilestone,
} from '../../../hooks/managerRules';

/** Bước 4: theo dõi mốc hành trình (tổ xe cập nhật thủ công), ETA, sự cố, bàn giao */
export const ProgressStage: React.FC<{ trip: Trip }> = ({ trip: t }) => {
  const { data, actions } = useManager();
  const stops = t.route?.stops ?? [], m = lastMilestone(t), n = nextMilestone(t);
  const departed = t.milestones.find((x) => x.type === 'DEPARTED');
  const reached = (i: number) => t.milestones.some((x) => x.stopIndex === i && ['DEPARTED', 'ARRIVED_STOP', 'ARRIVED_DESTINATION'].includes(x.type));
  const inc = data.incidents.filter((i) => i.tripId === t.id);
  const refusalOpen = !!t.refusal && !t.refusal.resolvedAt;

  let next = 'Chuyến đã hoàn tất.';
  if (t.status === 'READY_TO_DEPART') next = 'Manager đã duyệt khởi hành. Bước tiếp theo: tài xế xác nhận xuất phát thực tế.';
  else if (t.status === 'IN_TRANSIT' && n) next = `Tổ xe cập nhật mốc kế tiếp: ${milestoneText(t, n)}. Không dùng GPS.`;
  else if (t.status === 'IN_TRANSIT' && arrived(t)) next = refusalOpen ? 'Người nhận đã từ chối bàn giao – Manager phải ghi quyết định trước khi tổ xe bàn giao lại.' : 'Đã đến điểm giao: xác minh người nhận, từng con ngựa và hoàn tất biên bản bàn giao.';
  else if (t.status === 'COMPLETED') next = 'Đã bàn giao. Khách nghiệm thu và thanh toán số dư trong hạn chung 24 giờ; Manager đóng đơn khi đủ điều kiện.';

  return (
    <div className="mgr-grid-main">
      <div className="mgr-stack">
        <section className="mgr-card">
          <div className="mgr-between"><h3 className="mgr-card__title">Tiến độ chuyến đi</h3><StatusBadge kind="trip" status={t.status} /></div>
          <div className="mgr-td__next">{next}</div>
          <div className="mgr-kv">
            <div><span>Khởi hành dự kiến</span><b>{fmtDateTime(t.plannedDepart)}</b></div>
            <div><span>Khởi hành thực tế</span><b>{fmtDateTime(departed?.at)}</b></div>
            <div><span>ETA hiện tại</span><b>{fmtDateTime(t.eta)}</b></div>
            <div><span>Mốc gần nhất</span><b>{m ? `${MILESTONE_LABEL[m.type]} • ${fmtDateTime(m.at)}` : '—'}</b></div>
          </div>
          <div className="mgr-section-title">Các điểm trên tuyến</div>
          {stops.map((s, i) => {
            const at = t.milestones.filter((x) => x.stopIndex === i);
            return (
              <div key={`${s.name}-${i}`} className={`mgr-stop ${reached(i) ? 'done' : ''}`}>
                <i>{reached(i) ? '✓' : i + 1}</i>
                <div><b>{s.name}</b><span>{STOP_TYPE_LABEL[s.type]} • dự kiến {fmtDateTime(s.plannedAt)}</span>
                  {at.map((x) => <span key={x.type}>{MILESTONE_LABEL[x.type]} {fmtDateTime(x.at)} • {x.by}{x.note ? ` • ${x.note}` : ''}</span>)}</div>
              </div>
            );
          })}
          {t.etaHistory.length > 0 && (
            <>
              <div className="mgr-section-title">Thay đổi ETA</div>
              {t.etaHistory.map((e) => <div key={e.at} className="mgr-row"><div><b>{fmtDateTime(e.from)} → {fmtDateTime(e.to)}</b><span>{e.reason} • {fmtDateTime(e.at)}</span></div></div>)}
            </>
          )}
          <p className="mgr-hint">Các mốc do tài xế / người áp tải cập nhật thủ công, không có GPS.</p>
        </section>
      </div>
      <aside className="mgr-stack">
        {refusalOpen && <Note tone="red" title="Bàn giao bị từ chối">{t.refusal!.reason} <Link className="mgr-link" to={`/manager/requests/${t.requestId}/closure`}>Xem & xử lý</Link></Note>}
        <section className="mgr-card">
          <div className="mgr-between"><h3 className="mgr-card__title">Sự cố ({inc.length})</h3></div>
          {inc.map((i) => (
            <div key={i.id} className="mgr-row">
              <div><b>{i.id} • {INCIDENT_TYPE_LABEL[i.type]}</b><span>{i.location} • {fmtDateTime(i.at)}</span></div>
              <Link className="mgr-btn mgr-btn--sm" to={`/manager/incidents/${i.id}`}>{i.status === 'CLOSED' ? 'Xem' : 'Xử lý'}</Link>
            </div>
          ))}
          {!inc.length && <p className="mgr-hint" style={{ marginTop: 0 }}>Không có sự cố.</p>}
          <div className="mgr-actions"><Link className="mgr-btn mgr-btn--sm" to={`/manager/requests/${t.requestId}/closure`}>Bàn giao & đóng đơn</Link></div>
        </section>
        <DemoPanel buttons={[
          { label: 'Tài xế xác nhận khởi hành', run: () => actions.demo.driverDepart(t.id), primary: true, hidden: t.status !== 'READY_TO_DEPART' },
          { label: n ? `Tài xế: ${milestoneText(t, n)}` : '', run: () => actions.demo.driverNext(t.id), primary: true, hidden: !(t.status === 'IN_TRANSIT' && n) },
          { label: 'Tổ xe hoàn tất bàn giao', run: () => actions.demo.driverHandover(t.id), primary: true, hidden: !(t.status === 'IN_TRANSIT' && arrived(t) && !refusalOpen) },
          { label: 'Người nhận từ chối bàn giao', run: () => actions.demo.receiverRefuse(t.id), hidden: !(t.status === 'IN_TRANSIT' && arrived(t) && !refusalOpen) },
          { label: 'Tài xế báo sự cố (lỗi làm mát)', run: () => actions.demo.driverIncident(t.id), hidden: t.status !== 'IN_TRANSIT' || arrived(t) },
        ]} hint="Mỗi nút chỉ mô phỏng một thao tác của tổ xe hoặc người nhận trên chuyến này." />
      </aside>
    </div>
  );
};

export default ProgressStage;
