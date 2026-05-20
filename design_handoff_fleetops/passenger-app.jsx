// Passenger logistics app — 2 iOS screens
// Pickup request + live trip

function PaxHeader({ title, sub, dark = false }) {
  const ink = dark ? '#f1f4f8' : '#15181d';
  const dim = dark ? 'rgba(241,244,248,0.55)' : '#7a7468';
  return (
    <div style={{ padding: '8px 18px 14px' }}>
      <div className="row between">
        <div className="col" style={{ gap: 1 }}>
          <div style={{ fontSize: 11, color: dim, fontFamily: 'IBM Plex Mono',
            textTransform: 'uppercase', letterSpacing: '0.08em' }}>{sub}</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: ink, letterSpacing: '-0.02em' }}>{title}</div>
        </div>
        <div className="avatar" style={{ background: 'linear-gradient(135deg, #a78bfa, #f472b6)' }}>HA</div>
      </div>
    </div>
  );
}

function PaxTabBar({ active = 'home' }) {
  const tabs = [
    { k: 'home',  i: 'pin',   l: 'Home' },
    { k: 'trips', i: 'route', l: 'My trips' },
    { k: 'inbox', i: 'inbox', l: 'Inbox' },
    { k: 'me',    i: 'user',  l: 'Me' },
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
// 08 — Pickup request composer
// ─────────────────────────────────────────────────────────────
function PaxRequest() {
  return (
    <div className="fo" style={{ width: '100%', height: '100%' }}>
      <IOSDevice statusBarDark={true}>
        <div className="light col" style={{ width: '100%', height: '100%', position: 'relative' }}>
          <PaxHeader sub="TUE · 14 MAY · 06:42 LATER" title="Request a trip" />

          <div className="col gap-12" style={{ padding: '0 18px 100px', overflow: 'auto', flex: 1 }}>
            {/* Trip type chooser */}
            <div className="row gap-8">
              {['One-way','Round trip','Recurring'].map((t,i) => (
                <button key={t} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: i === 0 ? '#15181d' : '#fff',
                  color: i === 0 ? '#fff' : '#15181d',
                  border: i === 0 ? 'none' : '1px solid #e6e3dd',
                  fontSize: 12, fontWeight: 500,
                }}>{t}</button>
              ))}
            </div>

            {/* From / To */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e6e3dd', overflow: 'hidden' }}>
              <div className="row gap-12" style={{ padding: 14, borderBottom: '1px solid #f0ede6' }}>
                <div style={{ width: 28, display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 50, background: '#1ec991', border: '2px solid #fff', boxShadow: '0 0 0 1.5px #1ec991' }} />
                </div>
                <div className="col grow" style={{ gap: 2 }}>
                  <span style={{ fontSize: 10, color: '#7a7468', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono' }}>PICKUP</span>
                  <span style={{ fontSize: 14, color: '#15181d', fontWeight: 500 }}>Muscat HQ · Building 4 lobby</span>
                  <span style={{ fontSize: 11, color: '#7a7468' }}>Al Khuwair · Way 4302</span>
                </div>
              </div>
              <div className="row gap-12" style={{ padding: 14 }}>
                <div style={{ width: 28, display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                  <div className="col center" style={{ gap: 0 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 3, background: '#cdc8be', marginBottom: 2 }} />)}
                  </div>
                </div>
                <div className="col grow" style={{ gap: 2 }}>
                  <span style={{ fontSize: 10, color: '#7a7468', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono' }}>DROP-OFF</span>
                  <span style={{ fontSize: 14, color: '#15181d', fontWeight: 500 }}>Marmul Camp · Block C</span>
                  <span style={{ fontSize: 11, color: '#7a7468' }}>PDO Block 6 · approved sites</span>
                </div>
              </div>
              <div className="row" style={{
                padding: '8px 14px', background: '#f6f5f1',
                borderTop: '1px solid #f0ede6',
              }}>
                <span style={{ fontSize: 11, color: '#7a7468', fontFamily: 'IBM Plex Mono' }}>
                  <Glyph k="route" size={11} style={{ display: 'inline', verticalAlign: -2 }} /> 712 km · ~8h · pooled shuttle eligible
                </span>
                <div className="grow" />
                <Glyph k="chevR" size={14} style={{ color: '#9a9389' }} />
              </div>
            </div>

            {/* When */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e6e3dd', padding: 14 }}>
              <div className="row between" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: '#7a7468', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase' }}>WHEN</span>
                <span className="pill cond"><span className="dot" />SHIFT WINDOW</span>
              </div>
              <div className="row between">
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#15181d', fontFamily: 'IBM Plex Mono' }}>Tue 14 May · 06:00</div>
                  <div style={{ fontSize: 11, color: '#7a7468', marginTop: 2 }}>Within day-shift pickup window (05:30–07:00)</div>
                </div>
                <Glyph k="chevR" size={14} style={{ color: '#9a9389' }} />
              </div>
              <div className="row gap-6" style={{ marginTop: 12 }}>
                {[
                  ['05:30', false], ['06:00', true], ['06:30', false], ['07:00', false],
                ].map(([t,sel]) => (
                  <span key={t} style={{
                    flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8,
                    background: sel ? '#15181d' : '#f6f5f1', color: sel ? '#fff' : '#15181d',
                    fontSize: 12, fontWeight: 500, fontFamily: 'IBM Plex Mono',
                  }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Eligibility check */}
            <div style={{
              background: 'rgba(30,201,145,0.08)', borderRadius: 12,
              border: '1px solid rgba(30,201,145,0.25)', padding: 12,
            }}>
              <div className="row gap-8">
                <span style={{
                  width: 22, height: 22, borderRadius: 50, background: '#1ec991', color: '#08251c',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}><Glyph k="check" size={13} stroke={3.5} /></span>
                <div className="col grow" style={{ gap: 1 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#056b48' }}>You're eligible for this route</span>
                  <span style={{ fontSize: 11, color: '#0a6a4a' }}>PDO clearance valid · roster active · day-shift OK</span>
                </div>
              </div>
            </div>

            {/* Pool suggestion */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e6e3dd' }}>
              <div className="row between" style={{ padding: '12px 14px', borderBottom: '1px solid #f0ede6' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#7a7468', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase' }}>POOLABLE WITH</div>
                  <div style={{ fontSize: 13, color: '#15181d', fontWeight: 500, marginTop: 2 }}>3 nearby requests · same shift</div>
                </div>
                <span className="pill info"><span className="dot" />SAVE 18 min</span>
              </div>
              <div className="col">
                {[
                  ['H. Al-Lawati',  '06:00', 'Marmul Block C'],
                  ['F. Al-Amri',    '05:45', 'Marmul Block A'],
                  ['T. Al-Hosni',   '06:15', 'Marmul Workshop'],
                ].map(([n,t,d], i) => (
                  <div key={n} className="row gap-10" style={{
                    padding: '10px 14px', borderBottom: i < 2 ? '1px solid #f0ede6' : 'none',
                  }}>
                    <div className="avatar" style={{ width: 26, height: 26, fontSize: 10,
                      background: ['linear-gradient(135deg,#4a90ff,#38d4d4)','linear-gradient(135deg,#f472b6,#a78bfa)','linear-gradient(135deg,#f5a524,#ef4747)'][i] }}>
                      {n.split('.').map(s=>s.trim()[0]).join('')}
                    </div>
                    <div className="col grow" style={{ gap: 0 }}>
                      <span style={{ fontSize: 12.5, color: '#15181d' }}>{n}</span>
                      <span style={{ fontSize: 10.5, color: '#7a7468', fontFamily: 'IBM Plex Mono' }}>{t} · {d}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e6e3dd', padding: 14 }}>
              <div style={{ fontSize: 11, color: '#7a7468', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase' }}>NOTES TO PLANNER · OPTIONAL</div>
              <div style={{ fontSize: 13, color: '#9a9389', marginTop: 6, fontStyle: 'italic' }}>
                e.g. luggage, equipment, mobility needs…
              </div>
            </div>
          </div>

          {/* Submit footer */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '12px 18px 30px',
            background: 'rgba(246,245,241,0.96)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}>
            <button style={{
              width: '100%', height: 52, borderRadius: 14, border: 'none',
              background: '#15181d', color: '#fff',
              fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Submit request <Glyph k="arrow" size={16} stroke={2} />
            </button>
            <div style={{ fontSize: 10, color: '#7a7468', textAlign: 'center', marginTop: 6, fontFamily: 'IBM Plex Mono' }}>
              GOES TO MUSCAT LOGISTICS PLANNER · SLA 30 min
            </div>
          </div>
        </div>
      </IOSDevice>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 09 — My trip live
// ─────────────────────────────────────────────────────────────
function PaxLive() {
  const { mapStyle } = useFleetopsTweaks();
  return (
    <div className="fo" style={{ width: '100%', height: '100%' }}>
      <IOSDevice statusBarDark={true}>
        <div className="col" style={{ width: '100%', height: '100%', position: 'relative', background: '#f6f5f1' }}>
          {/* Map */}
          <div style={{
            flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden',
            background: mapStyle === 'dark' ? '#0c1118' : 'linear-gradient(180deg, #c8c0b0 0%, #d8d0c0 100%)',
          }}>
            <LeafletMap
              center={[23.59, 58.42]} zoom={12} theme={mapStyle}
              routes={[
                { coords: [[23.60, 58.40], [23.595, 58.43], [23.58, 58.45]], color: '#1ec991', weight: 3.5 },
                { coords: [[23.58, 58.45], [23.55, 58.47], [23.50, 58.50]], color: '#15181d', weight: 3, dash: '8 6', opacity: 0.5 },
              ]}
              markers={[
                { latlng: [23.60, 58.40], html: '<div class="fo-leaflet-pin" style="background:#1ec991;width:12px;height:12px;border-width:2px"></div>' },
                { latlng: [23.50, 58.50], html: '<div class="fo-leaflet-pin" style="background:#15181d;width:14px;height:14px;border-width:2px"></div>' },
                { latlng: [23.585, 58.44], size: [44,44], anchor: [22,22],
                  html: `<div style="width:44px;height:44px;border-radius:50%;background:#fff;border:3px solid #15181d;box-shadow:0 6px 14px rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15181d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3zm11 3h4l3 3v3h-7zM6 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>
                  </div>` },
              ]}
            />

            <div style={{ position: 'absolute', top: 16, left: 16 }}>
              <div style={{
                background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(20px)',
                borderRadius: 100, padding: '8px 14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Glyph k="arrowL" size={16} stroke={2} style={{ color: '#15181d' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#15181d' }}>My trip</span>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 16, right: 16 }}>
              <button style={{
                background: '#fff', borderRadius: 100, padding: '8px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: 'none', display: 'flex', alignItems: 'center', gap: 6,
                color: '#15181d', fontSize: 12, fontWeight: 500,
              }}><Glyph k="link" size={14} />Share ETA</button>
            </div>
          </div>

          {/* Bottom card */}
          <div style={{
            background: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
            padding: '14px 18px 92px',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.06)',
            marginTop: -12, position: 'relative', zIndex: 5,
          }}>
            <div style={{ width: 36, height: 4, background: '#cdc8be', borderRadius: 100, margin: '0 auto 14px' }} />

            {/* Status */}
            <div className="row between" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#7a7468', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase' }}>SHUTTLE IS ON THE WAY</span>
              <span className="pill go"><span className="dot" />ON TIME</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#15181d', fontFamily: 'IBM Plex Mono', letterSpacing: '-0.02em' }}>
              4 min away
            </div>
            <div style={{ fontSize: 12, color: '#7a7468', marginTop: 2 }}>
              Picking up at Muscat HQ · Building 4 lobby
            </div>

            {/* Vehicle / driver */}
            <div style={{
              marginTop: 14, padding: 12, borderRadius: 12,
              background: '#f6f5f1', display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <Placeholder w={56} h={56} label="driver" style={{ borderRadius: 12, border: 'none', flexShrink: 0 }} />
              <div className="col grow" style={{ gap: 2 }}>
                <div className="row between">
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#15181d' }}>Daoud A.</span>
                  <span className="row gap-4" style={{ fontSize: 11, color: '#7a7468', fontFamily: 'IBM Plex Mono' }}>
                    ★ 4.92 · 3 trips
                  </span>
                </div>
                <span style={{ fontSize: 11.5, color: '#7a7468' }}>Toyota Coaster · 14 seats</span>
                <span style={{ fontSize: 11, color: '#15181d', fontFamily: 'IBM Plex Mono', fontWeight: 500 }}>
                  Plate 34-D-1129
                </span>
              </div>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', background: '#15181d',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}><Glyph k="phone" size={16} stroke={2} /></div>
            </div>

            {/* Stops */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: '#7a7468', letterSpacing: '0.08em', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', marginBottom: 8 }}>STOPS ON YOUR ROUTE</div>
              {[
                ['Muscat HQ',     '06:00', 'next', 'you + 1 board'],
                ['Athaibah camp', '06:14', 'pending', '2 board'],
                ['Bidbid PIT',    '07:35', 'pending', '1 board'],
                ['Marmul gate',   '13:45', 'pending', 'drop · destination'],
              ].map(([place, t, s, sub], i, arr) => (
                <div key={i} className="row gap-10">
                  <div className="col center" style={{ width: 14 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: 50,
                      background: s === 'next' ? '#1ec991' : '#cdc8be',
                      boxShadow: s === 'next' ? '0 0 0 4px rgba(30,201,145,0.2)' : 'none',
                    }} />
                    {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: '#cdc8be', minHeight: 16 }} />}
                  </div>
                  <div className="col grow" style={{ gap: 0, paddingBottom: i < arr.length - 1 ? 8 : 0 }}>
                    <div className="row between gap-8">
                      <span style={{ fontSize: 13, color: s==='pending' ? '#7a7468' : '#15181d', fontWeight: s === 'next' ? 600 : 400 }}>{place}</span>
                      <span style={{ fontSize: 11, color: '#7a7468', fontFamily: 'IBM Plex Mono' }}>{t}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#9a9389' }}>{sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <PaxTabBar active="trips" />
        </div>
      </IOSDevice>
    </div>
  );
}

Object.assign(window, { PaxRequest, PaxLive });
