'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/stores/auth';
import { useLayout } from '@/stores/layout';
import { MapPin, Route, Truck, Wrench, Shield, Users, BarChart, Settings, LogOut, PanelLeftClose, PanelLeftOpen } from '@/components/ui/icons';
import type { ReactNode } from 'react';

const NAV_ITEMS: { href: string; label: string; icon: ReactNode; permission: string | null }[] = [
  { href: '/map', label: 'Control Tower', icon: <MapPin size={16} />, permission: null },
  { href: '/journeys', label: 'Journeys', icon: <Route size={16} />, permission: 'journey:read' },
  { href: '/fleet', label: 'Fleet', icon: <Truck size={16} />, permission: 'fleet:read' },
  { href: '/maintenance', label: 'Maintenance', icon: <Wrench size={16} />, permission: 'maintenance:read' },
  { href: '/hse', label: 'HSE', icon: <Shield size={16} />, permission: 'hse:read' },
  { href: '/passenger', label: 'Passenger', icon: <Users size={16} />, permission: 'passenger:read' },
  { href: '/analytics', label: 'Analytics', icon: <BarChart size={16} />, permission: 'analytics:read' },
  { href: '/admin', label: 'Admin', icon: <Settings size={16} />, permission: '*' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();
  const { sidebarOpen, toggleSidebar } = useLayout();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <aside className={`flex flex-col border-r border-line bg-panel h-screen shrink-0 transition-all duration-200 ${sidebarOpen ? 'w-[200px]' : 'w-[52px]'}`}>
      {/* Logo row */}
      <div className={`border-b border-line flex items-center shrink-0 ${sidebarOpen ? 'px-3 py-3 justify-between' : 'p-2 justify-center'}`}>
        {sidebarOpen && (
          <div>
            <div className="text-ink-0 font-semibold text-sm tracking-wide">FLEETOPS</div>
            <div className="text-ink-3 text-[11px] mt-0.5">AR Technology</div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-raised text-ink-3 hover:text-ink-1 transition-colors shrink-0"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center py-2.5 text-[13px] transition-colors ${sidebarOpen ? 'px-4 gap-2.5' : 'px-0 justify-center'} ${isActive ? 'text-primary bg-primary-soft border-r-2 border-primary' : 'text-ink-2 hover:text-ink-1 hover:bg-raised'}`}
              title={sidebarOpen ? undefined : item.label}
            >
              <span className="w-5 h-5 flex items-center justify-center shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className={`border-t border-line py-3 ${sidebarOpen ? 'px-4' : 'flex flex-col items-center px-1'}`}>
          {sidebarOpen ? (
            <>
              <div className="text-ink-1 text-[12px] font-medium truncate">{user.name}</div>
              <div className="text-ink-3 text-[11px] truncate capitalize">{user.role.replace(/_/g, ' ')}</div>
              <button onClick={logout} className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-nogo transition-colors">
                <LogOut size={12} /> Sign out
              </button>
            </>
          ) : (
            <button onClick={logout} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-raised text-ink-3 hover:text-nogo transition-colors" title="Sign out">
              <LogOut size={16} />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
