// Khối điều khiển demo: mô phỏng quyết định của Quản lý vận hành (không phải thao tác của Điều phối)
import { curRoute, resourceGaps, trip } from '../../domain/coordinatorRules';
import { demoOn } from '../../store/coordinatorStore';
import { human } from '../../utils/format';
import { coordDemo, EMPTY_PLAN_ID, emptyPlanDemo } from '../../workflows/coordinatorActions';
import { Pill } from '../common/ui';

export function DemoCard({ current }: { current?: string }) {
  if (!demoOn()) return null;
  const b = (arg: string, label: string) => (
    <button type="button" className="btn ghost sm" title={`Demo: ${label}`} onClick={() => coordDemo(arg, current)}>{label}</button>
  );
  return (
    <div className="card demo m-demo"><div className="eyebrow">Điều khiển demo</div>
      <p className="hint" style={{ margin: '6px 0 8px' }}>Mô phỏng quyết định của Quản lý vận hành để trình diễn. Đây không phải thao tác của Điều phối viên.</p>
      <div className="btn-row" style={{ marginTop: 0 }}>
        {b('deploy', 'Quản lý xác nhận triển khai chuyến')}
        {b('ready', 'Tạo chuyến sẵn sàng lập kế hoạch')}
        {b('approve', 'Quản lý duyệt tuyến đã gửi')}
        {b('return', 'Quản lý trả tuyến để chỉnh sửa')}
      </div>
    </div>
  );
}

export function EmptyPlanLaunch() {
  if (!demoOn() || !trip(EMPTY_PLAN_ID)) return null;
  return (
    <div className="empty-plan-launch"><div><b>Demo lập kế hoạch từ đầu</b><span>{EMPTY_PLAN_ID} · Kế hoạch bắt đầu trống</span></div>
      <button type="button" className="btn solid sm" onClick={() => emptyPlanDemo('open')}>Mở kế hoạch demo</button></div>
  );
}

const GUIDE: Record<string, string> = {
  EMPTY: 'Chưa có tuyến, xe hay nhân sự. Thông tin khách và hợp đồng đã có sẵn.',
  PENDING_APPROVAL: 'Phương án đang khóa. Demo Manager duyệt hoặc trả về có ý kiến.',
  RETURNED: 'Điền lại mẫu để tạo phiên bản mới; giữ nguyên ý kiến và phiên bản cũ.',
  APPROVED: 'Manager đã duyệt phương án. Chuyến vẫn đang chuẩn bị, chưa được phép khởi hành.',
};
export function EmptyPlanPanel() {
  const t = trip(EMPTY_PLAN_ID); if (!t || !demoOn()) return null;
  const rt = curRoute(t), state = rt?.status || 'EMPTY', ready = !!t.resourcesConfirmed && !resourceGaps(t).length;
  const guide = state === 'DRAFT' ? (ready ? 'Đã xác nhận xe/nhân sự. Có thể gửi Manager duyệt.' : 'Điền phương án hoặc tự lập tuyến, sau đó xác nhận xe/nhân sự.') : GUIDE[state] || '';
  const btn = (action: string, label: string, on: boolean, solid = false) => (
    <button type="button" className={`btn ${solid ? 'solid' : 'ghost'} sm`} disabled={!on} onClick={() => emptyPlanDemo(action)}>{label}</button>
  );
  return (
    <section className="card empty-plan-demo">
      <div className="between"><div><span className="eyebrow">Kịch bản Demo · {EMPTY_PLAN_ID}</span><h3>Kế hoạch trống → Manager duyệt</h3></div>
        {rt ? <Pill v={state} label={`v${rt.v} · ${human(state)}`} /> : <Pill v="MISSING" label="Chưa lập kế hoạch" />}</div>
      <p className="empty-plan-guide">{guide}</p>
      <div className="empty-plan-steps">
        <div><b>Điều phối lập phương án</b><div className="btn-row">
          {btn('fill', '1. Điền phương án mẫu', !rt || state === 'RETURNED' || (state === 'DRAFT' && rt.stops.length <= 2))}
          {btn('confirm', '2. Xác nhận xe & nhân sự', state === 'DRAFT' && !ready && !resourceGaps(t).length)}
          {btn('submit', '3. Gửi Manager duyệt', state === 'DRAFT' && ready, true)}
        </div></div>
        <div><b>Mô phỏng quyết định Manager</b><div className="btn-row">
          {btn('approve', 'Demo: Manager duyệt', state === 'PENDING_APPROVAL', true)}
          {btn('return', 'Demo: Manager trả về', state === 'PENDING_APPROVAL')}
        </div></div>
      </div>
      {state === 'RETURNED' ? <p className="note yellow">Ý kiến Manager: {rt.note || ''}</p> : null}
      <div className="empty-plan-footer"><span>Dữ liệu mẫu trong phiên. Tuyến nét đứt và thời gian mô phỏng. Các nút Demo không phải quyền nghiệp vụ của Điều phối.</span>
        <div className="btn-row">{btn('reset', 'Đặt lại kế hoạch trống', true)}</div></div>
    </section>
  );
}
