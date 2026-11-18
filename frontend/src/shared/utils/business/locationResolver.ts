// Bộ chuẩn hoá và giải mã vị trí hiện trường / sự cố thành địa danh thân thiện (giống bên khám sức khoẻ)

export function humanizeLocation(
  rawLocation?: string | null,
  coords?: string | [number, number] | null,
  trip?: any
): string {
  const text = String(rawLocation || '').trim();

  // Kiểm tra xem text có phải chỉ là chuỗi toạ độ thô hay không (ví dụ "Tọa độ: 10.9289,108.1021" hoặc "10.9289, 108.1021")
  const isOnlyCoords =
    !text ||
    /^Tọa độ:\s*[-0-9.,\s]+$/i.test(text) ||
    /^[-0-9.,\s]+$/.test(text);

  let extraNote = '';
  if (/^Tọa độ:[^–—-]+[–—\-]\s*(.+)$/i.test(text)) {
    const match = text.match(/^Tọa độ:[^–—-]+[–—\-]\s*(.+)$/i);
    if (match) extraNote = match[1].trim();
  }

  // Nếu text đã là chuỗi mô tả thân thiện (không phải toạ độ trần)
  if (!isOnlyCoords && !extraNote && text.length > 0) {
    return text;
  }

  // Tách toạ độ số
  let lat: number | null = null;
  let lng: number | null = null;
  if (Array.isArray(coords)) {
    lat = Number(coords[0]);
    lng = Number(coords[1]);
  } else if (typeof coords === 'string') {
    const m = coords.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (m) {
      lat = Number(m[1]);
      lng = Number(m[2]);
    }
  }
  if ((lat == null || lng == null) && text) {
    const m = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (m) {
      lat = Number(m[1]);
      lng = Number(m[2]);
    }
  }

  // Nếu có chuyến đi và danh sách điểm dừng, suy luận địa danh thân thiện từ lộ trình
  const rawStops: any[] = trip ? (trip.stops || []) : [];
  if (rawStops.length > 0 && lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    // 1. Kiểm tra xem có trùng hoặc rất gần một trạm dừng không (khoảng dưới ~3km ~ 0.035 độ)
    let closestStop: any = null;
    let closestDist = Infinity;
    rawStops.forEach((s: any) => {
      const sLat = Number(s?.lat), sLng = Number(s?.lng);
      if (Number.isFinite(sLat) && Number.isFinite(sLng)) {
        const d = Math.hypot(lat! - sLat, (lng! - sLng) * Math.cos((lat! * Math.PI) / 180));
        if (d < closestDist) {
          closestDist = d;
          closestStop = s;
        }
      }
    });

    if (closestStop && closestDist < 0.035) {
      const stopName = String(closestStop.name || '')
        .replace(/^[A-Z0-9_-]+\s*•\s*/, '')
        .trim();
      const base = closestDist < 0.008 ? `Tại ${stopName}` : `Gần ${stopName}`;
      return extraNote ? `${base} – ${extraNote}` : base;
    }

    // 2. Tìm chặng nằm giữa hai điểm dừng
    for (let i = 0; i < rawStops.length - 1; i++) {
      const s1 = rawStops[i], s2 = rawStops[i + 1];
      const lat1 = Number(s1?.lat), lng1 = Number(s1?.lng);
      const lat2 = Number(s2?.lat), lng2 = Number(s2?.lng);
      if (Number.isFinite(lat1) && Number.isFinite(lng1) && Number.isFinite(lat2) && Number.isFinite(lng2)) {
        const minLat = Math.min(lat1, lat2) - 0.05, maxLat = Math.max(lat1, lat2) + 0.05;
        const minLng = Math.min(lng1, lng2) - 0.05, maxLng = Math.max(lng1, lng2) + 0.05;
        if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
          const n1 = String(s1?.name || '').replace(/^[A-Z0-9_-]+\s*•\s*/, '').trim();
          const n2 = String(s2?.name || '').replace(/^[A-Z0-9_-]+\s*•\s*/, '').trim();
          const base = `Trên tuyến ${n1} → ${n2}`;
          return extraNote ? `${base} – ${extraNote}` : base;
        }
      }
    }
  }

  if (extraNote) return extraNote;
  if (!isOnlyCoords && text) return text;
  return 'Trên đường vận chuyển';
}

/** Tách nhãn hiển thị huy hiệu theo phong cách bên Khám sức khoẻ */
export function locationBadgeInfo(locationText: string): {
  badgeLabel: string;
  isStop: boolean;
  isOnRoad: boolean;
  cleanText: string;
} {
  const atStop = /^Tại\s+/i.test(locationText);
  const onRoad = /^Trên tuyến\s+/i.test(locationText) || /^Gần\s+/i.test(locationText);
  const badgeLabel = atStop ? 'Tại trạm nghỉ' : onRoad ? 'Trên đường đi' : 'Hiện trường';
  const cleanText = atStop
    ? locationText.replace(/^Tại\s+/i, '')
    : onRoad
    ? locationText.replace(/^Trên tuyến\s+/i, '')
    : locationText;
  return { badgeLabel, isStop: atStop, isOnRoad: onRoad, cleanText };
}
