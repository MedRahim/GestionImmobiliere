import api from './client';
import {User} from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', data).then(r => r.data),

  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data).then(r => r.data),

  getMe: () =>
    api.get<{success: boolean; user: User}>('/auth/me').then(r => r.data),

  updateProfile: (data: Partial<User>) =>
    api
      .put<{success: boolean; user: User}>('/auth/profile', data)
      .then(r => r.data),

  logout: () => api.post('/auth/logout').then(r => r.data),

  loginWithGoogle: (idToken: string) =>
    api.post<AuthResponse>('/auth/google', {idToken}).then(r => r.data),
};
