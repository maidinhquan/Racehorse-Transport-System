import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  const role = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');

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

