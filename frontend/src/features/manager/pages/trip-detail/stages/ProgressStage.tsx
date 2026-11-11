import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import { Note } from '../../../components/Common/Common';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { ManagerRouteMap } from '../../../components/RouteMap/ManagerRouteMap';
import { refreshTripExecution, useManager } from '../../../hooks/useManager';
import type { Trip } from '../../../types';
import {
  INCIDENT_TYPE_LABEL,
  STOP_TYPE_LABEL,
  arrived,
  fmtDateTime,
  lastMilestone,
  milestoneLabel,
  milestoneText,
  nextMilestone,
  tripStops,
} from '../../../hooks/managerRules';
import { onSync } from '../../../../../shared/utils/syncChannel';
import { useIncidentPins } from '../../../../../shared/utils/sharedIncidentPins';

/** Bước 4: theo dõi mốc hành trình (tổ xe cập nhật thủ công), ETA, sự cố, bàn giao */
export const ProgressStage: React.FC<{ trip: Trip }> = ({ trip: t }) => {
  const { data, actions } = useManager();
  // Lịch trình thực hiện (Flow 4) ưu tiên hơn phương án tuyến: cùng nguồn với tài xế, có tọa độ và tự cập nhật khi tài xế check-in
  const stops = tripStops(t), m = lastMilestone(t), n = nextMilestone(t);
  const sharedPins = useIncidentPins(t.id);

  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') void refreshTripExecution(t.id).catch(() => undefined); };
    tick();
    const id = window.setInterval(tick, 15000);
    const stopSync = onSync(tick);
    return () => { window.clearInterval(id); stopSync(); };
  }, [t.id]);

  const departed = t.milestones.find((x) => x.type === 'DEPARTED');
  const reached = (i: number) => t.milestones.some((x) => x.stopIndex === i && ['DEPARTED', 'ARRIVED_STOP', 'LEFT_STOP', 'ARRIVED_DESTINATION'].includes(x.type));
  const inc = data.incidents.filter((i) => i.tripId === t.id);
  const totalInc = Math.max(inc.length, sharedPins.length);
  const refusalOpen = !!t.refusal && !t.refusal.resolvedAt;

  let next = 'Chuyến đã hoàn tất.';
  if (t.status === 'READY_TO_DEPART') next = 'Manager đã duyệt khởi hành. Bước tiếp theo: tài xế xác nhận xuất phát thực tế.';
  else if (t.status === 'IN_TRANSIT' && n) next = `Tổ xe cập nhật mốc kế tiếp: ${milestoneText(t, n)}. Không dùng GPS.`;
  else if (t.status === 'IN_TRANSIT' && arrived(t)) next = refusalOpen ? 'Người nhận đã từ chối bàn giao – Manager phải ghi quyết định trước khi tổ xe bàn giao lại.' : 'Đã đến điểm giao: xác minh người nhận, từng con ngựa và hoàn tất biên bản bàn giao.';
  else if (t.status === 'COMPLETED') next = 'Đã bàn giao. Khách nghiệm thu và thanh toán số dư trong hạn chung 24 giờ; Manager đóng đơn khi đủ điều kiện.';

  return (
    <div className="mgr-grid-main">
      <div className="mgr-stack">
        {/* Khối 1: Tổng quan tiến độ chuyến đi */}
        <section className="mgr-card">
          <div className="mgr-between">
            <div>
              <h3 className="mgr-card__title" style={{ margin: 0 }}>Tiến độ chuyến đi</h3>
              <p className="mgr-hint" style={{ margin: '4px 0 0', fontSize: 13 }}>
                Tổng quan hành trình và tình trạng vận chuyển của chuyến xe.
              </p>
            </div>
            <StatusBadge kind="trip" status={t.status} />
          </div>

          <div className="mgr-td__next" style={{ margin: '14px 0 16px' }}>{next}</div>

          <div
            className="mgr-kv"
            style={{
              background: 'var(--mgr-bg, #f8fafc)',
              border: '1px solid var(--mgr-line, #e2e8f0)',
              borderRadius: 12,
              padding: '16px 20px',
              gap: '14px 24px',
            }}
          >
            <div>
              <span style={{ fontSize: 12, color: 'var(--mgr-muted, #64748b)', marginBottom: 3 }}>Khởi hành dự kiến</span>
              <b style={{ fontSize: 13.5, color: '#1e293b' }}>{fmtDateTime(t.plannedDepart)}</b>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--mgr-muted, #64748b)', marginBottom: 3 }}>Khởi hành thực tế</span>
              <b style={{ fontSize: 13.5, color: '#1e293b' }}>{fmtDateTime(departed?.at)}</b>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--mgr-muted, #64748b)', marginBottom: 3 }}>ETA hiện tại</span>
              <b style={{ fontSize: 13.5, color: '#2563eb' }}>{fmtDateTime(t.eta)}</b>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--mgr-muted, #64748b)', marginBottom: 3 }}>Mốc gần nhất</span>
              <b style={{ fontSize: 13.5, color: '#ea580c' }}>{m ? `${milestoneLabel(t, m.type)} • ${fmtDateTime(m.at)}` : '—'}</b>
            </div>
          </div>
        </section>

        {/* Khối 2: Bản đồ hành trình & vị trí sự cố */}
        {stops.length >= 2 && (
          <section className="mgr-card">
            <div className="mgr-between" style={{ marginBottom: 14 }}>
              <div>
                <h3 className="mgr-card__title" style={{ margin: 0 }}>Bản đồ lộ trình &amp; Vị trí sự cố</h3>
                <p className="mgr-hint" style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                  Theo dõi trực quan cung đường di chuyển, thứ tự các mốc dừng và cảnh báo sự cố hiện trường.
                </p>
              </div>
            </div>
            <ManagerRouteMap stops={stops} tripId={t.id} current={m ? Math.min(m.stopIndex, stops.length - 1) : -1} />
          </section>
        )}

        {/* Khối 3: Chi tiết các điểm dừng trên tuyến */}
        <section className="mgr-card">
          <div className="mgr-between" style={{ marginBottom: 16 }}>
            <div>
              <h3 className="mgr-card__title" style={{ margin: 0 }}>Các điểm trên tuyến ({stops.length} điểm)</h3>
              <p className="mgr-hint" style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                Tiến độ di chuyển và thời gian xác nhận qua từng mốc hành trình.
              </p>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 20,
                background: '#eff6ff',
                color: '#1d4ed8',
              }}
            >
              {m ? `Đang tại mốc ${m.stopIndex + 1}/${stops.length}` : 'Chưa xuất phát'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stops.map((s, i) => {
              const at = t.milestones.filter((x) => x.stopIndex === i);
              return (
                <div key={`${s.name}-${i}`} className={`mgr-stop ${reached(i) ? 'done' : ''}`} style={{ padding: '12px 14px' }}>
                  <i>{reached(i) ? '✓' : i + 1}</i>
                  <div>
                    <b>{s.name}</b>
                    <span>{STOP_TYPE_LABEL[s.type]} • dự kiến {fmtDateTime(s.plannedAt)}</span>
                    {at.map((x) => (
                      <span key={x.type}>
                        {milestoneLabel(t, x.type)} {fmtDateTime(x.at)}
                        {x.by ? ` • ${x.by}` : ''}
                        {x.note ? ` • ${x.note}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mgr-hint" style={{ marginTop: 16, marginBottom: 0, fontSize: 12 }}>
            Các mốc do tài xế / người áp tải cập nhật thủ công, không có GPS.
          </p>
        </section>

        {/* Khối 4: Lịch sử thay đổi ETA (nếu có) */}
        {t.etaHistory.length > 0 && (
          <section className="mgr-card">
            <h3 className="mgr-card__title" style={{ marginBottom: 12 }}>Thay đổi ETA</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {t.etaHistory.map((e) => (
                <div key={e.at} className="mgr-row">
                  <div>
                    <b>{fmtDateTime(e.from)} → {fmtDateTime(e.to)}</b>
                    <span>{e.reason} • {fmtDateTime(e.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="mgr-stack">
        {refusalOpen && <Note tone="red" title="Bàn giao bị từ chối">{t.refusal!.reason} <Link className="mgr-link" to={`/manager/requests/${t.requestId}/closure`}>Xem & xử lý</Link></Note>}
        <section className="mgr-card">
          <div className="mgr-between"><h3 className="mgr-card__title">Sự cố ({totalInc})</h3></div>
          {inc.length > 0 ? (
            inc.map((i) => (
              <div key={i.id} className="mgr-row">
                <div><b>{i.id} • {INCIDENT_TYPE_LABEL[i.type]}</b><span>{i.location} • {fmtDateTime(i.at)}</span></div>
                <Link className="mgr-btn mgr-btn--sm" to={`/manager/incidents/${i.id}`}>{i.status === 'CLOSED' ? 'Xem' : 'Xử lý'}</Link>
              </div>
            ))
          ) : sharedPins.length > 0 ? (
            sharedPins.map((p) => (
              <div key={p.id} className="mgr-row">
                <div><b>{p.id} • {p.label || 'Sự cố'}</b><span>{p.where || 'Trên tuyến'} • {p.at ? fmtDateTime(p.at) : 'Mới ghi nhận'}</span></div>
                <Link className="mgr-btn mgr-btn--sm" to={`/manager/incidents/${p.id}`}>Xem</Link>
              </div>
            ))
          ) : (
            <p className="mgr-hint" style={{ marginTop: 0 }}>Không có sự cố.</p>
          )}
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
