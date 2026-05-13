'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/stores/auth';
import { connectWs } from '@/lib/ws';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const loadUser = useAuth((s) => s.loadUser);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (isAuthenticated) {
      connectWs();
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
