import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "./api/authApi";

// No replacement screen: the existing login page owns authentication UI.
export function RequireCustomer({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem("accessToken");
  const [verified, setVerified] = useState<{ token: string; allowed: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    if (token) getCurrentUser().then(r => { if (active) setVerified({ token, allowed: r.success && r.data?.role === "CUSTOMER" }); })
      .catch(() => { if (active) setVerified({ token, allowed: false }); });
    return () => { active = false; };
  }, [token]);
  if (!token || verified?.token === token && !verified.allowed) return <Navigate to={location.pathname.includes("create-request") || location.pathname.endsWith("/new") ? "/login?next=flow1" : "/login"} replace />;
  return verified?.token === token && verified.allowed ? children : null;
}
