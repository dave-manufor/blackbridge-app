/**
 * Axios module for managing API calls that require authorization header for authentication.
 * This module includes Axios instance configuration with API base URL, and token-based request/response interceptors.
 * @module API
 */

import { useAuthStore } from "@/stores/authStore";
import axios from "axios";
import { ApiRoutes } from ".";
import { devOnly } from "@/utils/dev";

const API = axios.create({
  timeout: 10000, // 10 seconds.
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

let isRefreshingRef = false;
let failedQueueRef: {
  resolve: (value?: unknown) => void;
  reject: (error: Error | null) => void;
}[] = [];
const processQueue = (error: Error | null) => {
  failedQueueRef.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueueRef = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshingRef) {
        return new Promise((resolve, reject) => {
          failedQueueRef.push({ resolve, reject });
        })
          .then(() => {
            return API(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshingRef = true;

      try {
        devOnly(() => console.log("Refreshing access token..."));
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || ""}${ApiRoutes.auth.refresh}`,
          null,
          {
            withCredentials: true,
          }
        );
        devOnly(() => console.log("Access token refreshed successfully"));
        processQueue(null);
        return API(originalRequest);
      } catch (err) {
        const { signOut } = useAuthStore.getState();
        devOnly(() => console.error("Token refresh failed:", err));
        signOut();
        processQueue(err as Error);
        return Promise.reject(err);
      } finally {
        isRefreshingRef = false;
      }
    }

    return Promise.reject(error);
  }
);

export default API;
