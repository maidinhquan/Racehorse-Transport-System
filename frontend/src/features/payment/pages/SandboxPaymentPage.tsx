import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { contractClient } from '../../../shared/api/contractClient'
import { flow6Api } from '../../aftercare/api/flow6Api'
import './SandboxPaymentPage.css'

type Payment = { id: string; amount: number; status: string; responseCode?: string }

async function readResponse(response: Response) {
  const body = await response.json()
  if (!response.ok) throw new Error(body.message || 'Không đọc được giao dịch.')
  return body
}

export default function SandboxPaymentPage() {
  const location = useLocation()
  const isReturn = location.pathname === '/payment/return' || location.pathname.endsWith('/return')
  const [amount, setAmount] = useState('10000')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [payment, setPayment] = useState<Payment | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!isReturn) return

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = Date.now() + 60_000
    async function load() {
      try {
        setChecking(true)
        const params = new URLSearchParams(location.search)
        const vnpTxnRef = params.get('vnp_TxnRef') || ''
        const f6Match = vnpTxnRef.match(/^F6PAYMENT([0-9]+)/)
        const f1Match = vnpTxnRef.match(/^PAYMENT([0-9]+)/)
        const refPaymentId = f6Match ? `PAYMENT_${f6Match[1]}` : f1Match ? `PAYMENT_${f1Match[1]}` : ''
        // Mã trong URL VNPAY trả về là nguồn đúng; mã lưu trong trình duyệt có thể còn sót từ giao dịch/tài khoản trước
        const paymentId = refPaymentId || sessionStorage.getItem('last_deposit_payment_id') || ''

        if (!paymentId) throw new Error('Không tìm thấy phiên thanh toán. Mở lại yêu cầu để kiểm tra trạng thái từ máy chủ.')

        // Chuyển tiếp query callback từ trình duyệt tới endpoint IPN để máy chủ xác thực chữ ký số và cập nhật DB khi test ở localhost
        let ipnConfirmed = false
        if (location.search.includes('vnp_SecureHash')) {
          try {
            const ipnRes = await fetch(`/api/payments/vnpay/ipn${location.search}`)
            if (ipnRes.ok) {
              const ipnBody = await ipnRes.json().catch(() => null)
              if (ipnBody && ['00', '02'].includes(ipnBody.RspCode)) ipnConfirmed = true
            }
          } catch {
            // Đã được xử lý hoặc ghi nhận
          }
        }

        type PaymentDto = { id: string; amount: number; status: string; responseCode?: string }
        const readFlow1 = () => contractClient<PaymentDto>('get', `/customer/payments/${paymentId}`)
        const readFlow6 = async (): Promise<PaymentDto> => {
          const f6 = await flow6Api.getCustomerPayment(paymentId)
          return { id: f6.id, amount: f6.amountVnd, status: f6.status }
        }
        const [first, second] = vnpTxnRef.startsWith('F6PAYMENT') ? [readFlow6, readFlow1] : [readFlow1, readFlow6]
        let dto: PaymentDto
        try {
          dto = await first()
        } catch (firstError) {
          try {
            dto = await second()
          } catch {
            if (ipnConfirmed) {
              const vnpAmount = Number(params.get('vnp_Amount') || 0) / 100
              const vnpCode = params.get('vnp_ResponseCode') || undefined
              dto = { id: paymentId, amount: vnpAmount, status: vnpCode === '00' ? 'SUCCESS' : 'FAILED', responseCode: vnpCode }
            } else {
              // Hiện lỗi của luồng chính thay vì lỗi của luồng dự phòng (thường chỉ là "không tìm thấy")
              throw firstError
            }
          }
        }

        const vnpResponseCode = params.get('vnp_ResponseCode')
        if (vnpResponseCode && !dto.responseCode) {
          dto.responseCode = vnpResponseCode
        }

        const result: Payment = { ...dto, status: ['Paid', 'SUCCESS'].includes(dto.status) ? 'Paid' : ['FAILED', 'REJECTED'].includes(dto.status) ? 'Failed' : 'Pending' }
        if (controller.signal.aborted) return
        setPayment(result)
        setError('')
        if (result.status === 'Pending' && Date.now() < deadline) timer = setTimeout(load, 2000)
        else setChecking(false)
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Không kết nối được API.')
          setChecking(false)
        }
      }
    }
    void load()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [isReturn, location.search])

  async function pay(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = await fetch('/api/payments/vnpay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount) }),
      }).then(readResponse)
      window.location.assign(result.paymentUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết nối được API.')
      setBusy(false)
    }
  }

  return <main className="sandbox-payment">
    <section>
      <span className="sandbox-badge">VNPAY SANDBOX · THỬ NGHIỆM</span>
      <h1>{isReturn ? 'Kết quả thanh toán thử' : 'Thử thanh toán VNPAY'}</h1>
      <p>Giao dịch giả lập bằng VND, không dùng để thanh toán thật.</p>
      {error && <p role="alert" className="sandbox-error">{error}</p>}
      {isReturn ? <>
        {payment && <dl>
          <dt>Mã giao dịch</dt><dd>{payment.id}</dd>
          <dt>Số tiền</dt><dd>{payment.amount.toLocaleString('vi-VN')} VND</dd>
          <dt>Trạng thái xác nhận từ IPN</dt><dd>{payment.status === 'Paid' ? 'Thanh toán thành công' : payment.status === 'Failed' ? 'Thanh toán thất bại / đã hủy' : 'Chờ VNPAY gửi IPN'}</dd>
          <dt>Mã phản hồi VNPAY</dt><dd>{payment.responseCode}</dd>
        </dl>}
        {checking && <p role="status">Đang chờ xác nhận giao dịch…</p>}
        {payment?.status === 'Pending' && !checking && <p>Chưa nhận được IPN. Kiểm tra URL IPN công khai đã đăng ký với VNPAY, rồi tải lại trang.</p>}
        <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {(() => {
            const role = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userRole') : null)
              || (typeof localStorage !== 'undefined' ? localStorage.getItem('userRole') : null) || '';
            const isManager = role.toUpperCase() === 'LOGISTICS_MANAGER';
            const reqId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('last_payment_request_id') : null;

            if (isManager) {
              return (
                <>
                  {reqId ? (
                    <Link to={`/manager/requests/${reqId}/closure`} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>
                      Quay về yêu cầu {reqId} (Tất toán & đóng đơn)
                    </Link>
                  ) : (
                    <Link to="/manager/reports" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>
                      Về Báo cáo chi phí
                    </Link>
                  )}
                  <Link to="/manager/requests" style={{ padding: '8px 16px', background: '#e2e8f0', color: '#1e293b', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>
                    Danh sách yêu cầu
                  </Link>
                </>
              );
            }

            return (
              <>
                {reqId ? (
                  <Link to={`/customer/requests/${reqId}/handover`} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>
                    Quay về yêu cầu {reqId}
                  </Link>
                ) : (
                  <Link to="/customer/requests" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>
                    Quay về danh sách yêu cầu của tôi
                  </Link>
                )}
              </>
            );
          })()}
          <Link to="/payment/sandbox" style={{ padding: '8px 16px', background: '#f1f5f9', color: '#334155', borderRadius: 6, textDecoration: 'none' }}>
            Thử giao dịch khác
          </Link>
        </div>
      </> : <>
        <form onSubmit={pay}>
          <label htmlFor="sandbox-amount">Số tiền thử (VND)</label>
          <input id="sandbox-amount" type="number" min="5000" max="999999999" step="1" required value={amount} onChange={e => setAmount(e.target.value)} />
          <button disabled={busy}>{busy ? 'Đang tạo giao dịch…' : 'Thanh toán qua VNPAY Sandbox'}</button>
        </form>
        <details><summary>Thẻ NCB dùng để thử</summary>
          <p>Số thẻ: 9704198526191432198<br />Chủ thẻ: NGUYEN VAN A<br />Ngày phát hành: 07/15<br />OTP: 123456</p>
        </details>
      </>}
    </section>
  </main>
}
