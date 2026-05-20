// Control Tower — Dispatcher / Journey Manager desktop screens
// Three artboards: Live Fleet Map, Journey Composer (Go/No-Go), Active Journey detail

// ─────────────────────────────────────────────────────────────
// Shared chrome — sidebar + topbar
// ─────────────────────────────────────────────────────────────
function CTSidebar({ active = 'map' }) {
  const sections = [
    { label: 'Operate', items: [
      { k: 'map',     i: 'map',    t: 'Live fleet map' },
      { k: 'journeys',i: 'route',  t: 'Journeys',     badge: 47 },
      { k: 'jobs',    i: 'flag',   t: 'Job plans' },
      { k: 'pass',    i: 'users',  t: 'Passengers',   badge: 12 },
    ]},
    { label: 'Fleet', items: [
      { k: 'veh',     i: 'truck',  t: 'Vehicles' },
      { k: 'drv',     i: 'user',   t: 'Drivers' },
      { k: 'maint',   i: 'wrench', t: 'Maintenance',  badge: 8 },
      { k: 'docs',    i: 'doc',    t: 'Documents' },
    ]},
    { label: 'Safety', items: [
      { k: 'hse',     i: 'shield', t: 'HSE console' },
      { k: 'events',  i: 'alert',  t: 'Events',       badge: 3 },
    ]},
    { label: 'Insights', items: [
      { k: 'reports', i: 'chart',  t: 'Reports' },
      { k: 'admin',   i: 'cog',    t: 'Admin' },
    ]},
  ];
  return (
    <div className="col" style={{
      width: 220, background: 'var(--bg-1)', borderRight: '1px solid var(--line)',
      flexShrink: 0, padding: '14px 12px', gap: 16,
    }}>
      <div style={{ padding: '4px 8px 8px' }}><Logo size={20} /></div>
      <div className="col gap-4">
        <div className="row" style={{
          background: 'var(--bg-2)', border: '1px solid var(--line)',
          borderRadius: 6, padding: '6px 8px', gap: 6,
        }}>
          <Glyph k="search" size={13} stroke={1.8} style={{ color: 'var(--ink-3)' }} />
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Search fleet, journey…</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10,
            padding: '1px 5px', borderRadius: 3, background: 'var(--bg-3)', color: 'var(--ink-3)' }}>⌘K</span>
        </div>
      </div>
      {sections.map(sec => (
        <div className="col gap-2" key={sec.label}>
          <div className="label" style={{ padding: '0 8px 4px' }}>{sec.label}</div>
          {sec.items.map(it => (
            <div key={it.k} className={`nav-item ${active === it.k ? 'active' : ''}`}>
              <Glyph k={it.i} size={15} stroke={1.6} style={{ color: 'var(--ink-2)' }} />
              <span className="grow">{it.t}</span>
              {it.badge && <span style={{
                fontSize: 10, fontFamily: 'var(--font-mono)',
                padding: '1px 6px', borderRadius: 100,
                background: 'var(--bg-3)', color: 'var(--ink-2)',
              }}>{it.badge}</span>}
            </div>
          ))}
        </div>
      ))}
      <div style={{ marginTop: 'auto' }}>
        <div className="row gap-8" style={{
          padding: 8, borderRadius: 6, background: 'var(--bg-2)',
        }}>
          <div className="avatar" style={{
            background: 'linear-gradient(135deg, #38d4d4, #4a90ff)',
          }}>YS</div>
          <div className="col" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-1)' }}>Yusuf Said</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Journey Mgr · Marmul</div>
          </div>
          <Glyph k="chevD" size={14} style={{ color: 'var(--ink-3)' }} />
        </div>
      </div>
    </div>
  );
}

function CTTopbar({ title, sub, right }) {
  return (
    <div className="row" style={{
      height: 52, padding: '0 20px', borderBottom: '1px solid var(--line)',
      background: 'var(--bg-1)', gap: 16, flexShrink: 0,
    }}>
      <div className="col" style={{ gap: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-0)' }}>{title}</div>
        {sub && <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{sub}</div>}
      </div>
      <div className="grow" />
      <div className="row gap-12">
        <div className="row gap-6" style={{
          padding: '4px 10px', borderRadius: 100,
          background: 'var(--bg-2)', border: '1px solid var(--line-soft)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--go)' }} />
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-2)' }}>LIVE · 248 devices online</span>
        </div>
        {right}
        <button className="btn"><Glyph k="bell" size={14} stroke={1.8} /></button>
        <button className="btn primary sm"><Glyph k="plus" size={13} stroke={2} />New journey</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen 1: Live Fleet Map
// ─────────────────────────────────────────────────────────────
function CTLiveMap() {
  const { mapStyle } = useFleetopsTweaks();
  const kpis = [
    { label: 'ACTIVE', value: 47, sub: '+6 vs yest', spark: [22,28,30,27,35,40,47], color: '#4a90ff' },
    { label: 'GO',     value: 218, sub: 'of 264 fleet', spark: [200,210,205,215,212,220,218], color: '#1ec991' },
    { label: 'NO-GO',  value: 14,  sub: '3 critical',   spark: [8,10,12,11,13,15,14], color: '#ef4747' },
    { label: 'DEFECTS', value: 8,  sub: '2 overdue',    spark: [5,6,8,9,7,8,8], color: '#f5a524' },
  ];
  const events = [
    { t: '14:42:08', sev: 'nogo',   v: '12-A-3471', d: 'OVERSPEED', m: '118 km/h · zone limit 100', who: 'D. AL-BUSAIDI' },
    { t: '14:38:51', sev: 'cond',   v: '34-D-1129', d: 'IDLE > 15m', m: 'Engine on, no movement',    who: 'M. AL-HARTHI' },
    { t: '14:31:22', sev: 'info',   v: '08-B-2204', d: 'WAYPOINT',  m: 'Arrived Nimr-2 main camp',   who: 'S. AL-RAWAHI' },
    { t: '14:18:04', sev: 'nogo',   v: '21-C-7720', d: 'DEVIATION', m: '1.4 km off approved route',  who: 'F. AL-AMRI' },
    { t: '14:02:11', sev: 'cond',   v: '17-D-8841', d: 'HARSH BR.', m: 'Decel 0.42g · interior cam', who: 'K. AL-MAKKI' },
    { t: '13:54:39', sev: 'go',     v: '02-A-1003', d: 'JOURNEY OK','m': 'Closed at Marmul base',    who: 'R. AL-ZADJALI' },
  ];
  const journeys = [
    { id: 'JM-25-04018', driver: 'D. Al-Busaidi', veh: '12-A-3471', dest: 'Nimr-B → Marmul', risk: 'M', eta: '15:50', prog: 78, pass: 4, status: 'active' },
    { id: 'JM-25-04017', driver: 'M. Al-Harthi',  veh: '34-D-1129', dest: 'Fahud → Bahja',   risk: 'L', eta: '16:25', prog: 62, pass: 1, status: 'delayed' },
    { id: 'JM-25-04016', driver: 'S. Al-Rawahi',  veh: '08-B-2204', dest: 'Workshop → Nimr-2',risk: 'L', eta: '14:30', prog: 100, pass: 8, status: 'completed' },
    { id: 'JM-25-04014', driver: 'F. Al-Amri',    veh: '21-C-7720', dest: 'Saih Rawl → Camp 12', risk: 'H', eta: '17:10', prog: 41, pass: 2, status: 'deviated' },
  ];
  return (
    <div className="fo col" style={{ width: '100%', height: '100%' }}>
      <div className="row" style={{ flex: 1, minHeight: 0 }}>
        <CTSidebar active="map" />
        <div className="col grow" style={{ minWidth: 0 }}>
          <CTTopbar title="Live fleet map" sub="OMAN · MARMUL OPS · 13 MAY 2026" />
          {/* KPI strip */}
          <div className="row gap-12" style={{ padding: '14px 20px 0' }}>
            {kpis.map(k => (
              <div key={k.label} className="panel grow" style={{ padding: '12px 14px' }}>
                <div className="row between">
                  <div className="label">{k.label}</div>
                  <Spark values={k.spark} color={k.color} w={64} h={20} />
                </div>
                <div className="row baseline gap-8" style={{ marginTop: 2 }}>
                  <span className="display">{k.value}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{k.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Main grid: map + side */}
          <div className="row gap-12" style={{ padding: 14, flex: 1, minHeight: 0 }}>
            {/* Map */}
            <div className="panel grow col" style={{ overflow: 'hidden', minWidth: 0 }}>
              <div className="row between" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
                <div className="row gap-12">
                  {['All fleet','Active journeys','No-Go','Geofences','Heat'].map((t,i) => (
                    <span key={t} style={{
                      fontSize: 12, padding: '3px 10px', borderRadius: 100,
                      background: i === 1 ? 'var(--bg-3)' : 'transparent',
                      color: i === 1 ? 'var(--ink-0)' : 'var(--ink-2)', cursor: 'pointer',
                    }}>{t}</span>
                  ))}
                </div>
                <div className="row gap-8">
                  <span className="meta">PDO BLOCK 6 · INTERIOR OMAN</span>
                  <div className="row gap-4">
                    <button className="btn ghost sm"><Glyph k="filter" size={12} />Filters</button>
                    <button className="btn ghost sm"><Glyph k="refresh" size={12} /></button>
                  </div>
                </div>
              </div>
              <div className="grow" style={{ position: 'relative', overflow: 'hidden', minHeight: 0, height: '100%', flex: 1 }}>
                <LeafletMap
                  center={[20.0, 56.1]} zoom={7} theme={mapStyle}
                  routes={[
                    { coords: [[18.13, 55.20], [18.40, 55.40], [18.70, 55.60], [19.13, 55.93]], color: '#4a90ff', weight: 2.5 },
                    { coords: [[19.13, 55.93], [19.65, 56.05], [20.30, 56.40], [20.94, 56.65]], color: '#1ec991', weight: 2, opacity: 0.75 },
                    { coords: [[20.94, 56.65], [21.40, 56.55], [22.34, 56.50]], color: '#f5a524', weight: 2, opacity: 0.7 },
                    { coords: [[19.30, 56.10], [19.50, 56.35], [19.75, 56.50]], color: '#ef4747', weight: 2.2, dash: '6 5' },
                  ]}
                  fences={[
                    { bounds: [[18.95, 55.78], [19.35, 56.08]], color: '#4a90ff' },
                  ]}
                  markers={[
                    // Sites
                    { latlng: [18.13, 55.20], html: siteLabelHTML('MARMUL BASE') },
                    { latlng: [19.13, 55.93], html: siteLabelHTML('NIMR-2') },
                    { latlng: [20.94, 56.65], html: siteLabelHTML('SAIH RAWL') },
                    { latlng: [22.34, 56.50], html: siteLabelHTML('FAHUD') },
                    { latlng: [19.65, 56.05], html: siteLabelHTML('BAHJA') },
                    // Vehicles
                    { latlng: [18.65, 55.55], html: vehiclePinHTML({ status: 'active', label: '12-A-3471', sub: '87 km/h NE · JM-25-04018', popupBorder: 'primary' }) },
                    { latlng: [19.00, 55.88], html: vehiclePinHTML({ status: 'completed' }) },
                    { latlng: [20.50, 56.50], html: vehiclePinHTML({ status: 'go' }) },
                    { latlng: [21.45, 56.50], html: vehiclePinHTML({ status: 'cond' }) },
                    { latlng: [19.50, 56.35], html: vehiclePinHTML({ status: 'nogo' }) },
                    { latlng: [19.30, 56.10], html: vehiclePinHTML({ status: 'go' }) },
                    { latlng: [18.30, 55.40], html: vehiclePinHTML({ status: 'active' }) },
                    { latlng: [20.20, 56.40], html: vehiclePinHTML({ status: 'active' }) },
                    { latlng: [19.85, 56.20], html: vehiclePinHTML({ status: 'active' }) },
                  ]}
                />
                {/* Scale + legend */}
                <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 12, zIndex: 400 }}>
                  <div className="row gap-6" style={{ background: 'rgba(15,20,27,0.85)', padding: '4px 10px', borderRadius: 100, border: '1px solid var(--line)' }}>
                    <div style={{ width: 30, height: 2, background: 'var(--ink-1)' }} />
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)' }}>25 km</span>
                  </div>
                  <div className="row gap-12" style={{ background: 'rgba(15,20,27,0.85)', padding: '4px 12px', borderRadius: 100, border: '1px solid var(--line)' }}>
                    {[['#1ec991','Go'],['#f5a524','Cond'],['#ef4747','No-Go'],['#4a90ff','En route']].map(([c,l]) => (
                      <div key={l} className="row gap-4">
                        <span style={{ width: 7, height: 7, borderRadius: 50, background: c }} />
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)' }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: events + journeys */}
            <div className="col gap-12" style={{ width: 340, flexShrink: 0 }}>
              <div className="panel col">
                <div className="row between" style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
                  <div className="row gap-8">
                    <span className="h3">Event stream</span>
                    <span className="pill nogo"><span className="dot" />3 critical</span>
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>LAST 30 MIN</span>
                </div>
                <div className="col" style={{ maxHeight: 240, overflow: 'hidden' }}>
                  {events.map((e, i) => (
                    <div key={i} className="row gap-10" style={{
                      padding: '9px 12px',
                      borderBottom: i < events.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    }}>
                      <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2,
                        background: STATUS[e.sev]?.dot || '#6b7689' }} />
                      <div className="col grow" style={{ minWidth: 0 }}>
                        <div className="row between gap-8">
                          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-0)' }}>{e.d}</span>
                          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{e.t}</span>
                        </div>
                        <div className="row between gap-8" style={{ marginTop: 1 }}>
                          <span style={{ fontSize: 11.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.m}</span>
                          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', flexShrink: 0 }}>{e.v}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel col grow" style={{ minHeight: 0 }}>
                <div className="row between" style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
                  <span className="h3">Active journeys</span>
                  <div className="row gap-6">
                    <Glyph k="grid" size={12} style={{ color: 'var(--ink-3)' }} />
                    <Glyph k="list" size={12} style={{ color: 'var(--ink-0)' }} />
                  </div>
                </div>
                <div className="col" style={{ overflow: 'hidden' }}>
                  {journeys.map((j, i) => (
                    <div key={j.id} style={{
                      padding: '10px 12px',
                      borderBottom: i < journeys.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    }}>
                      <div className="row between gap-8">
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-0)' }}>{j.id}</span>
                        <Pill status={j.status} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-1)', marginTop: 3 }}>{j.dest}</div>
                      <div className="row between" style={{ marginTop: 6 }}>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{j.veh} · {j.driver}</span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)' }}>ETA {j.eta}</span>
                      </div>
                      <div className="bar" style={{ marginTop: 6, height: 3 }}>
                        <div style={{
                          width: `${j.prog}%`,
                          background: j.status === 'deviated' ? 'var(--nogo)' :
                                       j.status === 'delayed' ? 'var(--cond)' :
                                       j.status === 'completed' ? 'var(--go)' : 'var(--primary)',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.CTLiveMap = CTLiveMap;
window.CTSidebar = CTSidebar;
window.CTTopbar = CTTopbar;
