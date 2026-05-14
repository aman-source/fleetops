import { create } from 'zustand';
import { api, unwrap } from '../lib/api';
import { storage } from '../lib/storage';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  permissions: string[];
  orgId: string;
  orgName: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, tokens } = unwrap<{
      user: AuthUser;
      tokens: { accessToken: string; refreshToken: string };
    }>(res);

    storage.set('accessToken', tokens.accessToken);
    storage.set('refreshToken', tokens.refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    const refreshToken = storage.getString('refreshToken');
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    storage.delete('accessToken');
    storage.delete('refreshToken');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    const token = storage.getString('accessToken');
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      const { user } = unwrap<{ user: AuthUser }>(res);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  hasRole: (...roles) => {
    const { user } = get();
    if (!user) return false;
    return roles.includes(user.role);
  },
}));
