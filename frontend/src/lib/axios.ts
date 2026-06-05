import axios from 'axios';
import { useMusicStore } from '../store/useMusicStore';

const axiosInstance = axios.create({
  baseURL: '',
  withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 429 Rate Limiting
    if (error.response && error.response.status === 429 && !originalRequest._retry429) {
      originalRequest._retry429 = true;
      const retryAfterHeader = error.response.headers['retry-after'];
      const retryAfterSeconds = parseInt(retryAfterHeader || '1', 10);
      const retryDelayMs = retryAfterSeconds * 1000;
      
      console.warn(`Rate limited. Waiting ${retryDelayMs}ms before retrying request: ${originalRequest.url}`);
      
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      return axiosInstance(originalRequest);
    }

    // Handle 401 Unauthorized
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check for direct access_revoked error from body
      if (error.response.data && error.response.data.error === 'access_revoked') {
        useMusicStore.getState().clearStore();
        window.location.href = '/?error=revoked';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((_token) => {
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshResponse = await axios.get('/api/auth/refresh', {
          withCredentials: true
        });
        const { accessToken } = refreshResponse.data;
        
        useMusicStore.getState().setAccessToken(accessToken);
        isRefreshing = false;
        onRefreshed(accessToken);

        return axiosInstance(originalRequest);
      } catch (refreshError: any) {
        isRefreshing = false;
        useMusicStore.getState().clearStore();
        
        const isRevoked = refreshError.response?.data?.error === 'access_revoked';
        const errorType = isRevoked ? 'revoked' : 'session_expired';
        
        // Only hard-redirect if we are not already on the landing page
        // This prevents an infinite reload loop when checking auth on the landing page
        if (window.location.pathname !== '/') {
          window.location.href = `/?error=${errorType}`;
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
