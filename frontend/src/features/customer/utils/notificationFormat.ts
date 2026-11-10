import type { CustomerNotification } from '../types';

export interface FormattedNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  link: string;
  icon: string;
  tone: 'success' | 'info' | 'warn' | 'alert';
}

/**
 * Chuyển đổi mã định danh, hằng số hoặc văn bản thô từ hệ thống
 * sang tiêu đề và nội dung thông báo tiếng Việt trực quan, thân thiện.
 */
export function formatNotification(n: CustomerNotification): FormattedNotification {
  const rawTitle = (n.title || '').trim();
  const rawBody = (n.body || '').trim();

  let title = rawTitle;
  let body = rawBody;
  let icon = 'bell';
  let tone: 'success' | 'info' | 'warn' | 'alert' = 'info';

  // 1. DELIVERY CONFIRMED / REFUSED (Bàn giao ngựa)
  if (
    rawTitle === 'DELIVERY_CONFIRMED' ||
    rawTitle.includes('DELIVERY_CONFIRMED') ||
    rawBody.includes('DELIVERY_CONFIRMED')
  ) {
    title = 'Xác nhận giao ngựa thành công';
    tone = 'success';
    icon = 'check';
    const match = rawBody.match(/(?:DELIVERY_CONFIRMED:\s*)?(TRIP_\w+|[\w-]+)/i);
    body = match && match[1] && match[1] !== 'DELIVERY_CONFIRMED'
      ? `Chuyến vận chuyển ${match[1]} đã hoàn thành và giao ngựa thành công.`
      : 'Chuyến vận chuyển đã được xác nhận giao ngựa an toàn.';
  } else if (
    rawTitle === 'DELIVERY_REFUSED' ||
    rawTitle.includes('DELIVERY_REFUSED') ||
    rawBody.includes('DELIVERY_REFUSED')
  ) {
    title = 'Từ chối nhận bàn giao';
    tone = 'alert';
    icon = 'alert';
    const match = rawBody.match(/(?:DELIVERY_REFUSED:\s*)?(TRIP_\w+|[\w-]+)/i);
    body = match && match[1] && match[1] !== 'DELIVERY_REFUSED'
      ? `Chuyến vận chuyển ${match[1]} bị từ chối nhận bàn giao.`
      : 'Bàn giao chuyến vận chuyển đã bị từ chối.';
  }

  // 2. CONTRACT SIGNED (Ký hợp đồng)
  else if (/^contract signed$/i.test(rawTitle) || rawTitle === 'CONTRACT_SIGNED') {
    title = 'Hợp đồng đã ký thành công';
    tone = 'success';
    icon = 'file';
    const match = rawBody.match(/Contract\s+([A-Za-z0-9_]+)\s+version\s+(\d+)\s+is effective\./i);
    if (match) {
      body = `Hợp đồng ${match[1]} (phiên bản ${match[2]}) đã được ký và chính thức có hiệu lực.`;
    } else {
      body = 'Hợp đồng vận chuyển của bạn đã được ký thành công.';
    }
  }

  // 3. DEPOSIT VERIFIED (Xác minh cọc)
  else if (
    /^deposit verified$/i.test(rawTitle) ||
    rawTitle === 'DEPOSIT_VERIFIED' ||
    rawTitle === 'Đã xác minh cọc'
  ) {
    title = 'Đã xác minh tiền đặt cọc';
    tone = 'info';
    icon = 'card';
    if (/You may now request the signing OTP/i.test(rawBody) || !body) {
      body = 'Khoản tiền đặt cọc đã được xác minh thành công. Bạn có thể yêu cầu mã OTP để ký hợp đồng.';
    }
  }

  // 4. CONTRACT ISSUED (Phát hành hợp đồng)
  else if (/^contract issued$/i.test(rawTitle) || rawTitle === 'CONTRACT_ISSUED') {
    title = 'Hợp đồng đã được phát hành';
    tone = 'info';
    icon = 'file';
    const match = rawBody.match(/Contract\s+([A-Za-z0-9_]+),\s*version\s+(\d+)\s+is ready\./i);
    if (match) {
      body = `Hợp đồng ${match[1]} (phiên bản ${match[2]}) đã sẵn sàng để kiểm tra và ký.`;
    } else {
      body = 'Quản lý đã hoàn tất và phát hành bản hợp đồng mới cho bạn.';
    }
  }

  // 5. REQUEST REVIEWED / APPROVED / REJECTED / CHANGES REQUESTED
  else if (rawTitle === 'Yêu cầu đã được chấp thuận' || rawTitle === 'REQUEST_APPROVED') {
    title = 'Yêu cầu đã được chấp thuận';
    tone = 'success';
    icon = 'check';
    if (!body || body === 'Quản lý đang chuẩn bị hợp đồng.') {
      body = 'Yêu cầu vận chuyển đã được phê duyệt. Quản lý đang tiến hành chuẩn bị hợp đồng.';
    }
  } else if (rawTitle === 'Yêu cầu cần phản hồi' || rawTitle === 'REQUEST_CHANGES_REQUESTED') {
    title = 'Yêu cầu cần chỉnh sửa bổ sung';
    tone = 'warn';
    icon = 'alert';
  } else if (rawTitle === 'Yêu cầu bị từ chối' || rawTitle === 'REQUEST_REJECTED') {
    title = 'Yêu cầu vận chuyển bị từ chối';
    tone = 'alert';
    icon = 'alert';
  } else if (rawTitle === 'Yêu cầu đã hết hạn' || rawTitle === 'REQUEST_EXPIRED') {
    title = 'Yêu cầu vận chuyển đã hết hạn';
    tone = 'warn';
    icon = 'clock';
  } else if (rawTitle === 'REQUEST_SUBMITTED' || /^request submitted$/i.test(rawTitle)) {
    title = 'Yêu cầu đã được gửi thành công';
    tone = 'info';
    icon = 'file';
    body = 'Yêu cầu vận chuyển đã được tiếp nhận và chuyển đến Quản lý xét duyệt.';
  }

  // 6. CANCELLATION & REFUND
  else if (rawTitle === 'Đã tiếp nhận yêu cầu hủy' || rawTitle === 'CANCELLATION_REQUESTED') {
    title = 'Đã tiếp nhận yêu cầu hủy';
    tone = 'warn';
    icon = 'clock';
    // Xử lý trường hợp người dùng gõ chuỗi ngẫu nhiên khi test
    if (!body || body.length < 5 || /^[a-z0-9\s]{1,15}$/i.test(body)) {
      body = 'Yêu cầu hủy đơn đã được ghi nhận và đang chờ Quản lý xem xét xử lý.';
    }
  } else if (rawTitle === 'Cancellation reviewed' || rawTitle === 'CANCELLATION_DECIDED') {
    title = 'Kết quả duyệt yêu cầu hủy';
    tone = 'info';
    icon = 'file';
  } else if (rawTitle === 'REFUND_COMPLETED' || rawTitle === 'Đã xác minh hoàn cọc') {
    title = 'Đã hoàn tất hoàn tiền cọc';
    tone = 'success';
    icon = 'card';
    body = 'Khoản hoàn tiền cọc đã được xử lý đối soát thành công.';
  }

  // 7. CONTRACT REMINDER & FEEDBACK
  else if (rawTitle === 'CONTRACT_REMINDER' || /^contract reminder$/i.test(rawTitle)) {
    title = 'Nhắc nhở hạn ký hợp đồng';
    tone = 'warn';
    icon = 'bell';
  } else if (rawTitle === 'FEEDBACK_DECIDED' || rawTitle === 'Contract feedback reviewed') {
    title = 'Phản hồi hợp đồng đã được xử lý';
    tone = 'info';
    icon = 'file';
  }

  // 8. TRIP & ASSIGNMENT
  else if (rawTitle === 'TRIP_ASSIGNED' || /^trip assigned$/i.test(rawTitle)) {
    title = 'Chuyến đi đã được phân công';
    tone = 'info';
    icon = 'pin';
    if (/prepare the trip documents/i.test(rawBody)) {
      body = 'Đội ngũ chuyên viên đang chuẩn bị hồ sơ cho chuyến vận chuyển.';
    } else if (/prepare the operational plan/i.test(rawBody)) {
      body = 'Điều phối viên đang chuẩn bị kế hoạch lộ trình vận hành.';
    }
  }

  // 9. INCIDENTS (Sự cố)
  else if (rawTitle === 'INCIDENT_REPORTED' || rawTitle.startsWith('Báo cáo sự cố')) {
    title = rawTitle.startsWith('Báo cáo sự cố') ? rawTitle : 'Báo cáo sự cố khẩn cấp';
    tone = 'alert';
    icon = 'alert';
  } else if (rawTitle === 'INCIDENT_RECOVERY_APPROVED' || rawTitle.startsWith('Phương án xử lý')) {
    title = rawTitle.startsWith('Phương án xử lý') ? rawTitle : 'Phương án khắc phục sự cố đã duyệt';
    tone = 'info';
    icon = 'check';
  } else if (rawTitle === 'INCIDENT_ESCALATED') {
    title = 'Sự cố chuyển cấp Quản lý giải quyết';
    tone = 'alert';
    icon = 'alert';
  }

  // 10. Fallback: Nếu là tên biến dạng SNAKE_CASE (ví dụ ORDER_COMPLETED, TRIP_STARTED)
  else if (/^[A-Z0-9_]{3,}$/.test(rawTitle)) {
    title = rawTitle
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // Chuẩn hóa link điều hướng
  let link = n.link || '';
  if (!link) {
    if (body.includes('TRIP_')) {
      link = '/customer/tracking';
    } else {
      link = '/customer/requests';
    }
  }

  return {
    id: n.id,
    title,
    body,
    at: n.at,
    read: n.read,
    link,
    icon,
    tone,
  };
}
