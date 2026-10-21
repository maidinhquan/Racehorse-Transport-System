import React, { useState, useMemo } from 'react';
import type {
  BankTransferTransaction,
  DeadlineOverdueItem,
  ManagerNav,
} from '../../types';
import { ReconcileModal } from '../../components/Modals';
import './ManagerPaymentsPage.css';

interface ManagerPaymentsPageProps {
  transactions: BankTransferTransaction[];
  overdueList: DeadlineOverdueItem[];
  onConfirmTransaction: (
    transactionId: string,
    confirmedAmount: number,
    bankRef?: string,
    note?: string
  ) => void;
  onRejectTransaction: (transactionId: string, reason: string) => void;
  onExtendDeadline: (requestId: string, newDeadline: string, reason?: string) => void;
  onCancelOverdue: (requestId: string, reason: string) => void;
  onNavigate?: (nav: ManagerNav, targetId?: string) => void;
}

export const ManagerPaymentsPage: React.FC<ManagerPaymentsPageProps> = ({
  transactions: initialTransactions,
  overdueList: initialOverdueList,
  onConfirmTransaction,
  onRejectTransaction,
  onExtendDeadline,
  onCancelOverdue,
  onNavigate: _onNavigate,
}) => {
  // Local state to support live interactive reconciliation
  const [txnList, setTxnList] = useState<BankTransferTransaction[]>(initialTransactions);
  const [overdues, setOverdues] = useState<DeadlineOverdueItem[]>(initialOverdueList);

  // Tabs: 'PENDING' (Hàng chờ xác minh), 'OVERDUE' (Tiền cọc còn nợ), 'ALL' (Tất cả giao dịch)
  // Default to 'ALL' as shown in the screenshots
  const [activeTab, setActiveTab] = useState<'PENDING' | 'OVERDUE' | 'ALL'>('ALL');

  // Transaction reconciliation modal state
  const [activeTxn, setActiveTxn] = useState<BankTransferTransaction | null>(null);

  // Toast feedback state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filter state for All Transactions tab
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');

  // Filtered queues
  const pendingTxns = txnList.filter((t) => t.status === 'PENDING_CONFIRMATION');

  const filteredAllTxns = useMemo(() => {
    return txnList.filter((t) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.transactionId.toLowerCase().includes(q) ||
        t.requestId.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        (t.contractId && t.contractId.toLowerCase().includes(q)) ||
        (t.bankReference && t.bankReference.toLowerCase().includes(q));

      let matchStatus = true;
      if (statusFilter === 'SUCCESS') {
        matchStatus = t.status === 'SUCCESS';
      } else if (statusFilter === 'PENDING') {
        matchStatus = t.status === 'PENDING_CONFIRMATION';
      } else if (statusFilter === 'REJECTED') {
        matchStatus = t.status === 'REJECTED';
      } else if (statusFilter === 'PROCESSING') {
        matchStatus = t.status === 'PROCESSING';
      }

      let matchType = true;
      if (typeFilter === 'DEPOSIT') {
        matchType = t.paymentType === 'Tiền cọc' || !t.paymentType;
      } else if (typeFilter === 'FINAL') {
        matchType = t.paymentType === 'Thanh toán cuối';
      }

      let matchMethod = true;
      if (methodFilter === 'GATEWAY') {
        matchMethod = t.method === 'VNPAY';
      } else if (methodFilter === 'TRANSFER') {
        matchMethod = t.method === 'BANK_TRANSFER';
      }

      return matchSearch && matchStatus && matchType && matchMethod;
    });
  }, [txnList, searchTerm, statusFilter, typeFilter, methodFilter]);

  // Execute confirm
  const handleExecuteConfirm = (
    transactionId: string,
    confirmedAmount: number,
    bankRef: string,
    confirmNote: string
  ) => {
    onConfirmTransaction(transactionId, confirmedAmount, bankRef, confirmNote);

    setTxnList((prev) =>
      prev.map((t) =>
        t.transactionId === transactionId
          ? {
              ...t,
              status: 'SUCCESS',
              confirmedAmount,
              confirmedAt: new Date().toISOString(),
              statusSubtext: `Đã xác minh ${new Date().toLocaleDateString('vi-VN')}`,
            }
          : t
      )
    );

    setActiveTxn(null);
    setToastMsg(
      `✓ Đã đối soát thành công giao dịch ${transactionId}! Đã đủ tiền cọc cho yêu cầu.`
    );
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Execute reject
  const handleExecuteReject = (transactionId: string, reason: string) => {
    onRejectTransaction(transactionId, reason);

    setTxnList((prev) =>
      prev.map((t) =>
        t.transactionId === transactionId
          ? {
              ...t,
              status: 'REJECTED',
              rejectReason: reason,
              statusSubtext: reason,
            }
          : t
      )
    );

    setActiveTxn(null);
    setToastMsg(`Đã từ chối xác nhận giao dịch ${transactionId}.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Handle Extend deadline
  const handleExtendDeadlineWrapper = (
    requestId: string,
    newDeadline: string,
    reason?: string
  ) => {
    onExtendDeadline(requestId, newDeadline, reason);
    setToastMsg(`✓ Đã gia hạn thêm thời hạn cọc cho ${requestId}.`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Handle Cancel Overdue
  const handleCancelOverdueWrapper = (requestId: string, reason: string) => {
    onCancelOverdue(requestId, reason);
    setOverdues((prev) => prev.filter((o) => o.requestId !== requestId));
    setToastMsg(`Đã hủy yêu cầu quá hạn ${requestId}.`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Render Status Column to match Screenshot 2 exactly
  const renderStatus = (t: BankTransferTransaction) => {
    if (t.status === 'PROCESSING') {
      return (
        <div>
          <span className="badge-status-processing">PROCESSING</span>
        </div>
      );
    }

    if (t.status === 'REJECTED') {
      return (
        <div>
          <span className="badge-status-rejected">Bị từ chối</span>
          <div className="status-subtext-red">
            {t.statusSubtext || t.rejectReason || 'No matching transfer on the bank statement for 30/9.'}
          </div>
        </div>
      );
    }

    if (t.status === 'PENDING_CONFIRMATION') {
      return (
        <div>
          <span className="badge-status-pending">Chờ xác nhận</span>
        </div>
      );
    }

    if (t.status === 'SUCCESS') {
      // Check if it's provider confirmed (e.g. gateway rows)
      if (t.statusSubtext && t.statusSubtext.includes('Provider confirmed')) {
        return (
          <div className="status-text-provider">
            {t.statusSubtext}
          </div>
        );
      }

      return (
        <div>
          <span className="badge-status-success">Thành công</span>
          {t.statusSubtext && (
            <div className="status-subtext-gray">{t.statusSubtext}</div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="payments-page-container">
      {/* Module Header */}
      <div className="payments-header-section">
        <h1 className="payments-header-title">Đặt cọc & thanh toán</h1>
        <p className="payments-header-sub">
          Xác minh chứng từ thanh toán, quản lý tiền cọc quá hạn và xem mọi giao dịch.
        </p>
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="payments-toast">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Tabs Row matching Screenshot 1 */}
      <div className="payments-tabs-bar">
        {/* Tab 1 */}
        <button
          type="button"
          className={`payments-tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
          onClick={() => setActiveTab('PENDING')}
        >
          <span>Hàng chờ xác minh</span>
          <span className="tab-circle-badge">1</span>
        </button>

        {/* Tab 2 */}
        <button
          type="button"
          className={`payments-tab-btn ${activeTab === 'OVERDUE' ? 'active' : ''}`}
          onClick={() => setActiveTab('OVERDUE')}
        >
          <span>Tiền cọc còn nợ</span>
          <span className="tab-circle-badge">3</span>
        </button>

        {/* Tab 3 */}
        <button
          type="button"
          className={`payments-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveTab('ALL')}
        >
          <span>Tất cả giao dịch</span>
        </button>
      </div>

      {/* Tab 1: Hàng chờ xác minh */}
      {activeTab === 'PENDING' && (
        <div className="pending-queue-container">
          <div className="payments-table-card">
            <div className="table-responsive">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>GIAO DỊCH</th>
                    <th>YÊU CẦU / KHÁCH HÀNG</th>
                    <th>LOẠI</th>
                    <th>PHƯƠNG THỨC</th>
                    <th>KHAI BÁO</th>
                    <th>DỰ KIẾN</th>
                    <th>MÃ THAM CHIẾU / CHỨNG TỪ</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTxns.map((txn) => (
                    <tr key={txn.transactionId} className="payments-table-row">
                      <td>
                        <div className="txn-code-text">{txn.transactionId}</div>
                        <div className="txn-sub-time">{txn.paidAt}</div>
                      </td>
                      <td>
                        <div className="txn-req-code">{txn.requestId}</div>
                        <div className="txn-sub-customer">{txn.customerName}</div>
                      </td>
                      <td>
                        <span className="badge-type-deposit">
                          {txn.paymentType || 'Tiền cọc'}
                        </span>
                      </td>
                      <td>
                        <span className="text-[#d1d5db]">
                          {txn.method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Cổng thanh toán'}
                        </span>
                      </td>
                      <td>
                        <span className="txn-amount-text">
                          ${txn.declaredAmount.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className="txn-amount-text">
                          ${txn.expectedDepositAmount.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <div className="text-[#d1d5db]">{txn.bankReference}</div>
                        {txn.attachmentName && (
                          <div
                            className="txn-attachment-link"
                            onClick={() => setActiveTxn(txn)}
                          >
                            {txn.attachmentName}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-detail-orange"
                          onClick={() => setActiveTxn(txn)}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}

                  {pendingTxns.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        style={{ textAlign: 'center', padding: '36px', color: '#9ca3af' }}
                      >
                        Không có giao dịch nào đang chờ đối soát.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Tiền cọc còn nợ */}
      {activeTab === 'OVERDUE' && (
        <div className="overdue-deposits-container">
          <div className="payments-notice-box overdue-rule-box">
            <div className="notice-header-row">
              <span className="notice-icon-circle">ⓘ</span>
              <span className="notice-title-text">Quy tắc quá hạn đặt cọc</span>
            </div>
            <p className="notice-desc-text">
              Hệ thống gửi một lời nhắc mỗi ngày làm việc tại Việt Nam trong 3 ngày làm việc sau ngày đến hạn. Yêu cầu không bao giờ bị hủy tự động: sau thời gian gia hạn, quản lý có thể gia hạn hoặc hủy thủ công, trừ khi chứng từ thanh toán vẫn đang được kiểm tra.
            </p>
          </div>

          <div className="payments-table-card">
            <div className="table-responsive">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>YÊU CẦU</th>
                    <th>KHÁCH HÀNG</th>
                    <th>TIỀN CỌC</th>
                    <th>ĐẾN HẠN</th>
                    <th>NHẮC NHỞ</th>
                    <th>KIỂM TRA THANH TOÁN</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {overdues.map((item) => (
                    <tr key={item.requestId} className="payments-table-row">
                      <td>
                        <span className="txn-code-text">{item.requestId}</span>
                      </td>
                      <td>
                        <div>
                          <div className="txn-customer-name">{item.customerName}</div>
                          <div className="txn-customer-sub">
                            {item.contactPerson || 'Alex Equine'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="txn-amount-text">
                          ${item.depositOutstanding.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div className="deadline-time-text">{item.completionDeadline}</div>
                          {item.expirySubtext && (
                            <div className="deadline-subtext expired">
                              {item.expirySubtext}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="text-[#9ca3af] text-xs">
                          {item.reminderStatus || '0 of 3 post-expiry reminders'}
                        </span>
                      </td>
                      <td>
                        {item.verificationStatus === 'Đang xác minh' ? (
                          <span className="badge-status-pill processing">
                            Đang xác minh
                          </span>
                        ) : (
                          <span className="text-[#6b7280]">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="btn-action-outline-orange"
                            onClick={() =>
                              handleExtendDeadlineWrapper(
                                item.requestId,
                                '2026-10-15 17:00'
                              )
                            }
                          >
                            Gia hạn
                          </button>
                          <button
                            type="button"
                            className="btn-action-outline-red"
                            onClick={() =>
                              handleCancelOverdueWrapper(
                                item.requestId,
                                'Khách hàng không nộp cọc sau thời gian gia hạn'
                              )
                            }
                          >
                            Hủy yêu cầu
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Tất cả giao dịch matching Screenshot 1 & 2 */}
      {activeTab === 'ALL' && (
        <div className="all-transactions-container">
          {/* Search & Filter Row */}
          <div className="all-txns-filters-row">
            <div className="all-txns-search-box">
              <span className="all-txns-search-icon">🔍</span>
              <input
                type="text"
                className="all-txns-search-input"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="all-txns-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="SUCCESS">Đã xác minh</option>
              <option value="PENDING">Chờ đối soát</option>
              <option value="REJECTED">Bị từ chối</option>
              <option value="PROCESSING">PROCESSING</option>
            </select>

            <select
              className="all-txns-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">Tất cả loại</option>
              <option value="DEPOSIT">Tiền cọc</option>
              <option value="FINAL">Thanh toán cuối</option>
            </select>

            <select
              className="all-txns-select"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="ALL">Mọi phương thức</option>
              <option value="GATEWAY">Cổng thanh toán</option>
              <option value="TRANSFER">Chuyển khoản</option>
            </select>
          </div>

          {/* 10-column Data Table */}
          <div className="payments-table-card">
            <div className="table-responsive">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>GIAO DỊCH</th>
                    <th>YÊU CẦU / KHÁCH HÀNG</th>
                    <th>HỢP ĐỒNG</th>
                    <th>LOẠI</th>
                    <th>PHƯƠNG THỨC</th>
                    <th>DỰ KIẾN</th>
                    <th>KHÁCH BÁO</th>
                    <th>ĐÃ XÁC MINH</th>
                    <th>MÃ THAM CHIẾU / CHỨNG TỪ</th>
                    <th>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllTxns.map((t) => (
                    <tr
                      key={t.transactionId}
                      className="payments-table-row"
                      onClick={() => setActiveTxn(t)}
                    >
                      {/* 1. Giao dịch */}
                      <td>
                        <div className="txn-code-text">{t.transactionId}</div>
                        <div className="txn-sub-time">{t.paidAt}</div>
                      </td>

                      {/* 2. Yêu cầu / Khách hàng */}
                      <td>
                        <div className="txn-req-code">{t.requestId}</div>
                        <div className="txn-sub-customer">{t.customerName}</div>
                      </td>

                      {/* 3. Hợp đồng */}
                      <td>
                        <div className="txn-contract-code">{t.contractId}</div>
                        <div className="txn-contract-ver">{t.contractVersion || 'v1'}</div>
                      </td>

                      {/* 4. Loại */}
                      <td>
                        <span className="badge-type-deposit">
                          {t.paymentType || 'Tiền cọc'}
                        </span>
                      </td>

                      {/* 5. Phương thức */}
                      <td>
                        <span className="txn-method-text">
                          {t.method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Cổng thanh toán'}
                        </span>
                      </td>

                      {/* 6. Dự kiến */}
                      <td>
                        <span className="txn-amount-val">
                          ${t.expectedDepositAmount.toLocaleString()}
                        </span>
                      </td>

                      {/* 7. Khách báo */}
                      <td>
                        <span className="txn-amount-val">
                          ${t.declaredAmount.toLocaleString()}
                        </span>
                      </td>

                      {/* 8. Đã xác minh */}
                      <td>
                        <span className="txn-amount-val">
                          {t.confirmedAmount != null ? `$${t.confirmedAmount.toLocaleString()}` : '—'}
                        </span>
                      </td>

                      {/* 9. Mã tham chiếu / Chứng từ */}
                      <td>
                        <div className="txn-ref-code">{t.bankReference || '—'}</div>
                        {t.attachmentName && (
                          <div
                            className="txn-attachment-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTxn(t);
                            }}
                          >
                            {t.attachmentName}
                          </div>
                        )}
                      </td>

                      {/* 10. Trạng thái */}
                      <td>
                        {renderStatus(t)}
                      </td>
                    </tr>
                  ))}

                  {filteredAllTxns.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        style={{ textAlign: 'center', padding: '36px', color: '#9ca3af' }}
                      >
                        Không tìm thấy giao dịch nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Reconciliation Modal */}
      {activeTxn && (
        <ReconcileModal
          transaction={activeTxn}
          onClose={() => setActiveTxn(null)}
          onConfirm={handleExecuteConfirm}
          onReject={handleExecuteReject}
        />
      )}
    </div>
  );
};

export default ManagerPaymentsPage;
