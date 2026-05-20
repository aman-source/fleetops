// Journey Composer — the flagship Go/No-Go gating screen
// + Active journey detail screen

function CTJourneyComposer() {
  // Validation gates — the heart of the system
  const gates = [
    { k: 'driver', ok: true,  title: 'Driver authorization',
      sub: 'D. Al-Busaidi · OM-DL-7740812 · Class C · DDC valid',
      checks: [
        ['License', 'VALID', 'Exp 22 Apr 2027'],
        ['Defensive driving cert', 'VALID', 'Exp 11 Sep 2026'],
        ['Medical fitness', 'VALID', 'Exp 03 Mar 2027'],
        ['Authorized vehicle types', 'OK', 'Class C, D — 4×4 light'],
        ['NFC card', 'ACTIVE', 'UID 04:E2:1F:8B'],
      ]},
    { k: 'vehicle', ok: true,  title: 'Vehicle readiness',
      sub: '12-A-3471 · Hilux DC 4×4 · 2024 · 47,820 km',
      checks: [
        ['Maintenance status', 'GO', 'Last service 2,140 km ago'],
        ['Tires', 'GO', 'All 4 above tread minimum (5.8mm avg)'],
        ['IVMS device', 'ONLINE', 'Last seen 12 sec ago'],
        ['NFC reader', 'ONLINE', 'Self-test passed 06:02'],
        ['Panic button', 'OK', 'Last test 11 May 2026'],
      ]},
    { k: 'docs', ok: 'warn', title: 'Documents & permits',
      sub: '6 of 6 present · 1 expires in 18 days',
      checks: [
        ['Mulkia / registration', 'VALID', 'Exp 03 Jul 2026'],
        ['Insurance', 'VALID', 'Exp 14 Dec 2026'],
        ['Inspection / RAS', 'EXPIRES SOON', 'Exp 31 May 2026 · renewal scheduled'],
        ['Site permit · PDO Block 6', 'VALID', 'Exp 31 Dec 2026'],
        ['Fire extinguisher', 'OK', 'Insp. 02 Apr 2026'],
        ['First aid kit', 'OK', 'Insp. 02 Apr 2026'],
      ]},
    { k: 'route', ok: true, title: 'Route & risk',
      sub: 'Marmul → Nimr-2 main camp · 142 km · Risk score 4.2 / 10 (M)',
      checks: [
        ['Approved roads only', 'OK', 'No red zones intersected'],
        ['Daylight window', 'OK', 'Departure 14:30, ETA 16:50 (sunset 18:42)'],
        ['Weather', 'OK', '33°C · clear · wind 14 km/h'],
        ['Refuel point', 'OK', 'Saih Rawl junction · km 78'],
        ['Comms coverage', 'OK', 'Full 4G except km 92–105'],
      ]},
    { k: 'passengers', ok: 'warn', title: 'Passengers & headcount',
      sub: '4 of max 5 · 1 manifest review pending',
      checks: [
        ['Manifest count', 'OK', '4 employees + driver'],
        ['Capacity', 'OK', '5 seatbelts available'],
        ['Eligibility', 'REVIEW', 'A. Al-Saadi — PDO clearance expired 11 May'],
        ['Boarding method', 'CONFIG', 'NFC card scan at vehicle'],
      ]},
    { k: 'hse', ok: false, title: 'HSE approval',
      sub: 'High-risk journey · awaits HSE sign-off',
      checks: [
        ['Risk level', 'MEDIUM', 'Auto-routed to HSE (policy ≥M)'],
        ['Last incident', 'CLEAR', 'No incidents in 90 days'],
        ['Driver fatigue', 'OK', 'Rest 11h 20m since last trip'],
        ['HSE officer', 'PENDING', 'N. Al-Mahrouqi · sent 14:12'],
      ]},
  ];
  const passengers = [
    { name: 'A. Al-Saadi',   id: 'PDO-44210', dept: 'Wellsite Ops', status: 'review',  pickup: 'Marmul C2' },
    { name: 'H. Al-Lawati',  id: 'PDO-31907', dept: 'Reservoir',    status: 'ok',      pickup: 'Marmul C2' },
    { name: 'T. Al-Ismaili', id: 'CTR-90183', dept: 'Halliburton',  status: 'ok',      pickup: 'Marmul gate' },
    { name: 'K. Al-Wahaibi', id: 'PDO-22018', dept: 'HSE',          status: 'ok',      pickup: 'Marmul gate' },
  ];
  return (
    <div className="fo col" style={{ width: '100%', height: '100%' }}>
      <div className="row" style={{ flex: 1, minHeight: 0 }}>
        <CTSidebar active="journeys" />
        <div className="col grow" style={{ minWidth: 0 }}>
          {/* Journey-specific topbar */}
          <div className="row" style={{
            height: 52, padding: '0 20px', borderBottom: '1px solid var(--line)',
            background: 'var(--bg-1)', gap: 16, flexShrink: 0,
          }}>
            <div className="row gap-8">
              <Glyph k="arrowL" size={14} style={{ color: 'var(--ink-3)' }} />
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>JOURNEYS</span>
              <Glyph k="chevR" size={11} style={{ color: 'var(--ink-4)' }} />
            </div>
            <div className="col" style={{ gap: 0 }}>
              <div className="row gap-8">
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-0)' }}>New journey plan</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>JM-25-04019 · draft</span>
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>STEP 3 OF 4 · VALIDATION</div>
            </div>
            <div className="grow" />
            <div className="row gap-8">
              <button className="btn ghost"><Glyph k="eye" size={13} />Preview</button>
              <button className="btn">Save draft</button>
              <button className="btn primary lg" style={{ opacity: 0.55, cursor: 'not-allowed' }}>
                <Glyph k="shieldChk" size={14} stroke={1.8} />Submit for approval
              </button>
            </div>
          </div>

          {/* Stepper */}
          <div className="row gap-16" style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-1)' }}>
            {[
              ['1','Plan','done'],['2','Resources','done'],['3','Validate','active'],['4','Submit','pending']
            ].map(([n,l,s]) => (
              <React.Fragment key={n}>
                <div className="row gap-8">
                  <span style={{
                    width: 22, height: 22, borderRadius: 50,
                    background: s==='done' ? 'var(--go)' : s==='active' ? 'var(--primary)' : 'var(--bg-3)',
                    color: s==='pending' ? 'var(--ink-3)' : '#08251c',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                  }}>{s==='done' ? '✓' : n}</span>
                  <span style={{ fontSize: 12.5, color: s==='pending' ? 'var(--ink-3)' : 'var(--ink-0)', fontWeight: s==='active' ? 600 : 400 }}>{l}</span>
                </div>
                {n !== '4' && <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />}
              </React.Fragment>
            ))}
          </div>

          {/* Body */}
          <div className="row gap-16" style={{ padding: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Left: gate cards */}
            <div className="col gap-12 grow" style={{ overflow: 'auto', minWidth: 0 }}>
              {/* Summary banner */}
              <div className="panel" style={{ padding: 14, borderColor: 'rgba(245,165,36,0.3)' }}>
                <div className="row gap-12">
                  <span style={{
                    width: 38, height: 38, borderRadius: 8,
                    background: 'var(--cond-soft)', color: 'var(--cond)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}><Glyph k="alert" size={18} stroke={2} /></span>
                  <div className="col grow gap-2">
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-0)' }}>
                      Cannot submit yet — 2 blocking items, 1 review item
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                      Resolve <b style={{ color: 'var(--nogo)' }}>HSE approval</b> and <b style={{ color: 'var(--cond)' }}>passenger eligibility</b> to enable submission.
                    </div>
                  </div>
                  <div className="col end" style={{ alignItems: 'flex-end', gap: 4 }}>
                    <div className="display-lg" style={{ fontSize: 32 }}>4<span style={{ color: 'var(--ink-3)', fontSize: 18 }}> / 6</span></div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>GATES CLEARED</div>
                  </div>
                </div>
              </div>

              {/* Gates */}
              {gates.map(g => {
                const ok = g.ok === true;
                const warn = g.ok === 'warn';
                const fail = g.ok === false;
                const c = ok ? 'var(--go)' : warn ? 'var(--cond)' : 'var(--nogo)';
                return (
                  <div key={g.k} className="panel">
                    <div className="row between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' }}>
                      <div className="row gap-12">
                        <span style={{
                          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                          background: ok ? 'var(--go-soft)' : warn ? 'var(--cond-soft)' : 'var(--nogo-soft)',
                          color: c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {ok ? <Glyph k="check" size={16} stroke={2.5} /> :
                           warn ? <Glyph k="alert" size={15} stroke={2} /> :
                           <Glyph k="x" size={15} stroke={2.5} />}
                        </span>
                        <div className="col" style={{ gap: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-0)' }}>{g.title}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{g.sub}</div>
                        </div>
                      </div>
                      <div className="row gap-8">
                        <Pill status={ok ? 'go' : warn ? 'cond' : 'nogo'} label={ok ? 'PASS' : warn ? 'REVIEW' : 'BLOCK'} />
                        <Glyph k="chevD" size={14} style={{ color: 'var(--ink-3)' }} />
                      </div>
                    </div>
                    <div className="col">
                      {g.checks.map((c, i) => {
                        const s = c[1];
                        const bad = ['EXPIRES SOON','REVIEW','PENDING'].includes(s);
                        const blk = ['FAIL','EXPIRED','OFFLINE','BLOCK'].includes(s);
                        return (
                          <div key={i} className="row gap-12" style={{
                            padding: '8px 14px',
                            borderBottom: i < g.checks.length - 1 ? '1px solid var(--line-soft)' : 'none',
                          }}>
                            <span style={{
                              width: 14, height: 14, borderRadius: 50, flexShrink: 0,
                              background: blk ? 'var(--nogo-soft)' : bad ? 'var(--cond-soft)' : 'var(--go-soft)',
                              color: blk ? 'var(--nogo)' : bad ? 'var(--cond)' : 'var(--go)',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {blk ? <Glyph k="x" size={9} stroke={3} /> :
                                bad ? <Glyph k="alert" size={9} stroke={2.5} /> :
                                <Glyph k="check" size={9} stroke={3.5} />}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--ink-1)', minWidth: 200 }}>{c[0]}</span>
                            <span className="mono" style={{ fontSize: 10.5, letterSpacing: '0.05em',
                              color: blk ? 'var(--nogo)' : bad ? 'var(--cond)' : 'var(--go)',
                              fontWeight: 500, minWidth: 110 }}>{s}</span>
                            <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{c[2]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: journey summary */}
            <div className="col gap-12" style={{ width: 340, flexShrink: 0, overflow: 'auto' }}>
              <div className="panel">
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                  <div className="label">Journey summary</div>
                  <div style={{ fontSize: 14, color: 'var(--ink-0)', fontWeight: 600, marginTop: 4 }}>
                    Marmul → Nimr-2 main camp
                  </div>
                  <div className="row gap-8" style={{ marginTop: 4 }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>142 km · 2h 20m</span>
                    <span className="pill cond"><span className="dot" />RISK · M</span>
                  </div>
                </div>
                {/* Mini route */}
                <div style={{ padding: 12 }}>
                  <div className="map-bg terrain" style={{ height: 130, borderRadius: 6, position: 'relative' }}>
                    <svg viewBox="0 0 300 130" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                      <path d="M 30 100 Q 80 40, 160 60 T 270 30" fill="none" stroke="#4a90ff" strokeWidth="2" />
                      <circle cx="30" cy="100" r="5" fill="#1ec991" stroke="#0a0d12" strokeWidth="1.5" />
                      <circle cx="270" cy="30" r="5" fill="#ef4747" stroke="#0a0d12" strokeWidth="1.5" />
                      <circle cx="160" cy="60" r="3" fill="#f5a524" stroke="#0a0d12" strokeWidth="1.5" />
                    </svg>
                    <div style={{ position: 'absolute', bottom: 6, left: 8, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-3)' }}>MARMUL</div>
                    <div style={{ position: 'absolute', top: 6, right: 8, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-3)' }}>NIMR-2</div>
                  </div>
                </div>
                <hr className="sep" />
                <div className="col" style={{ padding: 12, gap: 10 }}>
                  {[
                    ['Departure', '14:30 · 13 May'],
                    ['ETA', '16:50 · 13 May'],
                    ['Purpose', 'Wellsite handover · WO-12044'],
                    ['Job plan', 'JP-1188 · linked'],
                    ['Risk score', '4.2 / 10 · medium'],
                    ['Emergency contact', 'Ops desk +968 2467 0100'],
                  ].map(([l,v]) => (
                    <div key={l} className="row between gap-12">
                      <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{l}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-1)', textAlign: 'right' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                  <span className="h3">Passengers</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>4 / 5</span>
                </div>
                <div className="col">
                  {passengers.map((p, i) => (
                    <div key={p.id} className="row gap-10" style={{
                      padding: '10px 14px',
                      borderBottom: i < passengers.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    }}>
                      <div className="avatar" style={{ width: 26, height: 26, fontSize: 10,
                        background: p.status === 'review' ? 'linear-gradient(135deg, #f5a524, #ef4747)' :
                          'linear-gradient(135deg, #4a90ff, #38d4d4)' }}>
                        {p.name.split('.').map(s=>s.trim()[0]).join('')}
                      </div>
                      <div className="col grow" style={{ minWidth: 0, gap: 1 }}>
                        <div className="row between gap-8">
                          <span style={{ fontSize: 12, color: 'var(--ink-0)' }}>{p.name}</span>
                          {p.status === 'review' && <Pill status="cond" label="REVIEW" />}
                        </div>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{p.id} · {p.dept}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel" style={{ padding: 12 }}>
                <div className="label" style={{ marginBottom: 8 }}>Approver chain</div>
                {[
                  ['Submitter','Y. Said','done','14:12'],
                  ['Journey Mgr review','self-approved','done','14:12'],
                  ['HSE officer','N. Al-Mahrouqi','active','—'],
                  ['Final approval','Auto on HSE OK','pending','—'],
                ].map(([role,who,s,t], i, arr) => (
                  <div key={i} className="row gap-10" style={{ paddingTop: i ? 8 : 0 }}>
                    <div className="col center" style={{ width: 14, flexShrink: 0 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: 50,
                        background: s === 'done' ? 'var(--go)' : s === 'active' ? 'var(--primary)' : 'var(--bg-3)',
                        boxShadow: s === 'active' ? '0 0 0 4px rgba(74,144,255,0.2)' : 'none',
                      }} />
                      {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--line)', marginTop: 2, minHeight: 16 }} />}
                    </div>
                    <div className="col grow" style={{ gap: 0, paddingBottom: i < arr.length - 1 ? 4 : 0 }}>
                      <div className="row between gap-8">
                        <span style={{ fontSize: 11.5, color: 'var(--ink-1)' }}>{role}</span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{t}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{who}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen 3: Active journey detail
// ─────────────────────────────────────────────────────────────
function CTActiveJourney() {
  const { mapStyle } = useFleetopsTweaks();
  const waypoints = [
    { t: '14:30:02', name: 'Marmul Base · Gate', status: 'done', sub: 'Departed · headcount 4/4 confirmed' },
    { t: '14:48:11', name: 'Marmul C2 junction',  status: 'done', sub: 'Passed · 67 km/h' },
    { t: '15:22:50', name: 'Saih Rawl refuel',    status: 'done', sub: 'Stopped 11 min · 42 L diesel' },
    { t: '15:48:20', name: 'Km 102 checkpoint',   status: 'current', sub: 'Currently here · 87 km/h NE' },
    { t: '16:18 (est)', name: 'Nimr-2 outer geofence', status: 'pending', sub: 'ETA in 28 min' },
    { t: '16:50 (est)', name: 'Nimr-2 main camp',  status: 'pending', sub: 'Final destination · close-out on arrival' },
  ];
  return (
    <div className="fo col" style={{ width: '100%', height: '100%' }}>
      <div className="row" style={{ flex: 1, minHeight: 0 }}>
        <CTSidebar active="journeys" />
        <div className="col grow" style={{ minWidth: 0 }}>
          <div className="row" style={{
            height: 52, padding: '0 20px', borderBottom: '1px solid var(--line)',
            background: 'var(--bg-1)', gap: 16, flexShrink: 0,
          }}>
            <div className="row gap-8">
              <Glyph k="arrowL" size={14} style={{ color: 'var(--ink-3)' }} />
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>JOURNEYS</span>
              <Glyph k="chevR" size={11} style={{ color: 'var(--ink-4)' }} />
            </div>
            <div className="col" style={{ gap: 0 }}>
              <div className="row gap-8">
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-0)' }}>JM-25-04018</span>
                <Pill status="active" />
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Marmul → Nimr-2</span>
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>STARTED 14:30 · ETA 16:50 · 1H 18M ELAPSED</div>
            </div>
            <div className="grow" />
            <div className="row gap-8">
              <button className="btn ghost"><Glyph k="phone" size={13} />Contact driver</button>
              <button className="btn ghost"><Glyph k="link" size={13} />Share trip</button>
              <button className="btn"><Glyph k="alert" size={13} />Flag event</button>
              <button className="btn danger"><Glyph k="x" size={13} stroke={2.5} />Recall journey</button>
            </div>
          </div>

          <div className="row" style={{ flex: 1, minHeight: 0 }}>
            {/* Map + telemetry */}
            <div className="col grow" style={{ minWidth: 0 }}>
              <div className="grow" style={{ position: 'relative', minHeight: 0, height: '100%', flex: 1, overflow: 'hidden' }}>
                <LeafletMap
                  center={[18.62, 55.55]} zoom={9} theme={mapStyle}
                  routes={[
                    { coords: [[18.13, 55.20], [18.20, 55.25], [18.35, 55.40], [18.55, 55.55], [18.78, 55.72]], color: '#1ec991', weight: 3 },
                    { coords: [[18.78, 55.72], [18.95, 55.85], [19.13, 55.93]], color: '#4a90ff', weight: 2.5, dash: '6 5', opacity: 0.8 },
                  ]}
                  markers={[
                    { latlng: [18.13, 55.20], html: siteLabelHTML('MARMUL BASE') },
                    { latlng: [19.13, 55.93], html: siteLabelHTML('NIMR-2 CAMP') },
                    { latlng: [18.20, 55.25], html: '<div class="fo-leaflet-pin" style="background:#1ec991;width:8px;height:8px;border-width:1px"></div>' },
                    { latlng: [18.35, 55.40], html: '<div class="fo-leaflet-pin" style="background:#1ec991;width:8px;height:8px;border-width:1px"></div>' },
                    { latlng: [18.55, 55.55], html: '<div class="fo-leaflet-pin" style="background:#1ec991;width:8px;height:8px;border-width:1px"></div>' },
                    { latlng: [18.95, 55.85], html: '<div class="fo-leaflet-pin site" style="border-color:rgba(255,255,255,0.5)"></div>' },
                    { latlng: [18.78, 55.72], size: [18,18], anchor: [9,9],
                      html: `<div style="position:relative">
                        <div class="fo-leaflet-pin active" style="width:14px;height:14px;border-width:2px"></div>
                        <div class="fo-leaflet-pop primary" style="left:18px;top:-10px">
                          <div style="display:flex;gap:8px;align-items:center">
                            <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#f1f4f8;font-weight:600">12-A-3471</span>
                            <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#4a90ff">87 km/h</span>
                          </div>
                          <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#95a0b0;margin-top:1px">18.7820° N · 55.7240° E</div>
                        </div>
                      </div>` },
                  ]}
                />
                {/* HUD strip */}
                <div className="row gap-8" style={{ position: 'absolute', top: 12, left: 12 }}>
                  {['Replay 10 min','Hide off-route','Show passengers'].map((t,i) => (
                    <button key={t} className="btn sm" style={{ background: 'rgba(15,20,27,0.85)' }}>{t}</button>
                  ))}
                </div>
                <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12,
                  background: 'rgba(10,13,18,0.92)', border: '1px solid var(--line)', borderRadius: 8,
                  padding: '10px 14px', display: 'flex', gap: 24,
                }}>
                  {[
                    ['SPEED',     '87', 'km/h', 'var(--primary)'],
                    ['LIMIT',     '100', 'km/h', 'var(--ink-2)'],
                    ['DISTANCE',  '102.4', 'km',  'var(--ink-2)'],
                    ['REMAINING', '40', 'km',  'var(--ink-2)'],
                    ['FUEL',      '64', '%',    'var(--go)'],
                    ['ENGINE',    '2,140', 'rpm', 'var(--ink-2)'],
                    ['IGNITION',  'ON',  '',    'var(--go)'],
                    ['NFC',       'D.AL-BUSAIDI','','var(--go)'],
                    ['DEVICE',    'ONLINE',  '',    'var(--go)'],
                  ].map(([l,v,u,c]) => (
                    <div key={l} className="col" style={{ gap: 2 }}>
                      <span className="label" style={{ fontSize: 9 }}>{l}</span>
                      <div className="row baseline gap-4">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: c, fontWeight: 500 }}>{v}</span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{u}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Bottom: timeline strip */}
              <div className="panel" style={{ margin: 12, padding: 12, borderRadius: 8 }}>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <span className="h3">Speed & events · last 90 min</span>
                  <div className="row gap-12">
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>1 OVERSPEED · 0 HARSH · 0 DEVIATION</span>
                  </div>
                </div>
                <svg width="100%" height="60" viewBox="0 0 800 60" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="spg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4a90ff" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#4a90ff" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="22" x2="800" y2="22" stroke="#ef4747" strokeDasharray="3 3" strokeWidth="1" strokeOpacity="0.6"/>
                  <text x="6" y="18" fontFamily="IBM Plex Mono" fontSize="9" fill="rgba(239,71,71,0.8)">LIMIT 100</text>
                  <polygon points="0,60 0,42 50,38 90,30 140,32 190,26 230,28 280,18 320,20 360,24 400,22 440,16 480,20 520,28 560,30 600,34 640,32 680,26 720,28 760,30 800,32 800,60"
                    fill="url(#spg)" />
                  <polyline points="0,42 50,38 90,30 140,32 190,26 230,28 280,18 320,20 360,24 400,22 440,16 480,20 520,28 560,30 600,34 640,32 680,26 720,28 760,30 800,32"
                    fill="none" stroke="#4a90ff" strokeWidth="1.5" />
                  <circle cx="280" cy="18" r="4" fill="#ef4747"/>
                  <line x1="600" y1="0" x2="600" y2="60" stroke="#4a90ff" strokeWidth="1" strokeOpacity="0.4"/>
                </svg>
              </div>
            </div>

            {/* Right rail: waypoints + passengers + IVMS */}
            <div className="col" style={{ width: 360, flexShrink: 0, borderLeft: '1px solid var(--line)', overflow: 'auto' }}>
              <div className="col" style={{ padding: 14, gap: 12 }}>
                <div className="row between">
                  <span className="h3">Driver</span>
                  <span className="pill go"><span className="dot" />NFC AUTHENTICATED</span>
                </div>
                <div className="row gap-12 card" style={{ padding: 12 }}>
                  <Placeholder w={56} h={56} label="photo" style={{ borderRadius: 50, flexShrink: 0 }} />
                  <div className="col grow" style={{ gap: 2 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink-0)', fontWeight: 500 }}>Daoud Al-Busaidi</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>OM-DL-7740812 · DDC Sep 26</div>
                    <div className="row gap-12" style={{ marginTop: 4 }}>
                      <div className="col"><span className="label" style={{ fontSize: 9 }}>SCORE</span><span className="mono" style={{ fontSize: 12, color: 'var(--go)' }}>94</span></div>
                      <div className="col"><span className="label" style={{ fontSize: 9 }}>TRIPS</span><span className="mono" style={{ fontSize: 12, color: 'var(--ink-1)' }}>1,247</span></div>
                      <div className="col"><span className="label" style={{ fontSize: 9 }}>INCIDENTS</span><span className="mono" style={{ fontSize: 12, color: 'var(--ink-1)' }}>0 · 90d</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <hr className="sep" />
              <div className="col" style={{ padding: 14, gap: 10 }}>
                <div className="h3">Route timeline</div>
                {waypoints.map((w, i) => (
                  <div key={i} className="row gap-10">
                    <div className="col center" style={{ width: 14, flexShrink: 0 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: 50, marginTop: 4,
                        background: w.status==='done' ? 'var(--go)' :
                                   w.status==='current' ? 'var(--primary)' : 'var(--bg-3)',
                        boxShadow: w.status==='current' ? '0 0 0 4px rgba(74,144,255,0.2)' : 'none',
                      }} />
                      {i < waypoints.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--line)', marginTop: 2, minHeight: 18 }} />}
                    </div>
                    <div className="col grow" style={{ gap: 1, paddingBottom: i < waypoints.length - 1 ? 6 : 0 }}>
                      <div className="row between gap-8">
                        <span style={{ fontSize: 12, color: w.status === 'pending' ? 'var(--ink-3)' : 'var(--ink-0)' }}>{w.name}</span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{w.t}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{w.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
              <hr className="sep" />
              <div className="col" style={{ padding: 14, gap: 10 }}>
                <div className="row between">
                  <span className="h3">Passengers boarded</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--go)' }}>4 / 4 ✓ MATCH</span>
                </div>
                {['A. Al-Saadi','H. Al-Lawati','T. Al-Ismaili','K. Al-Wahaibi'].map((n, i) => (
                  <div key={n} className="row between" style={{ padding: '6px 0' }}>
                    <div className="row gap-8">
                      <Glyph k="check" size={12} style={{ color: 'var(--go)' }} stroke={3} />
                      <span style={{ fontSize: 12, color: 'var(--ink-1)' }}>{n}</span>
                    </div>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>NFC · 14:28</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.CTJourneyComposer = CTJourneyComposer;
window.CTActiveJourney = CTActiveJourney;
