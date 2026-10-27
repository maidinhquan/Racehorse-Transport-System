import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ManagerLayout, Icon } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { CustomerCell, RouteCell } from '../../components/Common/Common';
import { DemoPanel } from '../../components/DemoPanel/DemoPanel';
import { useManager } from '../../hooks/useManager';
import { cleanDisplayName } from '../../../../shared/utils/textUtils';
import { MANAGER_NAME } from '../../data/mockData';
import {
  MILESTONE_LABEL,
  buildAlerts,
  customerOf,
  daysUntil,
  fmtDate,
  fmtDateTime,
  lastMilestone,
  reqOfTrip,
  shortLeadTime,
} from '../../hooks/managerRules';
import './ManagerDashboardPage.css';

/** Tổng quan Logistics Manager: việc cần làm, cảnh báo, yêu cầu chờ duyệt, chuyến đang chạy */
export const ManagerDashboardPage: React.FC = () => {
  const { data, requests, trips, stats, actions } = useManager();
  const navigate = useNavigate();
  const alerts = buildAlerts(data);
  const waiting = requests.filter((r) => r.status === 'PENDING_REVIEW').sort((a, b) => a.date.localeCompare(b.date));
  const active = trips.filter((t) => ['READY_TO_DEPART', 'IN_TRANSIT'].includes(t.status)).sort((a, b) => a.plannedDepart.localeCompare(b.plannedDepart));

  const STATS: Array<[string, number, string, string, ('warn' | 'bad')?]> = [
    ['Yêu cầu chờ xét duyệt', stats.pendingReview, '/manager/requests?status=PENDING_REVIEW', 'inbox', stats.pendingReview ? 'warn' : undefined],
    ['Hợp đồng cần soạn / sửa', stats.awaitingContract, '/manager/contracts?group=draft', 'file'],
    ['Chờ khách cọc & ký OTP', stats.awaitingSignature, '/manager/contracts?group=sign', 'clock'],
    ['Thanh toán cần xử lý', stats.payQueue, '/manager/payments', 'card', stats.payQueue ? 'warn' : undefined],
    ['Chuyến cần quyết định', stats.tripDecisions, '/manager/trips?attention=1', 'truck', stats.tripDecisions ? 'warn' : undefined],
    ['Sẵn sàng / đang vận chuyển', stats.active, '/manager/trips?status=IN_TRANSIT', 'route'],
    ['Sự cố & khiếu nại mở', stats.openIncidents + stats.openComplaints, '/manager/incidents', 'alert', stats.openIncidents + stats.openComplaints ? 'bad' : undefined],
    ['Bàn giao chờ đóng đơn', stats.delivered, '/manager/requests?status=DELIVERED', 'check'],
  ];

  const currentManagerName = cleanDisplayName(localStorage.getItem('userFullName')) || MANAGER_NAME;

  return (
    <ManagerLayout title="Tổng quan">
      <div className="mgr-head">
        <div>
          <h2 className="mgr-title">Chào {currentManagerName}, đây là việc cần xử lý hôm nay</h2>
          <p className="mgr-subtitle">Xét duyệt yêu cầu, phát hành hợp đồng, xác minh thanh toán và điều hành chuyến đi.</p>
        </div>
      </div>

      <div className="mgr-stats eight">
        {STATS.map(([label, n, to, icon, tone]) => (
          <button key={label} type="button" className={`mgr-stat ${tone ?? ''}`} onClick={() => navigate(to)}>
            <span><Icon name={icon} />{label}</span><b>{n}</b><small>Bấm để mở danh sách</small>
          </button>
        ))}
      </div>

      <div className="mgr-dash">
        <div className="mgr-stack">
          <section className="mgr-card">
            <div className="mgr-between"><h3 className="mgr-card__title">Yêu cầu chờ xét duyệt ({waiting.length})</h3><Link className="mgr-link" to="/manager/requests?status=PENDING_REVIEW">Xem tất cả</Link></div>
            <div className="mgr-table-wrap">
              <table className="mgr-table">
                <thead><tr><th>Yêu cầu</th><th>Khách hàng</th><th>Tuyến</th><th>Ngày vận chuyển</th><th>Ngựa</th></tr></thead>
                <tbody>
                  {waiting.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => navigate(`/manager/requests/${r.id}`)}>
                      <td><b className="mgr-id">{r.id}</b><div className="mgr-muted">Gửi {fmtDateTime(r.submittedAt)}</div></td>
                      <td><CustomerCell c={customerOf(data, r)} /></td>
                      <td><RouteCell r={r} /></td>
                      <td className="mgr-nowrap">{fmtDate(r.date)}{shortLeadTime(r) && <div><StatusBadge tone="warn" label={`Gấp • còn ${Math.max(0, daysUntil(r.date))} ngày`} /></div>}</td>
                      <td>{r.horses.length}</td>
                    </tr>
                  ))}
                  {!waiting.length && <tr><td colSpan={5} className="mgr-empty">Không có yêu cầu nào chờ xét duyệt.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mgr-card">
            <div className="mgr-between"><h3 className="mgr-card__title">Chuyến sẵn sàng & đang vận chuyển ({active.length})</h3><Link className="mgr-link" to="/manager/trips">Tất cả chuyến</Link></div>
            <div className="mgr-table-wrap">
              <table className="mgr-table">
                <thead><tr><th>Chuyến</th><th>Tuyến</th><th>Khởi hành / ETA</th><th>Trạng thái / mốc gần nhất</th></tr></thead>
                <tbody>
                  {active.map((t) => {
                    const r = reqOfTrip(data, t), m = lastMilestone(t);
                    return (
                      <tr key={t.id} className="clickable" onClick={() => navigate(`/manager/trips/${t.id}`)}>
                        <td><b className="mgr-id">{t.id}</b><div className="mgr-muted">{t.requestId}</div></td>
                        <td><RouteCell r={r} /></td>
                        <td className="mgr-nowrap">{fmtDateTime(t.plannedDepart)}<div className="mgr-muted">ETA {fmtDateTime(t.eta)}</div></td>
                        <td><StatusBadge kind="trip" status={t.status} />{m && <div className="mgr-muted">{MILESTONE_LABEL[m.type]} • {t.route?.stops[m.stopIndex]?.name}</div>}</td>
                      </tr>
                    );
                  })}
                  {!active.length && <tr><td colSpan={4} className="mgr-empty">Chưa có chuyến nào sẵn sàng hoặc đang chạy.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="mgr-stack">
          <section className="mgr-card">
            <h3 className="mgr-card__title">Cảnh báo & việc cần quyết định ({alerts.length})</h3>
            <div className="mgr-dash__scroll">
              {alerts.map((a) => (
                <button key={a.title} type="button" className={`mgr-alert mgr-alert--${a.tone}`} onClick={() => navigate(a.link)}>
                  <b>{a.title}</b><span>{a.text}</span>
                </button>
              ))}
              {!alerts.length && <p className="mgr-hint">Không có cảnh báo.</p>}
            </div>
          </section>
          <DemoPanel buttons={[{ label: 'Khách hàng gửi yêu cầu vận chuyển mới', run: () => actions.demo.customerSubmitRequest(), primary: true }]}
            hint="Tạo một yêu cầu mới từ khách hàng để thử quy trình xét duyệt → hợp đồng → chuyến đi." />
        </aside>
      </div>
    </ManagerLayout>
  );
};

export default ManagerDashboardPage;
