// Vẽ ghim "xe đang gặp sự cố" lên bản đồ Leaflet, dùng chung cho Tài xế, Điều phối, Quản lý và Khách hàng.
import L from 'leaflet';
import type { IncidentPin } from '../utils/sharedIncidentPins';

export const INCIDENT_PIN_CSS_ID = 'rts-incident-pin-style';

export function ensureIncidentPinStyle() {
  ensureStyle();
}

function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById(INCIDENT_PIN_CSS_ID)) return;
  const style = document.createElement('style');
  style.id = INCIDENT_PIN_CSS_ID;
  style.textContent = `
.rts-inc-pin {
  position: relative;
  width: 32px;
  height: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  pointer-events: auto;
}
.rts-inc-pin.is-draggable { cursor: grab; }
.rts-inc-pin.is-draggable:active { cursor: grabbing; }
.rts-inc-pin-badge {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #dc2626;
  border: 2.5px solid #ffffff;
  color: #ffffff;
  font: 800 14px/21px system-ui, -apple-system, sans-serif;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.rts-inc-pin-tip {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 7px solid #dc2626;
  margin-top: -2px;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
  z-index: 2;
}
.rts-inc-pin::before {
  content: "";
  position: absolute;
  top: 1px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(220, 38, 38, 0.45);
  animation: rts-inc-pulse 1.6s ease-out infinite;
  z-index: 1;
}
@keyframes rts-inc-pulse {
  0% { transform: scale(0.6); opacity: 1; }
  100% { transform: scale(1.35); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .rts-inc-pin::before { animation: none; }
}`;
  document.head.appendChild(style);
}

export type PolylineCoords = Array<[number, number]> | Array<{ lat: number; lng: number }>;

export interface DrawIncidentPinsOptions {
  draggable?: boolean;
  onDrag?: (point: { lat: number; lng: number }) => void;
  /** Giới hạn vị trí ghim chỉ được trượt trên đường gấp khúc/chặng này (dạng mảng toạ độ hoặc hàm getter) */
  constrainPolyline?: PolylineCoords | (() => PolylineCoords | undefined);
}

/**
 * Chiếu vuông góc một điểm (lat, lng) vào đường gấp khúc (polyline).
 * Điểm trả về luôn nằm chính xác trên một trong các đoạn thẳng của polyline,
 * trong phạm vi từ điểm đầu đến điểm cuối, không bao giờ văng ra ngoài.
 */
export function snapPointToPolyline(
  point: { lat: number; lng: number },
  polyline: Array<[number, number]> | Array<{ lat: number; lng: number }>
): { lat: number; lng: number } {
  if (!polyline || polyline.length === 0) return point;
  if (polyline.length === 1) {
    const p0 = Array.isArray(polyline[0])
      ? { lat: polyline[0][0], lng: polyline[0][1] }
      : polyline[0];
    return { lat: Number(p0.lat.toFixed(6)), lng: Number(p0.lng.toFixed(6)) };
  }

  const pts: Array<{ lat: number; lng: number }> = polyline.map((p) =>
    Array.isArray(p) ? { lat: p[0], lng: p[1] } : p
  );

  let bestDistSq = Infinity;
  let bestPoint = pts[0];

  const midLat = point.lat;
  const rad = Math.PI / 180;
  const cosLat = Math.cos(midLat * rad);

  for (let i = 0; i < pts.length - 1; i++) {
    const pA = pts[i];
    const pB = pts[i + 1];

    const dx = (pB.lng - pA.lng) * cosLat;
    const dy = pB.lat - pA.lat;
    const segLenSq = dx * dx + dy * dy;

    let t = 0;
    if (segLenSq > 1e-12) {
      const px = (point.lng - pA.lng) * cosLat;
      const py = point.lat - pA.lat;
      t = (px * dx + py * dy) / segLenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const projLat = pA.lat + t * (pB.lat - pA.lat);
    const projLng = pA.lng + t * (pB.lng - pA.lng);

    const distDx = (point.lng - projLng) * cosLat;
    const distDy = point.lat - projLat;
    const distSq = distDx * distDx + distDy * distDy;

    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestPoint = { lat: projLat, lng: projLng };
    }
  }

  return {
    lat: Number(bestPoint.lat.toFixed(6)),
    lng: Number(bestPoint.lng.toFixed(6)),
  };
}

/** Thêm các ghim sự cố vào một lớp (hoặc bản đồ). Hỗ trợ kéo trực tiếp trên bản đồ khi draggable=true */
export function drawIncidentPins(
  target: L.LayerGroup | L.Map,
  pins: IncidentPin[],
  options?: DrawIncidentPinsOptions
): void {
  ensureStyle();
  const isDraggable = Boolean(options?.draggable);
  pins.forEach((pin) => {
    const marker = L.marker([pin.lat, pin.lng], {
      icon: L.divIcon({
        html: `
          <div class="rts-inc-pin ${isDraggable ? 'is-draggable' : ''}">
            <div class="rts-inc-pin-badge">!</div>
            <div class="rts-inc-pin-tip"></div>
          </div>
        `,
        className: '',
        iconSize: [32, 40],
        iconAnchor: [16, 38],
      }),
      zIndexOffset: 3000,
      draggable: isDraggable,
    });

    if (isDraggable) {
      const getPoly = () => {
        if (typeof options?.constrainPolyline === 'function') {
          return options.constrainPolyline();
        }
        return options?.constrainPolyline;
      };

      const snap = (raw: L.LatLng) => {
        const poly = getPoly();
        if (poly && poly.length > 0) {
          return snapPointToPolyline(raw, poly);
        }
        return { lat: Number(raw.lat.toFixed(6)), lng: Number(raw.lng.toFixed(6)) };
      };

      marker.on('drag', (e: L.LeafletEvent) => {
        const targetMarker = e.target as L.Marker;
        const ll = targetMarker.getLatLng().wrap();
        const snapped = snap(ll);
        targetMarker.setLatLng([snapped.lat, snapped.lng]);
        options?.onDrag?.(snapped);
      });

      marker.on('dragend', (e: L.LeafletEvent) => {
        const targetMarker = e.target as L.Marker;
        const ll = targetMarker.getLatLng().wrap();
        const snapped = snap(ll);
        targetMarker.setLatLng([snapped.lat, snapped.lng]);
        options?.onDrag?.(snapped);
      });
    }

    const tip = document.createElement('span');
    tip.textContent = isDraggable ? 'Kéo để đổi vị trí sự cố' : `Sự cố: ${pin.label}`;
    marker.bindTooltip(tip, { direction: 'top', offset: [0, -14] });
    const popup = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = `${pin.id} • ${pin.label}`;
    const where = document.createElement('p');
    where.textContent = pin.where;
    const desc = document.createElement('p');
    desc.textContent = pin.description;
    const at = document.createElement('small');
    at.textContent = `${pin.at} • Vị trí tài xế chọn, không phải GPS`;
    popup.append(title, where, desc, at);
    marker.bindPopup(popup);
    marker.addTo(target);
  });
}
