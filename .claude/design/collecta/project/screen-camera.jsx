// Collecta — Camera / capture screen

function CameraScreen({ onClose, onSave }) {
  const [phase, setPhase] = React.useState('viewfinder'); // viewfinder → analyzing → result
  const [selectedCollection, setSelectedCollection] = React.useState(MY_COLLECTIONS[0].id);
  const [note, setNote] = React.useState('');
  const [flash, setFlash] = React.useState(false);

  const capture = () => {
    setPhase('analyzing');
    setTimeout(() => setPhase('result'), 1600);
  };

  if (phase === 'viewfinder') {
    return <Viewfinder onClose={onClose} onCapture={capture} flash={flash} setFlash={setFlash}/>;
  }
  if (phase === 'analyzing') {
    return <Analyzing/>;
  }
  return <ResultSheet onBack={() => setPhase('viewfinder')} onClose={onClose} onSave={onSave}
    selected={selectedCollection} setSelected={setSelectedCollection}
    note={note} setNote={setNote}/>;
}

function Viewfinder({ onClose, onCapture, flash, setFlash }) {
  // Simulated camera view — use a photo as background
  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#000',
      overflow: 'hidden', borderRadius: 'inherit',
    }}>
      {/* Fake camera feed */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `url(${UNSPLASH('1514888286974-6c03e2ca1dba', 800)}) center/cover`,
        filter: 'brightness(0.95)',
      }}/>

      {/* AI framing reticle */}
      <div style={{
        position: 'absolute', top: '38%', left: '20%',
        width: '60%', height: '30%', border: `2px solid ${THEME.gold}`,
        borderRadius: 18, boxShadow: `0 0 0 9999px rgba(0,0,0,0.25)`,
      }}>
        {/* corner brackets */}
        {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h], i) => (
          <div key={i} style={{
            position: 'absolute', [v]: -2, [h]: -2,
            width: 16, height: 16,
            borderTop: v === 'top' ? `3px solid ${THEME.gold}` : 'none',
            borderBottom: v === 'bottom' ? `3px solid ${THEME.gold}` : 'none',
            borderLeft: h === 'left' ? `3px solid ${THEME.gold}` : 'none',
            borderRight: h === 'right' ? `3px solid ${THEME.gold}` : 'none',
            borderTopLeftRadius: v === 'top' && h === 'left' ? 8 : 0,
            borderTopRightRadius: v === 'top' && h === 'right' ? 8 : 0,
            borderBottomLeftRadius: v === 'bottom' && h === 'left' ? 8 : 0,
            borderBottomRightRadius: v === 'bottom' && h === 'right' ? 8 : 0,
          }}/>
        ))}
        <div style={{
          position: 'absolute', top: -32, left: 0,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 100,
          background: THEME.gold, color: '#1A1410',
          fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
        }}>
          <Icon name="sparkle" size={11} color="#1A1410" fill="#1A1410"/>
          CAT DETECTED
        </div>
      </div>

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 56, left: 16, right: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onClose} style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="x" size={18} color="#fff"/>
        </button>
        <div style={{
          padding: '7px 14px', borderRadius: 100,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
          fontSize: 12, fontWeight: 600, color: '#fff',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="sparkle" size={12} color={THEME.gold} fill={THEME.gold}/>
          AI assist on
        </div>
        <button onClick={() => setFlash(!flash)} style={{
          width: 38, height: 38, borderRadius: '50%',
          background: flash ? THEME.gold : 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="flash" size={17} color={flash ? '#1A1410' : '#fff'} fill={flash ? '#1A1410' : 'none'}/>
        </button>
      </div>

      {/* Target collection hint */}
      <div style={{
        position: 'absolute', top: 114, left: '50%', transform: 'translateX(-50%)',
        padding: '8px 14px 8px 10px', borderRadius: 100,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', gap: 8,
        border: `1px solid rgba(255,255,255,0.1)`,
      }}>
        <span style={{ fontSize: 16 }}>🐈</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#fff' }}>
          Adding to Cat Breeds of NYC
        </span>
        <Icon name="chevronRight" size={12} color="rgba(255,255,255,0.5)"/>
      </div>

      {/* Bottom controls */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '30px 24px 50px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.6), rgba(0,0,0,0))',
      }}>
        {/* Mode chips */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginBottom: 28 }}>
          {['LIBRARY', 'PHOTO', 'BURST'].map((m, i) => (
            <div key={m} style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
              color: i === 1 ? THEME.gold : 'rgba(255,255,255,0.55)',
            }}>{m}</div>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Library preview */}
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: `url(${UNSPLASH('1518791841217-8f162f1e1131', 200)}) center/cover`,
            border: `2px solid rgba(255,255,255,0.3)`,
          }}/>
          {/* Shutter */}
          <button onClick={onCapture} style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: `3px solid rgba(255,255,255,0.8)`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: '#fff',
              boxShadow: `inset 0 0 0 3px rgba(0,0,0,0)`,
            }}/>
          </button>
          {/* Flip */}
          <button style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="refresh" size={19} color="#fff"/>
          </button>
        </div>
      </div>
    </div>
  );
}

function Analyzing() {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#000',
      borderRadius: 'inherit', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `url(${UNSPLASH('1514888286974-6c03e2ca1dba', 800)}) center/cover`,
        filter: 'brightness(0.6) blur(2px)',
      }}/>
      {/* Scanning line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0,
        height: 3, background: `linear-gradient(90deg, transparent, ${THEME.gold}, transparent)`,
        boxShadow: `0 0 20px ${THEME.gold}`,
        animation: 'scan 1.6s ease-in-out infinite',
      }}/>
      <div style={{
        position: 'absolute', top: '50%', left: 0, right: 0,
        transform: 'translateY(-50%)', textAlign: 'center',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.goldLo})`,
          margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 1.2s ease-in-out infinite',
        }}>
          <Icon name="sparkle" size={28} color="#1A1410" fill="#1A1410"/>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          Analyzing your find…
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
          Identifying and checking your collection
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { top: 20%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 80%; opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

function ResultSheet({ onBack, onClose, onSave, selected, setSelected, note, setNote }) {
  const collection = MY_COLLECTIONS.find(c => c.id === selected);
  return (
    <div style={{
      position: 'absolute', inset: 0, background: THEME.bg,
      borderRadius: 'inherit', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Photo preview */}
      <div style={{
        position: 'relative', height: 340, flexShrink: 0,
        background: `url(${UNSPLASH('1514888286974-6c03e2ca1dba', 800)}) center/cover`,
      }}>
        <div style={{
          position: 'absolute', top: 56, left: 16,
        }}>
          <button onClick={onBack} style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="chevronLeft" size={19} color="#fff"/>
          </button>
        </div>

        {/* AI result badge */}
        <div style={{
          position: 'absolute', bottom: 16, left: 16, right: 16,
          padding: '14px 16px', borderRadius: 18,
          background: 'rgba(14,17,22,0.78)', backdropFilter: 'blur(20px)',
          border: `1px solid ${THEME.gold}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.goldLo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="check" size={22} color="#1A1410" strokeWidth={3}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: THEME.gold,
              textTransform: 'uppercase', letterSpacing: 1.2,
            }}>Verified · 96% match</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: THEME.text, marginTop: 2 }}>
              Cat · Orange Tabby
            </div>
          </div>
          <Icon name="sparkle" size={20} color={THEME.gold} fill={THEME.gold}/>
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, padding: '20px 20px 24px', overflow: 'auto' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: THEME.textDim,
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
        }}>Add to collection</div>

        {/* Collection picker (horizontal) */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20,
          scrollbarWidth: 'none', paddingBottom: 4,
        }}>
          {MY_COLLECTIONS.slice(0, 4).map(c => {
            const active = c.id === selected;
            return (
              <button key={c.id} onClick={() => setSelected(c.id)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 12px 8px 8px', borderRadius: 12,
                background: active ? THEME.goldGlow : THEME.surface,
                border: `1px solid ${active ? THEME.gold : THEME.stroke}`,
                cursor: 'pointer', flexShrink: 0,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `url(${c.cover}) center/cover`,
                }}/>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: THEME.text }}>{c.title}</div>
                  <div style={{ fontSize: 10, color: THEME.textDim, marginTop: 1 }}>{c.found}/{c.total}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Location */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderRadius: 14,
          background: THEME.surface, border: `1px solid ${THEME.stroke}`,
          marginBottom: 10,
        }}>
          <Icon name="pin" size={16} color={THEME.gold}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>
              East Village, NY
            </div>
            <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 1 }}>
              Detected from photo · tap to change
            </div>
          </div>
        </div>

        {/* Note */}
        <div style={{
          padding: '12px 14px', borderRadius: 14,
          background: THEME.surface, border: `1px solid ${THEME.stroke}`,
          marginBottom: 16,
        }}>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)…"
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: THEME.text, fontSize: 14, fontFamily: 'inherit',
              padding: 0,
            }}/>
        </div>

        {/* XP preview */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(233,184,106,0.08)',
          border: `1px solid rgba(233,184,106,0.2)`,
          marginBottom: 16,
        }}>
          <Icon name="bolt" size={15} color={THEME.gold} fill={THEME.gold}/>
          <div style={{ fontSize: 12.5, color: THEME.text, flex: 1 }}>
            <span style={{ fontWeight: 700, color: THEME.gold }}>+60 XP</span>{' '}
            for a new breed · streak +1
          </div>
        </div>

        <button onClick={onSave} style={{
          width: '100%', padding: '16px 0', borderRadius: 16,
          background: `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.gold})`,
          color: '#1A1410', fontSize: 15, fontWeight: 700,
          border: 'none', cursor: 'pointer', letterSpacing: 0.2,
        }}>
          Save to collection
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { CameraScreen, ResultSheet, Viewfinder });
