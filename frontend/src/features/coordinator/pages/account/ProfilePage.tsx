// Trang thông báo và hồ sơ của Điều phối
import { Cell } from '../../components/common/ui';
import { CoordinatorLayout, myNotifs } from '../../components/layout/CoordinatorLayout';
import { coordTrips } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { me, useCoordinatorStore } from '../../store/coordinatorStore';

export function ProfilePage() {
  useCoordinatorStore();
  const u = me() || {};
  return (
    <CoordinatorLayout title="Hồ sơ của tôi">
      <div className="head"><div><h2 className="page-title">Hồ sơ của tôi</h2><p className="subtitle">Thông tin tài khoản Điều phối đội xe &amp; tuyến.</p></div></div>
      <div className="grid-main" style={{ marginTop: 20 }}>
        <div className="card"><h3 className="card-title">Thông tin tài khoản</h3>
          <div className="kv2"><Cell label="Họ và tên">{u.name}</Cell><Cell label="Vai trò">Điều phối đội xe &amp; tuyến</Cell><Cell label="Email">{u.email}</Cell><Cell label="Mã nhân viên">{u.id}</Cell></div></div>
        <div className="card"><div className="eyebrow">Công việc</div>
          <div className="kv"><div><span>Chuyến được giao</span><b>{coordTrips().length}</b></div><div><span>Thông báo chưa đọc</span><b>{myNotifs().filter((n: Any) => !n.read).length}</b></div></div></div>
      </div>
    </CoordinatorLayout>
  );
}
export default ProfilePage;
