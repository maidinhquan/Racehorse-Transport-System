import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ManagerLayout, Icon } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { ActualCostModal, Modal } from '../../components/Modals';
import { useManager } from '../../hooks/useManager';
import { MANAGER_NAME } from '../../data/mockData';
import { PAYER_LABEL, costRows, fmtDate, fmtMoney, today } from '../../hooks/managerRules';
import { flow6Api } from '../../../aftercare/api/flow6Api';
import type * as T6 from '../../../aftercare/types/flow6.types';
import './ReportsPage.css';

const cleanId = (x?: string) => (x || '').replace(/-/g, '_');

/** Chi phí vận hành & lợi nhuận: doanh thu hợp đồng so với chi phí thực tế */
export const ReportsPage: React.FC = () => {
  const { data, actualCosts, actions } = useManager();
  const [edit, setEdit] = useState('');
  const [preview, setPreview] = useState(false);
  const [flow6Map, setFlow6Map] = useState<Record<string, { balance?: T6.Balance; adjustments?: T6.Adjustment[] }>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const settlements = await flow6Api.getManagerSettlements();
        const details = await Promise.all(
          settlements.map(async (s) => {
            const [bal, adjs] = await Promise.all([
              flow6Api.getManagerBalance(s.id).catch(() => undefined),
              flow6Api.getManagerAdjustments(s.id).catch(() => []),
            ]);
            return { tripId: cleanId(s.tripId), balance: bal, adjustments: adjs };
          })
        );
        if (!active) return;
        const next: Record<string, { balance?: T6.Balance; adjustments?: T6.Adjustment[] }> = {};
        for (const d of details) {
          if (d.tripId) next[d.tripId] = { balance: d.balance, adjustments: d.adjustments };
        }
        setFlow6Map(next);
      } catch {
        // ignore
      }
    })();
    return () => { active = false; };
  }, [data.trips.length]);

  const baseRows = costRows(data) || [];
  const rows = baseRows.map((x) => {
    const f6 = flow6Map[cleanId(x.trip?.id)];
    if (!f6) return x;
    const netRevenue = f6.balance
      ? f6.balance.signedPriceVnd + f6.balance.chargesVnd - f6.balance.discountsVnd
      : x.revenue;
    const f6Extras = (f6.adjustments || []).map((a) => ({
      label: a.reason || (a.type === 'CHARGE' ? 'Phụ phí phát sinh' : a.type === 'DISCOUNT' ? 'Giảm giá' : 'Hoàn tiền'),
      amount: a.amountVnd,
      payer: (a.type === 'CHARGE' ? 'CUSTOMER' : 'COMPANY') as 'CUSTOMER' | 'COMPANY' | 'INSURANCE',
    }));
    const mergedExtras = [...(x.extra || [])];
    for (const fe of f6Extras) {
      if (!mergedExtras.some((e) => e.label === fe.label && e.amount === fe.amount)) {
        mergedExtras.push(fe);
      }
    }
    return { ...x, revenue: netRevenue || x.revenue, extra: mergedExtras };
  });
  const sum = (k: 'revenue' | 'budget' | 'actual' | 'variance') => rows.reduce((s, x) => s + (x?.[k] || 0), 0);
  const entered = rows.filter((x) => x && x.entered);
  const revenueEntered = entered.reduce((s, x) => s + (x?.revenue || 0), 0), actualEntered = entered.reduce((s, x) => s + (x?.actual || 0), 0);
  const margin = revenueEntered ? Math.round(((revenueEntered - actualEntered) / revenueEntered) * 100) : 0;

  const table = (print = false) => (
    <table className="mgr-table">
      <thead>
        <tr>
          <th>Chuyến</th>
          <th>Trạng thái</th>
          <th className="num">Doanh thu</th>
          <th className="num">Chi phí thực tế</th>
          <th className="num">Lợi nhuận</th>
          {!print && <th>Khoản phát sinh</th>}
          {!print && <th>Thao tác</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((x, idx) => {
          const tripId = x.trip?.id || `trip-${idx}`;
          const requestId = x.request?.id || '—';
          const tripStatus = x.trip?.status || 'COMPLETED';
          const profit = (x.revenue || 0) - (x.actual || 0);
          return (
            <tr key={tripId}>
              <td><b className="mgr-id">{tripId}</b><div className="mgr-muted">{requestId}</div></td>
              <td><StatusBadge kind="trip" status={tripStatus} /></td>
              <td className="num">{fmtMoney(x.revenue || 0)}</td>
              <td className="num">{x.entered ? fmtMoney(x.actual || 0) : <span className="mgr-orange">Chưa nhập</span>}</td>
              <td className={`num ${!x.entered ? 'mgr-muted' : profit >= 0 ? 'mgr-ok' : 'mgr-bad'}`}>
                {x.entered ? `${profit >= 0 ? '+' : ''}${fmtMoney(profit)}` : '—'}
              </td>
              {!print && (
                <td className="mgr-muted">
                  {x.extra && x.extra.length ? x.extra.map((e) => `${e.label}: ${fmtMoney(e.amount)} (${PAYER_LABEL[e.payer] || e.payer || 'Khác'})`).join('; ') : '—'}
                </td>
              )}
              {!print && (
                <td>
                  <button
                    type="button"
                    className="mgr-btn mgr-btn--sm"
                    title="Cập nhật chi phí phát sinh thực tế (nhiên liệu, trạm dừng, ăn nghỉ tài xế). Không thay đổi giá hợp đồng."
                    onClick={() => setEdit(tripId)}
                  >
                    {x.entered ? 'Sửa chi phí' : 'Nhập chi phí'}
                  </button>
                </td>
              )}
            </tr>
          );
        })}
        {!rows.length && <tr><td colSpan={print ? 5 : 7} className="mgr-empty">Chưa có chuyến nào hoàn thành hoặc có chi phí thực tế.</td></tr>}
      </tbody>
    </table>
  );

  return (
    <ManagerLayout title="Chi phí & báo cáo">
      <div className="mgr-head">
        <div>
          <h2 className="mgr-title">Chi phí vận hành & báo cáo</h2>
          <p className="mgr-subtitle">Tổng hợp doanh thu hợp đồng đã ký và chi phí vận hành thực tế của từng chuyến.</p>
        </div>
        <button type="button" className="mgr-btn mgr-btn--solid" onClick={() => setPreview(true)}>
          <Icon name="print" />Xem trước báo cáo
        </button>
      </div>
      <div className="mgr-stats">
        <div className="mgr-stat">
          <span>Doanh thu hợp đồng</span>
          <b>{fmtMoney(sum('revenue'))}</b>
          <small>{rows.length} chuyến</small>
        </div>
        <div className="mgr-stat">
          <span>Chi phí thực tế (đã nhập)</span>
          <b>{fmtMoney(actualEntered)}</b>
          <small>Trên {entered.length} chuyến đã nhập</small>
        </div>
        <div className="mgr-stat">
          <span>Biên lợi nhuận gộp</span>
          <b>{margin}%</b>
          <small>{revenueEntered > 0 ? `${fmtMoney(revenueEntered - actualEntered)} lợi nhuận` : 'Chưa có lợi nhuận'}</small>
        </div>
      </div>
      <div className="mgr-card" style={{ padding: 0, marginTop: 16 }}>
        <h3 className="mgr-card__title" style={{ padding: '20px 22px 4px' }}>Chi phí & lợi nhuận theo chuyến</h3>
        <div className="mgr-table-wrap">{table()}</div>
      </div>
      <p className="mgr-hint">
        Tiền bồi thường bảo hiểm được ghi nhận riêng và chỉ tính khi tiền đã về. Khoản phát sinh do khách hàng hoặc bảo hiểm chi trả không cộng vào chi phí công ty. <Link className="mgr-link" to="/manager/trips">Danh sách chuyến</Link>
      </p>

      <ActualCostModal
        open={!!edit}
        tripId={edit}
        current={actualCosts.find((a) => a.tripId === edit || cleanId(a.tripId) === cleanId(edit))}
        onClose={() => setEdit('')}
        onSubmit={(c, e) => actions.saveActualCosts(edit, c, e).ok}
      />
      <Modal open={preview} title="Xem trước báo cáo" wide cancelText="Đóng" okText="In / lưu PDF" onClose={() => setPreview(false)} onOk={() => window.print()}>
        <div className="mgr-report mgr-printable">
          <div className="mgr-between">
            <div>
              <div className="mgr-contract__brand">CBN Transport</div>
              <h3 style={{ margin: '4px 0' }}>Chi phí vận hành & lợi nhuận theo chuyến</h3>
              <p className="mgr-hint" style={{ margin: 0 }}>Lập bởi {MANAGER_NAME}</p>
            </div>
            <div className="mgr-muted">Ngày lập {fmtDate(today())}</div>
          </div>
          <div className="mgr-kv" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', margin: '14px 0' }}>
            <div><span>Số chuyến</span><b>{rows.length}</b></div>
            <div><span>Doanh thu</span><b>{fmtMoney(sum('revenue'))}</b></div>
            <div><span>Chi phí thực tế</span><b>{fmtMoney(actualEntered)}</b></div>
            <div><span>Biên lợi nhuận</span><b>{margin}%</b></div>
          </div>
          {table(true)}
          <p className="mgr-hint">Số liệu từ dữ liệu hiện có trên hệ thống.</p>
        </div>
      </Modal>
    </ManagerLayout>
  );
};

export default ReportsPage;
