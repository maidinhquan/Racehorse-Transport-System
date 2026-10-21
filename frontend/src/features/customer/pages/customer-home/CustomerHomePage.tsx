import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { RouteText, horseNames } from '../../components/Common/Common';
import { needsCustomerAction, useCustomer } from '../../hooks/useCustomer';
import { fmtDate, fmtDateTime, isActive, tripSummary } from '../../hooks/customerRules';
import './CustomerHomePage.css';

/** Trang chủ khách hàng: chuyến hiện tại, việc cần làm, thông báo và yêu cầu gần đây */
export const CustomerHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, requests, horses, notifications, stats } = useCustomer();

  const current = requests
    .filter((r) => r.trip && ['IN_TRANSIT', 'READY_TO_DEPART'].includes(r.trip.status))
    .sort((a, b) => (a.trip!.status === 'IN_TRANSIT' ? -1 : 1) - (b.trip!.status === 'IN_TRANSIT' ? -1 : 1))[0];
  const s = current?.trip ? tripSummary(current.trip) : undefined;
  const todo = requests.filter((r) => isActive(r) && needsCustomerAction(r)).slice(0, 5);
  const recent = requests.filter(isActive).slice(0, 5);

  return (
    <CustomerLayout title="Trang chủ">
      <div className="cus-card cus-home__welcome">
        <div>
          <h2 className="cus-title">Chào mừng trở lại, {profile.name.split(' ')[0]}</h2>
          <p className="cus-subtitle">Quản lý ngựa và các yêu cầu vận chuyển của bạn ở một nơi.</p>
        </div>
        <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" onClick={() => navigate('/customer/requests/new')}>
          <Icon name="plus" />Tạo yêu cầu vận chuyển
        </button>
      </div>

      <div className="cus-stats">
        <button type="button" className="cus-stat" onClick={() => navigate('/customer/requests')}><span>Yêu cầu đang xử lý</span><b>{stats.active}</b></button>
        <button type="button" className="cus-stat" onClick={() => navigate('/customer/requests?filter=action')}><span>Cần bạn xử lý</span><b>{stats.needAction}</b></button>
        <button type="button" className="cus-stat" onClick={() => navigate('/customer/tracking')}><span>Đang vận chuyển</span><b>{stats.inTransit}</b></button>
        <button type="button" className="cus-stat" onClick={() => navigate('/customer/horses')}><span>Ngựa của tôi</span><b>{horses.length}</b></button>
      </div>

      <div className="cus-grid2">
        <div className="cus-card cus-home__trip">
          <h3 className="cus-card__title">
            {current?.trip?.status === 'IN_TRANSIT' ? 'Chuyến hiện tại' : 'Chuyến sắp tới'}
            {current?.trip && <TripStatusBadge kind="trip" status={current.trip.status} />}
          </h3>
          {current?.trip && s ? (
            <>
              <div className="cus-kv">
                <div><span>Ngựa</span><b>{horseNames(current, horses)}</b></div>
                <div><span>Tuyến</span><b><RouteText r={current} /></b></div>
              </div>
              <div className="cus-home__meta">
                <span>{s.dep ? `Xuất phát: ${fmtDateTime(s.dep.at)}` : `Dự kiến xuất phát: ${fmtDateTime(current.trip.plannedDepart)}`}</span>
                <b>{s.adjusted ? 'ETA điều chỉnh' : 'ETA'}: {fmtDateTime(current.trip.eta)}</b>
              </div>
              <div className="cus-progress"><i style={{ width: `${s.pct}%` }} /></div>
              <p className="cus-muted" style={{ marginTop: 8 }}>
                {s.m ? <>Mốc xác nhận gần nhất: <b>{s.lastLabel}</b> • {fmtDateTime(s.m.at)}</> : 'Chưa xuất phát – chưa có mốc nào được xác nhận.'}
              </p>
              <button type="button" className="cus-btn" style={{ marginTop: 12 }} onClick={() => navigate(`/customer/tracking/${current.id}`)}>
                <Icon name="pin" />Xem theo dõi chuyến
              </button>
            </>
          ) : (
            <>
              <p className="cus-subtitle">Hiện không có chuyến nào đang chạy hoặc sắp khởi hành.</p>
              <button type="button" className="cus-btn" style={{ marginTop: 12 }} onClick={() => navigate('/customer/requests')}>Xem yêu cầu vận chuyển</button>
            </>
          )}
        </div>

        <div className="cus-card">
          <h3 className="cus-card__title">Việc cần làm <span className="cus-muted">{todo.length} mục</span></h3>
          {todo.length === 0 && <p className="cus-subtitle">Bạn không có việc nào cần xử lý.</p>}
          <div className="cus-home__todo">
            {todo.map((r) => (
              <button key={r.id} type="button" onClick={() => navigate(`/customer/requests/${r.id}`)}>
                <span className="cus-home__todo-icon"><Icon name="alert" /></span>
                <span><b>{r.id}</b><small><RouteText r={r} /></small></span>
                <TripStatusBadge status={r.status} />
              </button>
            ))}
          </div>
          {notifications.filter((n) => !n.read).length > 0 && (
            <>
              <div className="cus-eyebrow" style={{ marginTop: 16 }}>Thông báo mới</div>
              <ul className="cus-home__notifs">
                {notifications.filter((n) => !n.read).slice(0, 3).map((n) => (
                  <li key={n.id}><button type="button" className="cus-link" onClick={() => navigate(n.link)}>{n.title}</button><span>{fmtDateTime(n.at)}</span></li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="cus-card" style={{ marginTop: 16 }}>
        <h3 className="cus-card__title">
          Yêu cầu vận chuyển gần đây
          <button type="button" className="cus-link" onClick={() => navigate('/customer/requests')}>Xem tất cả</button>
        </h3>
        <div className="cus-table-wrap">
          <table className="cus-table">
            <thead><tr><th>Mã yêu cầu</th><th>Tuyến</th><th>Ngựa</th><th>Ngày vận chuyển</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => navigate(`/customer/requests/${r.id}`)}>
                  <td className="cus-id">{r.id}</td>
                  <td><RouteText r={r} /></td>
                  <td>{horseNames(r, horses)}</td>
                  <td>{fmtDate(r.date)}</td>
                  <td><TripStatusBadge status={r.status} /></td>
                </tr>
              ))}
              {!recent.length && <tr><td colSpan={5} className="cus-empty">Chưa có yêu cầu nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerHomePage;
