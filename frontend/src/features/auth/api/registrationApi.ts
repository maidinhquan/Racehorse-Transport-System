import axios from "axios";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface RegistrationOtpData {
  registrationToken: string;
  expiresIn: number;
  resendAfterSeconds: number;
}

const registrationApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

export async function requestRegistrationOtp(request: {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}): Promise<RegistrationOtpData> {
  const response = await registrationApi.post<ApiResponse<RegistrationOtpData>>("/auth/register/request-otp", request);
  if (!response.data.success || !response.data.data) throw new Error(response.data.message);
  return response.data.data;
}

export async function verifyRegistrationOtp(registrationToken: string, otp: string): Promise<void> {
  const response = await registrationApi.post<ApiResponse<null>>("/auth/register/verify-otp", { registrationToken, otp });
  if (!response.data.success) throw new Error(response.data.message);
}

export async function resendRegistrationOtp(registrationToken: string): Promise<Omit<RegistrationOtpData, "registrationToken">> {
  const response = await registrationApi.post<ApiResponse<Omit<RegistrationOtpData, "registrationToken">>>(
    "/auth/register/resend-otp", { registrationToken });
  if (!response.data.success || !response.data.data) throw new Error(response.data.message);
  return response.data.data;
}

export function registrationErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    const response = error.response?.data;
    const validationErrors = Object.values(response?.errors ?? {}).flat();
    return validationErrors.length ? validationErrors.join(" ") : response?.message || "Không kết nối được máy chủ. Vui lòng thử lại.";
  }
  return error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.";
}
