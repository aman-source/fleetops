// Driver mobile app — iOS frames
// 4 screens: Today, Pre-trip checklist, NFC, In-trip

const drvCard = {
  background: '#fff', borderRadius: 14, border: '1px solid #e6e3dd',
  padding: 14,
};

// Mobile chrome — top app bar inside iOS frame
function DrvHeader({ title, sub, action }) {
  return (
    <div style={{
      padding: '8px 18px 12px', background: '#f6f5f1',
    }}>
      <div className="row between">
        <div className="col" style={{ gap: 1 }}>
          <div style={{ fontSize: 11, color: '#7a7468', fontFamily: 'IBM Plex Mono',
            textTransform: 'uppercase', letterSpacing: '0.08em' }}>{sub}</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#15181d', letterSpacing: '-0.02em' }}>{title}</div>
        </div>
        {action}
      </div>
    </div>
  );
}

function DrvTabBar({ active = 'today' }) {
  const tabs = [
    { k: 'today',  i: 'flag',  l: 'Today' },
    { k: 'trips',  i: 'route', l: 'Trips' },
    { k: 'check',  i: 'shieldChk', l: 'Checks' },
    { k: 'def',    i: 'alert', l: 'Defects' },
    { k: 'me',     i: 'user',  l: 'Me' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      background: 'rgba(246,245,241,0.92)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(0,0,0,0.06)',
      paddingTop: 8, paddingBottom: 28,
      display: 'flex', justifyContent: 'space-around',
    }}>
      {tabs.map(t => (
        <div key={t.k} className="col center" style={{ gap: 3, flex: 1 }}>
          <Glyph k={t.i} size={20} stroke={1.8}
            style={{ color: active === t.k ? '#15181d' : '#9a9389' }} />
          <span style={{ fontSize: 10, fontWeight: 500,
            color: active === t.k ? '#15181d' : '#9a9389' }}>{t.l}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen 04 — Today (assigned trip overview)
// ─────────────────────────────────────────────────────────────
function DrvToday() {
  return (
    <div className="fo" style={{ width: '100%', height: '100%' }}>
      <IOSDevice statusBarDark={true}>
        <div className="light col" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
          <DrvHeader sub="MONDAY · 13 MAY" title="Salaam, Daoud"
            action={<div className="avatar" style={{ background: 'linear-gradient(135deg, #4a90ff, #38d4d4)' }}>DA</div>} />

          <div className="col gap-12" style={{ padding: '0 18px 100px', overflow: 'auto', flex: 1 }}>
            {/* Status banner */}
            <div style={{
              background: '#0f141b', borderRadius: 14, padding: 14,
              color: '#f1f4f8', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,144,255,0.35), transparent 70%)' }} />
              <div className="row between" style={{ position: 'relative' }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono' }}>NEXT TRIP · APPROVED</div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginTop: 6 }}>Marmul → Nimr-2</div>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, opacity: 0.8, marginTop: 2 }}>JM-25-04018 · 4 passengers · 142 km</div>
                </div>
                <span className="pill go" style={{ background: 'rgba(30,201,145,0.2)', color: '#3ee0a8', border: '1px solid rgba(30,201,145,0.4)' }}><span className="dot" />READY</span>
              </div>
              <div className="row gap-12" style={{ marginTop: 14, position: 'relative' }}>
                <div className="col">
                  <span style={{ fontSize: 10, opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'IBM Plex Mono' }}>DEPART</span>
                  <span style={{ fontSize: 22, fontWeight: 500, fontFamily: 'IBM Plex Mono' }}>14:30</span>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                <div className="col">
                  <span style={{ fontSize: 10, opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'IBM Plex Mono' }}>ETA</span>
                  <span style={{ fontSize: 22, fontWeight: 500, fontFamily: 'IBM Plex Mono' }}>16:50</span>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                <div className="col">
                  <span style={{ fontSize: 10, opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'IBM Plex Mono' }}>RISK</span>
                  <span style={{ fontSize: 22, fontWeight: 500, fontFamily: 'IBM Plex Mono', color: '#f5a524' }}>M</span>
                </div>
              </div>
            </div>

            {/* Vehicle */}
            <div style={drvCard}>
              <div className="row gap-12">
                <div style={{
                  width: 52, height: 52, borderRadius: 10,
                  background: '#f0ede6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#1a1d22',
                }}>
                  <Glyph k="truck" size={26} stroke={1.6} />
                </div>
                <div className="col grow" style={{ gap: 2 }}>
                  <div className="row between">
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#15181d', fontFamily: 'IBM Plex Mono' }}>12-A-3471</span>
                    <span style={{ fontSize: 11, color: '#7a7468' }}>Bay 4 · Marmul</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#5e6776' }}>Toyota Hilux DC · 2024 · 47,820 km</span>
                </div>
              </div>
              <div className="row gap-8" style={{ marginTop: 12 }}>
                <span className="pill go"><span className="dot" />MAINT GO</span>
                <span className="pill go"><span className="dot" />DOCS</span>
                <span className="pill go"><span className="dot" />IVMS</span>
                <span className="pill cond"><span className="dot" />RAS 18d</span>
              </div>
            </div>

            {/* Tasks */}
            <div style={{ ...drvCard, padding: 0 }}>
              <div style={{ padding: '14px 14px 8px', borderBottom: '1px solid #f0ede6' }}>
                <span style={{ fontSize: 11, color: '#7a7468', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase' }}>BEFORE YOU DEPART</span>
              </div>
              {[
                { i: 'shieldChk', l: 'Complete pre-trip checklist', s: '18 items · ~5 min', done: false },
                { i: 'nfc', l: 'Tap NFC card at ignition', s: 'Auth driver to vehicle', done: false },
                { i: 'users', l: 'Confirm passenger boarding', s: '4 manifested · tap to scan', done: false },
                { i: 'flag', l: 'Acknowledge journey plan', s: 'Read route notes · daylight only', done: true },
              ].map((t, i, arr) => (
                <div key={t.l} className="row gap-12" style={{
                  padding: '12px 14px',
                  borderBottom: i < arr.length - 1 ? '1px solid #f0ede6' : 'none',
                  opacity: t.done ? 0.55 : 1,
                }}>
                  <div className={`check-box ${t.done ? 'checked' : ''}`} style={{
                    width: 22, height: 22, borderRadius: 50,
                    borderColor: t.done ? '#1ec991' : '#cdc8be',
                    background: t.done ? '#1ec991' : '#fff',
                  }}>
                    {t.done && <Glyph k="check" size={12} stroke={3.5} />}
                  </div>
                  <div className="col grow" style={{ gap: 1 }}>
                    <span style={{ fontSize: 13, color: '#15181d', textDecoration: t.done ? 'line-through' : 'none' }}>{t.l}</span>
                    <span style={{ fontSize: 11, color: '#7a7468' }}>{t.s}</span>
                  </div>
                  <Glyph k="chevR" size={14} style={{ color: '#9a9389' }} />
                </div>
              ))}
            </div>

            {/* Primary action */}
            <button className="btn primary lg" style={{
              width: '100%', height: 52, borderRadius: 12, fontSize: 15,
              background: '#15181d', borderColor: '#15181d', color: '#fff',
              justifyContent: 'center',
            }}>
              Start pre-trip <Glyph k="arrow" size={16} stroke={2} />
            </button>
          </div>

          <DrvTabBar active="today" />
        </div>
      </IOSDevice>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen 05 — Pre-trip checklist
// ─────────────────────────────────────────────────────────────
function DrvChecklist() {
  const items = [
    { l: 'Tires & visible damage',   s: 'OK · all 4 tires above min', state: 'pass' },
    { l: 'Lights & indicators',      s: 'OK · checked headlamps/tail', state: 'pass' },
    { l: 'Mirrors & windshield',     s: 'OK · clean, no cracks', state: 'pass' },
    { l: 'Fluid leaks under vehicle',s: 'NONE observed', state: 'pass' },
    { l: 'Seatbelts (all seats)',    s: '5 / 5 functional', state: 'pass' },
    { l: 'Fire extinguisher',        s: '⚠ Pressure low — needs check', state: 'fail' },
    { l: 'First aid kit',            s: 'Present · sealed', state: 'pass' },
    { l: 'Warning triangle & spare', s: 'Present', state: 'pass' },
    { l: 'GPS / IVMS device LED',    s: '—', state: 'pending' },
    { l: 'NFC reader self-test',     s: '—', state: 'pending' },
    { l: 'Panic button press-test',  s: '—', state: 'pending' },
    { l: 'Documents in cab',         s: '—', state: 'pending' },
  ];
  return (
    <div className="fo" style={{ width: '100%', height: '100%' }}>
      <IOSDevice statusBarDark={true}>
        <div className="light col" style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div className="row between" style={{ padding: '6px 18px 0' }}>
            <Glyph k="arrowL" size={20} stroke={1.8} style={{ color: '#15181d' }} />
            <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', color: '#7a7468' }}>STEP 1 OF 6</span>
            <Glyph k="x" size={18} stroke={1.8} style={{ color: '#15181d' }} />
          </div>
          <DrvHeader sub="PRE-TRIP · VEHICLE EXTERIOR" title="Walk-around" />

          <div className="col" style={{ padding: '0 18px 16px', overflow: 'auto', flex: 1 }}>
            {/* Progress */}
            <div className="row between" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: '#7a7468', fontFamily: 'IBM Plex Mono', letterSpacing: '0.08em' }}>8 / 18 COMPLETE</span>
              <span style={{ fontSize: 11, color: '#dc2626', fontFamily: 'IBM Plex Mono' }}>1 DEFECT</span>
            </div>
            <div style={{ height: 4, background: '#e6e3dd', borderRadius: 100, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ width: '44%', height: '100%', background: '#15181d' }} />
            </div>

            {/* Photo capture row */}
            <div className="row gap-8" style={{ marginBottom: 14 }}>
              {[
                { l: 'Front', filled: true },
                { l: 'L side', filled: true },
                { l: 'R side', filled: false },
                { l: 'Rear', filled: false },
              ].map(p => (
                <div key={p.l} className="col" style={{ flex: 1, gap: 4 }}>
                  <div style={{
                    aspectRatio: '1', borderRadius: 10,
                    background: p.filled ?
                      'repeating-linear-gradient(135deg, #d6d2c8 0 6px, #c9c5bb 6px 12px)' : '#f0ede6',
                    border: p.filled ? 'none' : '1.5px dashed #cdc8be',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: p.filled ? '#5e6776' : '#9a9389',
                  }}>
                    {p.filled ? <Glyph k="check" size={20} stroke={2.5} /> : <Glyph k="camera" size={18} stroke={1.5} />}
                  </div>
                  <span style={{ fontSize: 10, color: '#7a7468', textAlign: 'center', fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em' }}>{p.l}</span>
                </div>
              ))}
            </div>

            {/* Items */}
            <div className="col gap-6">
              {items.map((t, i) => (
                <div key={i} className="row gap-12" style={{
                  background: '#fff', borderRadius: 10,
                  padding: '11px 14px',
                  border: t.state === 'fail' ? '1px solid rgba(220,38,38,0.4)' : '1px solid #e6e3dd',
                }}>
                  <div className="check-box" style={{
                    width: 22, height: 22, borderRadius: 7,
                    borderColor: t.state === 'fail' ? '#dc2626' : t.state === 'pass' ? '#1ec991' : '#cdc8be',
                    background: t.state === 'fail' ? '#dc2626' : t.state === 'pass' ? '#1ec991' : 'transparent',
                    color: '#fff',
                  }}>
                    {t.state === 'pass' && <Glyph k="check" size={12} stroke={3.5} />}
                    {t.state === 'fail' && <Glyph k="x" size={12} stroke={3} />}
                  </div>
                  <div className="col grow" style={{ gap: 1 }}>
                    <span style={{ fontSize: 13, color: '#15181d' }}>{t.l}</span>
                    <span style={{ fontSize: 11, color: t.state === 'fail' ? '#9a1212' : '#7a7468' }}>{t.s}</span>
                  </div>
                  {t.state === 'pending' && <Glyph k="chevR" size={14} style={{ color: '#9a9389' }} />}
                </div>
              ))}
            </div>

            {/* Defect detail card */}
            <div style={{
              marginTop: 14, background: 'rgba(220,38,38,0.06)',
              border: '1px solid rgba(220,38,38,0.25)', borderRadius: 12, padding: 14,
            }}>
              <div className="row gap-8">
                <Glyph k="alert" size={16} style={{ color: '#dc2626' }} stroke={2} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#9a1212' }}>Defect logged · Fire extinguisher</span>
              </div>
              <div style={{ fontSize: 12, color: '#7a4040', marginTop: 4 }}>
                Pressure gauge reads below green band. Photo uploaded. This will trigger an Auto Conditional Release — Maintenance has been notified and will replace before departure.
              </div>
              <div className="row gap-8" style={{ marginTop: 10 }}>
                <Placeholder w={56} h={56} style={{ borderRadius: 6, border: 'none', background: 'repeating-linear-gradient(135deg, #b8a888 0 6px, #a89878 6px 12px)' }} />
                <Placeholder w={56} h={56} style={{ borderRadius: 6, border: 'none', background: 'repeating-linear-gradient(135deg, #b8a888 0 6px, #a89878 6px 12px)' }} />
              </div>
            </div>
          </div>

          {/* Footer CTAs */}
          <div style={{
            padding: '12px 18px 30px',
            background: 'rgba(246,245,241,0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', gap: 10,
          }}>
            <button style={{
              padding: '14px 20px', borderRadius: 12, border: '1px solid #cdc8be',
              background: '#fff', color: '#15181d', fontSize: 14, fontWeight: 500,
            }}>Back</button>
            <button style={{
              flex: 1, padding: '14px 20px', borderRadius: 12, border: 'none',
              background: '#15181d', color: '#fff', fontSize: 14, fontWeight: 500,
            }}>Continue to Safety equipment →</button>
          </div>
        </div>
      </IOSDevice>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen 06 — NFC tap
// ─────────────────────────────────────────────────────────────
function DrvNFC() {
  return (
    <div className="fo" style={{ width: '100%', height: '100%' }}>
      <IOSDevice statusBarDark={false}>
        <div className="col" style={{
          width: '100%', height: '100%', position: 'relative',
          background: 'radial-gradient(ellipse 80% 60% at 50% 35%, #1a2530 0%, #0a0d12 70%)',
          color: '#f1f4f8',
        }}>
          <div className="row between" style={{ padding: '6px 18px 0' }}>
            <Glyph k="arrowL" size={20} stroke={1.8} style={{ color: '#f1f4f8' }} />
            <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', color: 'rgba(241,244,248,0.55)' }}>STEP 5 OF 6</span>
            <Glyph k="x" size={18} stroke={1.8} style={{ color: '#f1f4f8' }} />
          </div>
          <div className="col" style={{ padding: '12px 18px 0' }}>
            <div style={{ fontSize: 11, color: 'rgba(241,244,248,0.55)', fontFamily: 'IBM Plex Mono',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>DRIVER AUTHENTICATION</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, letterSpacing: '-0.02em' }}>Tap your NFC card</div>
            <div style={{ fontSize: 13, color: 'rgba(241,244,248,0.65)', marginTop: 4 }}>
              Hold your driver card against the reader on the dashboard until you hear the confirmation tone.
            </div>
          </div>

          <div className="col center grow" style={{ position: 'relative' }}>
            {/* Pulse rings */}
            <div style={{ position: 'relative', width: 220, height: 220 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  position: 'absolute', inset: 0,
                  border: '1.5px solid rgba(74,144,255,0.4)',
                  borderRadius: '50%',
                  animation: `pulse${i} 2.4s ease-out infinite ${i * 0.6}s`,
                }} />
              ))}
              <div style={{
                position: 'absolute', inset: 30,
                background: 'radial-gradient(circle, rgba(74,144,255,0.25), transparent 65%)',
                borderRadius: '50%',
              }} />
              {/* Card */}
              <div style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: 'translate(-50%, -50%) rotate(-8deg)',
                width: 140, height: 88, borderRadius: 10,
                background: 'linear-gradient(135deg, #2a3340, #181f29)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 16px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,144,255,0.3)',
                padding: 10,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div className="row between">
                  <Glyph k="nfc" size={18} style={{ color: '#4a90ff' }} stroke={1.8} />
                  <span style={{ fontSize: 8, fontFamily: 'IBM Plex Mono', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>FLEETOPS</span>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: 'IBM Plex Mono', letterSpacing: '0.05em' }}>DAOUD AL-BUSAIDI</div>
                  <div style={{ fontSize: 10, color: '#fff', fontFamily: 'IBM Plex Mono' }}>04:E2:1F:8B</div>
                </div>
              </div>
            </div>

            <div className="col center" style={{ marginTop: 30, gap: 6 }}>
              <span className="pill" style={{
                background: 'rgba(74,144,255,0.15)', color: '#7baaf7',
                border: '1px solid rgba(74,144,255,0.4)', padding: '4px 12px',
              }}>
                <span className="dot" style={{ background: '#4a90ff', animation: 'blink 1.2s infinite' }} />
                LISTENING · 12 SEC
              </span>
              <span style={{ fontSize: 12, color: 'rgba(241,244,248,0.5)', fontFamily: 'IBM Plex Mono' }}>
                Reader: VEH 12-A-3471 · DASH-RDR-04
              </span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 18px 30px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: 12,
              marginBottom: 12,
            }}>
              <div className="row gap-8">
                <Glyph k="alert" size={14} style={{ color: '#f5a524' }} stroke={2} />
                <span style={{ fontSize: 12, color: '#f1f4f8', fontWeight: 500 }}>Card unreadable?</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(241,244,248,0.55)', marginTop: 2 }}>
                You can request manual override from your Journey Manager. All overrides are logged.
              </div>
            </div>
            <button style={{
              width: '100%', padding: '14px', borderRadius: 12,
              background: 'transparent', color: '#7baaf7',
              border: '1px solid rgba(74,144,255,0.4)',
              fontSize: 14, fontWeight: 500,
            }}>Request manual override</button>
          </div>

          <style>{`
            @keyframes pulse0 { 0%{transform:scale(0.4);opacity:1} 100%{transform:scale(1);opacity:0} }
            @keyframes pulse1 { 0%{transform:scale(0.4);opacity:1} 100%{transform:scale(1);opacity:0} }
            @keyframes pulse2 { 0%{transform:scale(0.4);opacity:1} 100%{transform:scale(1);opacity:0} }
            @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
          `}</style>
        </div>
      </IOSDevice>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen 07 — In-trip live
// ─────────────────────────────────────────────────────────────
function DrvInTrip() {
  const { mapStyle } = useFleetopsTweaks();
  return (
    <div className="fo" style={{ width: '100%', height: '100%' }}>
      <IOSDevice statusBarDark={true}>
        <div className="col" style={{ width: '100%', height: '100%', position: 'relative', background: '#f6f5f1' }}>
          {/* Map area */}
          <div style={{
            flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden',
            background: mapStyle === 'dark' ? '#0c1118' : 'linear-gradient(180deg, #c8c0b0 0%, #d8d0c0 100%)',
          }}>
            <LeafletMap
              center={[18.85, 55.78]} zoom={11} theme={mapStyle === 'dark' ? 'dark' : mapStyle}
              routes={[
                { coords: [[18.55, 55.55], [18.70, 55.65], [18.85, 55.78]], color: '#1ec991', weight: 3.5 },
                { coords: [[18.85, 55.78], [19.00, 55.88], [19.13, 55.93]], color: '#15181d', weight: 3, dash: '8 6', opacity: 0.55 },
              ]}
              markers={[
                { latlng: [18.55, 55.55], html: '<div class="fo-leaflet-pin" style="background:#1ec991;width:12px;height:12px;border-width:2px"></div>' },
                { latlng: [19.13, 55.93], html: '<div class="fo-leaflet-pin" style="background:#15181d;width:14px;height:14px;border-width:2px"></div>' },
                { latlng: [18.85, 55.78], size: [44,44], anchor: [22,22],
                  html: `<div style="width:36px;height:36px;border-radius:50%;background:#4a90ff;border:3px solid #fff;box-shadow:0 0 0 8px rgba(74,144,255,0.2),0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(-45deg)"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </div>` },
              ]}
            />
            {/* HUD top */}
            <div style={{
              position: 'absolute', top: 16, left: 16, right: 16,
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
              borderRadius: 14, padding: '10px 14px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            }}>
              <div className="row between">
                <div>
                  <div style={{ fontSize: 10, color: '#7a7468', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono' }}>NEXT WAYPOINT</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#15181d' }}>Nimr-2 main camp</div>
                </div>
                <div className="col" style={{ alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: '#15181d', fontFamily: 'IBM Plex Mono' }}>40 km</span>
                  <span style={{ fontSize: 11, color: '#7a7468', fontFamily: 'IBM Plex Mono' }}>ETA 16:50</span>
                </div>
              </div>
            </div>
            {/* Speed badge */}
            <div style={{
              position: 'absolute', left: 16, bottom: 124,
              width: 72, height: 72, borderRadius: '50%',
              background: '#fff', boxShadow: '0 6px 14px rgba(0,0,0,0.15)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '3px solid #15181d',
            }}>
              <span style={{ fontSize: 22, fontWeight: 600, fontFamily: 'IBM Plex Mono', color: '#15181d' }}>87</span>
              <span style={{ fontSize: 9, color: '#7a7468', fontFamily: 'IBM Plex Mono', letterSpacing: '0.08em', marginTop: -2 }}>KM/H</span>
            </div>
            <div style={{
              position: 'absolute', right: 16, bottom: 124, display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {[['nfc','#1ec991'],['signal','#1ec991'],['shield','#1ec991']].map(([k,c]) => (
                <div key={k} style={{
                  width: 38, height: 38, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: c, border: '1px solid rgba(0,0,0,0.06)',
                }}>
                  <Glyph k={k} size={18} stroke={1.8} />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom sheet */}
          <div style={{
            background: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
            padding: '14px 18px 30px',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.06)',
            marginTop: -10, position: 'relative', zIndex: 5,
          }}>
            <div style={{ width: 36, height: 4, background: '#cdc8be', borderRadius: 100, margin: '0 auto 12px' }} />
            <div className="row between">
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 10, color: '#7a7468', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono' }}>JM-25-04018 · ACTIVE</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#15181d' }}>Marmul → Nimr-2</span>
              </div>
              <span className="pill go"><span className="dot" />ON ROUTE</span>
            </div>
            <div className="row gap-10" style={{ marginTop: 14 }}>
              {[
                { l: 'PASSENGERS', v: '4 / 4', c: '#1ec991' },
                { l: 'FUEL', v: '64 %', c: '#15181d' },
                { l: 'TIME LEFT', v: '0:28', c: '#15181d' },
              ].map(x => (
                <div key={x.l} style={{ flex: 1, padding: 10, borderRadius: 10, background: '#f6f5f1' }}>
                  <div style={{ fontSize: 9, color: '#7a7468', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono' }}>{x.l}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: x.c, fontFamily: 'IBM Plex Mono', marginTop: 2 }}>{x.v}</div>
                </div>
              ))}
            </div>
            <div className="row gap-8" style={{ marginTop: 12 }}>
              <button style={{
                flex: 1, padding: '12px', borderRadius: 12, background: '#f6f5f1',
                border: '1px solid #e6e3dd', color: '#15181d', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}><Glyph k="alert" size={14} stroke={1.8} />Report defect</button>
              <button style={{
                padding: '12px 16px', borderRadius: 12, background: '#dc2626',
                border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}><Glyph k="panic" size={14} stroke={2} />SOS</button>
            </div>
          </div>
        </div>
      </IOSDevice>
    </div>
  );
}

Object.assign(window, { DrvToday, DrvChecklist, DrvNFC, DrvInTrip });
