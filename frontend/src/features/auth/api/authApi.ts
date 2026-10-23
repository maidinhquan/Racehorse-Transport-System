import { apiClient } from "../../../shared/api/apiClient";

import type {
  ApiResponse,
  ChangePasswordRequest,
  CurrentUserData,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginData,
  LoginRequest,
  RegisterRequestOtpData,
  RegisterRequestOtpRequest,
  ResendRegisterOtpData,
  ResendRegisterOtpRequest,
  ResetPasswordRequest,
  VerifyRegisterOtpRequest,
} from "../types/auth.types";

/* =========================
   LOGIN
========================= */

export const login = async (
  request: LoginRequest
): Promise<ApiResponse<LoginData>> => {
  const response =
    await apiClient.post<ApiResponse<LoginData>>(
      "/auth/login",
      request
    );

  return response.data;
};

/* =========================
   GOOGLE LOGIN
========================= */

export const googleLogin = async (
  request: GoogleLoginRequest
): Promise<ApiResponse<LoginData>> => {
  const response =
    await apiClient.post<ApiResponse<LoginData>>(
      "/auth/google-login",
      request
    );

  return response.data;
};

/* =========================
   REGISTER - REQUEST OTP
========================= */

export const requestRegisterOtp = async (
  request: RegisterRequestOtpRequest
): Promise<ApiResponse<RegisterRequestOtpData>> => {
  const response =
    await apiClient.post<
      ApiResponse<RegisterRequestOtpData>
    >(
      "/auth/register/request-otp",
      request
    );

  return response.data;
};

/* =========================
   REGISTER - VERIFY OTP
========================= */

export const verifyRegisterOtp = async (
  request: VerifyRegisterOtpRequest
): Promise<ApiResponse<null>> => {
  const response =
    await apiClient.post<ApiResponse<null>>(
      "/auth/register/verify-otp",
      request
    );

  return response.data;
};

/* =========================
   REGISTER - RESEND OTP
========================= */

export const resendRegisterOtp = async (
  request: ResendRegisterOtpRequest
): Promise<ApiResponse<ResendRegisterOtpData>> => {
  const response =
    await apiClient.post<
      ApiResponse<ResendRegisterOtpData>
    >(
      "/auth/register/resend-otp",
      request
    );

  return response.data;
};

/* =========================
   FORGOT PASSWORD
========================= */

export const forgotPassword = async (
  request: ForgotPasswordRequest
): Promise<ApiResponse<null>> => {
  const response =
    await apiClient.post<ApiResponse<null>>(
      "/auth/forgot-password",
      request
    );

  return response.data;
};

/* =========================
   RESET PASSWORD
========================= */

export const resetPassword = async (
  request: ResetPasswordRequest
): Promise<ApiResponse<null>> => {
  const response =
    await apiClient.post<ApiResponse<null>>(
      "/auth/reset-password",
      request
    );

  return response.data;
};

/* =========================
   CHANGE PASSWORD
========================= */

export const changePassword = async (
  request: ChangePasswordRequest
): Promise<ApiResponse<null>> => {
  const response =
    await apiClient.post<ApiResponse<null>>(
      "/auth/change-password",
      request
    );

  return response.data;
};

/* =========================
   CURRENT USER
========================= */

export const getCurrentUser = async (): Promise<
  ApiResponse<CurrentUserData>
> => {
  const response =
    await apiClient.get<
      ApiResponse<CurrentUserData>
    >("/auth/me");

  return response.data;
};