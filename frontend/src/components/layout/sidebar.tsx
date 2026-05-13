'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/stores/auth';

const NAV_ITEMS = [
  { href: '/map', label: 'Control Tower', icon: '◉', permission: null },
  { href: '/journeys', label: 'Journeys', icon: '⟶', permission: 'journey:read' },
  { href: '/fleet', label: 'Fleet', icon: '▣', permission: 'fleet:read' },
  { href: '/maintenance', label: 'Maintenance', icon: '⚙', permission: 'maintenance:read' },
  { href: '/hse', label: 'HSE', icon: '⚠', permission: 'hse:read' },
  { href: '/passenger', label: 'Passenger', icon: '⯆', permission: 'passenger:read' },
  { href: '/analytics', label: 'Analytics', icon: '◧', permission: 'analytics:read' },
  { href: '/admin', label: 'Admin', icon: '⊞', permission: '*' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <aside className="w-[200px] flex flex-col border-r border-line bg-panel h-screen shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-line">
        <div className="text-ink-0 font-semibold text-sm tracking-wide">FLEETOPS</div>
        <div className="text-ink-3 text-[11px] mt-0.5">AR Technology</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors ${
                isActive
                  ? 'text-primary bg-primary-soft border-r-2 border-primary'
                  : 'text-ink-2 hover:text-ink-1 hover:bg-raised'
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="border-t border-line px-4 py-3">
          <div className="text-ink-1 text-[12px] font-medium truncate">{user.name}</div>
          <div className="text-ink-3 text-[11px] truncate">{user.role}</div>
          <button
            onClick={logout}
            className="mt-2 text-[11px] text-ink-3 hover:text-nogo transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
