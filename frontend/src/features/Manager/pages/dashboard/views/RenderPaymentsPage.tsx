import { flow1Error } from "../../../../flow1/api";
import React, { useState } from 'react';
import type {
  BankTransferTransaction,
  DeadlineOverdueItem,
  ManagerNav,
} from './manager.types';

interface RenderPaymentsPageProps {
  transactions: BankTransferTransaction[];
  overdueList: DeadlineOverdueItem[];
  onConfirmTransaction: (
    transactionId: string,
    confirmedAmount: number,
    bankRef: string,
    note?: string
  ) => Promise<void>;
  onRejectTransaction: (transactionId: string, reason: string) => Promise<void>;
  onExtendDeadline: (requestId: string, newDeadline: string, reason: string) => Promise<void>;
  onCancelOverdue: (requestId: string, reason: string) => Promise<void>;
  onNavigate: (nav: ManagerNav, targetId?: string) => void;
}

export const RenderPaymentsPage: React.FC<RenderPaymentsPageProps> = ({
  transactions,
  overdueList,
  onConfirmTransaction,
  onRejectTransaction,
  onExtendDeadline,
  onCancelOverdue,
  onNavigate,
}) => {
  const [subTab, setSubTab] = useState<'TRANSFERS' | 'OVERDUE'>('TRANSFERS');

  // Transaction reconciliation modal
  const [activeTxn, setActiveTxn] = useState<BankTransferTransaction | null>(null);
  const [confirmedAmount, setConfirmedAmount] = useState<number>(0);
  const [bankRefInput, setBankRefInput] = useState<string>('');
  const [confirmNote, setConfirmNote] = useState<string>('Đã đối chiếu khớp tiền thực nhận trên sao kê');
  const [rejectReason, setRejectReason] = useState<string>('Chưa tìm thấy tiền thực nhận để xác minh');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Extend deadline modal
  const [extendingItem, setExtendingItem] = useState<DeadlineOverdueItem | null>(null);
  const [newDeadline, setNewDeadline] = useState<string>('');
  const [extendReason, setExtendReason] = useState<string>(
    'Cho khách hàng thêm thời gian hoàn tất thủ tục ngân hàng quốc tế'
  );

  // Cancel overdue modal
  const [cancellingItem, setCancellingItem] = useState<DeadlineOverdueItem | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>(
    'Không hoàn tất nghĩa vụ ký/đặt cọc sau các lần trao đổi và đã quá hạn ân hạn'
  );

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const pendingTxns = transactions.filter((t) => t.status === 'PENDING_CONFIRMATION');
  const successTxns = transactions.filter((t) => t.status === 'SUCCESS');

  const handleOpenConfirmModal = (txn: BankTransferTransaction) => {
    setActiveTxn(txn);
    setConfirmedAmount(txn.declaredAmount);
    setBankRefInput(txn.bankReference || '');
    setIsRejecting(false);
  };

  const handleExecuteConfirm = async () => {
    if (!activeTxn) return;
    try { await onConfirmTransaction(
      activeTxn.transactionId,
      confirmedAmount,
      bankRefInput,
      confirmNote
    );
    setActiveTxn(null);
    setToastMsg(
      `✓ Đã đối soát thành công giao dịch ${activeTxn.transactionId}! Kích hoạt yêu cầu ${activeTxn.requestId} & Hợp đồng có hiệu lực.`
    );
    setTimeout(() => setToastMsg(null), 4000);
    } catch (e) { setToastMsg(flow1Error(e)); }
  };

  const handleExecuteReject = async () => {
    if (!activeTxn) return;
    try { await onRejectTransaction(activeTxn.transactionId, rejectReason);
    setActiveTxn(null);
    setToastMsg(`Đã từ chối giao dịch ${activeTxn.transactionId}.`);
    setTimeout(() => setToastMsg(null), 3000);
    } catch (e) { setToastMsg(flow1Error(e)); }
  };

  const handleExecuteExtend = async () => {
    if (!extendingItem) return;
    try { await onExtendDeadline(extendingItem.requestId, newDeadline, extendReason);
    setExtendingItem(null);
    setToastMsg(
      `✓ Đã gia hạn deadline cho yêu cầu ${extendingItem.requestId} đến ${newDeadline.replace('T', ' ')}.`
    );
    setTimeout(() => setToastMsg(null), 4000);
    } catch (e) { setToastMsg(flow1Error(e)); }
  };

  const handleExecuteCancel = async () => {
    if (!cancellingItem || cancelBusy) return;
    setCancelError(null); setCancelBusy(true);
    try { await onCancelOverdue(cancellingItem.requestId, cancelReason);
    setCancellingItem(null);
    setToastMsg(
      `Đã hủy thủ công yêu cầu quá hạn ${cancellingItem.requestId}.`
    );
    setTimeout(() => setToastMsg(null), 4000);
    } catch (e) { setCancelError(flow1Error(e)); } finally { setCancelBusy(false); }
  };

  return (
    <div className="payments-page fade-in">
      {/* Header */}
      <div className="module-header">
        <div>
          <h1 className="module-title">Đặt cọc &amp; Thanh toán</h1>
          <p className="module-subtitle">
            Đối soát giao dịch VNPay, xác thực tiền cọc thực nhận và xử lý hạn chót hợp đồng (Flow 1: UC-LM-03)
          </p>
        </div>
        {toastMsg && (
          <div className="toast-alert-badge fade-in">
            {toastMsg}
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="stats-metric-grid">
        <div className="stat-card border-amber">
          <div className="stat-title">Chờ đối soát VNPay</div>
          <div className="stat-value text-amber-600">{pendingTxns.length}</div>
          <div className="stat-sub">Cần đối chiếu giao dịch đã xác minh</div>
        </div>
        <div className="stat-card border-green">
          <div className="stat-title">Đã xác nhận Tiền cọc</div>
          <div className="stat-value text-emerald-600">{successTxns.length}</div>
          <div className="stat-sub">Hợp đồng đã kích hoạt có hiệu lực</div>
        </div>
        <div className="stat-card border-red">
          <div className="stat-title">Quá hạn Deadline chung</div>
          <div className="stat-value text-red-600">{overdueList.length}</div>
          <div className="stat-sub">Cần gia hạn hoặc hủy thủ công</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Tổng tiền cọc đã thu</div>
          <div className="stat-value text-blue-600">$96,800</div>
          <div className="stat-sub">Tương đương ~2.42 tỷ VND</div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="table-controls-card">
        <div className="status-tabs-row">
          <button
            type="button"
            className={`tab-btn ${subTab === 'TRANSFERS' ? 'active' : ''}`}
            onClick={() => setSubTab('TRANSFERS')}
          >
            Hàng đợi Đối soát Ngân hàng ({pendingTxns.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${subTab === 'OVERDUE' ? 'active' : ''}`}
            onClick={() => setSubTab('OVERDUE')}
          >
            Quản lý Quá hạn &amp; Gia hạn Deadline ({overdueList.length})
          </button>
        </div>
      </div>

      {/* TAB 1: BANK TRANSFERS RECONCILIATION */}
      {subTab === 'TRANSFERS' && (
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">Hàng đợi Xác nhận Chuyển khoản (Bank Transfers)</h2>
              <p className="text-xs text-muted mt-0.5">
                Chỉ dành cho phương thức BANK_TRANSFER; Quản lý cần đối chiếu tiền thực nhận trên tài khoản công ty trước khi xác nhận (F01-BR-15).
              </p>
            </div>
            <span className="badge-status-yellow">{pendingTxns.length} giao dịch chờ</span>
          </div>

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>MÃ GIAO DỊCH</th>
                  <th style={{ width: '13%' }}>MÃ YÊU CẦU</th>
                  <th style={{ width: '20%' }}>KHÁCH HÀNG</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>SỐ TIỀN KHAI BÁO</th>
                  <th style={{ width: '18%' }}>NGÂN HÀNG &amp; THAM CHIẾU</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>ỦY NHIỆM CHI</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.transactionId} className="hoverable-row">
                    <td className="font-semibold text-primary-dark">
                      {txn.transactionId}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="text-primary hover:underline font-semibold"
                        onClick={() => onNavigate('requests', txn.requestId)}
                      >
                        {txn.requestId}
                      </button>
                    </td>
                    <td>
                      <div className="customer-cell-main">{txn.customerName}</div>
                      <div className="customer-cell-sub">Hợp đồng: {txn.contractId}</div>
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono font-semibold text-slate-800">
                      ${txn.declaredAmount.toLocaleString()} {txn.currency}
                    </td>
                    <td>
                      <div className="text-xs font-medium text-slate-700">
                        {txn.bankName}
                      </div>
                      <div className="text-xs text-muted font-mono">
                        Ref: {txn.bankReference || 'Chưa có'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {txn.receiptUrl ? (
                        <a
                          href={txn.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-action-view text-xs py-1 px-2"
                        >
                          👁️ Xem UNC
                        </a>
                      ) : (
                        <span className="text-xs text-muted">Không có file</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {txn.status === 'PENDING_CONFIRMATION' ? (
                        <button
                          type="button"
                          className="btn-primary py-1 px-3 text-xs"
                          onClick={() => handleOpenConfirmModal(txn)}
                        >
                          Đối soát &amp; Duyệt
                        </button>
                      ) : txn.status === 'SUCCESS' ? (
                        <span className="badge-status-blue">✓ Đã xác nhận</span>
                      ) : (
                        <span className="badge-status-red">{txn.statusLabel || txn.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: OVERDUE & DEADLINE MANAGEMENT */}
      {subTab === 'OVERDUE' && (
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h2 className="dash-card-title">Quản lý Quá hạn &amp; Gia hạn Hạn chót chung</h2>
              <p className="text-xs text-muted mt-0.5">
                Các yêu cầu đã hết hạn completionDeadline chung nhưng chưa hoàn tất nghĩa vụ. Hệ thống khóa nộp tiền mới; Quản lý quyết định gia hạn hoặc hủy thủ công (F01-BR-16).
              </p>
            </div>
            <span className="badge-status-red">{overdueList.length} yêu cầu quá hạn</span>
          </div>

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>MÃ YÊU CẦU</th>
                  <th style={{ width: '22%' }}>KHÁCH HÀNG</th>
                  <th style={{ width: '16%' }}>TUYẾN ĐƯỜNG</th>
                  <th style={{ width: '16%' }}>HẠN HOÀN TẤT GỐC</th>
                  <th style={{ width: '12%' }}>TÌNH TRẠNG KÝ</th>
                  <th style={{ width: '10%' }}>QUÁ HẠN</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {overdueList.map((item) => (
                  <tr key={item.requestId} className="hoverable-row">
                    <td className="font-semibold text-primary-dark">
                      {item.requestId}
                    </td>
                    <td>
                      <div className="customer-cell-main">{item.customerName}</div>
                      <div className="customer-cell-sub">
                        Cọc còn thiếu: ${item.depositOutstanding.toLocaleString()} {item.currency}
                      </div>
                    </td>
                    <td className="route-cell">{item.routeDisplay}</td>
                    <td>
                      <div className="text-xs font-semibold text-red-700">
                        {item.completionDeadline}
                      </div>
                    </td>
                    <td>
                      {item.contractStatus === 'SIGNED' ? (
                        <span className="badge-status-blue">Đã ký OTP (Chưa cọc)</span>
                      ) : (
                        <span className="badge-status-yellow">Chưa ký OTP</span>
                      )}
                    </td>
                    <td>
                      <div className="text-xs font-bold text-red-600">
                        +{item.daysExpired} ngày
                      </div>
                      <div className="text-xs text-muted">
                        {item.isGracePeriodEnded ? 'Hết ân hạn' : 'Đang ân hạn'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex-row-center justify-end gap-1">
                        <button
                          type="button"
                          className="btn-secondary py-1 px-2 text-xs"
                          title="Gia hạn thêm thời gian hoàn tất"
                          onClick={() => {
                            setExtendingItem(item);
                            setNewDeadline('');
                          }}
                        >
                          Gia hạn
                        </button>
                        <button
                          type="button"
                          className="btn-decision btn-reject py-1 px-2 text-xs"
                          title="Hủy đơn thủ công"
                          onClick={() => { setCancelError(null); setCancellingItem(item); }}
                        >
                          Hủy đơn
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: RECONCILE BANK TRANSFER (F01-M20) */}
      {activeTxn && (
        <div className="modal-backdrop fade-in" onClick={() => setActiveTxn(null)}>
          <div
            className="modal-box modal-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  Đối soát VNPay: {activeTxn.transactionId}
                </h2>
                <p className="modal-sub">
                  Yêu cầu: <strong>{activeTxn.requestId}</strong> • Khách hàng: {activeTxn.customerName}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveTxn(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body space-y-4">
              {/* Receipt preview if available */}
              {activeTxn.receiptUrl && (
                <div className="receipt-preview-box">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    📄 Bản chụp Ủy nhiệm chi do Khách hàng nộp:
                  </div>
                  <img
                    src={activeTxn.receiptUrl}
                    alt="Ủy nhiệm chi"
                    className="receipt-img"
                  />
                </div>
              )}

              <div className="detail-card">
                <div className="info-kv-row">
                  <span className="kv-label">Số tiền khách khai báo:</span>
                  <span className="kv-val font-bold text-slate-900">
                    ${activeTxn.declaredAmount.toLocaleString()} {activeTxn.currency}
                  </span>
                </div>
                <div className="info-kv-row">
                  <span className="kv-label">Số tiền cọc cần thu theo HĐ:</span>
                  <span className="kv-val font-semibold text-amber-700">
                    ${activeTxn.expectedDepositAmount.toLocaleString()} {activeTxn.currency}
                  </span>
                </div>
                <div className="info-kv-row">
                  <span className="kv-label">Ngân hàng thụ hưởng:</span>
                  <span className="kv-val">{activeTxn.bankName}</span>
                </div>
                <div className="info-kv-row">
                  <span className="kv-label">Mã tham chiếu chuyển khoản:</span>
                  <span className="kv-val font-mono">{activeTxn.bankReference}</span>
                </div>
              </div>

              {!isRejecting ? (
                <div className="space-y-3">
                  <div className="form-group">
                    <label className="form-label font-semibold">
                      Số tiền thực nhận trên sao kê ngân hàng ($):
                    </label>
                    <input
                      type="number"
                      className="text-input font-mono font-bold"
                      readOnly value={confirmedAmount}
                      onChange={(e) => setConfirmedAmount(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label font-semibold">
                      Mã bút toán / Mã giao dịch ngân hàng đã kiểm tra:
                    </label>
                    <input
                      type="text"
                      className="text-input font-mono"
                      readOnly value={bankRefInput}
                      onChange={(e) => setBankRefInput(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ghi chú đối soát:</label>
                    <input
                      type="text"
                      className="text-input"
                      value={confirmNote}
                      onChange={(e) => setConfirmNote(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <label className="form-label text-red-800 font-semibold">
                    Lý do từ chối xác nhận giao dịch:
                  </label>
                  <textarea
                    rows={2}
                    className="textarea-input border-red-300"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer flex justify-between">
              <div>
                {!isRejecting ? (
                  <button
                    type="button"
                    className="btn-decision btn-reject text-xs"
                    onClick={() => setIsRejecting(true)}
                  >
                    Từ chối giao dịch này
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => setIsRejecting(false)}
                  >
                    Hủy từ chối
                  </button>
                )}
              </div>

              <div className="flex-row-center gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveTxn(null)}
                >
                  Đóng
                </button>
                {!isRejecting ? (
                  <button
                    type="button"
                    className="btn-primary btn-green"
                    onClick={handleExecuteConfirm}
                  >
                    ✓ Xác nhận Tiền Thực Nhận
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary btn-red"
                    onClick={handleExecuteReject}
                  >
                    Xác nhận Từ Chối
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EXTEND COMPLETION DEADLINE (F01-M23) */}
      {extendingItem && (
        <div className="modal-backdrop fade-in" onClick={() => setExtendingItem(null)}>
          <div
            className="modal-box modal-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Gia hạn Hạn chót: {extendingItem.requestId}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setExtendingItem(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body space-y-3">
              <p className="text-sm text-slate-600">
                Gia hạn <code>effectiveCompletionDeadline</code> chung cho khách hàng <strong>{extendingItem.customerName}</strong>. Thao tác này sẽ tự động <strong>mở lại cổng thanh toán (paymentLocked=false)</strong> để khách hàng có thể tiếp tục nộp tiền cọc.
              </p>

              <div className="info-kv-row p-2 bg-slate-50 rounded">
                <span className="kv-label">Hạn chót cũ:</span>
                <span className="kv-val text-red-600 font-bold">{extendingItem.completionDeadline}</span>
              </div>

              <div className="form-group">
                <label className="form-label font-semibold">
                  Hạn chót mới áp dụng:
                </label>
                <input
                  type="datetime-local"
                  className="text-input"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label font-semibold">
                  Lý do gia hạn (Lưu vết kiểm toán Audit):
                </label>
                <textarea
                  rows={2}
                  className="textarea-input"
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setExtendingItem(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleExecuteExtend}
              >
                Xác nhận Gia hạn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CANCEL OVERDUE MANUALLY (F01-M24) */}
      {cancellingItem && (
        <div className="modal-backdrop fade-in" onClick={() => setCancellingItem(null)}>
          <div
            className="modal-box modal-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title text-red-700">
                Hủy Thủ công Yêu cầu Quá hạn: {cancellingItem.requestId}
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCancellingItem(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body space-y-3">
              {cancelError && <p role="alert" className="text-red-700">{cancelError}</p>}
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                ⚠️ Cảnh báo: Quản lý đang tiến hành hủy thủ công yêu cầu quá hạn sau khi đã đối soát không có giao dịch tiền cọc nào tồn đọng. Thao tác này sẽ chuyển yêu cầu sang trạng thái <strong>CANCELLED</strong>.
              </div>

              <div className="form-group">
                <label className="form-label font-semibold">
                  Lý do hủy đơn quá hạn:
                </label>
                <textarea
                  rows={3}
                  className="textarea-input border-red-300"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCancellingItem(null)}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="btn-primary btn-red"
                disabled={cancelBusy || !cancelReason.trim()}
                onClick={handleExecuteCancel}
              >
                Xác nhận Hủy Đơn Quá Hạn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
