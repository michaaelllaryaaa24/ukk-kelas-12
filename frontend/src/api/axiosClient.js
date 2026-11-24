import axios from 'axios';

/**
 * Konfigurasi Global Axios Client
 * -------------------------------
 * Menggunakan baseURL `/api` yang otomatis diteruskan oleh Vite Proxy ke `http://127.0.0.1:8000/api`.
 * Menyisipkan Bearer Token Sanctum secara otomatis pada setiap permintaan yang terautentikasi.
 */
const axiosClient = axios.create({
  baseURL: '/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// Interceptor Request: menyematkan token otentikasi dari localStorage jika tersedia
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('taskflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor Response: menangani status 401 (sesi kedaluwarsa / token tidak valid)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint =
        requestUrl.includes('/login') ||
        requestUrl.includes('/register') ||
        requestUrl.includes('/demo-login');

      if (!isAuthEndpoint) {
        localStorage.removeItem('taskflow_token');
        localStorage.removeItem('taskflow_user');
        window.dispatchEvent(new CustomEvent('taskflow:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;

