'use client';

import { useAuth } from '@/stores/auth';

export function Header({ title }: { title: string }) {
  const user = useAuth((s) => s.user);

  return (
    <header className="h-11 px-4 flex items-center justify-between border-b border-line bg-panel shrink-0">
      <h1 className="text-ink-0 text-sm font-medium">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-ink-3 text-[12px]">{user?.orgName}</span>
        <div className="w-6 h-6 rounded-full bg-primary-soft flex items-center justify-center text-primary text-[11px] font-medium">
          {user?.name?.charAt(0) ?? '?'}
        </div>
      </div>
    </header>
  );
}
