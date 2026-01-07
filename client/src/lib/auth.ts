import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  mobileNumber: string;
  fullName: string;
  role: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface UserProfile {
  user: User;
  profile: any;
}

export const authApi = {
  sendOtp: async (data: { mobileNumber: string; role: string }) => {
    const response = await apiRequest('POST', '/api/auth/otp/send', data);
    return response.json();
  },

  register: async (data: { mobileNumber: string; fullName: string; role: string }) => {
    const response = await apiRequest('POST', '/api/auth/register', data);
    return response.json();
  },

  verifyOtp: async (data: { mobileNumber: string; otp: string; password: string; role: string; fullName: string }) => {
    const response = await apiRequest('POST', '/api/auth/otp/verify', data);
    return response.json();
  },

  login: async (data: { mobileNumber: string; password: string }) => {
    const response = await apiRequest('POST', '/api/auth/login', data);
    return response.json();
  },

  sendLoginOtp: async (data: { mobileNumber: string }) => {
    const response = await apiRequest('POST', '/api/auth/login/otp/send', data);
    return response.json();
  },

  loginWithOtp: async (data: { mobileNumber: string; otp: string }) => {
    const response = await apiRequest('POST', '/api/auth/login/otp/verify', data);
    return response.json();
  },

  getProfile: async (): Promise<UserProfile> => {
    const response = await apiRequest('GET', '/api/auth/me');
    return response.json();
  },

  logout: () => {
    sessionStorage.removeItem('auth-token');
    localStorage.removeItem('auth-token'); // Also clear localStorage for backward compatibility
    window.location.href = '/';
  },
};

export const getAuthToken = () => {
  // Check sessionStorage first (per-tab), fallback to localStorage (shared)
  return sessionStorage.getItem('auth-token') || localStorage.getItem('auth-token');
};

export const setAuthToken = (token: string) => {
  // Store in sessionStorage for per-tab isolation, also in localStorage for backward compatibility
  sessionStorage.setItem('auth-token', token);
  localStorage.setItem('auth-token', token);
  // Dispatch custom event to notify auth context
  window.dispatchEvent(new CustomEvent('tokenChanged'));
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export const decodeToken = (token: string): User | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return decoded;
  } catch (error) {
    console.error('❌ Token decode error:', error);
    return null;
  }
};

export const getUserFromToken = (): User | null => {
  const token = getAuthToken();
  if (!token) return null;
  return decodeToken(token);
};
