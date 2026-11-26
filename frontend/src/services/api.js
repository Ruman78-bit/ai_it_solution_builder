/**
 * Axios instance shared by all API calls.
 * - Adds the admin token when present.
 * - Normalises every error into { message, fieldErrors, status, code } so pages
 *   can show one consistent message and per-field errors.
 */
import axios from 'axios';

export const TOKEN_KEY = 'itsb_admin_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    let body = error.response?.data;

    // Blob responses (PDF downloads) carry JSON errors as blobs.
    if (body instanceof Blob && body.type.includes('json')) {
      try {
        body = JSON.parse(await body.text());
      } catch {
        body = null;
      }
    }

    const apiError = body?.error;
    const normalised = {
      status,
      code: apiError?.code || (error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR'),
      message:
        apiError?.message ||
        (status
          ? 'Something went wrong. Please try again.'
          : 'Cannot reach the server. Check your connection and try again.'),
      fieldErrors: Object.fromEntries((apiError?.details || []).map((d) => [d.field, d.message])),
    };

    if (status === 401 && onUnauthorized && !error.config?.url?.includes('/auth/login')) onUnauthorized();
    return Promise.reject(normalised);
  }
);

export default api;
