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

export interface CheckEmailAvailabilityResponse {
  isAvailable: boolean;
  existsInSystem: boolean;
  message: string;
}

export async function checkEmailAvailability(email: string): Promise<CheckEmailAvailabilityResponse> {
  const response = await registrationApi.post<ApiResponse<CheckEmailAvailabilityResponse>>(
    "/auth/check-email-availability",
    { email }
  );
  return (
    response.data.data ?? {
      isAvailable: false,
      existsInSystem: false,
      message: response.data.message || "Không thể kiểm tra tính khả dụng của email",
    }
  );
}

export interface ValidateEmailResponse {
  isValid: boolean;
  existsInSystem: boolean;
  message: string;
  deliverability?: string;
  isSmtpValid?: boolean;
}

export async function validateEmailExistence(email: string): Promise<ValidateEmailResponse> {
  const response = await registrationApi.post<ApiResponse<ValidateEmailResponse>>("/auth/validate-email", { email });
  return (
    response.data.data ?? {
      isValid: false,
      existsInSystem: false,
      message: response.data.message || "Không thể kiểm tra email",
    }
  );
}

export function registrationErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    const response = error.response?.data;
    if (response?.errors?.exceptionType || response?.errors?.stackTrace) {
      return "Đã xảy ra lỗi nội bộ từ máy chủ. Vui lòng kiểm tra terminal backend hoặc thử lại sau.";
    }
    const validationErrors = Object.values(response?.errors ?? {}).flat();
    return validationErrors.length ? validationErrors.join(" ") : response?.message || "Không kết nối được máy chủ. Vui lòng thử lại.";
  }
  return error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.";
}
