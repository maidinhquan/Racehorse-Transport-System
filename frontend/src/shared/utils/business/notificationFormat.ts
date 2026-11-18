export interface GenericNotification {
  id: string;
  title?: string | null;
  body?: string | null;
  text?: string | null;
  at?: string | null;
  read?: boolean;
  link?: string | null;
}

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
 * Chuyển đổi mã định danh, hằng số SCREAMING_SNAKE_CASE hoặc văn bản tiếng Anh thô
 * sang tiêu đề và nội dung thông báo tiếng Việt trực quan, tự nhiên, thân thiện.
 */
export function formatNotification(n: GenericNotification): FormattedNotification {
  const rawTitle = (n.title || '').trim();
  const rawBody = (n.body ?? n.text ?? '').trim();

  let title = rawTitle;
  let body = rawBody;
  let icon = 'bell';
  let tone: 'success' | 'info' | 'warn' | 'alert' = 'info';

  // 1. DELIVERY CONFIRMED (Bàn giao ngựa thành công)
  if (
    rawTitle === 'DELIVERY_CONFIRMED' ||
    rawTitle.toLowerCase().includes('delivery_confirmed') ||
    rawBody.toUpperCase().includes('DELIVERY_CONFIRMED') ||
    rawTitle === 'Xác nhận giao ngựa thành công' ||
    rawTitle === 'Giao ngựa thành công'
  ) {
    title = 'Giao ngựa thành công';
    tone = 'success';
    icon = 'check';
    const match = rawBody.match(/TRIP_[A-Za-z0-9_]+/i) || rawBody.match(/(?:DELIVERY_CONFIRMED:\s*)([^\s]+)/i);
    const tripId = match ? (match[1] || match[0]) : '';
    body = tripId && !tripId.toUpperCase().includes('DELIVERY')
      ? `Chuyến vận chuyển ${tripId} đã hoàn thành và giao ngựa an toàn.`
      : 'Chuyến vận chuyển đã hoàn tất và giao ngựa an toàn.';
  }

  // 2. DELIVERY REFUSED (Từ chối nhận bàn giao)
  else if (
    rawTitle === 'DELIVERY_REFUSED' ||
    rawTitle.toLowerCase().includes('delivery_refused') ||
    rawBody.toUpperCase().includes('DELIVERY_REFUSED') ||
    rawTitle === 'Từ chối nhận bàn giao'
  ) {
    title = 'Từ chối nhận bàn giao';
    tone = 'alert';
    icon = 'alert';
    const match = rawBody.match(/TRIP_[A-Za-z0-9_]+/i) || rawBody.match(/(?:DELIVERY_REFUSED:\s*)([^\s]+)/i);
    const tripId = match ? (match[1] || match[0]) : '';
    body = tripId && !tripId.toUpperCase().includes('DELIVERY')
      ? `Chuyến vận chuyển ${tripId} bị từ chối nhận bàn giao.`
      : 'Bàn giao chuyến vận chuyển đã bị từ chối.';
  }

  // 3. REQUEST PENDING REVIEW (Yêu cầu mới chờ xét duyệt)
  else if (
    rawTitle === 'Request pending review' ||
    rawTitle === 'REQUEST_PENDING_REVIEW' ||
    rawTitle === 'Yêu cầu mới chờ xét duyệt' ||
    rawTitle.toLowerCase().includes('pending review') ||
    /ready for review/i.test(rawBody)
  ) {
    title = 'Yêu cầu mới chờ xét duyệt';
    tone = 'warn';
    icon = 'inbox';
    const match = rawBody.match(/REQUEST_[A-Za-z0-9_]+/i) || rawBody.match(/Request\s+([A-Za-z0-9_]+)\s+is ready for review/i);
    const reqId = match ? (match[1] || match[0]) : '';
    body = reqId
      ? `Yêu cầu ${reqId} đã sẵn sàng để xét duyệt phương án & hợp đồng.`
      : 'Có yêu cầu vận chuyển mới đang chờ bạn xét duyệt.';
  }

  // 4. CONTRACT SIGNED (Ký hợp đồng)
  else if (
    rawTitle === 'CONTRACT_SIGNED' ||
    /^contract signed$/i.test(rawTitle) ||
    rawTitle.includes('Hợp đồng đã ký')
  ) {
    title = 'Hợp đồng đã ký thành công';
    tone = 'success';
    icon = 'file';
    const match = rawBody.match(/Contract\s+([A-Za-z0-9_]+)(?:\s+version\s+(\d+))?/i);
    if (match && match[1]) {
      body = `Hợp đồng ${match[1]}${match[2] ? ` (bản v${match[2]})` : ''} đã được ký và chính thức có hiệu lực.`;
    } else if (!body || /is effective/i.test(body)) {
      body = 'Hợp đồng vận chuyển đã được ký và chính thức có hiệu lực.';
    }
  }

  // 5. DEPOSIT VERIFIED (Xác minh tiền cọc)
  else if (
    rawTitle === 'DEPOSIT_VERIFIED' ||
    /^deposit verified$/i.test(rawTitle) ||
    rawTitle === 'Đã xác minh cọc' ||
    rawTitle === 'Đã xác minh tiền đặt cọc'
  ) {
    title = 'Đã xác minh tiền đặt cọc';
    tone = 'info';
    icon = 'card';
    if (/You may now request the signing OTP/i.test(rawBody) || !body || rawBody === 'Đã xác minh cọc') {
      body = 'Khoản tiền đặt cọc đã được đối soát thành công. Sẵn sàng để ký hợp đồng.';
    }
  }

  // 6. CONTRACT ISSUED (Phát hành hợp đồng)
  else if (/^contract issued$/i.test(rawTitle) || rawTitle === 'CONTRACT_ISSUED' || rawTitle === 'Hợp đồng đã được phát hành') {
    title = 'Hợp đồng đã được phát hành';
    tone = 'info';
    icon = 'file';
    const match = rawBody.match(/Contract\s+([A-Za-z0-9_]+),\s*version\s+(\d+)/i);
    if (match && match[1]) {
      body = `Hợp đồng ${match[1]} (phiên bản ${match[2]}) đã sẵn sàng để kiểm tra và ký.`;
    } else if (!body || /ready/i.test(body)) {
      body = 'Bản hợp đồng vận chuyển mới đã sẵn sàng để kiểm tra và ký.';
    }
  }

  // 7. REQUEST APPROVED / REJECTED / CHANGES REQUESTED
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

  // 8. CANCELLATION & REFUND
  else if (rawTitle === 'Đã tiếp nhận yêu cầu hủy' || rawTitle === 'CANCELLATION_REQUESTED') {
    title = 'Đã tiếp nhận yêu cầu hủy';
    tone = 'warn';
    icon = 'clock';
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

  // 9. CONTRACT REMINDER & FEEDBACK
  else if (rawTitle === 'CONTRACT_REMINDER' || /^contract reminder$/i.test(rawTitle) || /^complete your contract$/i.test(rawTitle)) {
    title = 'Nhắc nhở hạn ký hợp đồng';
    tone = 'warn';
    icon = 'bell';
    if (!body || /review your current contract/i.test(body)) {
      body = 'Vui lòng kiểm tra hợp đồng, thanh toán tiền cọc và ký trước thời hạn quy định.';
    }
  } else if (rawTitle === 'FEEDBACK_DECIDED' || rawTitle === 'Contract feedback reviewed') {
    title = 'Phản hồi hợp đồng đã được xử lý';
    tone = 'info';
    icon = 'file';
  }

  // 10. TRIP ASSIGNED / ROUTE
  else if (rawTitle === 'TRIP_ASSIGNED' || /^trip assigned$/i.test(rawTitle) || rawTitle === 'Chuyến đi đã được phân công') {
    title = 'Chuyến đi đã được phân công';
    tone = 'info';
    icon = 'pin';
    if (/prepare the trip documents/i.test(rawBody)) {
      body = 'Chuyên viên vui lòng chuẩn bị hồ sơ cho chuyến vận chuyển.';
    } else if (/prepare the operational plan/i.test(rawBody)) {
      body = 'Điều phối viên vui lòng chuẩn bị kế hoạch lộ trình vận hành.';
    }
  }

  // 11. Generic fallback cleanup for any SCREAMING_SNAKE_CASE
  else if (/^[A-Z0-9_]{3,}$/.test(rawTitle)) {
    title = rawTitle
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // 12. Smart semantic inference for custom Vietnamese titles/content
  const textCombined = `${title} ${body}`.toLowerCase();
  if (tone === 'info' && icon === 'bell') {
    if (textCombined.includes('sự cố') || textCombined.includes('khiếu nại') || textCombined.includes('từ chối') || textCombined.includes('thất bại')) {
      tone = 'alert';
      icon = 'alert';
    } else if (textCombined.includes('chờ duyệt') || textCombined.includes('cần duyệt') || textCombined.includes('chờ quyết định') || textCombined.includes('yêu cầu sửa') || textCombined.includes('quá hạn') || textCombined.includes('cảnh báo')) {
      tone = 'warn';
      icon = textCombined.includes('chuyến') || textCombined.includes('tuyến') ? 'pin' : 'alert';
    } else if (textCombined.includes('thành công') || textCombined.includes('hoàn thành') || textCombined.includes('đã duyệt') || textCombined.includes('đã ký') || textCombined.includes('an toàn')) {
      tone = 'success';
      icon = 'check';
    } else if (textCombined.includes('chuyển khoản') || textCombined.includes('tiền cọc') || textCombined.includes('thanh toán') || textCombined.includes('chi phí')) {
      icon = 'card';
    } else if (textCombined.includes('hợp đồng') || textCombined.includes('hồ sơ') || textCombined.includes('giấy tờ') || textCombined.includes('thẩm định')) {
      icon = 'file';
    } else if (textCombined.includes('chuyến') || textCombined.includes('xe') || textCombined.includes('lộ trình') || textCombined.includes('hành trình')) {
      icon = 'truck';
    }
  }

  return {
    id: n.id,
    title,
    body,
    at: n.at || '',
    read: !!n.read,
    link: n.link || '',
    icon,
    tone,
  };
}
