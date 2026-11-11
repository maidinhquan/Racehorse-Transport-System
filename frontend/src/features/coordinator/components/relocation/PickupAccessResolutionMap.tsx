import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addGeoapifyTiles } from '../../../../shared/maps/GeoapifyTiles';

interface PickupAccessResolutionMapProps {
  pickupLat: number;
  pickupLng: number;
  pickupName?: string;
  vehicleLat?: number;
  vehicleLng?: number;
  selectedLat?: number;
  selectedLng?: number;
  onSelectLocation?: (lat: number, lng: number, distanceMeters: number) => void;
  height?: string;
}

export const PickupAccessResolutionMap: React.FC<PickupAccessResolutionMapProps> = ({
  pickupLat,
  pickupLng,
  pickupName = 'Điểm lấy ngựa ban đầu',
  vehicleLat,
  vehicleLng,
  selectedLat,
  selectedLng,
  onSelectLocation,
  height = '360px',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const meetingMarkerRef = useRef<L.Marker | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);

  // Helper tính khoảng cách trắc địa bằng Leaflet
  const calcDist = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    return Math.round(L.latLng(lat1, lng1).distanceTo(L.latLng(lat2, lng2)));
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if ((containerRef.current as any)._leaflet_id) {
      delete (containerRef.current as any)._leaflet_id;
    }

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      attributionControl: true,
      zoomAnimation: false,
    }).setView([pickupLat, pickupLng], 15);

    mapRef.current = map;
    addGeoapifyTiles(map, () => {});

    // 1. Vòng tròn bán kính an toàn 500m quanh điểm lấy ngựa
    L.circle([pickupLat, pickupLng], {
      radius: 500,
      color: '#2563eb',
      weight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.12,
      dashArray: '6, 6',
    })
      .addTo(map)
      .bindTooltip('Vùng an toàn dắt bộ (< 500m)', { permanent: false, direction: 'top' });

    // 2. Marker điểm lấy ngựa ban đầu (Trang trại)
    const pickupIcon = L.divIcon({
      className: '',
      html: `
        <div style="background:#dc2626; color:#ffffff; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; border:2px solid #ffffff; box-shadow:0 3px 6px rgba(0,0,0,0.3);">
          TN
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    L.marker([pickupLat, pickupLng], { icon: pickupIcon })
      .addTo(map)
      .bindPopup(`<b>${pickupName}</b><br><small>Tọa độ: ${pickupLat.toFixed(5)}, ${pickupLng.toFixed(5)}</small>`);

    // 3. Marker vị trí xe tải đang dừng (nếu tài xế đã gửi tọa độ)
    if (vehicleLat && vehicleLng && Number.isFinite(vehicleLat) && Number.isFinite(vehicleLng)) {
      const vehicleIcon = L.divIcon({
        className: '',
        html: `
          <div style="background:#475569; color:#ffffff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; border:2px solid #ffffff; box-shadow:0 2px 5px rgba(0,0,0,0.25);">
            XE
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const distVehicle = calcDist(pickupLat, pickupLng, vehicleLat, vehicleLng);
      L.marker([vehicleLat, vehicleLng], { icon: vehicleIcon })
        .addTo(map)
        .bindPopup(`<b>Vị trí xe hiện tại (Tài xế báo cản trở)</b><br><small>Cách trại: ${distVehicle}m</small>`);

      // Đường kẻ nối giữa xe và trang trại
      L.polyline([[pickupLat, pickupLng], [vehicleLat, vehicleLng]], {
        color: '#64748b',
        weight: 2,
        dashArray: '4, 4',
      }).addTo(map);
    }

    // 4. Marker điểm hẹn mới (có thể kéo thả)
    const initMeetingLat = selectedLat ?? (vehicleLat ?? (pickupLat + 0.002));
    const initMeetingLng = selectedLng ?? (vehicleLng ?? (pickupLng + 0.002));
    const initDist = calcDist(pickupLat, pickupLng, initMeetingLat, initMeetingLng);
    setCurrentDistance(initDist);

    const meetingIcon = L.divIcon({
      className: '',
      html: `
        <div style="background:#16a34a; color:#ffffff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; border:2px solid #ffffff; box-shadow:0 4px 8px rgba(0,0,0,0.35); cursor:grab;">
          ĐH
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const meetingMarker = L.marker([initMeetingLat, initMeetingLng], {
      icon: meetingIcon,
      draggable: true,
    }).addTo(map);
    meetingMarkerRef.current = meetingMarker;

    meetingMarker.bindTooltip('Điểm hẹn mới (Kéo để chỉnh)', { direction: 'top', permanent: false });

    let animFrameId: number | null = null;

    // Lắng nghe sự kiện kéo thả marker điểm hẹn với requestAnimationFrame throttle
    meetingMarker.on('drag', () => {
      if (animFrameId) return;
      animFrameId = requestAnimationFrame(() => {
        const pos = meetingMarker.getLatLng();
        const dist = calcDist(pickupLat, pickupLng, pos.lat, pos.lng);
        setCurrentDistance(dist);
        animFrameId = null;
      });
    });

    meetingMarker.on('dragend', () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      const pos = meetingMarker.getLatLng();
      const dist = calcDist(pickupLat, pickupLng, pos.lat, pos.lng);
      setCurrentDistance(dist);
      onSelectLocation?.(pos.lat, pos.lng, dist);
    });

    // Lắng nghe click trên bản đồ để di chuyển điểm hẹn
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      meetingMarker.setLatLng([lat, lng]);
      const dist = calcDist(pickupLat, pickupLng, lat, lng);
      setCurrentDistance(dist);
      onSelectLocation?.(lat, lng, dist);
    });

    // Đảm bảo map zoom vừa vặn các mốc
    const points: [number, number][] = [[pickupLat, pickupLng], [initMeetingLat, initMeetingLng]];
    if (vehicleLat && vehicleLng) points.push([vehicleLat, vehicleLng]);
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.3));

    return () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
      map.remove();
      mapRef.current = null;
    };
  }, [pickupLat, pickupLng, vehicleLat, vehicleLng]);

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Thanh thông báo khoảng cách thực tế trên bản đồ */}
      {currentDistance !== null && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            zIndex: 1000,
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            padding: '8px 14px',
            borderRadius: '6px',
            boxShadow: 'var(--card-shadow)',
            border: '1px solid var(--border-color)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <span>Khoảng cách đến điểm lấy ngựa: </span>
            <b style={{ color: currentDistance <= 500 ? '#16a34a' : '#d97706' }}>
              {currentDistance} m
            </b>
          </div>
          <div>
            {currentDistance <= 500 ? (
              <span style={{ color: '#16a34a', fontWeight: 600 }}>
                Trong bán kính 500m (Khuyến nghị dắt bộ, miễn phí)
              </span>
            ) : (
              <span style={{ color: '#d97706', fontWeight: 600 }}>
                Vượt quá 500m (Khuyến nghị điều xe trung chuyển)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

