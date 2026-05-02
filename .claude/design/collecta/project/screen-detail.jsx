// Collecta — Collection detail screen

function CollectionDetailScreen({ collection, onBack }) {
  const c = collection || MY_COLLECTIONS[0];
  const items = c.items || [];
  const placeholders = Math.max(0, c.total - items.length);
  const pct = c.found / c.total;

  const placeholderNames = [
    'Munchkin', 'Abyssinian', 'Himalayan', 'Burmese', 'Birman',
    'Chartreux', 'Devon Rex', 'Turkish Angora', 'Manx', 'Bombay',
    'Korat', 'Snowshoe', 'Nebelung', 'Cornish Rex', 'Havana Brown',
    'Savannah',
  ];

  return (
    <div style={{ paddingBottom: 140, minHeight: '100%', background: THEME.bg }}>
      {/* Header image */}
      <div style={{
        position: 'relative', height: 280, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `url(${c.cover}) center/cover`,
          filter: 'brightness(0.75)',
        }}/>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(180deg, rgba(14,17,22,0.35) 0%, rgba(14,17,22,0) 40%, ${THEME.bg} 100%)`,
        }}/>
        {/* Top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '56px 16px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={onBack} style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'rgba(10,13,18,0.5)', backdropFilter: 'blur(14px)',
            border: `1px solid rgba(255,255,255,0.08)`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="chevronLeft" size={20} color="#F4F1EA"/>
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <IconBtn icon="share"/>
            <IconBtn icon="dots"/>
          </div>
        </div>
      </div>

      {/* Title block */}
      <div style={{ padding: '0 20px', marginTop: -10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>{c.emoji}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: THEME.textDim,
                textTransform: 'uppercase', letterSpacing: 1.2,
              }}>{c.category} · Public</span>
            </div>
            <div style={{
              fontSize: 28, fontWeight: 700, color: THEME.text,
              fontFamily: 'Fraunces, serif', letterSpacing: -0.5, lineHeight: 1.1,
            }}>{c.title}</div>
          </div>
          <ProgressRing size={72} stroke={6} progress={pct}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: THEME.gold, lineHeight: 1 }}>
                {c.found}
              </div>
              <div style={{ fontSize: 10, color: THEME.textDim, marginTop: 1 }}>
                of {c.total}
              </div>
            </div>
          </ProgressRing>
        </div>

        <div style={{ fontSize: 13.5, color: THEME.textDim, lineHeight: 1.5, marginBottom: 16 }}>
          Finding every cat breed roaming New York. 16 to go — the Sphynx was the hardest.
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          background: THEME.surface, borderRadius: 16, padding: '12px 0',
          border: `1px solid ${THEME.stroke}`, marginBottom: 20,
        }}>
          {[
            { k: '14', l: 'Found' },
            { k: '16', l: 'Remaining' },
            { k: '42d', l: 'Collecting' },
          ].map((s, i) => (
            <div key={i} style={{
              textAlign: 'center',
              borderRight: i < 2 ? `1px solid ${THEME.stroke}` : 'none',
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text, fontFamily: 'Fraunces, serif' }}>{s.k}</div>
              <div style={{ fontSize: 10.5, color: THEME.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Mini map */}
        <div style={{
          position: 'relative', height: 120, borderRadius: 18,
          overflow: 'hidden', marginBottom: 24,
          background: '#1A2230', border: `1px solid ${THEME.stroke}`,
        }}>
          <MiniMap/>
          <div style={{
            position: 'absolute', top: 10, left: 12,
            fontSize: 11, fontWeight: 600, color: THEME.text, letterSpacing: 0.3,
          }}>
            FOUND AROUND NYC
          </div>
          <div style={{
            position: 'absolute', bottom: 10, right: 12,
            padding: '4px 8px', background: 'rgba(10,13,18,0.7)',
            backdropFilter: 'blur(10px)', borderRadius: 100,
            fontSize: 11, fontWeight: 600, color: '#F4F1EA',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            View map <Icon name="chevronRight" size={11} color="#F4F1EA"/>
          </div>
        </div>

        {/* Section title */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: THEME.text }}>
            Your finds
          </div>
          <div style={{ display: 'flex', gap: 4, background: THEME.surface, padding: 3, borderRadius: 10 }}>
            <div style={{ padding: '5px 9px', background: THEME.surfaceHi, borderRadius: 7 }}>
              <Icon name="grid" size={14} color={THEME.text}/>
            </div>
            <div style={{ padding: '5px 9px' }}>
              <Icon name="map" size={14} color={THEME.textDim}/>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7,
        }}>
          {items.map(it => (
            <div key={it.id} style={{
              aspectRatio: '1', borderRadius: 12, position: 'relative',
              background: `url(${it.photo}) center/cover, #222`,
              border: `1px solid ${THEME.stroke}`, overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7))',
              }}/>
              <div style={{
                position: 'absolute', bottom: 5, left: 6, right: 6,
                fontSize: 10, fontWeight: 600, color: THEME.text,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{it.name}</div>
              <div style={{
                position: 'absolute', top: 5, right: 5,
                width: 16, height: 16, borderRadius: '50%',
                background: THEME.gold, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="check" size={10} color="#1A1410" strokeWidth={3}/>
              </div>
            </div>
          ))}
          {Array.from({ length: placeholders }).map((_, i) => (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 12, position: 'relative',
              background: 'rgba(255,255,255,0.03)',
              border: `1px dashed ${THEME.strokeHi}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 6,
            }}>
              <div style={{
                fontSize: 9.5, color: THEME.textMuted, textAlign: 'center',
                fontWeight: 500, letterSpacing: 0.1, lineHeight: 1.2,
              }}>
                {placeholderNames[i] || '???'}
              </div>
            </div>
          ))}
        </div>

        {/* Share CTA */}
        <div style={{
          display: 'flex', gap: 10, marginTop: 22,
        }}>
          <button style={{
            flex: 1, padding: '14px 0', borderRadius: 14,
            background: `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.gold})`,
            color: '#1A1410', fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon name="camera" size={17} color="#1A1410" strokeWidth={2.2}/>
            Add a find
          </button>
          <button style={{
            padding: '14px 18px', borderRadius: 14,
            background: THEME.surface, color: THEME.text,
            fontSize: 14, fontWeight: 600,
            border: `1px solid ${THEME.stroke}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="share" size={16} color={THEME.text}/>
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ icon }) {
  return (
    <button style={{
      width: 38, height: 38, borderRadius: 12,
      background: 'rgba(10,13,18,0.5)', backdropFilter: 'blur(14px)',
      border: `1px solid rgba(255,255,255,0.08)`, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={icon} size={18} color="#F4F1EA"/>
    </button>
  );
}

// Stylized mini-map — street grid with pins
function MiniMap() {
  const pins = [
    { x: 22, y: 40 }, { x: 38, y: 28 }, { x: 52, y: 52 },
    { x: 68, y: 32 }, { x: 76, y: 62 }, { x: 30, y: 72 },
    { x: 46, y: 80 }, { x: 60, y: 18 }, { x: 84, y: 44 },
    { x: 14, y: 58 }, { x: 88, y: 22 }, { x: 42, y: 56 },
    { x: 58, y: 70 }, { x: 72, y: 82 },
  ];
  return (
    <svg viewBox="0 0 100 70" preserveAspectRatio="xMidYMid slice" style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
    }}>
      {/* Water */}
      <rect width="100" height="70" fill={THEME.mapBg}/>
      <path d="M0 0 L 12 0 L 14 15 L 10 30 L 15 50 L 8 70 L 0 70 Z" fill={THEME.mapBgDeep}/>
      <path d="M90 0 L 100 0 L 100 70 L 92 70 L 88 50 L 94 30 L 90 15 Z" fill={THEME.mapBgDeep}/>
      {/* Streets */}
      {[15, 25, 35, 45, 55].map(y => (
        <line key={y} x1="14" y1={y} x2="88" y2={y} stroke={THEME.mapStreet} strokeWidth="0.4"/>
      ))}
      {[20, 30, 42, 52, 62, 72, 82].map(x => (
        <line key={x} x1={x} y1="6" x2={x} y2="66" stroke={THEME.mapStreet} strokeWidth="0.4"/>
      ))}
      {/* Park */}
      <rect x="40" y="18" width="12" height="14" rx="1.5" fill="rgba(124,203,166,0.15)" stroke="rgba(124,203,166,0.35)" strokeWidth="0.3"/>
      {/* Pins */}
      {pins.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="2.5" fill={THEME.gold} opacity="0.25"/>
          <circle cx={p.x} cy={p.y} r="1.2" fill={THEME.gold}/>
        </g>
      ))}
    </svg>
  );
}

Object.assign(window, { CollectionDetailScreen });
