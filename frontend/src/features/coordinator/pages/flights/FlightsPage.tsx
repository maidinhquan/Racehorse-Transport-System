// Dịch vụ bay & đối tác: dịch vụ theo Trip và danh mục bên dịch vụ thuê máy bay
import { AirCard } from '../../components/air/AirCard';
import { DataTable, Icon, PillT } from '../../components/common/ui';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import type { Any } from '../../store/coordinatorStore';
import { commit, db, ui, useCoordinatorStore } from '../../store/coordinatorStore';
import { airBadge, myAirTrips, partnerDelete, partnerEdit, partnerStatus, used } from '../../workflows/airOperations';

export function FlightsPage() {
  useCoordinatorStore();
  const tab = ['trips', 'partners'].includes(ui.faAirTab) ? ui.faAirTab : 'trips';
  const mine = myAirTrips();
  const setTab = (k: string) => { ui.faAirTab = k; commit(); };
  return (
    <CoordinatorLayout title="Dịch vụ bay & đối tác">
      <div className="fa-page">
        <div className="head"><div><div className="eyebrow">FLOW 3 · DỊCH VỤ HÀNG KHÔNG</div><h2 className="page-title">Dịch vụ bay &amp; đối tác</h2><p className="subtitle">Thuê bên dịch vụ máy bay: xem chuyến bay khả dụng, nhập mã chuyến bay để lấy thông tin bên dịch vụ cung cấp → gửi Manager duyệt → chấp thuận thì book. Bên này không được thì liên hệ bên khác.</p></div></div>
        <div className="fa-notice"><Icon name="info" /><span>Danh sách chuyến bay do các bên dịch vụ cung cấp (dữ liệu mẫu). Có trong danh sách chưa phải đã giữ chỗ; chỉ book sau khi Manager chấp thuận và bên dịch vụ xác nhận. Bên này không được thì liên hệ bên khác.</span></div>
        <div className="fa-metrics"><div><small>Bên dịch vụ đang hợp tác</small><b>{db.air.partners.filter((p: Any) => p.status === 'ACTIVE').length}</b></div><div><small>Chuyến đã có booking</small><b>{mine.filter((t: Any) => t.flight?.status === 'BOOKED').length}</b></div></div>
        <div className="rtabs fa-tabs">
          <button type="button" className={tab === 'trips' ? 'on' : ''} onClick={() => setTab('trips')}>Dịch vụ theo Trip</button>
          <button type="button" className={tab === 'partners' ? 'on' : ''} onClick={() => setTab('partners')}>Bên dịch vụ thuê máy bay</button>
        </div>
        {tab === 'trips' ? <>
          <div className="fa-trip-list">{mine.filter((t: Any) => t.status !== 'COMPLETED').map((t: Any) => <AirCard key={t.id} t={t} />)}
            {mine.filter((t: Any) => t.status !== 'COMPLETED').length ? null : <div className="card pad">Chưa có Trip hàng không đang được phân công.</div>}</div>
          <details className="card pad"><summary>Lịch sử chuyến đã hoàn tất</summary>
            {mine.filter((t: Any) => t.status === 'COMPLETED').map((t: Any) => <AirCard key={t.id} t={t} />)}
            {mine.some((t: Any) => t.status === 'COMPLETED') ? null : <p className="hint">Chưa có chuyến hoàn tất.</p>}</details>
        </> : <>
          <div className="between fa-section-head"><div><h3 className="card-title">Bên dịch vụ thuê máy bay</h3><p className="hint">Điều phối quản lý đối tác. Tuyến và lịch bay là dữ liệu mẫu do đối tác cung cấp, chỉ tra cứu.</p></div>
            <button type="button" className="btn solid" onClick={() => partnerEdit('')}><Icon name="plus" />Thêm đối tác</button></div>
          <DataTable id="fa-partners" rows={db.air.partners} search={(x: Any) => JSON.stringify(x)} emptyTitle="Chưa có dữ liệu" empty="Điều phối bổ sung thông tin từ đối tác."
            filters={[{ key: 'status', label: 'Mọi trạng thái', options: [['ACTIVE', 'Đang sử dụng'], ['INACTIVE', 'Ngừng sử dụng']], test: (x: Any, v) => x.status === v }]}
            cols={[
              { label: 'Đối tác', render: (p: Any) => <><b>{p.name}</b>{p.sample ? <small className="fa-sample">Mẫu</small> : null}<small>{p.services}</small></> },
              { label: 'Liên hệ', render: (p: Any) => <>{p.contact}<small>{p.email || 'Chưa có email'} · {p.phone || 'Chưa có số điện thoại'}</small></> },
              { label: 'Trạng thái', render: (p: Any) => <PillT p={airBadge(p.status)} /> },
              { label: 'Thao tác', render: (p: Any) => <span className="btn-row">
                <button type="button" className="btn ghost sm" onClick={() => partnerEdit(p.id)}>Xem / sửa</button>
                <button type="button" className="btn ghost sm" onClick={() => partnerStatus(p.id)}>{p.status === 'INACTIVE' ? 'Kích hoạt' : 'Ngừng sử dụng'}</button>
                {used('partners', p.id) ? null : <button type="button" className="btn ghost sm" onClick={() => partnerDelete(p.id)}>Xóa</button>}</span> },
            ]} />
        </>}
      </div>
    </CoordinatorLayout>
  );
}
export default FlightsPage;
