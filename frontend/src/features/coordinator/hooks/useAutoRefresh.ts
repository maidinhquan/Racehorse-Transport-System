import { useEffect } from 'react';
import { commit, modalState } from '../store/coordinatorStore';

/** tự làm mới mỗi 30 giây (vị trí ước tính thay đổi theo thời gian) */
export function useAutoRefresh() {
  useEffect(() => {
    const id = setInterval(() => { if (!modalState.spec) commit(); }, 30000);
    return () => clearInterval(id);
  }, []);
}
