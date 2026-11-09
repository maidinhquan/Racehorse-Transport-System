import React, { useState } from 'react';
import type { ContractVersion, FileRef, Horse, TransportRequest } from '../../types';
import {
  cityLabel,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  isPast,
  timeLeft,
  versionState,
  SEX_LABEL,
  passportStatus,
  PASSPORT_LABEL,
} from '../../hooks/customerRules';
import { PlaceBlock } from '../Common/Common';
import { TripStatusBadge } from '../TripStatusBadge/TripStatusBadge';
import { Modal } from '../Modals/Modal';
import { FilePreviewModal } from '../Modals/FilePreviewModal';
import './ContractBody.css';

const cleanId = (x?: string) => (x || '').replace(/-/g, '_');

/** Bảng khoản mục giá chính thức + tiền cọc + số dư */
export const ItemsTable: React.FC<{ v: ContractVersion }> = ({ v }) => {
  const dep = Math.round((v.total * v.depositPct) / 100);
  return (
    <div className="cus-table-wrap">
      <table className="cus-table cus-items">
        <thead><tr><th>Khoản mục</th><th className="num">Số tiền (VND)</th></tr></thead>
        <tbody>
          {v.items.map((i) => (
            <tr key={i.desc}><td>{i.desc}{i.required && <span className="cus-req-tag">Bắt buộc</span>}</td><td className="num">{fmtMoney(i.amount)}</td></tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td>Tổng giá trị hợp đồng</td><td className="num">{fmtMoney(v.total)}</td></tr>
          <tr className="muted"><td>Tiền cọc {v.depositPct}%</td><td className="num">{fmtMoney(dep)}</td></tr>
          <tr className="muted"><td>Số dư thanh toán sau bàn giao</td><td className="num">{fmtMoney(v.total - dep)}</td></tr>
        </tfoot>
      </table>
    </div>
  );
};

/** Nội dung hợp đồng: A. Tổng quan vận chuyển, B. Giá chính thức, C. Thông tin hợp đồng & điều khoản */
export const ContractBody: React.FC<{ request: TransportRequest; v: ContractVersion; horses?: Horse[] }> = ({
  request: r,
  v,
  horses = [],
}) => {
  const snapshot = v.snapshot;
  const [selectedHorse, setSelectedHorse] = useState<{
    snapshot: NonNullable<typeof snapshot>['horses'][0];
    full?: Horse;
  } | null>(null);
  const [preview, setPreview] = useState<{ file: FileRef; title: string } | null>(null);

  if (!snapshot || !v.terms?.length || (!v.mode && !v.modeDeferred)) {
    return (
      <div className="cus-note cus-note--yellow" role="alert">
        Chưa có đủ nội dung phiên bản hợp đồng từ máy chủ. Tải lại dữ liệu trước khi đồng ý điều khoản hoặc ký.
      </div>
    );
  }

  const plan = { mode: v.mode };
  const detail = snapshot;
  // The Manager may propose dates different from the customer's request.
  const datesChanged = !!(detail.requestedPickupAt && v.departAt && detail.requestedPickupAt !== v.departAt.slice(0, 10))
    || !!(detail.requestedDate && v.arriveAt && detail.requestedDate !== v.arriveAt.slice(0, 10));
  const state = versionState(v);
  const dep = Math.round((v.total * v.depositPct) / 100);

  return (
    <div className="cus-stack">
      <div className="cus-card">
        <h3 className="cus-card__title">A. Tổng quan vận chuyển</h3>
        <div className="cus-kv">
          <div><span>Mã yêu cầu</span><b>{r.id}</b></div>
          <div><span>Bạn yêu cầu lấy ngựa</span><b>{fmtDate(detail.requestedPickupAt || detail.pickupAt)}</b></div>
          <div><span>Bạn yêu cầu giao ngựa</span><b>{fmtDate(detail.requestedDate || detail.date)}</b></div>
          <div><span>Điểm đi</span><b>{cityLabel(detail.origin)}</b></div>
          <div><span>Điểm đến</span><b>{cityLabel(detail.destination)}</b></div>
          <div><span>Phương thức vận chuyển</span><b>{v.modeDeferred ? 'Coordinator quyết định khi lập kế hoạch vận chuyển' : plan.mode === 'AIR' ? 'Hàng không + đường bộ' : 'Đường bộ'}</b></div>
          <div><span>Số ngựa</span><b>{detail.horses.length}</b></div>
          <div><span>Khởi hành dự kiến</span><b className={datesChanged ? 'cus-bad' : undefined}>{fmtDateTime(v.departAt)}</b></div>
          <div><span>Đến dự kiến</span><b className={datesChanged ? 'cus-bad' : undefined}>{fmtDateTime(v.arriveAt)}</b></div>
        </div>
        {datesChanged && (
          <div className="cus-note cus-note--yellow" role="note" style={{ marginTop: 12 }}>
            <b>CBN đề xuất lịch khác ngày bạn yêu cầu.</b> Lấy ngựa {fmtDate(detail.requestedPickupAt)} → {fmtDate(v.departAt?.slice(0, 10))}; giao ngựa {fmtDate(detail.requestedDate)} → {fmtDate(v.arriveAt?.slice(0, 10))}.
            {' '}Nếu đồng ý, hãy tiếp tục ký hợp đồng; nếu không, chọn "Yêu cầu sửa hợp đồng".
          </div>
        )}
        <div className="cus-grid2" style={{ marginTop: 14 }}>
          <div><div className="cus-eyebrow">Điểm nhận</div><PlaceBlock place={detail.pickup} who="Người liên hệ" /></div>
          <div><div className="cus-eyebrow">Điểm giao</div><PlaceBlock place={detail.delivery} who="Người nhận" /></div>
        </div>

        <div className="cus-contract__horses-block">
          <div className="cus-eyebrow cus-contract__horses-title">Ngựa ({detail.horses.length})</div>
          <div className="cus-contract__horses-list">
            {detail.horses.map((h) => {
              const full = horses.find(
                (x) => x.id === h.id || cleanId(x.id) === cleanId(h.id) || x.name?.toLowerCase() === h.name?.toLowerCase()
              );
              const horseId = full?.id || h.id;
              const horseName = full?.name || h.name;
              const horseBreed = full?.breed || h.breed;
              const horseMicrochip = full?.microchip || h.microchip;
              const horsePassportNo = full?.passport?.number || h.passportNo;

              const metaParts: string[] = [];
              if (horseId) metaParts.push(horseId);
              if (horseBreed) metaParts.push(horseBreed);
              if (horseMicrochip) metaParts.push(`Microchip ${horseMicrochip}`);
              if (horsePassportNo) metaParts.push(`Hộ chiếu ${horsePassportNo}`);

              return (
                <button
                  key={h.id}
                  type="button"
                  className="cus-contract__horse-row"
                  onClick={() => setSelectedHorse({ snapshot: h, full })}
                  title={`Bấm để xem thông tin chi tiết ngựa: ${horseName}`}
                >
                  <div className="cus-contract__horse-row-name">{horseName}</div>
                  <div className="cus-contract__horse-row-meta">
                    {metaParts.join(' • ')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="cus-eyebrow" style={{ marginTop: 14 }}>Yêu cầu chăm sóc đặc biệt</div>
        <p className="cus-lines">{detail.careNotes || <span className="cus-muted">Không có.</span>}</p>
      </div>

      <div className="cus-card cus-contract__price">
        <h3 className="cus-card__title">
          <span><span className="cus-official">Giá hợp đồng chính thức</span><br />B. Giá chính thức</span>
          <span className="cus-contract__total">{fmtMoney(v.total)} <small>VND</small></span>
        </h3>
        <ItemsTable v={v} />
        {v.note && <div className="cus-note cus-note--grey" style={{ marginTop: 14 }}><div><b>Ghi chú của Manager</b>{v.note}</div></div>}
      </div>

      <div className="cus-card">
        <h3 className="cus-card__title">C. Thông tin hợp đồng <TripStatusBadge kind="contract" status={state} /></h3>
        <div className="cus-kv">
          <div><span>Số hợp đồng</span><b>{v.number}</b></div>
          <div><span>Phiên bản</span><b>v{v.v}</b></div>
          <div><span>Ngày phát hành</span><b>{fmtDateTime(v.issuedAt)}</b></div>
          <div>
            <span>Hạn chung cọc / ký OTP</span>
            <b>{v.signedAt ? `Đã ký ${fmtDateTime(v.signedAt)}` : <>{fmtDateTime(v.validUntil)} <small className={isPast(v.validUntil) ? 'cus-bad' : 'cus-muted'}>({timeLeft(v.validUntil)})</small></>}</b>
          </div>
          <div><span>Tiền cọc</span><b>{v.depositPct}% • {fmtMoney(dep)}</b></div>
          {v.termsAcceptedAt && <div><span>Đồng ý điều khoản</span><b>{fmtDateTime(v.termsAcceptedAt)}</b></div>}
        </div>
        <div className="cus-eyebrow" style={{ marginTop: 14 }}>Điều khoản</div>
        <ol className="cus-terms">{v.terms.map((t, i) => <li key={i}><b>{t.title}</b>: {t.text}</li>)}</ol>
      </div>

      {selectedHorse && (() => {
        const h = selectedHorse.snapshot;
        const full = selectedHorse.full;

        const horseName = full?.name || h.name;
        const horseBreed = full?.breed || h.breed || '—';
        const horseSex = full?.sex ? (SEX_LABEL[full.sex] ?? full.sex) : '—';
        const horseDob = full?.dob ? fmtDate(full.dob) : '—';
        const horseColor = full?.color || '—';
        const horseMicrochip = full?.microchip || h.microchip || '—';

        const passportNo = full?.passport?.number || h.passportNo || '—';
        const passportAuthority = full?.passport?.authority || '—';
        const passportIssueDate = full?.passport?.issueDate ? fmtDate(full.passport.issueDate) : '—';
        const passportExpiryDate = full?.passport?.expiryDate ? fmtDate(full.passport.expiryDate) : '—';
        const passportScan = full?.passport?.scan;

        const ps = full ? passportStatus(full) : (passportNo !== '—' ? 'VALID' : 'MISSING');

        const ownership = full?.ownership;
        const declaredValue = full?.value ? `${Number(full.value).toLocaleString('en-US')} ${full.currency || 'VND'}` : '—';
        const valueProof = full?.valueProof;

        const fluDate = full?.fluDate ? fmtDate(full.fluDate) : '—';
        const conditions = full?.conditions || 'Không khai báo';
        const flu = full?.flu;
        const health = full?.health;

        const fileRow = (label: string, file?: FileRef) => (
          <div className="cus-hd__file">
            <span>{label}</span>
            {file ? (
              <>
                <b>{file.name}</b>
                <button
                  type="button"
                  className="cus-btn cus-btn--sm"
                  onClick={() => setPreview({ file, title: label })}
                >
                  Xem tệp
                </button>
              </>
            ) : (
              <TripStatusBadge label="Còn thiếu" tone="bad" />
            )}
          </div>
        );

        return (
          <Modal
            open={!!selectedHorse}
            title={`Hồ sơ cá thể ngựa: ${horseName}`}
            onClose={() => setSelectedHorse(null)}
            cancelText="Đóng"
            wide
            className="cus-modal__box--horse-popup"
          >
            <div className="cus-horse-modal-grid">
              <div className="cus-card" style={{ margin: 0 }}>
                <h3 className="cus-card__title">Thông tin sinh học & định danh</h3>
                <div className="cus-kv">
                  <div><span>Tên ngựa</span><b>{horseName}</b></div>
                  <div><span>Giống</span><b>{horseBreed}</b></div>
                  <div><span>Giới tính</span><b>{horseSex}</b></div>
                  <div><span>Ngày sinh</span><b>{horseDob}</b></div>
                  <div><span>Màu lông</span><b>{horseColor}</b></div>
                  <div><span>Microchip</span><b>{horseMicrochip}</b></div>
                </div>
              </div>

              <div className="cus-card" style={{ margin: 0 }}>
                <h3 className="cus-card__title">
                  Hộ chiếu ngựa{' '}
                  <TripStatusBadge
                    label={PASSPORT_LABEL[ps]}
                    tone={ps === 'VALID' ? 'ok' : ps === 'EXPIRING_SOON' ? 'warn' : 'bad'}
                  />
                </h3>
                <div className="cus-kv">
                  <div><span>Số hộ chiếu</span><b>{passportNo}</b></div>
                  <div><span>Cơ quan cấp</span><b>{passportAuthority}</b></div>
                  <div><span>Ngày cấp</span><b>{passportIssueDate}</b></div>
                  <div><span>Ngày hết hạn</span><b>{passportExpiryDate}</b></div>
                </div>
                {fileRow('Bản scan', passportScan)}
              </div>

              <div className="cus-card" style={{ margin: 0 }}>
                <h3 className="cus-card__title">Sở hữu & giá trị thương mại</h3>
                {fileRow('Chứng nhận sở hữu', ownership)}
                <div className="cus-kv" style={{ marginTop: 12 }}>
                  <div><span>Giá trị khai báo</span><b>{declaredValue}</b></div>
                </div>
                {fileRow('Bằng chứng định giá', valueProof)}
              </div>

              <div className="cus-card" style={{ margin: 0 }}>
                <h3 className="cus-card__title">Tiêm ngừa & sức khỏe</h3>
                <div className="cus-kv">
                  {full?.fluDate ? <div><span>Tiêm cúm gần nhất</span><b>{fluDate}</b></div> : null}
                  <div><span>Ghi chú sức khỏe</span><b>{conditions}</b></div>
                </div>
                {fileRow('Sổ tiêm ngừa', flu)}
                {fileRow('Giấy chứng nhận sức khỏe', health)}
              </div>
            </div>
          </Modal>
        );
      })()}

      <FilePreviewModal
        open={!!preview}
        file={preview?.file}
        title={preview?.title}
        onClose={() => setPreview(null)}
      />
    </div>
  );
};

export default ContractBody;
