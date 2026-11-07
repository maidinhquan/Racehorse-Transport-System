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
      // Role hiện tại không khớp quyền trang này -> Chuyển hướng sang trang Login
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
};

export default RequireAuth;

