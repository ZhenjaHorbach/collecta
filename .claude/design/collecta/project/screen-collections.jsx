// Collecta — Collections grid screen

function CollectionsScreen({ onOpenCollection, onCreate }) {
  const [tab, setTab] = React.useState('my');
  const tabs = [
    { id: 'my', label: 'My', count: MY_COLLECTIONS.length },
    { id: 'shared', label: 'Shared', count: SHARED_COLLECTIONS.length },
    { id: 'discover', label: 'Discover', count: null },
  ];

  return (
    <div style={{ paddingBottom: 140, minHeight: '100%', background: THEME.bg }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, color: THEME.textDim, fontWeight: 500, marginBottom: 4 }}>
              You've collected
            </div>
            <div style={{
              fontSize: 32, fontWeight: 700, color: THEME.text,
              letterSpacing: -0.8, fontFamily: 'Fraunces, serif',
            }}>
              <span style={{ color: THEME.gold }}>284</span> things
            </div>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: THEME.surface, border: `1px solid ${THEME.stroke}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="search" size={18} color={THEME.text}/>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '0 16px 16px',
        borderBottom: `1px solid ${THEME.stroke}`, margin: '0 0 16px',
      }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 14px', background: 'transparent', border: 'none',
              cursor: 'pointer', position: 'relative',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                fontSize: 15, fontWeight: active ? 700 : 500,
                color: active ? THEME.text : THEME.textDim,
              }}>{t.label}</span>
              {t.count !== null && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '1px 6px', borderRadius: 100,
                  background: active ? THEME.goldGlow : 'rgba(255,255,255,0.07)',
                  color: active ? THEME.gold : THEME.textDim,
                }}>{t.count}</span>
              )}
              {active && (
                <div style={{
                  position: 'absolute', bottom: -16, left: 10, right: 10,
                  height: 2, background: THEME.gold, borderRadius: 2,
                }}/>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tab === 'my' && <MyGrid onOpen={onOpenCollection} onCreate={onCreate}/>}
      {tab === 'shared' && <SharedList/>}
      {tab === 'discover' && <DiscoverList/>}
    </div>
  );
}

function MyGrid({ onOpen, onCreate }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      padding: '0 16px',
    }}>
      {/* Create new */}
      <button onClick={onCreate} style={{
        aspectRatio: '0.82', borderRadius: 20,
        border: `1.5px dashed ${THEME.strokeHi}`,
        background: 'transparent', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: 0,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.goldLo})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="plus" size={22} color="#1A1410" strokeWidth={2.6}/>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>
          New collection
        </div>
        <div style={{ fontSize: 11, color: THEME.textDim, textAlign: 'center', padding: '0 20px' }}>
          Start collecting anything
        </div>
      </button>

      {MY_COLLECTIONS.map(c => (
        <CollectionCard key={c.id} c={c} onOpen={onOpen}/>
      ))}
    </div>
  );
}

function CollectionCard({ c, onOpen }) {
  const pct = c.found / c.total;
  return (
    <button onClick={() => onOpen && onOpen(c)} style={{
      borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
      background: THEME.surface, border: `1px solid ${THEME.stroke}`,
      padding: 0, textAlign: 'left',
      display: 'flex', flexDirection: 'column', aspectRatio: '0.82',
    }}>
      <div style={{
        flex: 1, position: 'relative',
        background: `url(${c.cover}) center/cover, #222`,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55))',
        }}/>
        {/* Privacy + emoji */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          width: 32, height: 32, borderRadius: 10,
          background: 'rgba(10,13,18,0.65)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, border: `1px solid rgba(255,255,255,0.08)`,
        }}>{c.emoji}</div>
        {c.privacy === 'private' && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            width: 26, height: 26, borderRadius: 8,
            background: 'rgba(10,13,18,0.65)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="lock" size={12} color={THEME.text}/>
          </div>
        )}
        {/* Progress ring in corner */}
        <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
          <ProgressRing size={40} stroke={3.5} progress={pct}>
            <span style={{ fontSize: 10, fontWeight: 700, color: THEME.gold }}>
              {Math.round(pct*100)}%
            </span>
          </ProgressRing>
        </div>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: THEME.text,
          marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{c.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <ProgressBar progress={pct} height={4}/>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: THEME.textDim, letterSpacing: 0.2 }}>
            {c.found}<span style={{ opacity: 0.5 }}>/{c.total}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function SharedList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
      {SHARED_COLLECTIONS.map(c => {
        const pct = c.found / c.total;
        return (
          <div key={c.id} style={{
            display: 'flex', gap: 12, padding: 12, alignItems: 'center',
            background: THEME.surface, borderRadius: 18,
            border: `1px solid ${THEME.stroke}`,
          }}>
            <div style={{
              width: 78, height: 78, borderRadius: 14,
              background: `url(${c.cover}) center/cover, #222`,
              position: 'relative', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', bottom: 4, right: 4,
                background: 'rgba(10,13,18,0.75)', borderRadius: 8, padding: '2px 6px',
                fontSize: 10, fontWeight: 700, color: THEME.gold,
              }}>{c.emoji} {c.found}/{c.total}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: THEME.text }}>{c.title}</div>
              <div style={{ fontSize: 12, color: THEME.textDim, marginTop: 3 }}>{c.category}</div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, gap: 8 }}>
                <div style={{ display: 'flex' }}>
                  {c.collaborators.map((u, i) => (
                    <div key={i} style={{ marginLeft: i > 0 ? -8 : 0, borderRadius: '50%', outline: `2px solid ${THEME.surface}` }}>
                      <Avatar src={u.avatar} size={20}/>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1 }}><ProgressBar progress={pct}/></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DiscoverList() {
  const CATEGORIES = [
    { emoji: '🌿', label: 'Nature' },
    { emoji: '🏙', label: 'Urban' },
    { emoji: '🐾', label: 'Animals' },
    { emoji: '🍕', label: 'Food' },
    { emoji: '🚗', label: 'Transport' },
    { emoji: '🎨', label: 'Art' },
    { emoji: '⚽', label: 'Sports' },
    { emoji: '📸', label: 'Visual' },
    { emoji: '🎄', label: 'Seasonal' },
    { emoji: '🏖', label: 'Travel' },
  ];
  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
        padding: '14px 14px 16px', borderRadius: 16,
        background: `linear-gradient(120deg, rgba(233,184,106,0.16), rgba(107,168,212,0.12))`,
        border: `1px solid ${THEME.stroke}`,
      }}>
        <div style={{ fontSize: 24 }}>✨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>Trending in NYC</div>
          <div style={{ fontSize: 11.5, color: THEME.textDim, marginTop: 2 }}>
            342 people started collections this week
          </div>
        </div>
      </div>

      {/* Categories */}
      <div style={{
        fontSize: 11, fontWeight: 700, color: THEME.textDim,
        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
      }}>
        Browse by category
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8,
        marginBottom: 22,
      }}>
        {CATEGORIES.map(c => (
          <button key={c.label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '12px 4px', borderRadius: 14,
            background: THEME.surface, border: `1px solid ${THEME.stroke}`,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <div style={{ fontSize: 22, lineHeight: 1 }}>{c.emoji}</div>
            <div style={{
              fontSize: 10.5, fontWeight: 600, color: THEME.text,
              letterSpacing: 0.1,
            }}>{c.label}</div>
          </button>
        ))}
      </div>

      <div style={{
        fontSize: 11, fontWeight: 700, color: THEME.textDim,
        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
      }}>
        Popular collections
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {DISCOVER_COLLECTIONS.map(c => (
          <div key={c.id} style={{
            borderRadius: 20, overflow: 'hidden',
            background: THEME.surface, border: `1px solid ${THEME.stroke}`,
            aspectRatio: '0.82', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              flex: 1, position: 'relative',
              background: `url(${c.cover}) center/cover, #222`,
            }}>
              <div style={{
                position: 'absolute', top: 10, left: 10,
                width: 32, height: 32, borderRadius: 10,
                background: 'rgba(10,13,18,0.65)', backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>{c.emoji}</div>
            </div>
            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>{c.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <div style={{ fontSize: 11, color: THEME.textDim }}>{c.total} items</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: THEME.gold }}>{c.followers} joined</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { CollectionsScreen });
