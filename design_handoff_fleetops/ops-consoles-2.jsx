// Ops consoles, part 2 — GM/Ops dashboard, Vehicle Master profile, Admin workflow config

// ─────────────────────────────────────────────────────────────
// 14 — GM / Ops KPI dashboard
// ─────────────────────────────────────────────────────────────
function GMDashboard() {
  const kpis = [
    { l: 'FLEET UTILIZATION', v: '72', u: '%', d: '+4.2 vs target', dc: 'var(--go)', spark: [60,62,65,68,66,70,72], c: '#4a90ff' },
    { l: 'JOURNEY ON-TIME',   v: '94.1', u: '%', d: '+1.8 MoM',     dc: 'var(--go)', spark: [88,90,89,91,93,93,94], c: '#1ec991' },
    { l: 'NO-GO RATE',        v: '5.3',  u: '%', d: '-0.8 MoM',     dc: 'var(--go)', spark: [7,8,7,6.5,6,5.6,5.3], c: '#f5a524' },
    { l: 'INCIDENTS · 30D',   v: '3',    u: '', d: 'TRIR 0.14',     dc: 'var(--ink-2)', spark: [1,0,1,0,1,1,0], c: '#ef4747' },
    { l: 'DRIVER SCORE AVG',  v: '88.4', u: '/100', d: '+0.6',       dc: 'var(--go)', spark: [85,86,86,87,87,88,88.4], c: '#a78bfa' },
    { l: 'COST · OMR / KM',   v: '0.146',u: '', d: '-2.1% vs Apr',   dc: 'var(--go)', spark: [0.16,0.158,0.155,0.151,0.149,0.148,0.146], c: '#38d4d4' },
  ];
  return (
    <OpsShell role="gm" active="kpi" title="GM Operations · monthly board view"
      sub="MAY 2026 · MONTH-TO-DATE · PDO BLOCK 6 · INTERIOR OMAN"
      headerRight={
        <div className="row gap-8">
          <span className="row gap-6" style={{
            padding: '4px 10px', borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--line)',
          }}>
            <Glyph k="clock" size={12} style={{ color: 'var(--ink-3)' }} />
            <span style={{ fontSize: 12, color: 'var(--ink-1)' }}>May 2026</span>
            <Glyph k="chevD" size={11} style={{ color: 'var(--ink-3)' }} />
          </span>
          <button className="btn ghost"><Glyph k="download" size={13} />Export PDF</button>
          <button className="btn"><Glyph k="link" size={13} />Share to BI</button>
        </div>
      }>
      <div className="col gap-12" style={{ padding: 14, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {/* KPI grid */}
        <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
          {kpis.map(k => (
            <div key={k.l} className="panel" style={{ flex: '1 1 220px', padding: 14, minHeight: 120 }}>
              <div className="row between">
                <div className="label">{k.l}</div>
                <Glyph k="dots" size={14} style={{ color: 'var(--ink-3)' }} />
              </div>
              <div className="row baseline gap-4" style={{ marginTop: 6 }}>
                <span className="display-lg" style={{ fontSize: 32 }}>{k.v}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{k.u}</span>
              </div>
              <div className="row between" style={{ marginTop: 8 }}>
                <span className="mono" style={{ fontSize: 11, color: k.dc }}>{k.d}</span>
                <Spark values={k.spark} color={k.c} w={88} h={26} />
              </div>
            </div>
          ))}
        </div>

        {/* Mid row: Fleet readiness + Journey breakdown + Top risks */}
        <div className="row gap-12" style={{ flex: 1, minHeight: 320 }}>
          {/* Fleet readiness */}
          <div className="panel grow col" style={{ minWidth: 320 }}>
            <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span className="h3">Fleet readiness · 264 vehicles</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>BY STATUS · LIVE</span>
            </div>
            <div className="col" style={{ padding: 14, gap: 10 }}>
              {[
                ['Go',                   218, 'var(--go)'],
                ['Conditional release',   16, 'var(--cond)'],
                ['Under maintenance',      8, 'var(--cond)'],
                ['No-Go · critical',       3, 'var(--nogo)'],
                ['Expired documents',      5, 'var(--nogo)'],
                ['IVMS / NFC fault',       6, 'var(--neutral)'],
                ['HSE hold',               4, 'var(--violet)'],
                ['Decommissioned',         4, 'var(--ink-3)'],
              ].map(([l,n,c]) => {
                const pct = (n / 264 * 100).toFixed(1);
                return (
                  <div key={l} className="col gap-4">
                    <div className="row between">
                      <span style={{ fontSize: 12, color: 'var(--ink-1)' }}>{l}</span>
                      <span className="row gap-8">
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{pct}%</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-0)', width: 36, textAlign: 'right' }}>{n}</span>
                      </span>
                    </div>
                    <div className="bar"><div style={{ width: `${pct}%`, background: c }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Journeys 30-day */}
          <div className="panel col grow" style={{ minWidth: 320 }}>
            <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span className="h3">Journeys · last 30 days</span>
              <div className="row gap-12">
                {[['Approved','#1ec991'],['Delayed','#f5a524'],['Deviated','#ef4747']].map(([l,c]) => (
                  <div key={l} className="row gap-4">
                    <span style={{ width: 8, height: 8, borderRadius: 50, background: c }} />
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grow" style={{ padding: 14, minHeight: 0 }}>
              <svg width="100%" height="100%" viewBox="0 0 600 240" preserveAspectRatio="none" style={{ display: 'block' }}>
                {/* Grid */}
                {[0,60,120,180,240].map(y => <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="rgba(255,255,255,0.05)" />)}
                {/* Bars */}
                {Array.from({ length: 30 }, (_,i) => {
                  const x = i * 20 + 4;
                  const tot = 30 + Math.sin(i * 0.4) * 8 + (i % 7 < 5 ? 8 : -10);
                  const dev = (i % 11 === 0) ? 4 : (i % 7 === 0) ? 2 : 0;
                  const del = Math.max(0, Math.round(tot * 0.08 + (i % 5 === 0 ? 2 : 0)));
                  const app = Math.max(0, Math.round(tot - dev - del));
                  let stack = 240;
                  const out = [];
                  [[app,'#1ec991'],[del,'#f5a524'],[dev,'#ef4747']].forEach(([v,c],j) => {
                    const h = v * 4;
                    stack -= h;
                    out.push(<rect key={j} x={x} y={stack} width="12" height={h} fill={c} opacity={0.85} />);
                  });
                  return out;
                })}
                <line x1="0" y1="240" x2="600" y2="240" stroke="var(--line)" />
                <text x="0" y="234" fontSize="9" fill="rgba(149,160,176,0.6)" fontFamily="IBM Plex Mono">14 APR</text>
                <text x="280" y="234" fontSize="9" fill="rgba(149,160,176,0.6)" fontFamily="IBM Plex Mono">29 APR</text>
                <text x="540" y="234" fontSize="9" fill="rgba(149,160,176,0.6)" fontFamily="IBM Plex Mono">13 MAY</text>
              </svg>
            </div>
          </div>

          {/* Top risks */}
          <div className="panel col" style={{ width: 280 }}>
            <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span className="h3">Top operational risks</span>
            </div>
            <div className="col" style={{ overflow: 'auto' }}>
              {[
                { t: 'RAS inspection renewals due', n: '12 vehicles', s: 'In next 30 days', sev: 'cond' },
                { t: 'Driver DDC expiring',         n: '7 drivers',   s: 'In next 60 days', sev: 'cond' },
                { t: 'Tire age > 5 years',          n: '14 units',    s: 'Schedule replacement', sev: 'nogo' },
                { t: 'IVMS devices offline > 1h',   n: '3 vehicles',  s: 'Field check required', sev: 'nogo' },
                { t: 'Insurance renewals',          n: '4 vehicles',  s: 'Within 21 days', sev: 'cond' },
                { t: 'Camp 12 corridor speeding',   n: '8 events / 7d',s: 'Pattern detected',  sev: 'cond' },
              ].map((r, i, arr) => (
                <div key={i} className="row gap-10" style={{
                  padding: '10px 14px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--line-soft)' : 'none',
                }}>
                  <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 2,
                    background: r.sev === 'nogo' ? 'var(--nogo)' : 'var(--cond)' }} />
                  <div className="col grow" style={{ gap: 1 }}>
                    <div className="row between gap-8">
                      <span style={{ fontSize: 12, color: 'var(--ink-0)' }}>{r.t}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-2)' }}>{r.n}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{r.s}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: site breakdown */}
        <div className="panel">
          <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
            <span className="h3">By project / site</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>MAY 1–13</span>
          </div>
          <table className="tbl">
            <thead><tr>
              <th>Site / project</th><th>Vehicles</th><th>Journeys</th>
              <th>On-time %</th><th>Driver score</th><th>Incidents</th><th>No-Go rate</th><th>Cost/km</th>
            </tr></thead>
            <tbody>
              {[
                ['Marmul base',    62, 412, '95.1%', '89.2', 0, '4.8%', '0.142'],
                ['Nimr-2',         48, 388, '94.7%', '88.1', 1, '5.2%', '0.148'],
                ['Fahud',          54, 351, '93.2%', '87.6', 1, '5.6%', '0.149'],
                ['Bahja',          41, 264, '94.8%', '88.9', 0, '5.0%', '0.144'],
                ['Saih Rawl',      35, 199, '93.7%', '87.2', 1, '5.9%', '0.151'],
                ['Workshop pool',  24,  68, '—',     '—',    0, '8.3%', '—'],
              ].map(r => (
                <tr key={r[0]}>
                  <td>{r[0]}</td>
                  <td className="mono">{r[1]}</td>
                  <td className="mono">{r[2]}</td>
                  <td className="mono" style={{ color: parseFloat(r[3]) >= 95 ? 'var(--go)' : parseFloat(r[3]) < 94 ? 'var(--cond)' : 'var(--ink-1)' }}>{r[3]}</td>
                  <td className="mono">{r[4]}</td>
                  <td className="mono" style={{ color: r[5] > 0 ? 'var(--cond)' : 'var(--ink-2)' }}>{r[5]}</td>
                  <td className="mono">{r[6]}</td>
                  <td className="mono">{r[7]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </OpsShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 15 — Vehicle Master profile
// ─────────────────────────────────────────────────────────────
function VehicleProfile() {
  return (
    <OpsShell role="veh" active={null} title="12-A-3471 · Toyota Hilux DC 4×4"
      sub="VIN AHTKD22G8N0117482 · FLEET ID FT-0341 · OWNER AR TECHNOLOGY · PDO BLOCK 6"
      headerRight={
        <div className="row gap-8">
          <button className="btn ghost"><Glyph k="download" size={13} />Export profile</button>
          <button className="btn"><Glyph k="upload" size={13} />Upload doc</button>
          <button className="btn primary"><Glyph k="wrench" size={13} stroke={1.8} />Open work order</button>
        </div>
      }>
      <div className="row gap-12" style={{ padding: 14, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {/* Left rail: photo + status */}
        <div className="col gap-12" style={{ width: 280, flexShrink: 0 }}>
          <div className="panel" style={{ padding: 12 }}>
            <Placeholder w="100%" h={170} label="vehicle photo · 3/4 view" style={{ borderRadius: 8 }} />
            <div className="row gap-6" style={{ marginTop: 8 }}>
              {[1,2,3,4].map(i => (
                <Placeholder key={i} w={48} h={36} label="" style={{ borderRadius: 4 }} />
              ))}
            </div>
            <div className="row between" style={{ marginTop: 12 }}>
              <div className="col gap-2">
                <div className="label">CURRENT STATUS</div>
                <Pill status="cond" label="CONDITIONAL · 12d" />
              </div>
              <button className="btn sm">Change</button>
            </div>
          </div>

          <div className="panel" style={{ padding: 12 }}>
            <div className="label" style={{ marginBottom: 8 }}>Identity</div>
            {[
              ['Plate', '12-A-3471'],
              ['VIN', 'AHTKD22G8N0117482'],
              ['Engine no.', '2KD-8814023'],
              ['Make', 'Toyota'],
              ['Model', 'Hilux DC 4×4'],
              ['Year', '2024'],
              ['Type', 'Light vehicle · 5-seat'],
              ['Owner', 'AR Technology LLC'],
              ['Project', 'PDO Block 6 · Marmul'],
              ['Base', 'Marmul workshop'],
            ].map(([l,v]) => (
              <div key={l} className="row between" style={{ padding: '4px 0' }}>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{l}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-1)', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="panel" style={{ padding: 12 }}>
            <div className="label" style={{ marginBottom: 8 }}>Telemetry · live</div>
            {[
              ['Odometer', '47,820 km'],
              ['Engine hrs', '2,841 h'],
              ['Last seen', '2 sec ago'],
              ['Last position', '22.71° N 56.94° E'],
              ['IVMS device', 'TLT-2640 · v3.21'],
              ['SIM', '+968 95221208'],
              ['NFC reader', 'NXP-DR4 · OK'],
            ].map(([l,v]) => (
              <div key={l} className="row between" style={{ padding: '4px 0' }}>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{l}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-1)', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: tabs + content */}
        <div className="col grow gap-12" style={{ minWidth: 0 }}>
          {/* Tabs */}
          <div className="row gap-2" style={{ borderBottom: '1px solid var(--line)' }}>
            {[
              ['Overview',true],['Documents',false,3],['Maintenance',false,8],['Tires',false],['Parts',false],['Journeys',false],['Events',false,12],['Devices',false],['Audit',false],
            ].map(([l,sel,n]) => (
              <div key={l} className="row gap-6" style={{
                padding: '8px 14px', borderBottom: sel ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -1, cursor: 'pointer',
              }}>
                <span style={{ fontSize: 12.5, color: sel ? 'var(--ink-0)' : 'var(--ink-2)', fontWeight: sel ? 600 : 400 }}>{l}</span>
                {n && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', padding: '0 5px', borderRadius: 100, background: 'var(--bg-3)' }}>{n}</span>}
              </div>
            ))}
          </div>

          {/* Health summary cards */}
          <div className="row gap-12">
            {[
              { l: 'MAINTENANCE', s: 'GO', sub: '2,140 km since service · next at 50,000', c: 'go' },
              { l: 'DOCUMENTS', s: '6 / 6', sub: 'RAS expires in 18 days', c: 'cond' },
              { l: 'TIRES', s: 'GO', sub: 'Avg tread 5.8mm · last rotation 4 wks', c: 'go' },
              { l: 'IVMS / NFC', s: 'ONLINE', sub: 'Devices healthy · GPS quality 92%', c: 'go' },
            ].map(c => (
              <div key={c.l} className="panel grow" style={{ padding: 14 }}>
                <div className="row between">
                  <span className="label">{c.l}</span>
                  <Pill status={c.c} label={c.s} />
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 6 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Documents */}
          <div className="panel">
            <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span className="h3">Documents & permits</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>1 EXPIRING · 0 EXPIRED</span>
            </div>
            <table className="tbl">
              <thead><tr><th>Document</th><th>Reference</th><th>Issued</th><th>Expires</th><th>Reminder</th><th>Status</th><th>File</th></tr></thead>
              <tbody>
                {[
                  ['Mulkia / registration', 'ROP-1148206',  '03 Jul 2024', '03 Jul 2026', '90/60/30/7d', 'valid'],
                  ['Insurance',             'AXA-7720918',  '14 Dec 2025', '14 Dec 2026', '60/30/7d',    'valid'],
                  ['Inspection / RAS',      'RAS-2026-0440','01 Jun 2025', '31 May 2026', '90/60/30/7d', 'soon'],
                  ['PDO site permit · B6',  'PDO-SP-1820',  '01 Jan 2026', '31 Dec 2026', '60/30d',      'valid'],
                  ['Fire extinguisher',     'FE-2KG-117',   '13 May 2026', '13 May 2028', '60/30d',      'valid'],
                  ['First aid kit',         'FA-2024-208',  '02 Apr 2026', '02 Apr 2028', '60/30d',      'valid'],
                ].map(r => (
                  <tr key={r[0]}>
                    <td>{r[0]}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{r[1]}</td>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{r[2]}</td>
                    <td className="mono" style={{ fontSize: 11, color: r[5] === 'soon' ? 'var(--cond)' : 'var(--ink-1)' }}>{r[3]}</td>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{r[4]}</td>
                    <td><Pill status={r[5] === 'soon' ? 'cond' : 'go'} label={r[5] === 'soon' ? 'EXPIRES 18D' : 'VALID'} /></td>
                    <td><Glyph k="doc" size={14} style={{ color: 'var(--ink-2)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Maintenance + Tires */}
          <div className="row gap-12">
            <div className="panel grow">
              <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                <span className="h3">Recent maintenance</span>
                <button className="btn ghost sm">View all 47</button>
              </div>
              <table className="tbl">
                <thead><tr><th>Date</th><th>WO</th><th>Type</th><th>Tech</th><th>Result</th></tr></thead>
                <tbody>
                  {[
                    ['13 May 26','WO-12035','Fire ext. replacement','A. Hassan','cond'],
                    ['28 Apr 26','WO-11904','PM · 45,000 km service','R. Kumar','go'],
                    ['19 Apr 26','WO-11881','Tire P3 rotation','R. Kumar','go'],
                    ['02 Apr 26','WO-11722','Battery health check','A. Hassan','go'],
                    ['18 Mar 26','WO-11602','Brake pads · front','R. Kumar','go'],
                  ].map(r => (
                    <tr key={r[1]}>
                      <td className="mono" style={{ fontSize: 11 }}>{r[0]}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{r[1]}</td>
                      <td>{r[2]}</td>
                      <td>{r[3]}</td>
                      <td><Pill status={r[4]} label={r[4].toUpperCase()} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel" style={{ width: 360 }}>
              <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                <span className="h3">Tires</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>BRIDGESTONE DUELER · 265/65R17</span>
              </div>
              <div style={{ padding: 14 }}>
                {/* Vehicle diagram */}
                <div style={{
                  background: 'var(--bg-2)', borderRadius: 8, padding: 14,
                  position: 'relative', height: 160,
                }}>
                  <svg viewBox="0 0 200 160" style={{ width: '100%', height: '100%' }}>
                    <rect x="60" y="30" width="80" height="100" rx="10" fill="#1c2430" stroke="var(--line)" strokeWidth="1.5" />
                    <rect x="68" y="42" width="64" height="32" rx="3" fill="rgba(74,144,255,0.1)" stroke="rgba(74,144,255,0.3)" />
                    <text x="100" y="62" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9" fill="rgba(255,255,255,0.5)">CABIN</text>
                    {[
                      [40, 36, 'P1', '6.2mm', 'go'],
                      [160, 36, 'P2', '5.8mm', 'go'],
                      [40, 124, 'P3', '4.4mm', 'cond'],
                      [160, 124, 'P4', '6.0mm', 'go'],
                    ].map(([x,y,l,t,s]) => (
                      <g key={l}>
                        <rect x={x-12} y={y-8} width="24" height="16" rx="3" fill={s === 'go' ? '#1ec991' : '#f5a524'} opacity="0.25" />
                        <rect x={x-12} y={y-8} width="24" height="16" rx="3" fill="none" stroke={s === 'go' ? '#1ec991' : '#f5a524'} />
                        <text x={x} y={y-12} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9" fill="var(--ink-1)">{l}</text>
                        <text x={x} y={y+22} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9" fill={s === 'go' ? '#1ec991' : '#f5a524'}>{t}</text>
                      </g>
                    ))}
                  </svg>
                </div>
                <div className="row gap-8" style={{ marginTop: 12 }}>
                  <div className="col grow"><span className="label" style={{ fontSize: 9 }}>AVG TREAD</span><span className="mono" style={{ fontSize: 14, color: 'var(--ink-0)' }}>5.6 mm</span></div>
                  <div className="col grow"><span className="label" style={{ fontSize: 9 }}>OLDEST</span><span className="mono" style={{ fontSize: 14, color: 'var(--ink-0)' }}>14 mo</span></div>
                  <div className="col grow"><span className="label" style={{ fontSize: 9 }}>NEXT ROT.</span><span className="mono" style={{ fontSize: 14, color: 'var(--cond)' }}>P3 → P1</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OpsShell>
  );
}

// ─────────────────────────────────────────────────────────────
// 16 — Admin · workflow configuration
// ─────────────────────────────────────────────────────────────
function AdminConfig() {
  return (
    <OpsShell role="admin" active="flow" title="Workflows · Journey approval"
      sub="WORKFLOW JM-APPROVAL · V2.3 · 14 USERS AFFECTED · LAST EDITED 8 MAY"
      headerRight={
        <div className="row gap-8">
          <button className="btn ghost"><Glyph k="refresh" size={13} />Test on draft journey</button>
          <button className="btn ghost">Discard</button>
          <button className="btn primary"><Glyph k="check" size={13} stroke={2} />Publish v2.4</button>
        </div>
      }>
      <div className="row" style={{ flex: 1, minHeight: 0 }}>
        {/* Workflow list rail */}
        <div className="col" style={{ width: 230, borderRight: '1px solid var(--line)', flexShrink: 0 }}>
          <div className="row between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
            <span className="h3">Workflows</span>
            <Glyph k="plus" size={14} style={{ color: 'var(--ink-2)' }} stroke={2} />
          </div>
          <div className="col" style={{ overflow: 'auto' }}>
            {[
              ['Journey approval',   'JM-APPROVAL',     'v2.3', true],
              ['Vehicle release',    'VEH-RELEASE',     'v1.7'],
              ['Document renewal',   'DOC-EXPIRY',      'v3.1'],
              ['Driver onboarding',  'DRV-ONBOARD',     'v1.4'],
              ['HSE incident',       'HSE-INCIDENT',    'v2.0'],
              ['Passenger request',  'PAX-REQUEST',     'v1.2'],
              ['Inspection campaign','INSP-CAMPAIGN',   'v1.0 BETA'],
              ['Tire replacement',   'TIRE-REPLACE',    'v1.5'],
            ].map(([t,k,v,sel]) => (
              <div key={k} className="col" style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--line-soft)',
                background: sel ? 'var(--bg-2)' : 'transparent',
                borderLeft: sel ? '2px solid var(--primary)' : '2px solid transparent',
              }}>
                <span style={{ fontSize: 12.5, color: sel ? 'var(--ink-0)' : 'var(--ink-1)', fontWeight: sel ? 600 : 400 }}>{t}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{k} · {v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flow canvas */}
        <div className="col grow" style={{ minWidth: 0, position: 'relative', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div className="row" style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', gap: 8 }}>
            {[
              ['Trigger','flag','active'], ['Gate','shieldChk'], ['Approval','user'],
              ['Notification','bell'], ['Action','cog'], ['Branch','grid'], ['Wait','clock']
            ].map(([t,i,s]) => (
              <button key={t} className="btn ghost sm" style={{
                background: s === 'active' ? 'var(--bg-3)' : 'transparent',
              }}>
                <Glyph k={i} size={12} stroke={1.8} />{t}
              </button>
            ))}
            <div className="grow" />
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>DRAFT · 8 NODES · 11 EDGES</span>
            <button className="btn sm"><Glyph k="grid" size={12} />Auto-layout</button>
          </div>

          {/* Canvas */}
          <div className="grow" style={{
            position: 'relative',
            background: 'var(--bg-1)',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            overflow: 'hidden',
          }}>
            {/* Edges */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <defs>
                <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-3)" />
                </marker>
                <marker id="arrG" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill="var(--go)" />
                </marker>
                <marker id="arrR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill="var(--nogo)" />
                </marker>
              </defs>
              {/* Trigger → Validate */}
              <path d="M 170 130 L 290 130" stroke="var(--ink-3)" strokeWidth="1.5" markerEnd="url(#arr)" fill="none" />
              {/* Validate → branch */}
              <path d="M 420 130 L 540 130" stroke="var(--ink-3)" strokeWidth="1.5" markerEnd="url(#arr)" fill="none" />
              {/* Branch GO down */}
              <path d="M 600 160 L 600 260" stroke="var(--go)" strokeWidth="1.5" markerEnd="url(#arrG)" fill="none" />
              <text x="608" y="210" fontFamily="IBM Plex Mono" fontSize="9" fill="var(--go)">PASS</text>
              {/* Branch FAIL right-down */}
              <path d="M 660 160 L 800 160 L 800 260" stroke="var(--nogo)" strokeWidth="1.5" markerEnd="url(#arrR)" fill="none" />
              <text x="808" y="210" fontFamily="IBM Plex Mono" fontSize="9" fill="var(--nogo)">FAIL</text>
              {/* Risk gate down → JM approve OR HSE approve */}
              <path d="M 600 320 L 600 380" stroke="var(--ink-3)" strokeWidth="1.5" fill="none" />
              <path d="M 600 380 L 460 380 L 460 430" stroke="var(--ink-3)" strokeWidth="1.5" markerEnd="url(#arr)" fill="none" />
              <text x="380" y="376" fontFamily="IBM Plex Mono" fontSize="9" fill="var(--ink-3)">RISK ≤ LOW</text>
              <path d="M 600 380 L 760 380 L 760 430" stroke="var(--ink-3)" strokeWidth="1.5" markerEnd="url(#arr)" fill="none" />
              <text x="700" y="376" fontFamily="IBM Plex Mono" fontSize="9" fill="var(--ink-3)">RISK ≥ MED</text>
            </svg>

            {/* Nodes */}
            {[
              { id: 'trigger', x: 40, y: 100, w: 130, h: 60, icon: 'flag', t: 'Trigger', s: 'Journey submitted' },
              { id: 'validate', x: 290, y: 100, w: 130, h: 60, icon: 'shieldChk', t: 'Validate gates', s: '6 gate checks · auto', accent: 'primary' },
              { id: 'branch', x: 540, y: 100, w: 130, h: 60, icon: 'grid', t: 'Branch', s: 'on validation result' },
              { id: 'fail', x: 740, y: 260, w: 130, h: 60, icon: 'x', t: 'Reject', s: 'Notify submitter · log audit', accent: 'nogo' },
              { id: 'risk', x: 540, y: 260, w: 130, h: 60, icon: 'gauge', t: 'Risk check', s: 'Compute risk score', accent: 'primary' },
              { id: 'jm', x: 390, y: 430, w: 140, h: 64, icon: 'user', t: 'Journey Mgr approve', s: 'Auto if score ≤ 3.5', accent: 'go' },
              { id: 'hse', x: 690, y: 430, w: 140, h: 64, icon: 'shield', t: 'HSE approve', s: 'Required · SLA 30 min', accent: 'cond', sel: true },
            ].map(n => {
              const accentMap = {
                primary: { c: 'var(--primary)', bg: 'var(--primary-soft)' },
                go: { c: 'var(--go)', bg: 'var(--go-soft)' },
                cond: { c: 'var(--cond)', bg: 'var(--cond-soft)' },
                nogo: { c: 'var(--nogo)', bg: 'var(--nogo-soft)' },
              };
              const a = accentMap[n.accent] || { c: 'var(--ink-3)', bg: 'var(--bg-3)' };
              return (
                <div key={n.id} style={{
                  position: 'absolute', left: n.x, top: n.y, width: n.w, height: n.h,
                  background: 'var(--surface)',
                  border: `1px solid ${n.sel ? 'var(--primary)' : 'var(--line)'}`,
                  boxShadow: n.sel ? '0 0 0 3px var(--primary-soft)' : 'none',
                  borderRadius: 8, padding: 10,
                  display: 'flex', gap: 10, alignItems: 'center',
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                    background: a.bg, color: a.c,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}><Glyph k={n.icon} size={16} stroke={1.8} /></span>
                  <div className="col" style={{ gap: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-0)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.t}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.s}</span>
                  </div>
                </div>
              );
            })}

            {/* Minimap */}
            <div style={{
              position: 'absolute', bottom: 14, right: 14,
              width: 180, height: 100,
              background: 'var(--panel)', border: '1px solid var(--line)',
              borderRadius: 6, padding: 6,
            }}>
              <div className="label" style={{ fontSize: 9 }}>MINIMAP</div>
              <div style={{ position: 'relative', width: '100%', height: 70 }}>
                {[[10,30],[50,30],[90,30],[125,55],[90,55],[55,80],[100,80]].map(([x,y],i) => (
                  <div key={i} style={{ position: 'absolute', left: x, top: y, width: 16, height: 6, background: 'var(--ink-3)', borderRadius: 1 }} />
                ))}
                <div style={{ position: 'absolute', left: 4, top: 26, width: 130, height: 60, border: '1px solid var(--primary)', borderRadius: 3 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right inspector */}
        <div className="col" style={{ width: 320, borderLeft: '1px solid var(--line)', flexShrink: 0, overflow: 'auto' }}>
          <div className="row between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
            <span className="h3">HSE approve · node</span>
            <Pill status="cond" label="REQUIRED" />
          </div>
          <div className="col" style={{ padding: 14, gap: 12 }}>
            <div className="col gap-4">
              <span className="field-label">Approver group</span>
              <div className="input row gap-6" style={{ alignItems: 'center' }}>
                <Glyph k="shield" size={12} style={{ color: 'var(--ink-3)' }} />
                <span style={{ fontSize: 12 }}>HSE Officers · Block 6</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 'auto' }}>4 USERS</span>
              </div>
            </div>
            <div className="col gap-4">
              <span className="field-label">Trigger condition</span>
              <div className="input row gap-6">
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-1)' }}>risk_score >= 3.6 OR passengers &gt; 6</span>
              </div>
            </div>
            <div className="row gap-8">
              <div className="col gap-4 grow">
                <span className="field-label">SLA · response</span>
                <div className="input row"><span style={{ fontSize: 12 }}>30 minutes</span></div>
              </div>
              <div className="col gap-4 grow">
                <span className="field-label">On timeout</span>
                <div className="input row"><span style={{ fontSize: 12 }}>Escalate to GM</span></div>
              </div>
            </div>
            <div className="col gap-4">
              <span className="field-label">Notification channels</span>
              <div className="row gap-6">
                {[['Email',true],['SMS',true],['WhatsApp',true],['In-app',true],['Phone call',false]].map(([t,on]) => (
                  <span key={t} className="row gap-4" style={{
                    padding: '4px 10px', borderRadius: 100,
                    background: on ? 'var(--primary-soft)' : 'var(--bg-2)',
                    border: '1px solid ' + (on ? 'rgba(74,144,255,0.3)' : 'var(--line)'),
                    color: on ? 'var(--primary)' : 'var(--ink-3)',
                    fontSize: 11,
                  }}>
                    {on && <Glyph k="check" size={10} stroke={3} />}{t}
                  </span>
                ))}
              </div>
            </div>
            <div className="col gap-4">
              <span className="field-label">Required attachments</span>
              <div className="col gap-4">
                {['Risk assessment form','HSE sign-off note','Driver fatigue check'].map(t => (
                  <div key={t} className="row between" style={{
                    padding: '6px 10px', borderRadius: 6,
                    background: 'var(--bg-2)', border: '1px solid var(--line-soft)',
                  }}>
                    <span style={{ fontSize: 11.5 }}>{t}</span>
                    <Glyph k="check" size={12} stroke={3} style={{ color: 'var(--go)' }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="col gap-4">
              <span className="field-label">On approve</span>
              <div className="card" style={{ padding: 10 }}>
                <div className="row gap-6">
                  <Glyph k="arrow" size={12} style={{ color: 'var(--ink-3)' }} />
                  <span style={{ fontSize: 11.5 }}>Set journey status → APPROVED</span>
                </div>
                <div className="row gap-6" style={{ marginTop: 4 }}>
                  <Glyph k="arrow" size={12} style={{ color: 'var(--ink-3)' }} />
                  <span style={{ fontSize: 11.5 }}>Lock vehicle assignment for 30 min</span>
                </div>
                <div className="row gap-6" style={{ marginTop: 4 }}>
                  <Glyph k="arrow" size={12} style={{ color: 'var(--ink-3)' }} />
                  <span style={{ fontSize: 11.5 }}>Notify driver app · push checklist</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OpsShell>
  );
}

Object.assign(window, { GMDashboard, VehicleProfile, AdminConfig });
