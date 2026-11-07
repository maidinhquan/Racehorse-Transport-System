// Trang thông báo và hồ sơ của Điều phối
import { Empty, Icon, Tabs, tabOn } from '../../components/common/ui';
import { CoordinatorLayout, myNotifs } from '../../components/layout/CoordinatorLayout';
import type { Any } from '../../store/coordinatorStore';
import { commit, useCoordinatorStore } from '../../store/coordinatorStore';
import { dt } from '../../utils/format';
import { notifOpen } from '../../workflows/coordinatorActions';

export function NotificationsPage() {
  useCoordinatorStore();
  const list = myNotifs(), unread = list.filter((n: Any) => !n.read).length, on = tabOn('notif', 'all');
  const shown = on === 'unread' ? list.filter((n: Any) => !n.read) : list;
  return (
    <CoordinatorLayout title="Thông báo">
      <div className="head"><div><h2 className="page-title">Thông báo</h2><p className="subtitle">{unread} chưa đọc trên tổng {list.length}.</p></div>
        <button type="button" className="btn ghost" disabled={!unread} onClick={() => { list.forEach((n: Any) => { n.read = true; }); commit(); }}><Icon name="check" />Đánh dấu tất cả đã đọc</button></div>
      <Tabs k="notif" fallback="all" items={[['all', 'Tất cả', list.length], ['unread', 'Chưa đọc', unread]]} />
      <div className="card" style={{ marginTop: 16, overflow: 'hidden' }}>
        {shown.length ? shown.map((n: Any) => (
          <div key={n.id} className={`notif-row ${n.read ? '' : 'unread'}`}>
            <span className="dot" /><div style={{ flex: 1, minWidth: 0 }}><b>{n.title}</b><span>{n.body}</span><span>{dt(n.at)}</span></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {n.go ? <button type="button" className="btn ghost sm" onClick={() => notifOpen(n.id)}>Mở</button> : null}
              <button type="button" className="btn ghost sm" onClick={() => { n.read = !n.read; commit(); }}>Đánh dấu {n.read ? 'chưa đọc' : 'đã đọc'}</button>
            </div>
          </div>))
          : <Empty title={on === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo'} text="Các cập nhật về công việc của bạn sẽ hiện ở đây." />}
      </div>
    </CoordinatorLayout>
  );
}
export default NotificationsPage;
