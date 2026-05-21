'use client';

import { useState, useRef, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

interface GeoResult {
  name: string;
  fullAddress: string;
  lat: number;
  lon: number;
}

interface Props {
  placeholder?: string;
  proximityLon?: number;
  proximityLat?: number;
  onSelect: (result: GeoResult) => void;
  className?: string;
  defaultValue?: string;
}

export function GeocoderInput({
  placeholder = 'Search location…',
  proximityLon,
  proximityLat,
  onSelect,
  className = '',
  defaultValue = '',
}: Props) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: val });
        if (proximityLon != null) params.set('lon', String(proximityLon));
        if (proximityLat != null) params.set('lat', String(proximityLat));

        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/mapbox/geocode?${params}`, { headers });
        if (res.ok) {
          const json = (await res.json()) as { data: GeoResult[] };
          setResults(json.data ?? []);
          setOpen(true);
        }
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
  }

  function handleSelect(r: GeoResult) {
    setQuery(r.fullAddress);
    setResults([]);
    setOpen(false);
    onSelect(r);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full h-9 px-3 bg-bg-2 border border-line rounded-[6px] text-[13px] text-ink-0 placeholder:text-ink-3 focus:outline-none focus:border-[var(--primary)] transition-colors pr-8"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-ink-3 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-panel border border-line rounded-[8px] shadow-lg z-50 overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onMouseDown={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-raised transition-colors border-b border-line last:border-0"
            >
              <div className="text-[13px] text-ink-0 font-medium">{r.name}</div>
              <div className="text-[11px] text-ink-3 mt-0.5 truncate">{r.fullAddress}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
