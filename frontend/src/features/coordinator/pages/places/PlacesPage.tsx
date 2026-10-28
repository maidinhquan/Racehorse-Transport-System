// Quản lý địa điểm: danh mục dùng chung cho lập lộ trình (nghỉ, nhiên liệu, kiểm dịch, cửa khẩu, sân bay)
import { DataTable, Icon, Pill } from '../../components/common/ui';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import type { Any } from '../../store/coordinatorStore';
import { db, useCoordinatorStore } from '../../store/coordinatorStore';
import { dt } from '../../utils/format';
import { PF, PF_COLOR, PLACE_ST, placeDelete, placeEdit, placeStatus, placeUsedIn } from '../../workflows/routePlanner';

export function PlacesPage() {
  useCoordinatorStore();
  const countries = [...new Set(db.places.map((p: Any) => p.country))] as string[];
  return (
    <CoordinatorLayout title="Quản lý địa điểm">
      <div className="head"><div><h2 className="page-title">Quản lý địa điểm</h2><p className="subtitle">Danh mục dùng chung cho lập lộ trình: điểm nghỉ, tiếp nhiên liệu, kiểm dịch, cửa khẩu, sân bay. Một địa điểm có thể có nhiều chức năng. Điểm nhận/giao lấy từ yêu cầu khách hàng. <b>Dữ liệu mẫu.</b></p></div>
        <button type="button" className="btn solid" onClick={() => placeEdit('')}><Icon name="plus" />Thêm địa điểm</button></div>
      <DataTable id="f-places" rows={db.places} style={{ marginTop: 16 }} search={(p: Any) => [p.name, p.province, p.address, p.country].join(' ')}
        filters={[
          { key: 'f', label: 'Mọi chức năng', options: Object.keys(PF).map((k) => [k, PF[k]] as [string, string]), test: (p: Any, v) => p.functions.includes(v) },
          { key: 'c', label: 'Mọi quốc gia', options: countries.map((c) => [c, c] as [string, string]), test: (p: Any, v) => p.country === v },
          { key: 's', label: 'Mọi trạng thái', options: Object.keys(PLACE_ST).map((k) => [k, PLACE_ST[k][1]] as [string, string]), test: (p: Any, v) => p.status === v },
        ]}
        cols={[
          { label: 'Địa điểm', sort: (p: Any) => p.name, render: (p: Any) => <><b style={{ color: 'var(--ink)' }}>{p.name}</b><br /><small className="muted">{p.province}, {p.country}{p.sample ? ' • mẫu' : ''}</small></> },
          { label: 'Chức năng', render: (p: Any) => p.functions.map((fn: string, k: number) => <span key={fn}>{k ? ' ' : null}<span className="pl-fn" style={{ ['--c' as Any]: PF_COLOR[fn] }}>{PF[fn]}</span></span>) },
          { label: 'Giờ hoạt động', render: (p: Any) => p.hours || '—' },
          { label: 'Tọa độ', render: (p: Any) => (p.lat != null ? `${Number(p.lat).toFixed(4)}, ${Number(p.lng).toFixed(4)}` : <span className="t-bad">Chưa có</span>) },
          { label: 'Dùng trong kế hoạch', render: (p: Any) => { const u = placeUsedIn(p); return u.length ? u.map((t: Any) => t.id).join(', ') : '—'; } },
          { label: 'Trạng thái', render: (p: Any) => <><Pill v={PLACE_ST[p.status][0]} label={PLACE_ST[p.status][1]} /><br /><small className="muted">cập nhật {dt(p.updatedAt)}</small></> },
          { label: '', render: (p: Any) => <span className="btn-row" style={{ margin: 0, flexWrap: 'nowrap', gap: 6 }}>
            <button type="button" className="btn ghost sm" onClick={() => placeEdit(p.id)}>Xem/sửa</button>
            <button type="button" className="btn ghost sm" onClick={() => placeStatus(p.id)}>Trạng thái</button>
            {placeUsedIn(p).length ? null : <button type="button" className="btn danger sm" onClick={() => placeDelete(p.id)}>Xóa</button>}</span> },
        ]} />
      <p className="hint">Địa điểm đã dùng trong lịch sử chuyến không xóa được – chỉ tạm ngừng hoặc ngừng sử dụng. Sức chứa là khả năng tiếp nhận của cơ sở, không phải chỗ trống thời gian thực.</p>
    </CoordinatorLayout>
  );
}
export default PlacesPage;
