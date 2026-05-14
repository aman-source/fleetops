'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/stores/auth';
import { useLayout } from '@/stores/layout';
import { Glyph, Logo } from '@/components/ui/glyph';

const SECTIONS = [
  { label: 'Operate', items: [
    { k: 'map',   href: '/map',        icon: 'map',    t: 'Live fleet map' },
    { k: 'jrny',  href: '/journeys',   icon: 'route',  t: 'Journeys',    perm: 'journey:read' },
    { k: 'pass',  href: '/passenger',  icon: 'users',  t: 'Passengers',  perm: 'passenger:read' },
  ]},
  { label: 'Fleet', items: [
    { k: 'veh',   href: '/fleet',       icon: 'truck',  t: 'Vehicles',    perm: 'fleet:read' },
    { k: 'maint', href: '/maintenance', icon: 'wrench', t: 'Maintenance', perm: 'maintenance:read' },
    { k: 'docs',  href: '/documents',   icon: 'doc',    t: 'Documents',   perm: 'documents:read' },
  ]},
  { label: 'Safety', items: [
    { k: 'hse',   href: '/hse',    icon: 'shield', t: 'HSE console', perm: 'hse:read' },
    { k: 'evnt',  href: '/events', icon: 'alert',  t: 'Events' },
  ]},
  { label: 'Insights', items: [
    { k: 'rpt',   href: '/analytics', icon: 'chart', t: 'Reports',     perm: 'analytics:read' },
    { k: 'admin', href: '/admin',     icon: 'cog',   t: 'Admin',       perm: '*' },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();
  const { sidebarOpen, toggleSidebar } = useLayout();

  return (
    <aside className={`flex flex-col border-r border-line bg-bg-1 h-screen shrink-0 transition-all duration-200 ${sidebarOpen ? 'w-[220px]' : 'w-[52px]'}`}
      style={{ padding: sidebarOpen ? '14px 12px' : '14px 8px', gap: 16 }}>

      {/* Logo row */}
      <div className="flex items-center justify-between" style={{ padding: sidebarOpen ? '4px 8px 8px' : '4px 0 8px' }}>
        {sidebarOpen ? <Logo size={20} /> : (
          <button onClick={toggleSidebar} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-bg-2 text-ink-2 hover:text-ink-0 transition-colors mx-auto">
            <Glyph k="panelR" size={18} stroke={1.4} />
          </button>
        )}
        {sidebarOpen && (
          <button onClick={toggleSidebar} className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-bg-2 text-ink-3 hover:text-ink-0 transition-colors">
            <Glyph k="panelL" size={14} stroke={1.4} />
          </button>
        )}
      </div>

      {/* Search */}
      {sidebarOpen && (
        <div className="flex items-center gap-1.5 bg-bg-2 border border-line rounded-[6px] px-2 py-1.5 cursor-pointer hover:border-[var(--primary)] transition-colors">
          <Glyph k="search" size={13} stroke={1.8} className="text-ink-3" />
          <span className="text-[11.5px] text-ink-3 flex-1">Search fleet, journey&#x2026;</span>
          <span className="font-mono text-[10px] px-1 py-px rounded bg-bg-3 text-ink-3">&#x2318;K</span>
        </div>
      )}

      {/* Nav sections */}
      <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
        {SECTIONS.map(sec => (
          <div key={sec.label} className="flex flex-col gap-0.5">
            {sidebarOpen && (
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium px-2 pb-1">{sec.label}</div>
            )}
            {sec.items.map(it => {
              if (it.perm && !hasPermission(it.perm)) return null;
              const isActive = pathname.startsWith(it.href);
              return (
                <Link key={it.k} href={it.href}
                  className={`flex items-center gap-2.5 rounded-[6px] transition-colors ${sidebarOpen ? 'px-2.5 py-[7px]' : 'px-0 py-2 justify-center'} ${isActive ? 'bg-bg-3 text-ink-0' : 'text-ink-2 hover:bg-bg-2 hover:text-ink-0'}`}
                  title={sidebarOpen ? undefined : it.t}>
                  <Glyph k={it.icon} size={15} stroke={1.6} className="shrink-0" />
                  {sidebarOpen && <span className="flex-1 text-[12.5px]">{it.t}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User card */}
      {user && sidebarOpen && (
        <div className="flex items-center gap-2 p-2 rounded-[6px] bg-bg-2 mt-auto">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold font-mono shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--cyan, #38d4d4), var(--primary))' }}>
            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-ink-0 truncate">{user.name}</div>
            <div className="font-mono text-[10px] text-ink-3 truncate capitalize">{user.role.replace(/_/g, ' ')}</div>
          </div>
          <button onClick={logout} title="Sign out" className="text-ink-3 hover:text-[var(--nogo)] transition-colors">
            <Glyph k="chevD" size={14} />
          </button>
        </div>
      )}
      {user && !sidebarOpen && (
        <button onClick={logout} title="Sign out"
          className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-bg-2 text-ink-3 hover:text-[var(--nogo)] transition-colors mx-auto mt-auto">
          <Glyph k="chevD" size={14} />
        </button>
      )}
    </aside>
  );
}
