'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useLayout } from '@/stores/layout';
import { Glyph } from '@/components/ui/glyph';

interface VehicleResult { id: string; plateNo: string; make: string; model: string; status: string; }
interface JourneyResult { id: string; journeyNo: string; purpose: string | null; status: string; }

export function SearchModal() {
  const router = useRouter();
  const { searchOpen, closeSearch } = useLayout();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K global listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useLayout.getState().openSearch();
      }
      if (e.key === 'Escape') closeSearch();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeSearch]);

  // Focus input when modal opens
  useEffect(() => {
    if (searchOpen) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const { data: vehicles } = useQuery({
    queryKey: ['search-vehicles', q],
    queryFn: async () => unwrap<VehicleResult[]>(await api.get(`/vehicles?search=${encodeURIComponent(q)}&limit=5`)),
    enabled: q.length >= 1,
  });

  const { data: journeys } = useQuery({
    queryKey: ['search-journeys', q],
    queryFn: async () => unwrap<JourneyResult[]>(await api.get(`/journeys?search=${encodeURIComponent(q)}&limit=5`)),
    enabled: q.length >= 1,
  });

  if (!searchOpen) return null;

  function go(href: string) {
    closeSearch();
    router.push(href);
  }

  const hasResults = (vehicles?.length ?? 0) > 0 || (journeys?.length ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center pt-[12vh]"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
      onClick={closeSearch}
    >
      <div
        className="w-full max-w-[560px] mx-4 bg-surface border border-line rounded-[12px] shadow-[0_24px_64px_rgba(0,0,0,0.18)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
          <Glyph k="search" size={15} stroke={1.8} className="text-ink-3 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search vehicles, journeys…"
            className="flex-1 bg-transparent text-[14px] text-ink-0 placeholder:text-ink-3 outline-none"
          />
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-bg-3 border border-line text-ink-3">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {q.length === 0 && (
            <div className="px-4 py-6 text-center text-ink-3 text-[12px]">
              Type to search vehicles, plates, journeys…
            </div>
          )}

          {q.length >= 1 && !hasResults && (
            <div className="px-4 py-6 text-center text-ink-3 text-[12px]">No results for "{q}"</div>
          )}

          {(vehicles?.length ?? 0) > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium border-b border-line-soft bg-bg-1">
                Vehicles
              </div>
              {vehicles!.map(v => (
                <button
                  key={v.id}
                  onClick={() => go(`/fleet/${v.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-raised transition-colors text-left border-b border-line-soft"
                >
                  <Glyph k="truck" size={14} stroke={1.5} className="text-ink-3 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[13px] font-semibold text-ink-0">{v.plateNo}</span>
                    <span className="text-[11px] text-ink-3 ml-2">{v.make} {v.model}</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-3 capitalize">{v.status.replace(/_/g, ' ')}</span>
                </button>
              ))}
            </div>
          )}

          {(journeys?.length ?? 0) > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium border-b border-line-soft bg-bg-1">
                Journeys
              </div>
              {journeys!.map(j => (
                <button
                  key={j.id}
                  onClick={() => go(`/journeys/${j.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-raised transition-colors text-left border-b border-line-soft"
                >
                  <Glyph k="route" size={14} stroke={1.5} className="text-ink-3 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[13px] font-semibold text-[var(--primary)]">{j.journeyNo}</span>
                    <span className="text-[11px] text-ink-3 ml-2 truncate">{j.purpose ?? 'Journey'}</span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-3 capitalize">{j.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-line bg-bg-1 text-[10px] text-ink-3 font-mono">
          <span>↵ open</span>
          <span>↑↓ navigate</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>
  );
}
