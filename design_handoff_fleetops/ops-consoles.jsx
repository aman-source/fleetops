// Ops consoles, part 1 — Planner Hub, Maintenance Workshop, Work Order, HSE Console

// Reusable: a generic sidebar that adapts per role
function OpsShell({ role, active, title, sub, headerRight, children }) {
  const NAVS = {
    planner: [
      { label: 'Planner', items: [
        { k: 'pool',  i: 'inbox', t: 'Request pool', badge: 24 },
        { k: 'plans', i: 'route', t: 'Active plans' },
        { k: 'fleet', i: 'truck', t: 'Vehicles' },
        { k: 'pax',   i: 'users', t: 'Passengers' },
      ]},
      { label: 'Insights', items: [
        { k: 'analytics', i: 'chart', t: 'Analytics' },
      ]},
    ],
    maint: [
      { label: 'Workshop', items: [
        { k: 'board', i: 'wrench', t: 'Bay board', badge: 8 },
        { k: 'wo',    i: 'inbox',  t: 'Work orders' },
        { k: 'parts', i: 'package',t: 'Parts & stock' },
        { k: 'tires', i: 'gauge',  t: 'Tires' },
      ]},
      { label: 'Fleet', items: [
        { k: 'veh',  i: 'truck', t: 'Vehicles' },
        { k: 'docs', i: 'doc',   t: 'Documents' },
      ]},
    ],
    hse: [
      { label: 'HSE', items: [
        { k: 'dash',   i: 'shieldChk', t: 'Dashboard' },
        { k: 'events', i: 'alert', t: 'Events',  badge: 7 },
        { k: 'incidents', i: 'panic', t: 'Incidents' },
        { k: 'scores', i: 'gauge', t: 'Driver scores' },
        { k: 'camps',  i: 'inbox', t: 'Inspection campaigns' },
      ]},
      { label: 'Compliance', items: [
        { k: 'reports', i: 'chart', t: 'Reports' },
      ]},
    ],
    gm: [
      { label: 'Overview', items: [
        { k: 'kpi',  i: 'chart', t: 'KPIs' },
        { k: 'fleet',i: 'truck', t: 'Fleet readiness' },
        { k: 'jour', i: 'route', t: 'Journeys' },
        { k: 'risk', i: 'shield',t: 'Risk & HSE' },
      ]},
      { label: 'Reports', items: [
        { k: 'mo',  i: 'doc', t: 'Monthly board pack' },
      ]},
    ],
    admin: [
      { label: 'Admin', items: [
        { k: 'roles',  i: 'users', t: 'Roles & users' },
        { k: 'flow',   i: 'shieldChk', t: 'Workflows', badge: 'edit' },
        { k: 'rules',  i: 'flag', t: 'Vehicle rules' },
        { k: 'temps',  i: 'doc',  t: 'Templates' },
        { k: 'dev',    i: 'cog',  t: 'Devices' },
      ]},
      { label: 'System', items: [
        { k: 'int',  i: 'link',  t: 'Integrations' },
        { k: 'audit',i: 'doc',   t: 'Audit log' },
      ]},
    ],
  };
  const ROLE_BADGE = {
    planner: { l: 'Planner', col: '#a78bfa' },
    maint:   { l: 'Maintenance', col: '#f5a524' },
    hse:     { l: 'HSE', col: '#1ec991' },
    gm:      { l: 'GM/Ops', col: '#4a90ff' },
    admin:   { l: 'Admin', col: '#38d4d4' },
    veh:     { l: 'Vehicle', col: '#a78bfa' },
  };
  const rb = ROLE_BADGE[role];
  return (
    <div className="fo col" style={{ width: '100%', height: '100%' }}>
      <div className="row" style={{ flex: 1, minHeight: 0 }}>
        <div className="col" style={{
          width: 220, background: 'var(--bg-1)', borderRight: '1px solid var(--line)',
          flexShrink: 0, padding: '14px 12px', gap: 16,
        }}>
          <div style={{ padding: '4px 8px 0' }}><Logo size={20} /></div>
          <div className="row gap-6" style={{ padding: '0 8px' }}>
            <span style={{ width: 6, height: 6, borderRadius: 50, background: rb.col }} />
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{rb.l} CONSOLE</span>
          </div>
          {NAVS[role]?.map(sec => (
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
        </div>
        <div className="col grow" style={{ minWidth: 0 }}>
          <div className="row" style={{
            height: 52, padding: '0 20px', borderBottom: '1px solid var(--line)',
            background: 'var(--bg-1)', gap: 16, flexShrink: 0,
          }}>
            <div className="col" style={{ gap: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-0)' }}>{title}</div>
              {sub && <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{sub}</div>}
            </div>
            <div className="grow" />
            {headerRight}
          </div>
          <div className="col grow" style={{ minHeight: 0 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 10 — Logistics Planner Hub
// ─────────────────────────────────────────────────────────────
function PlannerHub() {
  const pool = [
    { id: 'PR-2204', name: 'H. Al-Lawati',  dept: 'Wells Ops',   from: 'Muscat HQ',  to: 'Marmul C2',  shift: '14 May · 06:00', sla: '23m', pri: 'M', sel: true },
    { id: 'PR-2205', name: 'F. Al-Amri',    dept: 'Drilling',    from: 'Muscat HQ',  to: 'Marmul A1',  shift: '14 May · 06:00', sla: '21m', pri: 'M', sel: true },
    { id: 'PR-2206', name: 'T. Al-Hosni',   dept: 'Maintenance', from: 'Muscat HQ',  to: 'Marmul WS',  shift: '14 May · 06:00', sla: '20m', pri: 'L', sel: true },
    { id: 'PR-2207', name: 'A. Al-Saadi',   dept: 'Wells Ops',   from: 'Athaibah',   to: 'Marmul C2',  shift: '14 May · 06:00', sla: '18m', pri: 'M', sel: true },
    { id: 'PR-2208', name: 'M. Al-Balushi', dept: 'HSE',         from: 'Athaibah',   to: 'Marmul HSE', shift: '14 May · 06:00', sla: '17m', pri: 'H' },
    { id: 'PR-2209', name: 'S. Al-Mahri',   dept: 'Reservoir',   from: 'Bidbid PIT', to: 'Bahja',      shift: '14 May · 07:30', sla: '1h12m',pri: 'L' },
    { id: 'PR-2210', name: 'K. Al-Wahaibi', dept: 'HSE',         from: 'Muscat HQ',  to: 'Marmul HSE', shift: '14 May · 06:00', sla: '14m', pri: 'M' },
    { id: 'PR-2211', name: 'D. Al-Riyami',  dept: 'IT',          from: 'Muscat HQ',  to: 'Nimr-2',     shift: '14 May · 06:00', sla: '12m', pri: 'L' },
  ];
  return (
    <OpsShell role="planner" active="pool" title="Request pool · Muscat → Block 6"
      sub="14 MAY · DAY-SHIFT WINDOW 05:30–07:00 · 24 OPEN"
      headerRight={
        <div className="row gap-8">
          <button className="btn ghost"><Glyph k="filter" size={13} />Filters · 3</button>
          <button className="btn"><Glyph k="grid" size={13} />Group by route</button>
          <button className="btn primary"><Glyph k="route" size={13} stroke={1.8} />Assign vehicle</button>
        </div>
      }>
      {/* Filters row */}
      <div className="row gap-12" style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-1)' }}>
        {[
          ['Pending', 24, true], ['Pooled', 6], ['Assigned', 11], ['Closed today', 47]
        ].map(([l,n,sel]) => (
          <div key={l} className="row gap-6" style={{
            padding: '4px 12px', borderRadius: 100,
            background: sel ? 'var(--bg-3)' : 'transparent',
            border: sel ? '1px solid var(--line)' : '1px solid transparent',
          }}>
            <span style={{ fontSize: 12, color: sel ? 'var(--ink-0)' : 'var(--ink-2)' }}>{l}</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{n}</span>
          </div>
        ))}
        <div className="grow" />
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>SHOWING 8 OF 24 · SORTED BY SLA</span>
      </div>

      {/* Main: pool list + pool composer */}
      <div className="row" style={{ flex: 1, minHeight: 0 }}>
        {/* Pool table */}
        <div className="col grow" style={{ minWidth: 0, borderRight: '1px solid var(--line)' }}>
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table className="tbl">
              <thead><tr>
                <th style={{ width: 36 }}></th>
                <th>Request</th><th>Passenger</th><th>From → To</th><th>Window</th>
                <th style={{ textAlign: 'right' }}>SLA</th><th>Priority</th>
              </tr></thead>
              <tbody>
                {pool.map(p => (
                  <tr key={p.id} style={p.sel ? { background: 'rgba(74,144,255,0.05)' } : {}}>
                    <td>
                      <div className={`check-box ${p.sel ? 'checked' : ''}`} style={{
                        width: 16, height: 16, borderRadius: 4,
                        background: p.sel ? 'var(--primary)' : 'transparent',
                        borderColor: p.sel ? 'var(--primary)' : 'var(--ink-3)',
                        color: 'white',
                      }}>{p.sel && <Glyph k="check" size={10} stroke={3.5} />}</div>
                    </td>
                    <td><span className="mono" style={{ fontSize: 11, color: 'var(--ink-0)' }}>{p.id}</span></td>
                    <td>
                      <div className="row gap-8">
                        <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{p.name.split('.').map(s=>s.trim()[0]).join('')}</div>
                        <div className="col" style={{ gap: 0 }}>
                          <span style={{ fontSize: 12 }}>{p.name}</span>
                          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{p.dept}</span>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 12 }}>{p.from} <span style={{ color: 'var(--ink-3)' }}>→</span> {p.to}</span></td>
                    <td><span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{p.shift}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ fontSize: 11,
                        color: p.sla.endsWith('m') && parseInt(p.sla) < 20 ? 'var(--cond)' : 'var(--ink-2)' }}>{p.sla}</span>
                    </td>
                    <td>
                      <span className={`pill ${p.pri==='H' ? 'nogo' : p.pri==='M' ? 'cond' : 'neutral'}`}>
                        <span className="dot" />{p.pri==='H'?'HIGH':p.pri==='M'?'MED':'LOW'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Composer panel */}
        <div className="col" style={{ width: 380, flexShrink: 0, overflow: 'auto' }}>
          <div style={{ padding: 16 }}>
            <div className="label">Building pool</div>
            <div className="row baseline gap-8" style={{ marginTop: 2 }}>
              <span className="display" style={{ fontSize: 22 }}>4 / 14</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>seats filled · Coaster</span>
            </div>
            <div className="bar" style={{ marginTop: 8 }}><div style={{ width: '28%' }} /></div>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>SAVINGS · 3 fewer journeys</span>
          </div>
          <hr className="sep" />

          <div className="col" style={{ padding: 16, gap: 12 }}>
            <div className="col gap-6">
              <div className="label">Route preview</div>
              <div className="map-bg terrain" style={{ height: 130, borderRadius: 6, position: 'relative' }}>
                <svg viewBox="0 0 320 130" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <path d="M 20 30 Q 80 50, 140 60 L 200 70 Q 260 90, 300 110" fill="none" stroke="#4a90ff" strokeWidth="2" />
                  {[[20,30,'Muscat'],[80,55,'Athaibah'],[140,60,'PIT'],[300,110,'Marmul']].map(([x,y,l],i) => (
                    <g key={i}>
                      <circle cx={x} cy={y} r="4" fill={i === 0 ? '#1ec991' : i === 3 ? '#ef4747' : '#4a90ff'} stroke="#0a0d12" strokeWidth="1.5" />
                      <text x={x+8} y={y+3} fontFamily="IBM Plex Mono" fontSize="9" fill="#95a0b0">{l}</text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            <div className="col gap-6">
              <div className="label">Suggested vehicle</div>
              <div className="card" style={{ padding: 12 }}>
                <div className="row between">
                  <div className="col gap-2">
                    <span className="mono" style={{ fontSize: 12, color: 'var(--ink-0)' }}>34-D-1129 · Coaster 14</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>14 seats · 11 belts · A/C ok</span>
                  </div>
                  <Pill status="go" label="AVAILABLE" />
                </div>
                <div className="row gap-12" style={{ marginTop: 10 }}>
                  <div className="col"><span className="label" style={{ fontSize: 9 }}>FUEL</span><span className="mono" style={{ fontSize: 12 }}>92%</span></div>
                  <div className="col"><span className="label" style={{ fontSize: 9 }}>NEXT SVC</span><span className="mono" style={{ fontSize: 12 }}>1.2k km</span></div>
                  <div className="col"><span className="label" style={{ fontSize: 9 }}>SCORE</span><span className="mono" style={{ fontSize: 12, color: 'var(--go)' }}>94</span></div>
                </div>
              </div>
            </div>

            <div className="col gap-6">
              <div className="label">Driver</div>
              <div className="card" style={{ padding: 12 }}>
                <div className="row gap-10">
                  <div className="avatar">DA</div>
                  <div className="col grow gap-1">
                    <span style={{ fontSize: 13 }}>Daoud Al-Busaidi</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>11h rest · DDC ✓ · medical ✓</span>
                  </div>
                  <Glyph k="refresh" size={14} style={{ color: 'var(--ink-3)' }} />
                </div>
              </div>
            </div>

            <button className="btn primary lg" style={{ justifyContent: 'center', marginTop: 4 }}>
              <Glyph k="shieldChk" size={14} stroke={1.8} />Convert to journey plan
            </button>
            <button className="btn ghost" style={{ justifyContent: 'center' }}>Save pool draft</button>
          </div>
        </div>
      </div>
    </OpsShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 11 — Maintenance workshop bay board
// ─────────────────────────────────────────────────────────────
function MaintWorkshop() {
  const cols = [
    { k: 'in',   t: 'Inbound queue',  pill: '#4a90ff', items: [
      { wo: 'WO-12039', v: '08-B-2204', t: 'Tire P3 vibration', pri: 'M', age: '14m' },
      { wo: 'WO-12040', v: '17-D-8841', t: 'Brake pad replacement · front', pri: 'H', age: '32m' },
      { wo: 'WO-12041', v: '22-A-5060', t: 'IVMS firmware update', pri: 'L', age: '2h' },
    ]},
    { k: 'bay',  t: 'In bay',         pill: '#f5a524', items: [
      { wo: 'WO-12035', v: '12-A-3471', t: 'Fire extinguisher pressure', pri: 'M', tech: 'A. Hassan', age: '00:45', bay: 'B2', photo: true },
      { wo: 'WO-12036', v: '21-C-7720', t: 'Major service · 60,000 km', pri: 'M', tech: 'R. Kumar', age: '02:12', bay: 'B4' },
    ]},
    { k: 'parts',t: 'Awaiting parts', pill: '#a78bfa', items: [
      { wo: 'WO-12033', v: '05-B-9210', t: 'Steering tie-rod replacement', pri: 'H', tech: 'R. Kumar', age: '1d 4h', part: 'TR-9802 · ETA tomorrow 12:00' },
    ]},
    { k: 'hse',  t: 'HSE review',     pill: '#ef4747', items: [
      { wo: 'WO-12032', v: '11-A-4408', t: 'Post-incident inspection', pri: 'H', tech: 'N. Al-Mahrouqi', age: '6h', },
    ]},
    { k: 'done', t: 'Ready for release', pill: '#1ec991', items: [
      { wo: 'WO-12030', v: '19-B-3344', t: 'Tire P1 replacement', pri: 'L', age: '12m', go: 'GO' },
      { wo: 'WO-12028', v: '02-A-1003', t: 'Battery + electrical', pri: 'M', age: '38m', go: 'CONDITIONAL' },
    ]},
  ];
  return (
    <OpsShell role="maint" active="board" title="Workshop bay board · Marmul"
      sub="MON 13 MAY · 8 OPEN WO · 4 TECHNICIANS ON SHIFT"
      headerRight={
        <div className="row gap-8">
          <button className="btn ghost"><Glyph k="filter" size={13} />My bays</button>
          <button className="btn primary"><Glyph k="plus" size={13} stroke={2} />New work order</button>
        </div>
      }>
      {/* KPI strip */}
      <div className="row gap-12" style={{ padding: '14px 20px 0' }}>
        {[
          ['NO-GO',  '14', 'in fleet · 3 critical', 'var(--nogo)'],
          ['IN BAY', '2',  '4 bays free',           'var(--cond)'],
          ['MTTR',   '3.4h','target 4h',            'var(--go)'],
          ['PARTS DUE','5','today',                  'var(--violet)'],
          ['PM COMPLIANCE','94%','30-day',           'var(--go)'],
        ].map(([l,v,s,c]) => (
          <div key={l} className="panel grow" style={{ padding: '10px 14px' }}>
            <div className="label">{l}</div>
            <div className="row baseline gap-6" style={{ marginTop: 2 }}>
              <span className="display" style={{ fontSize: 22, color: c }}>{v}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{s}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="row gap-12" style={{ padding: 14, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {cols.map(c => (
          <div key={c.k} className="col" style={{ flex: 1, minWidth: 220, gap: 8 }}>
            <div className="row between" style={{ padding: '0 4px' }}>
              <div className="row gap-8">
                <span style={{ width: 6, height: 6, borderRadius: 50, background: c.pill }} />
                <span style={{ fontSize: 12, color: 'var(--ink-0)', fontWeight: 600 }}>{c.t}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{c.items.length}</span>
            </div>
            <div className="col gap-6">
              {c.items.map(it => (
                <div key={it.wo} className="card" style={{ padding: 10 }}>
                  <div className="row between gap-6">
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-0)' }}>{it.wo}</span>
                    <span className={`pill ${it.pri==='H' ? 'nogo' : it.pri==='M' ? 'cond' : 'neutral'}`} style={{ padding: '0 6px', fontSize: 9 }}>
                      <span className="dot" />{it.pri}
                    </span>
                  </div>
                  <div className="row between gap-8" style={{ marginTop: 4 }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{it.v}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{it.age}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-1)', marginTop: 6 }}>{it.t}</div>
                  {it.photo && (
                    <div className="row gap-4" style={{ marginTop: 8 }}>
                      <Placeholder w={40} h={40} style={{ borderRadius: 4 }} label="" />
                      <Placeholder w={40} h={40} style={{ borderRadius: 4 }} label="" />
                    </div>
                  )}
                  {it.part && (
                    <div className="row gap-6" style={{ marginTop: 6, padding: '4px 6px', background: 'rgba(167,139,250,0.1)', borderRadius: 4 }}>
                      <Glyph k="package" size={10} style={{ color: 'var(--violet)' }} />
                      <span className="mono" style={{ fontSize: 10, color: '#c4b5fd' }}>{it.part}</span>
                    </div>
                  )}
                  {it.tech && (
                    <div className="row gap-6" style={{ marginTop: 8 }}>
                      <div className="avatar" style={{ width: 18, height: 18, fontSize: 8 }}>{it.tech.split('.').map(s=>s.trim()[0]).join('')}</div>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{it.tech}{it.bay ? ` · BAY ${it.bay}`: ''}</span>
                    </div>
                  )}
                  {it.go && (
                    <div className="row" style={{ marginTop: 8 }}>
                      <Pill status={it.go === 'GO' ? 'go' : 'cond'} label={it.go} />
                    </div>
                  )}
                </div>
              ))}
              <div className="row gap-6" style={{
                padding: '8px 10px', border: '1px dashed var(--line)',
                borderRadius: 6, color: 'var(--ink-3)', justifyContent: 'center',
                fontSize: 11.5, cursor: 'pointer',
              }}><Glyph k="plus" size={12} />Add work order</div>
            </div>
          </div>
        ))}
      </div>
    </OpsShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 12 — Work order detail · Go/No-Go release decision
// ─────────────────────────────────────────────────────────────
function MaintWorkOrder() {
  return (
    <OpsShell role="maint" active="wo" title="WO-12035 · Fire extinguisher pressure low"
      sub="VEHICLE 12-A-3471 · TOYOTA HILUX 4×4 · BAY B2 · OPENED 13 MAY 06:42"
      headerRight={
        <div className="row gap-8">
          <button className="btn ghost"><Glyph k="download" size={13} />Export PDF</button>
          <button className="btn"><Glyph k="package" size={13} />Issue parts</button>
          <button className="btn"><Glyph k="upload" size={13} />Add photo</button>
        </div>
      }>
      <div className="row gap-12" style={{ padding: 14, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {/* Left: timeline + photos + parts */}
        <div className="col gap-12 grow" style={{ minWidth: 0 }}>
          {/* Hero summary */}
          <div className="panel" style={{ padding: 16 }}>
            <div className="row between">
              <div className="col" style={{ gap: 4 }}>
                <div className="row gap-8">
                  <Pill status="cond" label="IN BAY · CORRECTIVE" />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>OPENED BY DRIVER (PRE-TRIP) · D. AL-BUSAIDI</span>
                </div>
                <div className="h1" style={{ fontSize: 18 }}>Fire extinguisher pressure below green band</div>
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  Detected during pre-trip walk-around. Vehicle conditionally released pending replacement.
                  Replacement unit issued from store and installed by A. Hassan. Awaiting HSE sign-off for full GO.
                </span>
              </div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
                <span className="display" style={{ fontSize: 22 }}>00:45</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>ELAPSED · TARGET 1H</span>
              </div>
            </div>
          </div>

          {/* Photo evidence */}
          <div className="panel">
            <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span className="h3">Photo evidence</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>4 PHOTOS · BEFORE / AFTER</span>
            </div>
            <div className="row gap-8" style={{ padding: 12 }}>
              {[
                { l: 'BEFORE · gauge', bg: 'repeating-linear-gradient(135deg, #8a3a3a 0 6px, #6a2a2a 6px 12px)' },
                { l: 'BEFORE · seal',  bg: 'repeating-linear-gradient(135deg, #5a4a30 0 6px, #4a3a20 6px 12px)' },
                { l: 'AFTER · gauge',  bg: 'repeating-linear-gradient(135deg, #3a6a3a 0 6px, #2a5a2a 6px 12px)' },
                { l: 'AFTER · installed', bg: 'repeating-linear-gradient(135deg, #3a4a6a 0 6px, #2a3a5a 6px 12px)' },
              ].map((p,i) => (
                <div key={i} className="col" style={{ flex: 1, gap: 4 }}>
                  <div style={{ aspectRatio: '1', borderRadius: 6, background: p.bg, border: '1px solid var(--line)' }} />
                  <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>{p.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Parts replaced */}
          <div className="panel">
            <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span className="h3">Parts replaced</span>
              <button className="btn ghost sm"><Glyph k="plus" size={11} />Add part</button>
            </div>
            <table className="tbl">
              <thead><tr><th>Part no.</th><th>Description</th><th>Qty</th><th>Supplier</th><th>Warranty</th><th>Old part</th></tr></thead>
              <tbody>
                <tr>
                  <td><span className="mono" style={{ fontSize: 11 }}>FE-ABC-2KG-OEM</span></td>
                  <td>ABC fire extinguisher · 2 kg · DCP</td>
                  <td className="mono">1</td>
                  <td>Tasnim Safety LLC</td>
                  <td className="mono" style={{ fontSize: 11 }}>24m · exp 13 May 28</td>
                  <td><span className="pill nogo" style={{ padding: '0 6px', fontSize: 9 }}><span className="dot" />DISPOSED</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Activity timeline */}
          <div className="panel">
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span className="h3">Activity</span>
            </div>
            <div className="col" style={{ padding: 14, gap: 12 }}>
              {[
                ['06:42','D. Al-Busaidi (driver)','Reported defect during pre-trip · 2 photos','info'],
                ['06:43','System','Vehicle status → Conditional Release · Maintenance notified','neutral'],
                ['06:51','A. Hassan (tech)','Started inspection · Bay B2','info'],
                ['07:02','A. Hassan','Issued part FE-ABC-2KG-OEM from store · qty 1','info'],
                ['07:18','A. Hassan','Installed replacement · 2 photos · ready for release','go'],
                ['07:27','—','Awaiting HSE sign-off for full GO','cond'],
              ].map(([t,who,what,s], i, arr) => (
                <div key={i} className="row gap-10">
                  <div className="col center" style={{ width: 14 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: 50, marginTop: 3,
                      background: s==='go' ? 'var(--go)' : s==='cond' ? 'var(--cond)' : s==='nogo' ? 'var(--nogo)' : s==='info' ? 'var(--primary)' : 'var(--ink-3)',
                    }} />
                    {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--line)', marginTop: 2, minHeight: 18 }} />}
                  </div>
                  <div className="col grow" style={{ paddingBottom: 4 }}>
                    <div className="row between gap-8">
                      <span style={{ fontSize: 12, color: 'var(--ink-1)' }}><b style={{ color: 'var(--ink-0)' }}>{who}</b></span>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{t}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{what}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Go/No-Go decision panel */}
        <div className="col gap-12" style={{ width: 340, flexShrink: 0 }}>
          <div className="panel">
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
              <div className="label">Release decision</div>
              <div style={{ fontSize: 13, color: 'var(--ink-0)', fontWeight: 600, marginTop: 4 }}>Choose status to apply</div>
            </div>
            <div className="col gap-8" style={{ padding: 14 }}>
              {[
                { k: 'go',   t: 'GO · full release',
                  d: 'Vehicle returns to operational pool. Available for any journey.',
                  c: 'var(--go)', bg: 'var(--go-soft)', sel: true },
                { k: 'cond', t: 'CONDITIONAL release',
                  d: 'Available with restrictions (e.g. daylight only, max distance). Expiry required.',
                  c: 'var(--cond)', bg: 'var(--cond-soft)' },
                { k: 'nogo', t: 'NO-GO · keep blocked',
                  d: 'Vehicle remains blocked from journey assignment. Reason logged.',
                  c: 'var(--nogo)', bg: 'var(--nogo-soft)' },
              ].map(o => (
                <label key={o.k} style={{
                  display: 'flex', gap: 10, padding: 12, borderRadius: 8,
                  background: o.sel ? o.bg : 'var(--bg-2)',
                  border: o.sel ? `1px solid ${o.c}` : '1px solid var(--line)',
                  cursor: 'pointer',
                }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: 50, marginTop: 2,
                    border: `2px solid ${o.sel ? o.c : 'var(--ink-3)'}`,
                    background: o.sel ? o.c : 'transparent', flexShrink: 0,
                    boxShadow: o.sel ? 'inset 0 0 0 3px var(--panel)' : 'none',
                  }} />
                  <div className="col grow" style={{ gap: 2 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: o.sel ? o.c : 'var(--ink-1)' }}>{o.t}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{o.d}</span>
                  </div>
                </label>
              ))}
            </div>
            <hr className="sep" />
            <div className="col" style={{ padding: 14, gap: 10 }}>
              <div className="col gap-4">
                <span className="field-label">Reason / note</span>
                <div className="input" style={{ height: 72, padding: 10, alignItems: 'flex-start', display: 'flex' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-1)' }}>
                    Replacement unit installed (FE-ABC-2KG-OEM). Pressure within green band, seal intact, mounting bracket secured. Photos attached.
                  </span>
                </div>
              </div>
              <div className="col gap-4">
                <span className="field-label">HSE co-sign required?</span>
                <div className="row gap-6">
                  {['Auto','Required','Skipped'].map((t,i) => (
                    <span key={t} style={{
                      flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 6,
                      background: i === 1 ? 'var(--bg-3)' : 'var(--bg-2)',
                      color: i === 1 ? 'var(--ink-0)' : 'var(--ink-2)',
                      fontSize: 11, fontWeight: 500, border: '1px solid var(--line)', cursor: 'pointer',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
              <button className="btn go lg" style={{ justifyContent: 'center', marginTop: 6 }}>
                <Glyph k="check" size={14} stroke={2.5} />Apply GO · request HSE co-sign
              </button>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'center' }}>
                AUDIT: USER · TIMESTAMP · DEVICE IP RECORDED
              </span>
            </div>
          </div>

          <div className="panel" style={{ padding: 14 }}>
            <div className="label" style={{ marginBottom: 8 }}>Vehicle status</div>
            <div className="row between">
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Current</span>
              <Pill status="cond" label="CONDITIONAL" />
            </div>
            <div className="row between" style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>After decision</span>
              <Pill status="go" label="GO (PENDING HSE)" />
            </div>
            <hr className="sep" style={{ margin: '12px 0' }} />
            <div className="row between" style={{ marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Blocked journeys</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--cond)' }}>2 · auto-releases</span>
            </div>
          </div>
        </div>
      </div>
    </OpsShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 13 — HSE console: panic event response
// ─────────────────────────────────────────────────────────────
function HSEConsole() {
  const { mapStyle } = useFleetopsTweaks();
  return (
    <OpsShell role="hse" active="incidents" title="EMERGENCY · Panic button activated"
      sub="JM-25-04014 · 21-C-7720 · F. AL-AMRI · 13 MAY · 14:47:22 +0400"
      headerRight={
        <div className="row gap-8">
          <button className="btn"><Glyph k="phone" size={13} />Call ops desk</button>
          <button className="btn danger lg"><Glyph k="panic" size={14} stroke={2} />Escalate to Tier 2</button>
        </div>
      }>
      {/* Critical banner */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(239,71,71,0.12), rgba(239,71,71,0.02))',
        borderBottom: '1px solid rgba(239,71,71,0.3)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, background: 'var(--nogo)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', animation: 'pulseRed 1.4s ease-in-out infinite',
        }}><Glyph k="panic" size={22} stroke={2.2} /></div>
        <div className="col grow">
          <div className="row gap-8">
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--nogo)', letterSpacing: '0.02em' }}>ACTIVE EMERGENCY · TIER 1</span>
            <span className="pill nogo"><span className="dot" />4 MIN 18 SEC ELAPSED</span>
          </div>
          <span style={{ fontSize: 13, color: 'var(--ink-1)', marginTop: 2 }}>
            Panic activated by driver F. Al-Amri · vehicle 21-C-7720 · 1.4 km off-route, deviation alert prior. Engine still on, last speed 0 km/h since 14:46:51.
          </span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>NEXT ACTION</span>
          <span style={{ fontSize: 13, color: 'var(--cond)', fontWeight: 600 }}>Verify driver safety call</span>
        </div>
        <style>{`@keyframes pulseRed { 0%,100%{box-shadow:0 0 0 0 rgba(239,71,71,0.5)} 70%{box-shadow:0 0 0 12px rgba(239,71,71,0)} }`}</style>
      </div>

      <div className="row" style={{ flex: 1, minHeight: 0 }}>
        {/* Map */}
        <div className="col grow" style={{ position: 'relative', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
          <LeafletMap
            center={[22.68, 56.82]} zoom={12} theme={mapStyle}
            routes={[
              { coords: [[22.65, 56.74], [22.66, 56.80], [22.68, 56.86], [22.71, 56.92]], color: '#4a90ff', weight: 3, dash: '6 4', opacity: 0.7 },
              { coords: [[22.68, 56.86], [22.684, 56.84], [22.684, 56.7740]], color: '#ef4747', weight: 3 },
            ]}
            fences={[
              { center: [22.685, 56.84], radius: 1200, color: '#4a90ff' },
            ]}
            markers={[
              { latlng: [22.684, 56.7740], size: [28,28], anchor: [14,14],
                html: `<div style="position:relative">
                  <div style="width:24px;height:24px;border-radius:50%;background:#ef4747;border:3px solid #fff;box-shadow:0 0 0 10px rgba(239,71,71,0.25),0 0 24px rgba(239,71,71,0.7);display:flex;align-items:center;justify-content:center;animation:pulseRed 1.4s ease-in-out infinite">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 22h20zM12 9v6M12 18v.5"/></svg>
                  </div>
                  <div class="fo-leaflet-pop nogo" style="left:32px;top:-10px;min-width:190px">
                    <div style="display:flex;gap:8px;align-items:center">
                      <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#f1f4f8;font-weight:600">21-C-7720</span>
                      <span style="background:rgba(239,71,71,0.15);color:#ef4747;border:1px solid rgba(239,71,71,0.4);padding:0 6px;border-radius:100px;font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.04em">● SOS</span>
                    </div>
                    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#95a0b0;margin-top:1px">22.6840° N · 56.7740° E</div>
                    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#5e6776;margin-top:1px">1.4 km from approved route</div>
                  </div>
                </div>` },
              { latlng: [22.71, 56.78], html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div class="fo-leaflet-pin go"></div><div style="background:rgba(15,20,27,0.85);padding:2px 6px;border-radius:100px;border:1px solid #232c39"><span style="font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:#d6dce5">HSE veh · 4 km</span></div></div>` },
              { latlng: [22.74, 56.92], html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div class="fo-leaflet-pin active"></div><div style="background:rgba(15,20,27,0.85);padding:2px 6px;border-radius:100px;border:1px solid #232c39"><span style="font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:#d6dce5">Camp 12 · 6 km</span></div></div>` },
              { latlng: [22.62, 56.70], html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div class="fo-leaflet-pin" style="background:#a78bfa;box-shadow:0 0 0 3px rgba(167,139,250,0.2)"></div><div style="background:rgba(15,20,27,0.85);padding:2px 6px;border-radius:100px;border:1px solid #232c39"><span style="font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:#d6dce5">Ambulance · 11 km</span></div></div>` },
            ]}
          />
          {/* HUD */}
          <div className="row gap-12" style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
            <div className="panel grow" style={{ padding: 12, background: 'rgba(15,20,27,0.92)' }}>
              <div className="row between">
                <span className="label">LAST IVMS</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>2s ago</span>
              </div>
              <div className="row gap-16" style={{ marginTop: 6 }}>
                {[['SPEED','0 km/h','var(--cond)'],['ENGINE','ON','var(--cond)'],['DOOR','CLOSED','var(--ink-1)'],['FUEL','41%','var(--ink-1)'],['SIGNAL','GOOD','var(--go)']].map(([l,v,c]) => (
                  <div key={l} className="col"><span className="label" style={{ fontSize: 9 }}>{l}</span><span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: c }}>{v}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: response playbook */}
        <div className="col" style={{ width: 380, flexShrink: 0, borderLeft: '1px solid var(--line)', overflow: 'auto' }}>
          <div style={{ padding: 14 }}>
            <span className="h3">Driver & journey</span>
            <div className="card" style={{ padding: 12, marginTop: 8 }}>
              <div className="row gap-10">
                <Placeholder w={48} h={48} label="" style={{ borderRadius: 50 }} />
                <div className="col grow gap-1">
                  <div style={{ fontSize: 13, color: 'var(--ink-0)', fontWeight: 500 }}>Faisal Al-Amri</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>OM-DL-2204713 · DDC ✓</div>
                </div>
                <div className="col" style={{ alignItems: 'flex-end' }}>
                  <button style={{ background: 'var(--go)', color: '#08251c', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 600, display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Glyph k="phone" size={12} stroke={2.2} />Call
                  </button>
                </div>
              </div>
              <hr className="sep" style={{ margin: '10px 0' }} />
              <div className="row gap-12">
                <div className="col"><span className="label" style={{ fontSize: 9 }}>JOURNEY</span><span className="mono" style={{ fontSize: 11 }}>JM-25-04014</span></div>
                <div className="col"><span className="label" style={{ fontSize: 9 }}>DEST</span><span style={{ fontSize: 11 }}>Camp 12</span></div>
                <div className="col"><span className="label" style={{ fontSize: 9 }}>PAX</span><span className="mono" style={{ fontSize: 11 }}>2</span></div>
              </div>
            </div>
          </div>
          <hr className="sep" />
          <div style={{ padding: 14 }}>
            <span className="h3">Response playbook · Tier 1</span>
            <div className="col gap-6" style={{ marginTop: 10 }}>
              {[
                { l: 'Acknowledge alert',     t: '14:47:30', who: 'N. Al-Mahrouqi (HSE)', s: 'done' },
                { l: 'Call driver mobile',    t: '14:47:55', who: 'No answer · auto-retry',s: 'done' },
                { l: 'Contact passenger phone', t: '14:48:40', who: 'Voice contact ok', s: 'done' },
                { l: 'Dispatch HSE veh from Camp 12', t: '14:49:11', who: 'ETA 6 min', s: 'active' },
                { l: 'Notify emergency services if needed', s: 'pending' },
                { l: 'Close incident & write report', s: 'pending' },
              ].map((it, i, arr) => (
                <div key={i} className="row gap-10" style={{
                  padding: '8px 10px', borderRadius: 6,
                  background: it.s === 'active' ? 'var(--primary-soft)' : 'var(--bg-2)',
                  border: '1px solid ' + (it.s === 'active' ? 'rgba(74,144,255,0.3)' : 'var(--line-soft)'),
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 50, flexShrink: 0,
                    background: it.s === 'done' ? 'var(--go)' : it.s === 'active' ? 'var(--primary)' : 'var(--bg-3)',
                    color: it.s === 'pending' ? 'var(--ink-3)' : '#08251c',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {it.s === 'done' ? <Glyph k="check" size={10} stroke={3.5} /> :
                     it.s === 'active' ? <span style={{ width: 6, height: 6, borderRadius: 50, background: '#fff' }} /> :
                     <span style={{ fontSize: 10, color: '#fff' }}>{i+1}</span>}
                  </span>
                  <div className="col grow" style={{ gap: 0 }}>
                    <span style={{ fontSize: 12, color: it.s === 'pending' ? 'var(--ink-3)' : 'var(--ink-0)' }}>{it.l}</span>
                    {it.who && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{it.t} · {it.who}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <hr className="sep" />
          <div style={{ padding: 14 }}>
            <span className="h3">Last 5 IVMS events</span>
            <div className="col gap-4" style={{ marginTop: 8 }}>
              {[
                ['14:47:22','PANIC pressed','nogo'],
                ['14:47:01','Engine ON · 0 km/h','cond'],
                ['14:46:51','Speed → 0','cond'],
                ['14:46:08','DEVIATION 1.4 km','nogo'],
                ['14:44:00','Overspeed 118 km/h','nogo'],
              ].map(([t,m,s], i) => (
                <div key={i} className="row between" style={{ padding: '4px 6px' }}>
                  <div className="row gap-6">
                    <span style={{ width: 6, height: 6, borderRadius: 50, background: s === 'nogo' ? 'var(--nogo)' : 'var(--cond)' }} />
                    <span style={{ fontSize: 11.5, color: 'var(--ink-1)' }}>{m}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </OpsShell>
  );
}

Object.assign(window, { OpsShell, PlannerHub, MaintWorkshop, MaintWorkOrder, HSEConsole });
