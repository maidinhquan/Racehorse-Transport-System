import { useEffect, useState } from 'react';
import { apiClient } from './apiClient';

/**
 * Private files (`/api/...`) need the bearer token, which `<img>`/`<iframe>` cannot send.
 * Fetches them through apiClient and returns a temporary object URL; other URLs
 * (blob:, data:, public links) are returned unchanged.
 */
export function useAuthFileUrl(url?: string): string | undefined {
  const isPrivate = !!url && url.startsWith('/api/');
  const [objectUrl, setObjectUrl] = useState<string>();
  useEffect(() => {
    setObjectUrl(undefined);
    if (!url || !isPrivate) return;
    let active = true, created: string | undefined;
    apiClient.get(url.slice(4), { responseType: 'blob' })
      .then(response => { if (active) { created = URL.createObjectURL(response.data); setObjectUrl(created); } })
      .catch(() => { /* Missing or forbidden file: caller shows its placeholder. */ });
    return () => { active = false; if (created) URL.revokeObjectURL(created); };
  }, [url, isPrivate]);
  return isPrivate ? objectUrl : url;
}
