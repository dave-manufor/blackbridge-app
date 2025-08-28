/**
 * Public API for the application
 * This API is used for all public-facing endpoints.
 * Similar to the private API, but without token refresh interceptor for public routes or might-be-public routes.
 * For might-be-public routes, components handle authentication errors.
 * @module PUBLIC_API
 */

import axios from "axios";

const PUBLIC_API = axios.create({
  timeout: 10000, // 10 seconds.
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
});

export default PUBLIC_API;
