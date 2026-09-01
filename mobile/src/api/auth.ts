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
  profileImage?: string;
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

  forgotPassword: (payload: {
    email?: string;
    phone?: string;
    channel?: 'email' | 'sms' | 'both';
  }) =>
    api
      .post<{
        success: boolean;
        message: string;
        emailSent?: boolean;
        smsSent?: boolean;
        phoneHint?: string;
      }>('/auth/forgot-password', payload)
      .then(r => r.data),

  resetPassword: (payload: {
    email?: string;
    phone?: string;
    code: string;
    newPassword: string;
  }) =>
    api
      .post<{success: boolean; message: string}>('/auth/reset-password', payload)
      .then(r => r.data),

  changePassword: (currentPassword: string | null, newPassword: string) =>
    api
      .put<{success: boolean; message: string; user?: User}>('/auth/change-password', {
        currentPassword: currentPassword || undefined,
        newPassword,
      })
      .then(r => r.data),
};
