import { download } from "../../../../flow1/relational/api";
import { flow1Error } from "../../../../flow1/api";
import React, { useState } from 'react';
import type {
  ContractItem,
  TransportRequestItem,
  ManagerNav,
} from './manager.types';

interface RenderContractsPageProps {
  contracts: ContractItem[];
  requests: TransportRequestItem[];
  onSaveContract: (contract: ContractItem) => Promise<ContractItem>;
  onSendContract: (contractId: string, completionDeadline: string) => Promise<void>;
  onNavigate: (nav: ManagerNav, targetId?: string) => void;
  initialSelectedRequestId?: string;
}

export const RenderContractsPage: React.FC<RenderContractsPageProps> = ({
  contracts,
  requests,
  onSaveContract,
  onSendContract,
  onNavigate: _onNavigate,
  initialSelectedRequestId,
}) => {
  // Find requests that are ACCEPTED or have contracts
  const readyRequests = requests.filter(
    (r) =>
      r.status === 'ACCEPTED' ||
      r.status === 'AWAITING_CONTRACT' ||
      r.status === 'AWAITING_DEPOSIT'
  );

  // Default selected request
  const [selectedReqId, setSelectedReqId] = useState<string>(() => {
    if (initialSelectedRequestId) return initialSelectedRequestId;
    if (readyRequests.length > 0) return readyRequests[0].id;
    return '';
  });

  const selectedRequest =
    requests.find((r) => r.id === selectedReqId) || readyRequests[0];

  // Current contract for selected request or initialize
  const existingContract = contracts.find((c) => c.requestId === selectedRequest?.id);

  const [edited, setEdited] = useState<ContractItem | null>(null);
  const fallback: ContractItem = { id: selectedRequest ? `draft:${selectedRequest.id}` : '—', version: '—', requestId: selectedRequest?.id || '', customerName: selectedRequest?.customerName || '—', routeDisplay: selectedRequest?.routeDisplay || '—', currency: 'VND', items: [{ id: 'total', category: 'TRANSPORT', description: 'Giá vận chuyển trọn gói', quantity: 1, unitPrice: 0, amount: 0, mandatory: true }], totalAmount: 0, suggestedTotal: 0, floorPrice: 0, isBelowFloor: false, depositPercent: 40, depositAmount: 0, completionDeadline: '', status: 'DRAFT', statusLabel: 'DRAFT', includedServices: [], excludedServices: [], customTerms: '', createdAt: '—' };
  const activeContract = edited && edited.requestId === selectedRequest?.id ? edited : existingContract || fallback;
  const setActiveContract = (c: ContractItem) => setEdited(c);
  const persisted = !activeContract.id.startsWith('draft:');
  const [priceOverrideReason, setPriceOverrideReason] = useState('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Recalculate contract total
  const handleItemChange = (
    index: number,
    field: 'unitPrice' | 'quantity' | 'description',
    val: any
  ) => {
    const updatedItems = [...activeContract.items];
    const target = { ...updatedItems[index] };

    if (field === 'unitPrice') {
      target.unitPrice = Number(val) || 0;
      target.amount = target.unitPrice * target.quantity;
    } else if (field === 'quantity') {
      target.quantity = Number(val) || 0;
      target.amount = target.unitPrice * target.quantity;
    } else if (field === 'description') {
      target.description = val;
    }
    updatedItems[index] = target;

    const newTotal = updatedItems.reduce((acc, it) => acc + it.amount, 0);
    const newDeposit = Math.round(newTotal * (activeContract.depositPercent / 100));
    const isBelow = newTotal < activeContract.floorPrice;

    setActiveContract({
      ...activeContract,
      items: updatedItems,
      totalAmount: newTotal,
      depositAmount: newDeposit,
      isBelowFloor: isBelow,
    });
  };

  const handleDepositPercentChange = (percent: number) => {
    if (percent !== 40) return;
    const newDeposit = Math.round(activeContract.totalAmount * (percent / 100));
    setActiveContract({
      ...activeContract,
      depositPercent: percent,
      depositAmount: newDeposit,
    });
  };

  const handleSaveDraft = async () => {
    try { const saved = await onSaveContract(activeContract); setActiveContract(saved); setSaveSuccessMsg('Đã lưu thành công bản nháp hợp đồng ' + saved.id); } catch (e) { setSaveSuccessMsg(null); window.alert(flow1Error(e)); }
  };
  const handleSendToCustomer = async () => {
    try { await onSendContract(activeContract.id, activeContract.completionDeadline); setSaveSuccessMsg('Đã phát hành hợp đồng thành công.'); } catch (e) { setSaveSuccessMsg(null); window.alert(flow1Error(e)); }
  };
  const preview = async () => {
    if (!persisted || activeContract.status === 'DRAFT') return;
    try { await download(`/manager/contracts/${activeContract.id}/pdf`, activeContract.id + '.pdf'); } catch (e) { setSaveSuccessMsg(null); window.alert(flow1Error(e)); }
  };

  return (
    <div className="contracts-page fade-in">
      {/* Header */}
      <div className="module-header">
        <div>
          <h1 className="module-title">Hợp đồng & Chi phí</h1>
          <p className="module-subtitle">
            Soạn thảo hợp đồng nháp, cấu hình các hạng mục định giá, kiểm tra giá sàn và phát hành hợp đồng (Flow 1: UC-LM-02)
          </p>
        </div>
        {saveSuccessMsg && (
          <div className="toast-alert-badge fade-in">
            ✓ {saveSuccessMsg}
          </div>
        )}
      </div>

      {/* Main Grid: Left Request Picker + Right Contract Studio */}
      <div className="contract-layout-grid">
        {/* Left Column: Request Queue */}
        <div className="contract-sidebar">
          <div className="dash-card">
            <h3 className="section-label mb-2">Hàng đợi Soạn Hợp đồng</h3>
            <p className="text-xs text-muted mb-3">
              Các yêu cầu đã được chấp thuận sẵn sàng phát hành báo giá chính thức:
            </p>

            <div className="contract-req-list">
              {readyRequests.map((req) => (
                <div
                  key={req.id}
                  className={`contract-req-card ${
                    req.id === selectedReqId ? 'selected' : ''
                  }`}
                  onClick={() => {
                    setSelectedReqId(req.id);
                  }}
                >
                  <div className="flex-row-center justify-between">
                    <span className="font-semibold text-primary-dark">{req.id}</span>
                    <span className="badge-status-blue text-xs">
                      {req.status === 'ACCEPTED' ? 'Chờ soạn' : req.statusLabel}
                    </span>
                  </div>
                  <div className="font-medium text-slate-800 text-sm mt-1">
                    {req.customerName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {req.routeDisplay} • {req.horses.length} ngựa
                  </div>
                  <div className="text-xs text-amber-700 mt-1">
                    Khởi hành: {req.departureDate} ({req.daysRemainingText})
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Policy Box */}
          <div className="policy-note-card">
            <div className="font-semibold text-amber-900 text-sm mb-1">
              ⚖️ Quy định nghiệp vụ (F01-BR-08/10/11)
            </div>
            <ul className="policy-list">
              <li>
                <strong>Bỏ Quote riêng:</strong> Giá chính thức được đưa thẳng vào Contract Draft.
              </li>
              <li>
                <strong>Giá sàn (Floor Price):</strong> Nếu giá phát hành thấp hơn giá sàn ({activeContract.floorPrice ? activeContract.floorPrice.toLocaleString() : '—'}), bắt buộc giải trình lý do.
              </li>
              <li>
                <strong>Hạn ký hợp đồng:</strong> Hạn ký được chốt trong hợp đồng; hạn cọc được chốt riêng sau ký.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Contract Editor Studio */}
        <div className="contract-editor-main">
          <div className="dash-card">
            {/* Studio Header */}
            <div className="contract-studio-header">
              <div>
                <div className="flex-row-center gap-2">
                  <h2 className="dash-card-title">
                    Hợp đồng: {activeContract.id} (Phiên bản v{activeContract.version})
                  </h2>
                  <span
                    className={
                      activeContract.status === 'DRAFT'
                        ? 'badge-status-yellow'
                        : 'badge-status-blue'
                    }
                  >
                    {activeContract.statusLabel}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Gắn liền yêu cầu: <strong>{selectedRequest.id}</strong> • Khách hàng: <strong>{selectedRequest?.customerName}</strong> ({selectedRequest?.routeDisplay})
                </p>
              </div>

              <div className="flex-row-center gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={!persisted || activeContract.status === "DRAFT"} onClick={() => void preview()}
                >
                  👁️ Xem trước Hợp đồng
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={!selectedRequest || persisted || !activeContract.totalAmount || !activeContract.completionDeadline} onClick={handleSaveDraft}
                >
                  💾 Lưu nháp
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!persisted || activeContract.status !== "DRAFT"} onClick={handleSendToCustomer}
                >
                  🚀 Phát hành &amp; Gửi Hợp đồng
                </button>
              </div>
            </div>

            {/* Pricing Line Items */}
            <div className="contract-section">
              <div className="flex-row-center justify-between mb-2">
                <h3 className="section-label">
                  1. Bảng Chi tiết Hạng mục Định giá (Pricing Breakdown)
                </h3>
                <span className="text-xs text-muted">Đơn vị: {activeContract.currency}</span>
              </div>

              <div className="dash-table-wrap">
                <table className="dash-table line-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>DANH MỤC DỊCH VỤ</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>SỐ LƯỢNG</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>ĐƠN GIÁ ({activeContract.currency})</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>THÀNH TIỀN ({activeContract.currency})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeContract.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="text"
                            className="table-inline-input font-medium"
                            readOnly value={item.description}
                            onChange={(e) =>
                              handleItemChange(idx, 'description', e.target.value)
                            }
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            min={1}
                            className="table-inline-input text-center"
                            disabled value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, 'quantity', e.target.value)
                            }
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            className="table-inline-input text-right font-mono"
                            disabled={persisted} value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(idx, 'unitPrice', e.target.value)
                            }
                          />
                        </td>
                        <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                          {item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pricing Summary & Floor Check */}
            <div className="pricing-summary-card">
              <div className="pricing-metrics-row">
                <div className="pricing-metric-box">
                  <span className="metric-label">Chi phí kế hoạch PC:</span>
                  <span className="metric-val text-slate-700">
                    {'—'} {activeContract.currency}
                  </span>
                </div>
                <div className="pricing-metric-box">
                  <span className="metric-label">Giá sàn quy định:</span>
                  <span className="metric-val text-amber-700 font-semibold">
                    {activeContract.floorPrice ? activeContract.floorPrice.toLocaleString() : '—'} {activeContract.currency}
                  </span>
                </div>
                <div className="pricing-metric-box">
                  <span className="metric-label">Giá gợi ý từ Hệ thống:</span>
                  <span className="metric-val text-blue-700 font-semibold">
                    {activeContract.suggestedTotal ? activeContract.suggestedTotal.toLocaleString() : '—'} {activeContract.currency}
                  </span>
                </div>
                <div className="pricing-metric-box highlight">
                  <span className="metric-label font-semibold">TỔNG GIÁ TRỊ HỢP ĐỒNG:</span>
                  <span className="metric-val text-primary-dark font-bold text-xl">
                    {activeContract.totalAmount.toLocaleString()} {activeContract.currency}
                  </span>
                </div>
              </div>

              {activeContract.isBelowFloor && (
                <div className="floor-warning-box">
                  <div className="text-red-700 font-semibold text-sm mb-1">
                    ⚠️ Cảnh báo: Giá hợp đồng đang thấp hơn Giá sàn ({activeContract.floorPrice ? activeContract.floorPrice.toLocaleString() : '—'} {activeContract.currency})!
                  </div>
                  <label className="form-label text-red-800">
                    Bắt buộc nhập Lý do miễn giảm / Ngoại lệ giá sàn (Price Override Reason):
                  </label>
                  <input
                    type="text"
                    className="text-input border-red-400"
                    placeholder="VD: Khách hàng thân thiết lâu năm, ký gói vận chuyển dài hạn 5 chuyến"
                    value={priceOverrideReason}
                    onChange={(e) => setPriceOverrideReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Deposit & Deadline Configuration */}
            <div className="contract-section">
              <h3 className="section-label mb-3">
                2. Thiết lập Tỷ lệ Đặt cọc &amp; Hạn chót Hoàn tất (Completion Deadline)
              </h3>

              <div className="deposit-config-grid">
                {/* Deposit configuration */}
                <div className="config-card">
                  <label className="form-label font-semibold">
                    Tỷ lệ Đặt cọc yêu cầu (%):
                  </label>
                  <div className="deposit-btn-group">
                    {[30, 40, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        className={`pct-btn ${
                          activeContract.depositPercent === pct ? 'active' : ''
                        }`}
                        disabled={pct !== 40} onClick={() => handleDepositPercentChange(pct)}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 p-3 bg-amber-50 rounded border border-amber-200">
                    <div className="text-xs text-amber-800">
                      Số tiền đặt cọc khách cần thanh toán:
                    </div>
                    <div className="text-xl font-bold font-mono text-amber-900 mt-1">
                      {activeContract.depositAmount.toLocaleString()} {activeContract.currency}
                    </div>
                    <div className="text-xs text-amber-700 mt-0.5">
                      ({activeContract.depositPercent}% tổng giá trị hợp đồng)
                    </div>
                  </div>
                </div>

                {/* Completion Deadline */}
                <div className="config-card">
                  <label className="form-label font-semibold">
                    Hạn ký hợp đồng (giờ Việt Nam):
                  </label>
                  <input
                    type="datetime-local"
                    className="text-input"
                    disabled={persisted} value={activeContract.completionDeadline.slice(0, 16)}
                    onChange={(e) =>
                      setActiveContract({
                        ...activeContract,
                        completionDeadline: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    💡 Hạn này áp dụng cho <strong>Ký hợp đồng bằng mã OTP</strong> và <strong>hạn cọc được chốt riêng sau ký</strong>. Hạn cọc được backend chốt sau ký, không tự hủy đơn.
                  </p>
                </div>
              </div>
            </div>

            {/* Terms & Scope of Work */}
            <div className="contract-section">
              <h3 className="section-label mb-2">3. Điều khoản Hợp đồng &amp; Ghi chú Riêng</h3>
              <div className="form-group">
                <textarea
                  rows={3}
                  className="textarea-input"
                  readOnly value={activeContract.customTerms}
                  onChange={(e) =>
                    setActiveContract({
                      ...activeContract,
                      customTerms: e.target.value,
                    })
                  }
                  placeholder="Nhập điều khoản bổ sung hoặc thỏa thuận riêng..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPdfPreview && (
        <div className="modal-backdrop fade-in" onClick={() => setShowPdfPreview(false)}>
          <div
            className="modal-box modal-medium pdf-preview-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Xem trước Bản thảo Hợp đồng ({activeContract.id})</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowPdfPreview(false)}
              >
                ✕
              </button>
            </div>
            <div className="pdf-mock-page">
              <div className="pdf-header text-center">
                <h3 className="text-lg font-bold text-slate-900 uppercase">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </h3>
                <p className="text-xs text-slate-600">Độc lập - Tự do - Hạnh phúc</p>
                <div className="border-b my-2"></div>
                <h4 className="text-base font-bold text-primary-dark mt-2">
                  HỢP ĐỒNG DỊCH VỤ VẬN CHUYỂN NGỰA ĐUA CHUYÊN DỤNG
                </h4>
                <p className="text-xs text-slate-500">Mã hợp đồng: {activeContract.id} / Version: v{activeContract.version}</p>
              </div>

              <div className="pdf-body text-xs text-slate-700 mt-4 space-y-2">
                <p>
                  <strong>BÊN A (Bên Cung Cấp):</strong> CÔNG TY CỔ PHẦN VẬN CHUYỂN CBN TRANSPORT
                </p>
                <p>
                  <strong>BÊN B (Khách Hàng):</strong> {selectedRequest?.customerName} - Đại diện: {selectedRequest?.contactPerson} ({selectedRequest?.phone})
                </p>
                <p>
                  <strong>LỘ TRÌNH VẬN CHUYỂN:</strong> {selectedRequest?.routeDisplay} ({selectedRequest?.transportMode === 'AIR' ? 'Đường hàng không' : 'Đường bộ'})
                </p>
                <p>
                  <strong>DANH SÁCH NGỰA:</strong> {selectedRequest.horses.map((h) => `${h.name} (${h.breed}, Microchip: ${h.microchipId})`).join('; ')}
                </p>

                <div className="my-2 p-2 bg-slate-50 rounded border">
                  <strong>TỔNG GIÁ TRỊ:</strong> {activeContract.totalAmount.toLocaleString()} {activeContract.currency} | <strong>TIỀN CỌC:</strong> {activeContract.depositAmount.toLocaleString()} {activeContract.currency} ({activeContract.depositPercent}%)
                </div>

                <p>
                  <strong>HẠN CHÓT HOÀN TẤT KÝ &amp; ĐẶT CỌC:</strong> {activeContract.completionDeadline.replace('T', ' ')}
                </p>

                <p className="italic text-slate-500">
                  Điều khoản: {activeContract.customTerms}
                </p>
              </div>

              <div className="pdf-signatures mt-6 flex justify-between text-xs font-semibold text-center">
                <div>
                  <p>ĐẠI DIỆN BÊN B</p>
                  <p className="text-slate-400 font-normal italic mt-8">(Ký qua mã OTP)</p>
                </div>
                <div>
                  <p>ĐẠI DIỆN CBN TRANSPORT</p>
                  <p className="text-blue-700 font-semibold mt-8">Linh Pham (Quản lý Vận hành)</p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPdfPreview(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setShowPdfPreview(false);
                  handleSendToCustomer();
                }}
              >
                Gửi hợp đồng cho khách hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
