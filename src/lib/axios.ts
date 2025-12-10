// src/lib/axios.ts
import axios from 'axios';

const { VITE_API_BASE_URL, VITE_API_AUTH_TOKEN } = import.meta.env;

const apiClient = axios.create({
  baseURL: VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (VITE_API_AUTH_TOKEN) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${VITE_API_AUTH_TOKEN}`;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.data ?? error.message);
    } else {
      console.error('Unknown API Error:', error);
    }

    const rejectionError =
      error instanceof Error
        ? error
        : new Error('Unknown API error');

    return Promise.reject(rejectionError);
  },
);

export default apiClient;
