'use client';

import { useState, useRef, useEffect } from 'react';
import { Search } from './icons';

interface ComboboxOption {
  value: string;
  label: string;
  sub?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export function Combobox({ options, value, onChange, placeholder = 'Search...', label, required }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()) || o.sub?.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      {label && <label className="text-ink-2 text-[11px] uppercase tracking-wider font-medium mb-1.5 block">{label}</label>}
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className={`w-full h-10 px-3 bg-surface border border-line rounded-[6px] text-[13px] text-left outline-none transition-colors flex items-center justify-between ${open ? 'border-[var(--primary)]' : ''} ${selected ? 'text-ink-0' : 'text-ink-3'}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-3 shrink-0"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface border border-line rounded-[8px] shadow-lg max-h-[280px] flex flex-col overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-line shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search..."
                className="w-full h-8 pl-8 pr-2.5 bg-[var(--bg-3)] border border-line rounded-[4px] text-ink-0 text-[12px] outline-none focus:border-[var(--primary)]"
                autoFocus
              />
            </div>
          </div>

          {/* Options */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-ink-3 text-[12px]">No results</div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--bg-3)] transition-colors ${opt.value === value ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'text-ink-0'}`}
              >
                <div className="font-medium">{opt.label}</div>
                {opt.sub && <div className="text-ink-2 text-[11px] mt-0.5">{opt.sub}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {required && <input type="text" value={value} onChange={() => {}} required className="sr-only" tabIndex={-1} />}
    </div>
  );
}
