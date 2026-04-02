import { create } from 'zustand';
import apiClient from '../api/client';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoadingAuth: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  getTokenExpiration: () => number | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoadingAuth: true, // Começa carregando
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token, isLoadingAuth: false });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isLoadingAuth: false });
  },
  checkAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ isLoadingAuth: false });
      return;
    }

    try {
      // Verifica o token usando o endpoint de validação
      const response = await apiClient.get('/auth/me');
      set({ user: response.data, isLoadingAuth: false });
    } catch (error) {
      // Se der erro (ex: 401 Token expirado), desloga limpando o estado
      get().logout();
    }
  },
  getTokenExpiration: () => {
    const token = get().token;
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      return payload.exp ? payload.exp * 1000 : null; // em milissegundos
    } catch (e) {
      return null;
    }
  },
}));
