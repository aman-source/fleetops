// Fleetops shared utilities: icons, logo, primitives
// Loaded as global, before any screen module.

const Icon = ({ d, size = 16, stroke = 1.6, fill = 'none', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={d} />
  </svg>
);

// Curated icon set — drawn lean & geometric, no AI slop
const IK = {
  // nav
  map:        "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16",
  route:      "M6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 6h4a4 4 0 0 1 4 4v4a4 4 0 0 0 4 4",
  truck:      "M3 7h11v9H3zm11 3h4l3 3v3h-7zM6 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  user:       "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0",
  users:      "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 20a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 20a6 6 0 0 0-5-5.9",
  shield:     "M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z",
  wrench:     "M14.7 6.3a4 4 0 0 1 5 5L17 14l-7 7-3-3 7-7-1.3-1.3a4 4 0 0 1 2-5.4z",
  chart:      "M4 20V10M10 20V4M16 20v-7M22 20H2",
  bell:       "M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 21a2 2 0 0 0 4 0",
  cog:        "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4l-2-1.2.2-2.3-2.2-.6-1-2-2.2.6L12 5l-1.8 1.5-2.2-.6-1 2-2.2.6.2 2.3L3 12l2 1.2-.2 2.3 2.2.6 1 2 2.2-.6L12 19l1.8-1.5 2.2.6 1-2 2.2-.6-.2-2.3z",
  inbox:      "M3 13h5l2 3h4l2-3h5M3 13l3-8h12l3 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  doc:        "M7 3h7l5 5v13H7zM14 3v5h5",
  search:     "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-5-5",
  plus:       "M12 5v14M5 12h14",
  filter:     "M3 5h18l-7 9v6l-4-2v-4z",
  download:   "M12 4v12m0 0l-4-4m4 4l4-4M4 20h16",
  // status / actions
  check:      "M5 12l5 5 9-11",
  x:          "M6 6l12 12M18 6L6 18",
  alert:      "M12 3l10 18H2zM12 10v5M12 18v.5",
  panic:      "M12 2L2 22h20zM12 9v6M12 18v.5",
  flag:       "M5 3v18M5 4h11l-2 4 2 4H5",
  clock:      "M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 4v4l3 2",
  pin:        "M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12zm0-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  fuel:       "M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16zM4 21h10M14 8h2l2 2v6a2 2 0 0 1-2 2",
  battery:    "M3 8h14v8H3zM17 11h2v2h-2z",
  gauge:      "M4 14a8 8 0 1 1 16 0M12 14l4-4",
  shieldChk:  "M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6zM8 12l3 3 5-5",
  // misc
  arrow:      "M5 12h14M13 6l6 6-6 6",
  arrowL:     "M19 12H5M11 6l-6 6 6 6",
  chevD:      "M6 9l6 6 6-6",
  chevR:      "M9 6l6 6-6 6",
  chevU:      "M6 15l6-6 6 6",
  refresh:    "M21 4v6h-6M3 20v-6h6M20 14a8 8 0 0 1-14 5l-3-3M4 10a8 8 0 0 1 14-5l3 3",
  dots:       "M5 12h.01M12 12h.01M19 12h.01",
  grid:       "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list:       "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  expand:     "M4 14v6h6M20 10V4h-6M14 10l6-6M4 20l6-6",
  car:        "M5 11l2-5h10l2 5M3 11h18v6h-2v2h-3v-2H8v2H5v-2H3zM7 14h.01M17 14h.01",
  package:    "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  qr:         "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14h1M14 20h3v1h-3zM20 20h1",
  nfc:        "M12 4a8 8 0 0 1 8 8 8 8 0 0 1-8 8M12 8a4 4 0 0 1 4 4 4 4 0 0 1-4 4M12 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z",
  sun:        "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
  moon:       "M21 13a9 9 0 0 1-12-12 9 9 0 1 0 12 12z",
  link:       "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 1 0 7 7l1-1",
  eye:        "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  upload:     "M12 20V8m0 0l-4 4m4-4l4 4M4 4h16",
  camera:     "M4 7h3l2-3h6l2 3h3v12H4zM12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  signal:     "M4 14v6M9 10v10M14 6v14M19 2v18",
  phone:      "M5 4h3l2 5-2 1a10 10 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
};

const Glyph = ({ k, size = 16, stroke = 1.6, style }) => (
  <Icon d={IK[k]} size={size} stroke={stroke} style={style} />
);

// Fleetops wordmark — a steering-helm derived rotor + clean type
const Logo = ({ size = 22, light = false }) => (
  <span className="row gap-8" style={{ alignItems: 'center' }}>
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" stroke={light ? '#1a1d22' : '#e6ebf2'} strokeWidth="1.6" />
      <circle cx="16" cy="16" r="3.5" fill="#4a90ff" />
      <path d="M16 3v6M16 23v6M3 16h6M23 16h6M6.7 6.7l4.2 4.2M21.1 21.1l4.2 4.2M6.7 25.3l4.2-4.2M21.1 10.9l4.2-4.2"
        stroke={light ? '#1a1d22' : '#e6ebf2'} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
    <span style={{
      fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: size * 0.7,
      letterSpacing: '-0.01em', color: light ? '#1a1d22' : '#f1f4f8',
    }}>Fleetops</span>
  </span>
);

// Placeholder image — striped neutral block with mono caption
const Placeholder = ({ w = '100%', h = 140, label = 'photo', style = {} }) => (
  <div style={{
    width: w, height: h, borderRadius: 6,
    background: 'repeating-linear-gradient(135deg, #1c2430 0 8px, #181f29 8px 16px)',
    border: '1px solid var(--line)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    ...style,
  }}>{label}</div>
);

// Status helpers
const STATUS = {
  go:        { label: 'GO',          klass: 'go',     dot: '#1ec991' },
  cond:      { label: 'CONDITIONAL', klass: 'cond',   dot: '#f5a524' },
  nogo:      { label: 'NO-GO',       klass: 'nogo',   dot: '#ef4747' },
  active:    { label: 'ACTIVE',      klass: 'info',   dot: '#4a90ff' },
  approved:  { label: 'APPROVED',    klass: 'go',     dot: '#1ec991' },
  pending:   { label: 'PENDING',     klass: 'cond',   dot: '#f5a524' },
  rejected:  { label: 'REJECTED',    klass: 'nogo',   dot: '#ef4747' },
  draft:     { label: 'DRAFT',       klass: 'neutral',dot: '#6b7689' },
  delayed:   { label: 'DELAYED',     klass: 'cond',   dot: '#f5a524' },
  deviated:  { label: 'DEVIATED',    klass: 'nogo',   dot: '#ef4747' },
  closed:    { label: 'CLOSED',      klass: 'neutral',dot: '#6b7689' },
  completed: { label: 'COMPLETED',   klass: 'go',     dot: '#1ec991' },
  emergency: { label: 'EMERGENCY',   klass: 'nogo',   dot: '#ef4747' },
};

const Pill = ({ status, label, mono = true }) => {
  const s = STATUS[status] || { label: label || status.toUpperCase(), klass: 'neutral' };
  return (
    <span className={`pill ${s.klass}`}>
      <span className="dot" />
      {label || s.label}
    </span>
  );
};

// Generic chrome around an artboard
const ArtboardLabel = ({ pre, title, sub }) => (
  <div className="col gap-4" style={{ marginBottom: 12 }}>
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'rgba(60,50,40,0.6)',
    }}>{pre}</div>
    <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(40,30,20,0.85)' }}>{title}</div>
    {sub && <div style={{ fontSize: 12, color: 'rgba(60,50,40,0.55)' }}>{sub}</div>}
  </div>
);

// Sparkline for KPI cards
const Spark = ({ values, color = '#4a90ff', w = 120, h = 32 }) => {
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const areaPts = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polygon points={areaPts} fill={color} fillOpacity="0.12" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// LeafletMap — real basemap via CartoDB tiles (Dark Matter / Voyager)
// Routes, fences, and markers passed as Leaflet primitives so they
// stay anchored to real lat/lng. Map is non-interactive by default
// (it's a design canvas, not a slippy map).
// ─────────────────────────────────────────────────────────────
function LeafletMap({
  center = [19.5, 56.3], zoom = 7,
  theme = 'dark',   // 'dark' | 'light' | 'schematic'
  routes = [], fences = [], markers = [],
  children,
}) {
  const ref = React.useRef(null);
  const mapRef = React.useRef(null);

  React.useEffect(() => {
    if (!ref.current || !window.L || mapRef.current) return;
    if (theme === 'schematic') return; // schematic theme: no tiles, just background
    const map = L.map(ref.current, {
      center, zoom,
      zoomControl: false, attributionControl: false,
      dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
      touchZoom: false, boxZoom: false, keyboard: false,
      zoomAnimation: false, fadeAnimation: false,
    });
    const url = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    L.tileLayer(url, { subdomains: 'abcd', maxZoom: 19, opacity: theme === 'dark' ? 0.85 : 0.92, crossOrigin: true }).addTo(map);
    console.log('[Fleetops] Leaflet map init', { theme, center, zoom, size: ref.current.getBoundingClientRect() });

    // Polylines
    routes.forEach(r => {
      L.polyline(r.coords, {
        color: r.color || '#4a90ff',
        weight: r.weight || 2.5,
        opacity: r.opacity ?? 0.95,
        dashArray: r.dash,
      }).addTo(map);
    });

    // Geofences
    fences.forEach(f => {
      const opts = {
        color: f.color || '#4a90ff', weight: 1.2,
        dashArray: '4 4', fillOpacity: theme === 'light' ? 0.04 : 0.07,
        fillColor: f.color || '#4a90ff',
      };
      if (f.bounds) L.rectangle(f.bounds, opts).addTo(map);
      else if (f.center) L.circle(f.center, { ...opts, radius: f.radius || 5000 }).addTo(map);
    });

    // Markers (each may carry its own html overlay/tooltip)
    markers.forEach(m => {
      const icon = L.divIcon({
        html: m.html,
        className: 'fo-leaflet-marker',
        iconSize: m.size || [12, 12],
        iconAnchor: m.anchor || [6, 6],
      });
      L.marker(m.latlng, { icon, interactive: !!m.interactive, keyboard: false }).addTo(map);
    });

    mapRef.current = map;

    // Tiles can render at 0×0 if init happened before layout settled.
    // Force a recalc once the container is sized, and on any resize.
    const ro = new ResizeObserver(() => {
      try { map.invalidateSize(); } catch(e){}
    });
    ro.observe(ref.current);
    // Backup: poll for a real size up to ~2s in case ResizeObserver doesn't fire
    // (e.g. the element was already at its final dimensions when we mounted).
    let tries = 0;
    const tick = () => {
      if (!mapRef.current) return;
      const r = ref.current?.getBoundingClientRect();
      try { map.invalidateSize(); } catch(e){}
      if (r && r.width > 0 && r.height > 0) return;
      if (++tries < 20) setTimeout(tick, 100);
    };
    requestAnimationFrame(tick);

    return () => { ro.disconnect(); try { map.remove(); } catch(e){} mapRef.current = null; };
  // eslint-disable-next-line
  }, [theme]);

  if (theme === 'schematic') {
    // Pure stylized grid — fallback when user wants no real tiles
    return (
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 70% 50% at 20% 30%, rgba(170,130,80,0.08), transparent 65%),
          radial-gradient(ellipse 60% 40% at 70% 60%, rgba(60,100,140,0.07), transparent 70%),
          repeating-linear-gradient(0deg, transparent 0 49px, rgba(255,255,255,0.025) 49px 50px),
          repeating-linear-gradient(90deg, transparent 0 49px, rgba(255,255,255,0.025) 49px 50px),
          #0a0e14`,
      }}>{children}</div>
    );
  }

  return (
    <>
      <div ref={ref} className={theme === 'light' ? 'light' : ''} style={{
        position: 'absolute', inset: 0,
        background: theme === 'dark' ? '#0c1118' : '#e8e4dd',
      }} />
      {children}
    </>
  );
}

// Helper: build the inline HTML for a vehicle pin marker, optionally with a popup
function vehiclePinHTML({ status = 'active', label, sub, popupSide = 'right', popupBorder }) {
  const pop = label ? `
    <div class="fo-leaflet-pop ${popupBorder || ''}" style="${popupSide === 'left' ? 'left:auto;right:14px;text-align:right;' : ''}">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#f1f4f8;font-weight:600">${label}</div>
      ${sub ? `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#95a0b0;margin-top:1px">${sub}</div>` : ''}
    </div>` : '';
  return `<div style="position:relative"><div class="fo-leaflet-pin ${status}"></div>${pop}</div>`;
}

function siteLabelHTML(name) {
  return `<div style="position:relative;display:flex;align-items:center;gap:6px"><div class="fo-leaflet-pin site"></div><div class="fo-leaflet-label">${name}</div></div>`;
}

// Shared tweaks context (default = ops mood, dark map)
const FleetopsTweakCtx = React.createContext({ mood: 'industrial', palette: 'cool', mapStyle: 'dark' });
const useFleetopsTweaks = () => React.useContext(FleetopsTweakCtx);

Object.assign(window, { Icon, IK, Glyph, Logo, Placeholder, STATUS, Pill, ArtboardLabel, Spark, LeafletMap, vehiclePinHTML, siteLabelHTML, FleetopsTweakCtx, useFleetopsTweaks });
