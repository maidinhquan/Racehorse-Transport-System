export type UserRole =
  | "ADMIN"
  | "CUSTOMER"
  | "LOGISTICS_MANAGER"
  | "TRANSPORT_SPECIALIST"
  | "FLEET_ROUTE_COORDINATOR"
  | "DRIVER_ESCORT";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: Record<string, string[]>;
}

/* =========================
   LOGIN
========================= */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginData {
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
  accessToken: string;
}

/* =========================
   GOOGLE LOGIN
========================= */

export interface GoogleLoginRequest {
  idToken: string;
}

/* =========================
   REGISTER - REQUEST OTP
========================= */

export interface RegisterRequestOtpRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface RegisterRequestOtpData {
  registrationToken: string;
  expiresIn: number;
}

/* =========================
   REGISTER - VERIFY OTP
========================= */

export interface VerifyRegisterOtpRequest {
  registrationToken: string;
  otp: string;
}

/* =========================
   REGISTER - RESEND OTP
========================= */

export interface ResendRegisterOtpRequest {
  registrationToken: string;
}

export interface ResendRegisterOtpData {
  expiresIn: number;
}

/* =========================
   FORGOT PASSWORD
========================= */

export interface ForgotPasswordRequest {
  email: string;
}

/* =========================
   RESET PASSWORD
========================= */

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
  confirmNewPassword: string;
}

/* =========================
   CHANGE PASSWORD
========================= */

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/* =========================
   CURRENT USER
========================= */

export interface CurrentUserData {
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
}