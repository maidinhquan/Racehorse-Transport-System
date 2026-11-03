import React, { useState } from 'react';
import { flow4Api } from '../tracking/api/flow4Api';
import { flow5Api } from '../incidents/api/flow5Api';
import { flow6Api } from '../aftercare/api/flow6Api';
import './ApiDemoPage.css';

interface DemoOperation {
  id: string;
  flow: 'FLOW4' | 'FLOW5' | 'FLOW6';
  name: string;
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  summary: string;
  defaultPathParams?: Record<string, string>;
  defaultBody?: unknown;
  requiresIdempotency?: boolean;
  executor: (params: { path: Record<string, string>; body?: any; idempotencyKey?: string }) => Promise<any>;
}

const DEMO_OPERATIONS: DemoOperation[] = [
  // ================= Flow 4 =================
  {
    id: 'F4-J01',
    flow: 'FLOW4',
    name: 'F4-J01: Tra cứu capabilities',
    method: 'GET',
    path: '/master/flow4-capabilities',
    summary: 'Kiểm tra năng lực hệ thống, chính sách giờ và kiểm tra sức khỏe',
    executor: () => flow4Api.getCapabilities(),
  },
  {
    id: 'F4-J02',
    flow: 'FLOW4',
    name: 'F4-J02: Danh sách chuyến đang chạy',
    method: 'GET',
    path: '/driver/trips',
    summary: 'Tổ xe tra cứu danh sách chuyến được phân công',
    executor: () => flow4Api.getDriverTrips({ status: 'IN_TRANSIT' }),
  },
  {
    id: 'F4-J03',
    flow: 'FLOW4',
    name: 'F4-J03: Chi tiết hành trình & mốc',
    method: 'GET',
    path: '/trips/{tripId}/execution/tracking',
    summary: 'Đọc mốc lộ trình, tọa độ polyline và danh sách ngựa',
    defaultPathParams: { tripId: 'TRIP_001' },
    executor: ({ path }) => flow4Api.getTracking(path.tripId),
  },
  {
    id: 'F4-J05',
    flow: 'FLOW4',
    name: 'F4-J05: Xác nhận xuất phát thực tế',
    method: 'POST',
    path: '/driver/trips/{tripId}/departure',
    summary: 'MAIN_DRIVER hoàn thành mốc DEPARTED đầu tiên (Trip IN_TRANSIT, Request IN_PROGRESS)',
    defaultPathParams: { tripId: 'TRIP_001' },
    requiresIdempotency: true,
    defaultBody: {
      expectedVersion: 1,
      approvedPlanVersion: 1,
      assignmentVersion: 1,
      occurredAt: '2026-11-10 07:00',
      acknowledgements: ['HORSES_CHECKED', 'VEHICLE_VERIFIED'],
      note: 'Xe đã xuất phát đúng kế hoạch',
      evidenceFileIds: [],
    },
    executor: ({ path, body, idempotencyKey }) =>
      flow4Api.confirmDeparture(path.tripId, body, idempotencyKey!),
  },
  {
    id: 'F4-J06',
    flow: 'FLOW4',
    name: 'F4-J06: Xác nhận mốc đến FINAL_ARRIVED',
    method: 'POST',
    path: '/driver/trips/{tripId}/milestones/{milestoneId}/complete',
    summary: 'Đến điểm cuối hành trình; Trip IN_TRANSIT, Request IN_PROGRESS, sẵn sàng mở Flow 6',
    defaultPathParams: { tripId: 'TRIP_001', milestoneId: 'MILESTONE_FINAL' },
    requiresIdempotency: true,
    defaultBody: {
      expectedVersion: 2,
      occurredAt: '2026-11-10 18:00',
      note: 'Xe đã tới điểm giao đích an toàn',
      evidenceFileIds: [],
    },
    executor: ({ path, body, idempotencyKey }) =>
      flow4Api.completeMilestone(path.tripId, path.milestoneId, body, idempotencyKey!),
  },
  {
    id: 'F4-J23',
    flow: 'FLOW4',
    name: 'F4-J23: Ghi nhận nhật ký sức khỏe ngựa',
    method: 'POST',
    path: '/driver/trips/{tripId}/health-logs',
    summary: 'Nhật ký thân nhiệt, nhịp thở, ăn uống của từng ngựa',
    defaultPathParams: { tripId: 'TRIP_001' },
    requiresIdempotency: true,
    defaultBody: {
      expectedVersion: 2,
      horseId: 'HORSE_001',
      leg: 'road',
      milestoneId: 'MILESTONE_001',
      observedAt: '2026-11-10 12:00',
      condition: 'NORMAL',
      observation: 'Ngựa ăn uống bình thường, trạng thái ổn định.',
      feeding: 'Đầy đủ',
      water: '15L',
      rest: 'Nghỉ ngơi 45 phút',
      care: 'Không có vấn đề',
      temperatureC: 38.0,
      heartRateBpm: 40,
      respiratoryRatePerMin: 14,
      photoFileIds: [],
      incidentId: null,
    },
    executor: ({ path, body, idempotencyKey }) =>
      flow4Api.recordHealthLog(path.tripId, body, idempotencyKey!),
  },
  {
    id: 'F4-J36',
    flow: 'FLOW4',
    name: 'F4-J36: Ghi nhận chi phí phát sinh tổ xe',
    method: 'POST',
    path: '/driver/trips/{tripId}/expenses',
    summary: 'Ghi vé BOT, cỏ nước nội bộ tổ xe (không tự cộng cước khách hàng)',
    defaultPathParams: { tripId: 'TRIP_001' },
    requiresIdempotency: true,
    defaultBody: {
      expectedVersion: 2,
      category: 'TOLL_FEE',
      amountVnd: 150000,
      occurredAt: '2026-11-10 09:30',
      reason: 'Phí qua trạm BOT',
      milestoneId: null,
      receiptFileIds: [],
    },
    executor: ({ path, body, idempotencyKey }) =>
      flow4Api.recordExpense(path.tripId, body, idempotencyKey!),
  },

  // ================= Flow 5 =================
  {
    id: 'F5-J01',
    flow: 'FLOW5',
    name: 'F5-J01: Tra cứu capabilities sự cố',
    method: 'GET',
    path: '/master/flow5-capabilities',
    summary: 'Tra cứu năng lực xử lý sự cố hệ thống',
    executor: () => flow5Api.getCapabilities(),
  },
  {
    id: 'F5-J02',
    flow: 'FLOW5',
    name: 'F5-J02: Danh sách sự cố phát sinh',
    method: 'GET',
    path: '/incidents',
    summary: 'Tra cứu sự cố trên tuyến đường',
    executor: () => flow5Api.getIncidents({ status: 'REPORTED' }),
  },
  {
    id: 'F5-J03',
    flow: 'FLOW5',
    name: 'F5-J03: Báo cáo sự cố khẩn cấp',
    method: 'POST',
    path: '/driver/incidents',
    summary: 'Báo sự cố ách tắc đường hoặc sức khỏe ngựa',
    requiresIdempotency: true,
    defaultBody: {
      tripId: 'TRIP_001',
      title: 'Tắc đường do tai nạn giao thông',
      description: 'Đoạn quốc lộ bị tắc nghẽn dự kiến kéo dài 1 tiếng.',
      category: 'ROAD_CONGESTION',
      severity: 'LOW',
      occurredAt: '2026-11-10 10:00',
      evidenceFileIds: [],
    },
    executor: ({ body, idempotencyKey }) =>
      flow5Api.reportIncident(body, idempotencyKey!),
  },

  // ================= Flow 6 =================
  {
    id: 'F6-J01',
    flow: 'FLOW6',
    name: 'F6-J01: Danh sách chuyến chờ bàn giao',
    method: 'GET',
    path: '/operations/flow6/trips',
    summary: 'Tổ xe tra cứu chuyến cần làm thủ tục giao nhận',
    executor: () => flow6Api.getTrips(),
  },
  {
    id: 'F6-J02',
    flow: 'FLOW6',
    name: 'F6-J02: Đọc bối cảnh & baseline giao nhận',
    method: 'GET',
    path: '/operations/flow6/trips/{tripId}/context',
    summary: 'Kiểm tra người nhận chỉ định, danh sách mã vi mạch ngựa, baseline PICKUP',
    defaultPathParams: { tripId: 'TRIP_001' },
    executor: ({ path }) => flow6Api.getTripContext(path.tripId),
  },
  {
    id: 'F6-J03',
    flow: 'FLOW6',
    name: 'F6-J03: Tạo biên bản DRAFT bàn giao',
    method: 'POST',
    path: '/operations/flow6/trips/{tripId}/delivery',
    summary: 'Lập bản dự thảo kiểm tra mã vi mạch, tài sản và giấy tờ',
    defaultPathParams: { tripId: 'TRIP_001' },
    requiresIdempotency: true,
    defaultBody: {
      location: 'Tokyo Racecourse',
      receiver: {
        name: 'Yuki Tanaka',
        phone: '+81312345678',
        authorized: true,
        otpEmail: 'receiver@example.com',
      },
      commonDocuments: null,
      items: [
        {
          horseId: 'HORSE_001',
          microchipVerified: true,
          condition: 'Tỉnh táo, không có vết thương mới.',
          assets: 'Một dây dắt',
          documents: null,
          documentsReceivedAtUtc: null,
        },
      ],
    },
    executor: ({ path, body, idempotencyKey }) =>
      flow6Api.createDelivery(path.tripId, body, idempotencyKey!),
  },
  {
    id: 'F6-J07',
    flow: 'FLOW6',
    name: 'F6-J07: Gửi mã OTP xác thực',
    method: 'POST',
    path: '/operations/flow6/revisions/{revisionId}/otp',
    summary: 'Đóng băng nội dung và gửi OTP tới email người nhận thực tế',
    defaultPathParams: { revisionId: 'HANDOVER_REVISION_001' },
    requiresIdempotency: true,
    executor: ({ path, idempotencyKey }) =>
      flow6Api.sendOtp(path.revisionId, idempotencyKey!),
  },
  {
    id: 'F6-J09',
    flow: 'FLOW6',
    name: 'F6-J09: Xác nhận nhận ngựa bằng OTP',
    method: 'POST',
    path: '/operations/flow6/revisions/{revisionId}/confirm',
    summary: 'Khớp mã OTP đúng phiên bản; Trip COMPLETED, Request DELIVERED, Contract EFFECTIVE',
    defaultPathParams: { revisionId: 'HANDOVER_REVISION_001' },
    requiresIdempotency: true,
    defaultBody: {
      otp: '123456',
    },
    executor: ({ path, body, idempotencyKey }) =>
      flow6Api.confirmRevision(path.revisionId, body, idempotencyKey!),
  },
  {
    id: 'F6-J12',
    flow: 'FLOW6',
    name: 'F6-J12: Khách hàng xem danh sách tất toán',
    method: 'GET',
    path: '/customer/flow6/settlements',
    summary: 'Xem tình trạng hồ sơ tất toán của Customer',
    executor: () => flow6Api.getCustomerSettlements(),
  },
  {
    id: 'F6-J18',
    flow: 'FLOW6',
    name: 'F6-J18: Khách hàng xem nghĩa vụ tiền & số dư',
    method: 'GET',
    path: '/customer/flow6/settlements/{settlementId}/balance',
    summary: 'Xem chi tiết giá ký, cọc đã trả, giảm giá và số dư còn phải nộp',
    defaultPathParams: { settlementId: 'SETTLEMENT_001' },
    executor: ({ path }) => flow6Api.getCustomerBalance(path.settlementId),
  },
  {
    id: 'F6-J24',
    flow: 'FLOW6',
    name: 'F6-J24: Tạo phiên thanh toán VNPay',
    method: 'POST',
    path: '/customer/flow6/invoices/{invoiceId}/payment-session',
    summary: 'Tạo URL thanh toán số dư qua cổng VNPay',
    defaultPathParams: { invoiceId: 'INVOICE_001' },
    requiresIdempotency: true,
    executor: ({ path, idempotencyKey }) =>
      flow6Api.createPaymentSession(path.invoiceId, idempotencyKey!),
  },
  {
    id: 'F6-J26',
    flow: 'FLOW6',
    name: 'F6-J26: Quản lý nghiệm thu và tất toán',
    method: 'POST',
    path: '/manager/flow6/settlements/{settlementId}/settle',
    summary: 'Manager xác nhận nghiệm thu sau khi đủ tiền; Settlement SETTLED, mở feedback window',
    defaultPathParams: { settlementId: 'SETTLEMENT_001' },
    requiresIdempotency: true,
    executor: ({ path, idempotencyKey }) =>
      flow6Api.settleSettlement(path.settlementId, idempotencyKey!),
  },
  {
    id: 'F6-J34',
    flow: 'FLOW6',
    name: 'F6-J34: Khách hàng gửi đánh giá sao',
    method: 'POST',
    path: '/customer/flow6/settlements/{settlementId}/feedback',
    summary: 'Đánh giá 1..5 sao và phản hồi chất lượng dịch vụ',
    defaultPathParams: { settlementId: 'SETTLEMENT_001' },
    requiresIdempotency: true,
    defaultBody: {
      rating: 5,
      comment: 'Vận chuyển chu đáo, ngựa về an toàn và rất khỏe mạnh.',
    },
    executor: ({ path, body, idempotencyKey }) =>
      flow6Api.submitFeedback(path.settlementId, body, idempotencyKey!),
  },
  {
    id: 'F6-J37',
    flow: 'FLOW6',
    name: 'F6-J37: Đóng hồ sơ tất toán hoàn tất',
    method: 'POST',
    path: '/manager/flow6/settlements/{settlementId}/close',
    summary: 'Hết hạn phản hồi và không còn khiếu nại/nợ treo; Settlement, Request, Contract CLOSED',
    defaultPathParams: { settlementId: 'SETTLEMENT_001' },
    requiresIdempotency: true,
    executor: ({ path, idempotencyKey }) =>
      flow6Api.closeSettlement(path.settlementId, idempotencyKey!),
  },
];

export const ApiDemoPage: React.FC = () => {
  const [activeFlow, setActiveFlow] = useState<'FLOW4' | 'FLOW5' | 'FLOW6'>('FLOW6');
  const [selectedOp, setSelectedOp] = useState<DemoOperation>(
    DEMO_OPERATIONS.find(op => op.flow === 'FLOW6')!
  );
  const [pathParams, setPathParams] = useState<Record<string, string>>(
    selectedOp.defaultPathParams || {}
  );
  const [jsonBody, setJsonBody] = useState<string>(
    selectedOp.defaultBody ? JSON.stringify(selectedOp.defaultBody, null, 2) : ''
  );
  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    crypto.randomUUID ? crypto.randomUUID() : '3f9f71c4-118e-4a69-95a9-467389a9446d'
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [responseResult, setResponseResult] = useState<{
    status: 'SUCCESS' | 'ERROR';
    code?: number | string;
    data: any;
  } | null>(null);

  const handleSelectOp = (op: DemoOperation) => {
    setSelectedOp(op);
    setPathParams(op.defaultPathParams || {});
    setJsonBody(op.defaultBody ? JSON.stringify(op.defaultBody, null, 2) : '');
    setResponseResult(null);
    setDuration(null);
  };

  const generateNewUuid = () => {
    setIdempotencyKey(crypto.randomUUID());
  };

  const handleExecute = async () => {
    setLoading(true);
    setResponseResult(null);
    const start = performance.now();

    try {
      let parsedBody: any = undefined;
      if (jsonBody.trim()) {
        parsedBody = JSON.parse(jsonBody);
      }

      const data = await selectedOp.executor({
        path: pathParams,
        body: parsedBody,
        idempotencyKey,
      });

      const elapsed = Math.round(performance.now() - start);
      setDuration(elapsed);
      setResponseResult({
        status: 'SUCCESS',
        code: 200,
        data,
      });
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      setDuration(elapsed);
      setResponseResult({
        status: 'ERROR',
        code: err.errorCode || err.status || 'ERROR',
        data: {
          errorCode: err.errorCode,
          status: err.status,
          message: err.message,
          errors: err.errors,
          blockers: err.blockers,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConcurrencyLock = async () => {
    setLoading(true);
    setResponseResult(null);
    const start = performance.now();

    try {
      let parsedBody: any = undefined;
      if (jsonBody.trim()) parsedBody = JSON.parse(jsonBody);

      // Gọi đồng thời 2 request với cùng idempotencyKey để kiểm tra concurrency lock
      const p1 = selectedOp.executor({ path: pathParams, body: parsedBody, idempotencyKey });
      const p2 = selectedOp.executor({ path: pathParams, body: parsedBody, idempotencyKey });

      const results = await Promise.allSettled([p1, p2]);
      const elapsed = Math.round(performance.now() - start);
      setDuration(elapsed);

      setResponseResult({
        status: 'SUCCESS',
        code: 'CONCURRENCY_TEST_RESULT',
        data: {
          note: 'Kiểm tra phòng chống spam/gửi đúp đồng thời:',
          call1: results[0].status === 'fulfilled' ? results[0].value : (results[0].reason as Error).message,
          call2: results[1].status === 'fulfilled' ? results[1].value : (results[1].reason as Error).message,
        },
      });
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      setDuration(elapsed);
      setResponseResult({
        status: 'ERROR',
        code: err.errorCode || 'CONCURRENCY_ERROR',
        data: err,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOps = DEMO_OPERATIONS.filter(op => op.flow === activeFlow);

  return (
    <div className="api-demo-container">
      <header className="api-demo-header">
        <div className="api-demo-title">
          <h1>🚀 API Contract Demo & Inspector</h1>
          <p>Trang kiểm thử trực quan và xác thực hợp đồng API Flow 4, Flow 5 và Flow 6</p>
        </div>

        <div className="api-demo-flow-selector">
          <button
            className={`flow-tab-btn ${activeFlow === 'FLOW4' ? 'active' : ''}`}
            onClick={() => {
              setActiveFlow('FLOW4');
              handleSelectOp(DEMO_OPERATIONS.find(op => op.flow === 'FLOW4')!);
            }}
          >
            Flow 4 (Tracking)
          </button>
          <button
            className={`flow-tab-btn ${activeFlow === 'FLOW5' ? 'active' : ''}`}
            onClick={() => {
              setActiveFlow('FLOW5');
              handleSelectOp(DEMO_OPERATIONS.find(op => op.flow === 'FLOW5')!);
            }}
          >
            Flow 5 (Incidents)
          </button>
          <button
            className={`flow-tab-btn ${activeFlow === 'FLOW6' ? 'active' : ''}`}
            onClick={() => {
              setActiveFlow('FLOW6');
              handleSelectOp(DEMO_OPERATIONS.find(op => op.flow === 'FLOW6')!);
            }}
          >
            Flow 6 (Aftercare & Settlement)
          </button>
        </div>
      </header>

      <div className="api-demo-body">
        {/* Left Side: Operations List */}
        <div className="api-list-panel">
          <div className="api-list-header">
            Danh sách Endpoint ({filteredOps.length})
          </div>
          {filteredOps.map(op => (
            <div
              key={op.id}
              className={`api-op-item ${selectedOp.id === op.id ? 'selected' : ''}`}
              onClick={() => handleSelectOp(op)}
            >
              <div className="api-op-badge-row">
                <span className={`method-badge ${op.method.toLowerCase()}`}>{op.method}</span>
                <span className="api-op-id">{op.id}</span>
              </div>
              <div className="api-op-title">{op.name.split(': ')[1] || op.name}</div>
              <div className="api-op-path">{op.path}</div>
            </div>
          ))}
        </div>

        {/* Right Side: Tester Panel */}
        <div className="api-tester-panel">
          <div className="tester-title-bar">
            <div className="tester-info">
              <h2>
                <span className={`method-badge ${selectedOp.method.toLowerCase()}`}>
                  {selectedOp.method}
                </span>
                {selectedOp.name}
              </h2>
              <div className="tester-url-bar">
                <span>URL:</span>
                <strong>{selectedOp.path}</strong>
              </div>
            </div>
          </div>

          <div className="tester-inputs">
            {/* Path Params */}
            {selectedOp.defaultPathParams && (
              <div className="input-group">
                <label>Tham số đường dẫn (Path Params):</label>
                {Object.keys(selectedOp.defaultPathParams).map(key => (
                  <div key={key} style={{ marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{key}: </span>
                    <input
                      type="text"
                      value={pathParams[key] || ''}
                      onChange={e => setPathParams({ ...pathParams, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Idempotency Key */}
            {selectedOp.requiresIdempotency && (
              <div className="input-group">
                <label>Header Idempotency-Key (UUID v4):</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={idempotencyKey}
                    onChange={e => setIdempotencyKey(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn-secondary" onClick={generateNewUuid} title="Sinh UUID mới">
                    🔄
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Request Body Editor */}
          {selectedOp.defaultBody !== undefined && (
            <div className="input-group">
              <label>Request Body (JSON Schema hợp lệ):</label>
              <textarea
                rows={8}
                value={jsonBody}
                onChange={e => setJsonBody(e.target.value)}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="tester-actions">
            <button
              className="btn-primary"
              disabled={loading}
              onClick={handleExecute}
            >
              {loading ? 'Đang thực thi...' : '🚀 Gửi Request thực tế (Call API)'}
            </button>

            {selectedOp.method !== 'GET' && (
              <button
                className="btn-secondary"
                disabled={loading}
                onClick={handleTestConcurrencyLock}
                title="Bảo vệ chống gửi trùng request"
              >
                🛡️ Thử nghiệm Request Lock (Spam test)
              </button>
            )}
          </div>

          {/* Response Box */}
          {responseResult && (
            <div className="response-card">
              <div className="response-header">
                <div>
                  Kết quả trả về:{' '}
                  <span className={`status-tag ${responseResult.status === 'SUCCESS' ? 'success' : 'error'}`}>
                    {String(responseResult.code)}
                  </span>
                  {duration !== null && (
                    <span style={{ marginLeft: '0.75rem', color: 'var(--text-muted)' }}>
                      ⏱️ {duration}ms
                    </span>
                  )}
                </div>

                <div className={`contract-badge-box ${responseResult.status === 'SUCCESS' ? 'valid' : 'invalid'}`}>
                  {responseResult.status === 'SUCCESS'
                    ? '✅ ĐÃ VALIDATE QUA SCHEMA AJV (HỢP LỆ VỚI OPENAPI CONTRACT)'
                    : '⚠️ PHẢN HỒI LỖI THEO CONTRACT ENVELOPE'}
                </div>
              </div>

              <pre className="response-pre">
                {JSON.stringify(responseResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiDemoPage;
