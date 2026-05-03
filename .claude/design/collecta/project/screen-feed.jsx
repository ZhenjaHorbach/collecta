// Collecta — Home Feed screen

function FeedScreen({ onOpenPhoto }) {
  const [reacted, setReacted] = React.useState({});
  const toggleReact = (id, kind) => setReacted(r => ({ ...r, [id + kind]: !r[id + kind] }));

  return (
    <div style={{ paddingBottom: 140, background: THEME.bg, minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '56px 20px 14px', position: 'sticky', top: 0, zIndex: 10,
        background: `linear-gradient(180deg, ${THEME.bg} 72%, transparent)`,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CollectaMark size={30}/>
          <div style={{
            fontSize: 22, fontWeight: 700, color: THEME.text,
            letterSpacing: -0.5, fontFamily: 'Fraunces, -apple-system, serif',
          }}>Collecta</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Icon name="bell" size={22} color={THEME.text}/>
            <div style={{
              position: 'absolute', top: -2, right: -2, width: 8, height: 8,
              borderRadius: 4, background: THEME.coral, border: `1.5px solid ${THEME.bg}`,
            }}/>
          </div>
          <Avatar src={USERS.me.avatar} size={32}/>
        </div>
      </div>

      {/* Streak banner */}
      <div style={{ padding: '4px 16px 14px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', borderRadius: 16,
          background: `linear-gradient(100deg, rgba(233,184,106,0.14), rgba(233,184,106,0.04))`,
          border: `1px solid rgba(233,184,106,0.22)`,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.goldLo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>🔥</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>
              12-day streak · keep it alive
            </div>
            <div style={{ fontSize: 11.5, color: THEME.textDim, marginTop: 2 }}>
              Find 1 more thing today to earn <span style={{ color: THEME.gold, fontWeight: 600 }}>+40 XP</span>
            </div>
          </div>
          <Icon name="chevronRight" size={18} color={THEME.textDim}/>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex', gap: 8, padding: '0 16px 14px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {['Nearby', 'Trending', 'New'].map((f, i) => (
          <div key={f} style={{
            padding: '7px 14px', borderRadius: 100,
            background: i === 0 ? THEME.text : THEME.surface,
            color: i === 0 ? THEME.bg : THEME.text,
            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            border: i === 0 ? 'none' : `1px solid ${THEME.stroke}`,
          }}>{f}</div>
        ))}
      </div>

      {/* Feed cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 16px' }}>
        {FEED.map(post => (
          <FeedCard key={post.id} post={post} reacted={reacted} onReact={toggleReact} onOpen={() => onOpenPhoto && onOpenPhoto(post)}/>
        ))}
      </div>
    </div>
  );
}

function FeedCard({ post, reacted, onReact, onOpen }) {
  return (
    <div style={{
      background: THEME.surface, borderRadius: 22,
      border: `1px solid ${THEME.stroke}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px',
      }}>
        <Avatar src={post.user.avatar} size={36}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>
            {post.user.name}
          </div>
          <div style={{ fontSize: 11.5, color: THEME.textDim, display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <Icon name="pin" size={11} color={THEME.textDim} strokeWidth={2.2}/>
            {post.location} · {post.timeAgo}
          </div>
        </div>
        <Icon name="dots" size={18} color={THEME.textDim}/>
      </div>

      {/* Photo */}
      <div onClick={onOpen} style={{ position: 'relative', aspectRatio: '4 / 5', cursor: 'pointer' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `url(${post.photo}) center/cover, #222`,
        }}/>
        {/* Collection tag on photo */}
        <div style={{
          position: 'absolute', top: 12, left: 12,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 11px 6px 8px', borderRadius: 100,
          background: 'rgba(10,13,18,0.72)', backdropFilter: 'blur(16px)',
          border: `1px solid rgba(255,255,255,0.1)`,
        }}>
          <span style={{ fontSize: 14 }}>{post.collectionEmoji}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#F4F1EA' }}>
            {post.collection}
          </span>
        </div>
        {/* AI-verified badge */}
        <div style={{
          position: 'absolute', top: 12, right: 12,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '6px 10px 6px 8px', borderRadius: 100,
          background: 'rgba(10,13,18,0.72)', backdropFilter: 'blur(16px)',
          border: `1px solid rgba(233,184,106,0.35)`,
        }}>
          <Icon name="sparkle" size={11} color={THEME.gold} fill={THEME.gold}/>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: THEME.gold }}>
            {post.itemLabel}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <ReactBtn icon="heart" count={post.reactions.heart} active={reacted[post.id + 'h']}
            color={THEME.coral} onClick={() => onReact(post.id, 'h')}/>
          <ReactBtn icon="fire" count={post.reactions.fire} active={reacted[post.id + 'f']}
            color="#E9B86A" onClick={() => onReact(post.id, 'f')}/>
          <ReactBtn icon="sparkle" count={post.reactions.sparkle} active={reacted[post.id + 's']}
            color={THEME.sky} onClick={() => onReact(post.id, 's')}/>
          <div style={{ flex: 1 }}/>
          <Icon name="bookmark" size={20} color={THEME.textDim}/>
        </div>
        <div style={{
          fontSize: 13.5, color: THEME.text, marginTop: 10, lineHeight: 1.4,
        }}>
          <span style={{ fontWeight: 600 }}>{post.user.handle}</span>{' '}
          <span style={{ color: THEME.textDim }}>{post.caption}</span>
        </div>
      </div>
    </div>
  );
}

function ReactBtn({ icon, count, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: 0, background: 'transparent', border: 'none', cursor: 'pointer',
    }}>
      <Icon name={icon} size={21} color={active ? color : THEME.text}
        fill={active ? color : 'none'} strokeWidth={2}/>
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: active ? color : THEME.text,
      }}>{count + (active ? 1 : 0)}</span>
    </button>
  );
}

Object.assign(window, { FeedScreen });
