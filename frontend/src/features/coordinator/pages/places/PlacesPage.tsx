// Quản lý địa điểm: danh mục dùng chung cho lập lộ trình (nghỉ, nhiên liệu, kiểm dịch, cửa khẩu, sân bay)
import { DataTable, Icon, Pill } from '../../components/common/ui';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import type { Any } from '../../store/coordinatorStore';
import { db, ui, useCoordinatorStore } from '../../store/coordinatorStore';
import { dt } from '../../utils/format';
import { PF, PF_COLOR, PLACE_ST, placeDelete, placeEdit, placeStatus, placeUsedIn } from '../../workflows/routePlanner';
import './PlacesPage.css';

export function PlacesPage() {
  useCoordinatorStore();
  const countries = [...new Set(db.places.map((p: Any) => p.country))] as string[];

  // Ưu tiên xếp theo cái nào mới sửa hoặc mới thêm lên đầu
  const sortedPlaces = [...db.places].sort((a: Any, b: Any) => {
    // 1. Địa điểm vừa được lưu / thêm mới trong phiên hiện tại
    if (ui.lastSavedPlaceId) {
      if (a.id === ui.lastSavedPlaceId) return -1;
      if (b.id === ui.lastSavedPlaceId) return 1;
    }

    // 2. Điểm có đánh dấu lastModified (thời gian thực ms)
    const modA = a.lastModified || 0;
    const modB = b.lastModified || 0;
    if (modA !== modB) return modB - modA;

    // 3. Chuỗi thời gian updatedAt (ISO hoặc YYYY-MM-DD HH:mm)
    const timeA = String(a.updatedAt || '');
    const timeB = String(b.updatedAt || '');
    if (timeA !== timeB) return timeB.localeCompare(timeA);

    // 4. Ưu tiên địa điểm người dùng thêm (sample === false) trước địa điểm mẫu hệ thống
    const sampleA = a.sample ? 1 : 0;
    const sampleB = b.sample ? 1 : 0;
    if (sampleA !== sampleB) return sampleA - sampleB;

    // 5. Thứ tự ID số tự tăng (ID lớn hơn là tạo sau)
    const numA = parseInt(String(a.id || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b.id || '').replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numB - numA;

    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  return (
    <CoordinatorLayout title="Quản lý địa điểm">
      <div className="places-page">
        <div className="head places-header"><div><h2 className="page-title">Danh sách địa điểm</h2><p className="subtitle">Quản lý các điểm dừng, tiếp nhiên liệu, kiểm dịch và cửa khẩu trên lộ trình.</p></div>
          <button type="button" className="btn solid" onClick={() => placeEdit('')}><Icon name="plus" />Thêm địa điểm</button></div>
      <DataTable id="f-places" rows={sortedPlaces} cls="places-table" placeholder="Tìm tên, địa chỉ, tỉnh thành..." search={(p: Any) => [p.name, p.province, p.address, p.country].join(' ')}
        filters={[
          { key: 'f', label: 'Mọi chức năng', options: Object.keys(PF).map((k) => [k, PF[k]] as [string, string]), test: (p: Any, v) => p.functions.includes(v) },
          { key: 'c', label: 'Mọi quốc gia', options: countries.map((c) => [c, c] as [string, string]), test: (p: Any, v) => p.country === v },
          { key: 's', label: 'Mọi trạng thái', options: Object.keys(PLACE_ST).map((k) => [k, PLACE_ST[k][1]] as [string, string]), test: (p: Any, v) => p.status === v },
        ]}
        cols={[
          { label: 'Địa điểm', sort: (p: Any) => p.name, render: (p: Any) => <div className="place-name"><b>{p.name}</b>{p.id === ui.lastSavedPlaceId ? <span className="pill ok">Vừa lưu</span> : null}<small className="muted">{p.province}, {p.country}</small></div> },
          { label: 'Chức năng', render: (p: Any) => <div className="place-functions">{p.functions.map((fn: string) => <span key={fn} className="pl-fn" style={{ ['--c' as Any]: PF_COLOR[fn] }}>{PF[fn]}</span>)}</div> },
          { label: 'Giờ hoạt động', render: (p: Any) => p.hours || '—' },
          { label: 'Tọa độ', render: (p: Any) => (p.lat != null ? `${Number(p.lat).toFixed(4)}, ${Number(p.lng).toFixed(4)}` : <span className="t-bad">Chưa có</span>) },
          { label: 'Dùng trong kế hoạch', render: (p: Any) => { const u = placeUsedIn(p); return u.length ? u.map((t: Any) => t.id).join(', ') : '—'; } },
          { label: 'Trạng thái', sort: (p: Any) => -(p.lastModified || (p.updatedAt ? new Date(p.updatedAt.replace(' ', 'T')).getTime() : 0)), render: (p: Any) => <div className="place-status"><Pill v={PLACE_ST[p.status][0]} label={PLACE_ST[p.status][1]} /><small className="muted">Cập nhật {dt(p.updatedAt)}</small></div> },
          { label: 'Thao tác', render: (p: Any) => <span className="btn-row place-actions">
            <button type="button" className="btn ghost sm" onClick={() => placeEdit(p.id)}>Xem/sửa</button>
            <button type="button" className="btn ghost sm" onClick={() => placeStatus(p.id)}>Trạng thái</button>
            {placeUsedIn(p).length ? null : <button type="button" className="btn danger sm" onClick={() => placeDelete(p.id)}>Xóa</button>}</span> },
        ]} />
      </div>
    </CoordinatorLayout>
  );
}
export default PlacesPage;
