// Collecta — Profile screen + Map screen

function ProfileScreen() {
  const me = USERS.me;
  const xpPct = me.xp / me.xpNext;
  const [tab, setTab] = React.useState('collections');

  return (
    <div style={{ paddingBottom: 140, minHeight: '100%', background: THEME.bg }}>
      {/* Cover gradient */}
      <div style={{
        position: 'relative', height: 180, overflow: 'hidden',
        background: `
          radial-gradient(circle at 30% 20%, rgba(233,184,106,0.35) 0%, transparent 50%),
          radial-gradient(circle at 80% 60%, rgba(240,122,99,0.25) 0%, transparent 50%),
          linear-gradient(180deg, #1A1820 0%, ${THEME.bg} 100%)
        `,
      }}>
        <div style={{
          position: 'absolute', top: 56, right: 16,
          display: 'flex', gap: 8,
        }}>
          <IconBtn icon="share"/>
          <IconBtn icon="settings"/>
        </div>
      </div>

      {/* Avatar + identity */}
      <div style={{ padding: '0 20px', marginTop: -48 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 14 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: `url(${me.avatar}) center/cover`,
              border: `4px solid ${THEME.bg}`,
            }}/>
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              padding: '3px 8px', borderRadius: 100,
              background: `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.gold})`,
              border: `2px solid ${THEME.bg}`,
              fontSize: 11, fontWeight: 800, color: '#1A1410',
              letterSpacing: 0.3,
            }}>LV {me.level}</div>
          </div>
          <div style={{ flex: 1, paddingBottom: 6 }}>
            <div style={{
              fontSize: 20, fontWeight: 700, color: THEME.text,
              fontFamily: 'Fraunces, serif', letterSpacing: -0.3,
            }}>{me.name}</div>
            <div style={{ fontSize: 13, color: THEME.textDim, marginTop: 1 }}>
              @{me.handle}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13.5, color: THEME.text, lineHeight: 1.45, marginBottom: 14 }}>
          Brooklyn-based. Collecting cats, clouds, and everything between. Finding 1 new thing/day, every day.
        </div>

        {/* XP bar */}
        <div style={{
          padding: '12px 14px', borderRadius: 14,
          background: THEME.surface, border: `1px solid ${THEME.stroke}`,
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="bolt" size={14} color={THEME.gold} fill={THEME.gold}/>
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>
                Level {me.level} · Curator
              </span>
            </div>
            <span style={{ fontSize: 11.5, color: THEME.textDim, fontWeight: 600 }}>
              {me.xp} / {me.xpNext} XP
            </span>
          </div>
          <ProgressBar progress={xpPct} height={5}/>
          <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 7 }}>
            <span style={{ color: THEME.gold, fontWeight: 600 }}>{me.xpNext - me.xp} XP</span> to Level 13 · Archivist
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          background: THEME.surface, borderRadius: 18, padding: '14px 0',
          border: `1px solid ${THEME.stroke}`, marginBottom: 22,
        }}>
          {[
            { k: '12', l: 'Collections', sub: null },
            { k: '284', l: 'Finds', sub: null },
            { k: '12', l: 'Day streak', sub: '🔥' },
          ].map((s, i) => (
            <div key={i} style={{
              textAlign: 'center',
              borderRight: i < 2 ? `1px solid ${THEME.stroke}` : 'none',
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: THEME.text, fontFamily: 'Fraunces, serif' }}>
                {s.k} {s.sub && <span style={{ fontSize: 14 }}>{s.sub}</span>}
              </div>
              <div style={{ fontSize: 10.5, color: THEME.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: THEME.text }}>
            Achievements
          </div>
          <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 600 }}>
            8 of 12
          </div>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
          marginBottom: 24,
        }}>
          {BADGES.map(b => (
            <div key={b.id} style={{
              aspectRatio: '0.9', borderRadius: 14, padding: '10px 6px 8px',
              background: b.earned ? THEME.surface : 'rgba(255,255,255,0.02)',
              border: `1px solid ${b.earned ? THEME.stroke : 'rgba(255,255,255,0.04)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 5, opacity: b.earned ? 1 : 0.4,
              position: 'relative',
            }}>
              {b.earned && b.tier === 'gold' && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 14,
                  background: `radial-gradient(circle at 50% 30%, ${THEME.goldGlow}, transparent 70%)`,
                  pointerEvents: 'none',
                }}/>
              )}
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: b.earned
                  ? (b.tier === 'gold'
                    ? `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.goldLo})`
                    : b.tier === 'silver'
                    ? 'linear-gradient(145deg, #D7DCE2, #8A96A3)'
                    : 'linear-gradient(145deg, #C69167, #8F6240)')
                  : 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
                boxShadow: b.earned ? 'inset 0 1px 0 rgba(255,255,255,0.3)' : 'none',
              }}>{b.icon}</div>
              <div style={{
                fontSize: 9.5, fontWeight: 600, color: THEME.text,
                textAlign: 'center', letterSpacing: 0.1, lineHeight: 1.1,
              }}>{b.name}</div>
            </div>
          ))}
        </div>

        {/* Tabs: Collections / Finds / Activity */}
        <div style={{
          display: 'flex', gap: 4, background: THEME.surface,
          padding: 4, borderRadius: 12, marginBottom: 14,
        }}>
          {[
            { id: 'collections', label: 'Public' },
            { id: 'finds', label: 'Recent finds' },
            { id: 'activity', label: 'Activity' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '9px 0', borderRadius: 9,
              background: tab === t.id ? THEME.surfaceHi : 'transparent',
              color: tab === t.id ? THEME.text : THEME.textDim,
              fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>

        {tab === 'collections' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MY_COLLECTIONS.slice(0, 4).map(c => (
              <div key={c.id} style={{
                display: 'flex', gap: 12, alignItems: 'center',
                padding: 10, borderRadius: 14,
                background: THEME.surface, border: `1px solid ${THEME.stroke}`,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `url(${c.cover}) center/cover`, flexShrink: 0,
                }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>
                    {c.emoji} {c.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <div style={{ flex: 1 }}><ProgressBar progress={c.found/c.total}/></div>
                    <div style={{ fontSize: 11, color: THEME.textDim, fontWeight: 600 }}>
                      {c.found}/{c.total}
                    </div>
                  </div>
                </div>
                <Icon name="chevronRight" size={16} color={THEME.textDim}/>
              </div>
            ))}
          </div>
        )}
        {tab === 'finds' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {MY_COLLECTIONS[0].items.slice(0, 9).map(it => (
              <div key={it.id} style={{
                aspectRatio: '1', borderRadius: 10,
                background: `url(${it.photo}) center/cover, #222`,
              }}/>
            ))}
          </div>
        )}
        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { emoji: '🐈', text: <>Found <b>Grey Tabby</b> in Greenpoint</>, time: '2h', xp: 60 },
              { emoji: '🔥', text: <>Extended streak to <b>12 days</b></>, time: '1d', xp: 40 },
              { emoji: '🏆', text: <>Earned <b>Cat Whisperer</b> achievement</>, time: '3d', xp: 200 },
              { emoji: '🎨', text: <>Started collection <b>Subway Typography</b></>, time: '5d', xp: null },
            ].map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                borderBottom: i < 3 ? `1px solid ${THEME.stroke}` : 'none',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: THEME.surface, border: `1px solid ${THEME.stroke}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>{a.emoji}</div>
                <div style={{ flex: 1, fontSize: 13.5, color: THEME.text, lineHeight: 1.35 }}>
                  {a.text}
                  <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2 }}>{a.time} ago</div>
                </div>
                {a.xp && (
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: THEME.gold,
                    padding: '3px 8px', borderRadius: 100,
                    background: THEME.goldGlow,
                  }}>+{a.xp}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MapScreen() {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: THEME.mapBg,
      borderRadius: 'inherit', overflow: 'hidden',
    }}>
      <MiniMap/>
      {/* Overlay pins with photos */}
      <div style={{
        position: 'absolute', inset: 0,
      }}>
        {[
          { x: 30, y: 42, photo: FEED[0].photo, emoji: '🐈' },
          { x: 58, y: 32, photo: FEED[1].photo, emoji: '🎨' },
          { x: 44, y: 60, photo: FEED[3].photo, emoji: '🏛️' },
          { x: 72, y: 52, photo: FEED[4].photo, emoji: '☁️' },
          { x: 22, y: 68, photo: MY_COLLECTIONS[0].items[2].photo, emoji: '🐈' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${p.x}%`, top: `${p.y}%`,
            transform: 'translate(-50%, -100%)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `url(${p.photo}) center/cover`,
              border: `2px solid ${THEME.gold}`,
              boxShadow: `0 4px 14px rgba(0,0,0,0.4)`,
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', bottom: -3, right: -3,
                width: 20, height: 20, borderRadius: '50%',
                background: THEME.bg, border: `1.5px solid ${THEME.gold}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10,
              }}>{p.emoji}</div>
              {/* pin point */}
              <div style={{
                position: 'absolute', bottom: -8, left: '50%',
                transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `8px solid ${THEME.gold}`,
              }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Top search */}
      <div style={{
        position: 'absolute', top: 56, left: 16, right: 16,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px', borderRadius: 14,
        background: THEME.overlay, backdropFilter: 'blur(18px)',
        border: `1px solid ${THEME.stroke}`,
      }}>
        <Icon name="search" size={17} color={THEME.textDim}/>
        <div style={{ flex: 1, fontSize: 13.5, color: THEME.textDim }}>
          Search finds near you…
        </div>
        <div style={{
          padding: '4px 8px', borderRadius: 100,
          background: THEME.goldGlow, color: THEME.gold,
          fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
        }}>FILTER</div>
      </div>

      {/* Filter chips */}
      <div style={{
        position: 'absolute', top: 114, left: 0, right: 0,
        display: 'flex', gap: 8, padding: '0 16px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {[
          { label: 'All', on: true },
          { label: '🐈 Cats', on: false },
          { label: '🎨 Street art', on: false },
          { label: '🏛️ Architecture', on: false },
          { label: '☁️ Nature', on: false },
        ].map(f => (
          <div key={f.label} style={{
            padding: '7px 12px', borderRadius: 100,
            background: f.on ? THEME.text : THEME.overlay,
            backdropFilter: 'blur(14px)',
            color: f.on ? THEME.bg : THEME.text,
            fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
            border: f.on ? 'none' : `1px solid ${THEME.stroke}`,
          }}>{f.label}</div>
        ))}
      </div>

      {/* Bottom sheet */}
      <div style={{
        position: 'absolute', bottom: 120, left: 16, right: 16,
        padding: '14px 16px', borderRadius: 20,
        background: THEME.overlayHi, backdropFilter: 'blur(20px)',
        border: `1px solid ${THEME.stroke}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 14,
            background: `url(${FEED[0].photo}) center/cover`,
          }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>
              Orange Tabby · 0.3 mi away
            </div>
            <div style={{ fontSize: 11.5, color: THEME.textDim, marginTop: 2 }}>
              Found by <span style={{ color: THEME.text, fontWeight: 600 }}>Maya</span> · 12 min ago
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 100, marginTop: 6,
              background: THEME.goldGlow, color: THEME.gold,
              fontSize: 10.5, fontWeight: 700, letterSpacing: 0.2,
            }}>
              You need this for Cat Breeds
            </div>
          </div>
          <Icon name="chevronRight" size={17} color={THEME.textDim}/>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProfileScreen, MapScreen });
