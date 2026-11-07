import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr';
import { apiClient } from '../api/apiClient';
import { receiveServerSync, setRealtimeConnected } from './syncChannel';

const HUB_PATH = '/hubs/notifications';
const EVENT_REQUESTS_UPDATED = 'requests_updated';

const readToken = () => sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken') || '';

/** `VITE_API_URL` có dạng http://host:5129/api hoặc /api; hub nằm cùng gốc với API. */
const hubUrl = () => `${(apiClient.defaults.baseURL ?? '/api').replace(/\/api\/?$/, '')}${HUB_PATH}`;

let connection: HubConnection | null = null;

/**
 * Giữ một kết nối SignalR cho phiên đăng nhập hiện tại. Máy chủ chỉ báo "dữ liệu đã đổi";
 * các store tải lại qua API như khi polling nên quyền truy cập không đổi.
 * Mất kết nối thì polling vẫn chạy bình thường (xem createSyncController).
 */
export function startRealtime(): void {
  if (typeof window === 'undefined' || connection || !readToken()) return;
  const hub = new HubConnectionBuilder()
    .withUrl(hubUrl(), { accessTokenFactory: readToken })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build();
  hub.on(EVENT_REQUESTS_UPDATED, () => receiveServerSync('requests_updated'));
  hub.onreconnecting(() => setRealtimeConnected(false));
  hub.onreconnected(() => { setRealtimeConnected(true); receiveServerSync('requests_updated'); });
  hub.onclose(() => setRealtimeConnected(false));
  connection = hub;
  hub.start()
    .then(() => setRealtimeConnected(true))
    .catch(() => setRealtimeConnected(false));
}

export function stopRealtime(): void {
  const hub = connection;
  connection = null;
  setRealtimeConnected(false);
  if (hub && hub.state !== HubConnectionState.Disconnected) void hub.stop();
}
