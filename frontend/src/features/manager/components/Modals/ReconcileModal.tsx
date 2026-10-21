import React, { useState } from 'react';
import type { BankTransferTransaction } from '../../types';
import './ReconcileModal.css';

interface ReconcileModalProps {
  transaction: BankTransferTransaction;
  onClose: () => void;
  onConfirm: (
    transactionId: string,
    confirmedAmount: number,
    bankRef: string,
    note: string
  ) => void;
  onReject: (transactionId: string, reason: string) => void;
}

export const ReconcileModal: React.FC<ReconcileModalProps> = ({
  transaction,
  onClose,
  onConfirm,
  onReject,
}) => {
  const [confirmedAmount, setConfirmedAmount] = useState<number>(
    transaction.declaredAmount || 555
  );
  const [bankRefInput, setBankRefInput] = useState<string>(
    transaction.bankReference ? `VERIFIED-${transaction.bankReference}` : 'VCB-TX-741-998'
  );
  const [confirmNote, setConfirmNote] = useState<string>(
    'Đã đối chiếu khớp tiền thực nhận trên sao kê ngân hàng'
  );
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>(
    'Chưa tìm thấy tiền thực nhận để xác minh'
  );

  return (
    <div className="reconcile-modal-overlay" onClick={onClose}>
      <div className="reconcile-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="reconcile-modal-header">
          <h3 className="reconcile-modal-title">
            Đối soát chuyển khoản - {transaction.transactionId}
          </h3>
          <button type="button" className="reconcile-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="reconcile-modal-body">
          <div className="reconcile-field-grid">
            <div className="reconcile-field-box">
              <div className="reconcile-field-label">Mã yêu cầu</div>
              <div className="reconcile-field-val">{transaction.requestId}</div>
            </div>
            <div className="reconcile-field-box">
              <div className="reconcile-field-label">Khách hàng</div>
              <div className="reconcile-field-val">{transaction.customerName}</div>
            </div>
            <div className="reconcile-field-box">
              <div className="reconcile-field-label">Số tiền khách khai báo</div>
              <div className="reconcile-field-val" style={{ color: '#ea580c' }}>
                ${transaction.declaredAmount.toLocaleString()} {transaction.currency}
              </div>
            </div>
            <div className="reconcile-field-box">
              <div className="reconcile-field-label">Số tiền cọc quy định</div>
              <div className="reconcile-field-val">
                ${transaction.expectedDepositAmount.toLocaleString()} {transaction.currency}
              </div>
            </div>
            <div className="reconcile-field-box">
              <div className="reconcile-field-label">Ngân hàng thụ hưởng</div>
              <div className="reconcile-field-val">
                {transaction.bankName} - {transaction.accountNumber}
              </div>
            </div>
            <div className="reconcile-field-box">
              <div className="reconcile-field-label">Cú pháp chuyển khoản</div>
              <div className="reconcile-field-val" style={{ fontFamily: 'monospace' }}>
                {transaction.bankReference}
              </div>
            </div>
          </div>

          {isRejecting ? (
            <div className="reconcile-form-group">
              <label className="reconcile-form-label">
                Lý do từ chối xác nhận tiền cọc:
              </label>
              <textarea
                className="reconcile-form-input"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="reconcile-form-group">
                <label className="reconcile-form-label">
                  Số tiền thực nhận trên sao kê ({transaction.currency}):
                </label>
                <input
                  type="number"
                  className="reconcile-form-input"
                  value={confirmedAmount}
                  onChange={(e) => setConfirmedAmount(Number(e.target.value))}
                />
              </div>

              <div className="reconcile-form-group">
                <label className="reconcile-form-label">
                  Mã bút toán sao kê ngân hàng:
                </label>
                <input
                  type="text"
                  className="reconcile-form-input"
                  value={bankRefInput}
                  onChange={(e) => setBankRefInput(e.target.value)}
                />
              </div>

              <div className="reconcile-form-group">
                <label className="reconcile-form-label">Ghi chú đối soát:</label>
                <input
                  type="text"
                  className="reconcile-form-input"
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="reconcile-modal-actions">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Đóng
          </button>

          {!isRejecting ? (
            <>
              <button
                type="button"
                className="btn-modal-reject"
                onClick={() => setIsRejecting(true)}
              >
                Từ chối chứng từ
              </button>
              <button
                type="button"
                className="btn-modal-confirm"
                onClick={() =>
                  onConfirm(
                    transaction.transactionId,
                    confirmedAmount,
                    bankRefInput,
                    confirmNote
                  )
                }
              >
                Xác nhận & Khớp tiền
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setIsRejecting(false)}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="btn-modal-reject"
                onClick={() => onReject(transaction.transactionId, rejectReason)}
              >
                Xác nhận từ chối
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReconcileModal;
