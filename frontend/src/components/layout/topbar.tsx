'use client';

import { useAuth } from '@/stores/auth';
import { Glyph } from '@/components/ui/glyph';
import type { ReactNode } from 'react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function Topbar({ title, subtitle, right }: TopbarProps) {
  const user = useAuth((s) => s.user);

  return (
    <div className="h-[52px] px-5 flex items-center border-b border-line bg-bg-1 shrink-0 gap-4">
      <div className="flex flex-col">
        <span className="text-[14px] font-semibold text-ink-0">{title}</span>
        {subtitle && <span className="font-mono text-[10.5px] text-ink-3">{subtitle}</span>}
      </div>
      <div className="flex-1" />
      {right}
      <div className="flex items-center gap-2 pl-2 border-l border-line">
        <span className="text-ink-3 text-[11px]">{user?.orgName}</span>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-mono font-semibold"
          style={{ background: 'linear-gradient(135deg, var(--cyan, #38d4d4), var(--primary))' }}>
          {user?.name?.charAt(0) ?? '?'}
        </div>
      </div>
    </div>
  );
}
