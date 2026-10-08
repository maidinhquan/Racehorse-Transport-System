import axios from "axios";

import type {
  GoogleLoginRequest,
  GoogleLoginResponse,
} from "../types/auth.types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const googleLogin = async (
  request: GoogleLoginRequest
): Promise<GoogleLoginResponse> => {
  const response =
    await api.post<GoogleLoginResponse>(
      "/auth/google-login",
      request
    );

  return response.data;
};