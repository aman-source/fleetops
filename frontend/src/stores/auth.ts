import { create } from 'zustand';
import { api, unwrap } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  permissions: string[];
  orgId: string;
  orgName: string;
  mfaEnabled: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, tokens } = unwrap<{ user: AuthUser; tokens: { accessToken: string; refreshToken: string } }>(res);

    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);

    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch { /* ignore */ }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    const token = localStorage.getItem('accessToken');
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

  hasPermission: (perm) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions.includes(perm);
  },
}));
