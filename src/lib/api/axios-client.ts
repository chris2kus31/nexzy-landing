import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// Client-side axios instance
export const apiClient = axios.create({
  baseURL: "/api", // Use Next.js API routes as proxy
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Automatically includes cookies
});

// Response interceptor for client-side error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Redirect to login on client side
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
