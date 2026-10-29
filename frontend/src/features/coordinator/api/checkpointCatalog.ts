import { apiClient } from '../../../shared/api/apiClient';
import type { ApiResponse, StopType } from '../types';

export interface GeoPoint { lat: number; lng: number }
export interface CheckpointDto {
    checkpointId: number; name: string; country: string; type: string;
    lat: number | null; lng: number | null; active: boolean;
}
export type LocatedCheckpoint = CheckpointDto & GeoPoint;
export const SEARCH_RADIUS_METERS = 5000; // Ngưỡng demo, cần thống nhất lại nghiệp vụ.

// Sao chép dữ liệu mẫu hiện có trong CoordinatorService, không phải dữ liệu DB.
const DEMO_CATALOG: CheckpointDto[] = [
    { checkpointId: 101, name: 'Sân bay Quốc tế Tân Sơn Nhất (SGN)', country: 'VN', type: 'AIRPORT', lat: 10.8188, lng: 106.6520, active: true },
    { checkpointId: 102, name: 'Cửa khẩu Quốc tế Mộc Bài (Tây Ninh)', country: 'VN', type: 'LAND_BORDER', lat: 11.0650, lng: 106.1720, active: true },
    { checkpointId: 103, name: 'Trạm Kiểm dịch Thú y Vùng VI (HCMC)', country: 'VN', type: 'QUARANTINE_STATION', lat: 10.8231, lng: 106.6297, active: true },
    { checkpointId: 104, name: 'Trạm dừng chân Suối Cát (Đồng Nai)', country: 'VN', type: 'REST_STOP', lat: 10.9574, lng: 107.1234, active: true },
    { checkpointId: 201, name: 'Sân bay Quốc tế Narita (NRT)', country: 'JP', type: 'AIRPORT', lat: 35.7720, lng: 140.3929, active: true },
    { checkpointId: 202, name: 'Sân bay Quốc tế Haneda (HND)', country: 'JP', type: 'AIRPORT', lat: 35.5494, lng: 139.7798, active: true },
    { checkpointId: 203, name: 'Trạm Kiểm dịch Động vật Narita (AQS)', country: 'JP', type: 'QUARANTINE_STATION', lat: 35.7750, lng: 140.3950, active: true },
    { checkpointId: 204, name: 'Trạm tiếp nhận Fuchu Racecourse (Tokyo)', country: 'JP', type: 'DESTINATION', lat: 35.6631, lng: 139.4828, active: true },
];

export function isGeoPoint(point: { lat?: number | null; lng?: number | null }): point is GeoPoint {
    return typeof point.lat === 'number' && Number.isFinite(point.lat) && Math.abs(point.lat) <= 90
        && typeof point.lng === 'number' && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180;
}

export async function loadCheckpointCatalog(): Promise<{ source: 'demo' | 'api'; items: CheckpointDto[] }> {
    if (import.meta.env.VITE_COORDINATOR_DEMO === 'true') {
        return { source: 'demo', items: DEMO_CATALOG.map(item => ({ ...item })) };
    }
    try {
        const response = await apiClient.get<ApiResponse<CheckpointDto[]>>('/coordinator/checkpoints');
        if (response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
            return { source: 'api', items: response.data.data };
        }
    } catch {
        // Fallback to DEMO_CATALOG if backend endpoint is unreachable or not yet populated
    }
    return { source: 'demo', items: DEMO_CATALOG.map(item => ({ ...item })) };
}

// Khoảng cách địa lý để gợi ý, không phải khoảng cách lái xe.
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
    const radians = (degrees: number) => degrees * Math.PI / 180;
    const dLat = radians(b.lat - a.lat), dLng = radians(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function nearbyCheckpoints(items: CheckpointDto[], point: GeoPoint, country: string, type: StopType) {
    if (!isGeoPoint(point)) return [];
    const apiType = type === 'CHECKPOINT' ? 'LAND_BORDER' : type;
    return items
        .filter((item): item is LocatedCheckpoint => item.active && isGeoPoint(item)
            && item.country.toUpperCase() === country.toUpperCase() && item.type.toUpperCase() === apiType)
        .map(item => ({ item, distance: distanceMeters(point, item) }))
        .filter(result => result.distance <= SEARCH_RADIUS_METERS)
        .sort((a, b) => a.distance - b.distance).slice(0, 3);
}
