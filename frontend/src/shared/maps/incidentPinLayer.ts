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
.rts-inc-pin{position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center}
.rts-inc-pin.is-draggable{cursor:grab}
.rts-inc-pin.is-draggable:active{cursor:grabbing}
.rts-inc-pin::before{content:"";position:absolute;inset:0;border-radius:50%;background:rgba(220,38,38,.35);animation:rts-inc-pulse 1.6s ease-out infinite}
.rts-inc-pin b{position:relative;width:22px;height:22px;border-radius:50%;background:#dc2626;border:3px solid #fff;color:#fff;font:700 13px/16px sans-serif;text-align:center;box-shadow:0 1px 5px rgba(0,0,0,.45)}
@keyframes rts-inc-pulse{0%{transform:scale(.5);opacity:1}100%{transform:scale(1.2);opacity:0}}
@media (prefers-reduced-motion:reduce){.rts-inc-pin::before{animation:none}}`;
  document.head.appendChild(style);
}

export interface DrawIncidentPinsOptions {
  draggable?: boolean;
  onDrag?: (point: { lat: number; lng: number }) => void;
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
        html: `<div class="rts-inc-pin ${isDraggable ? 'is-draggable' : ''}"><b>!</b></div>`,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
      zIndexOffset: 2000,
      draggable: isDraggable,
    });

    if (isDraggable && options?.onDrag) {
      marker.on('drag', (e: L.LeafletEvent) => {
        const targetMarker = e.target as L.Marker;
        const ll = targetMarker.getLatLng().wrap();
        options.onDrag!({ lat: ll.lat, lng: ll.lng });
      });
      marker.on('dragend', (e: L.LeafletEvent) => {
        const targetMarker = e.target as L.Marker;
        const ll = targetMarker.getLatLng().wrap();
        options.onDrag!({ lat: ll.lat, lng: ll.lng });
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
