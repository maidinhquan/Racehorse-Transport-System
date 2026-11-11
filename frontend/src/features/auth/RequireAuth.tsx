import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { startRealtime, stopRealtime } from '../../shared/utils/realtime';

interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  const role = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');

  useEffect(() => {
    if (!token) return;
    startRealtime();
    // Đăng xuất xóa token trước khi rời trang; chuyển trang trong phiên thì giữ nguyên kết nối
    return () => {
      if (!(sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken'))) stopRealtime();
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!role) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    const normalizedRole = role.toUpperCase();
    const hasRole = allowedRoles.some((r) => r.toUpperCase() === normalizedRole);
    if (!hasRole) {
      // Role hiện tại không khớp quyền trang này -> Chuyển về Dashboard của chính role đó thay vì đá ra login
      switch (normalizedRole) {
        case 'CUSTOMER': return <Navigate to="/customer/home" replace />;
        case 'LOGISTICS_MANAGER': return <Navigate to="/manager/dashboard" replace />;
        case 'FLEET_COORDINATOR': return <Navigate to="/coordinator/dashboard" replace />;
        case 'TRANSPORT_SPECIALIST': return <Navigate to="/specialist/dashboard" replace />;
        case 'DRIVER': return <Navigate to="/driver/journey" replace />;
        case 'ADMIN': return <Navigate to="/admin/dashboard" replace />;
        default: return <Navigate to="/login" state={{ from: location }} replace />;
      }
    }
  }

  return <>{children}</>;
};

export default RequireAuth;

