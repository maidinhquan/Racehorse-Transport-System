import axios, { type InternalAxiosRequestConfig } from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");

  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Keep transport responses intact; each feature maps backend DTOs explicitly.
import { notifyRateLimited } from '../utils/syncChannel';
apiClient.interceptors.response.use(response => response, error => {
  if (error.response?.status === 429) notifyRateLimited(Number(error.response.headers?.['retry-after']) || 60);
  return Promise.reject(error);
});
