// screen-photo.jsx — Photo card detail (fullscreen photo + rich metadata)

const SAMPLE_COMMENTS = [
  { id: 'c1', user: 'rumiokuda', avatar: 'R', text: 'wait is this Joe\'s on 7th? love that cat 😻', timeAgo: '8m', likes: 12 },
  { id: 'c2', user: 'theo.k', avatar: 'T', text: 'great composition, the light on the register is perfect', timeAgo: '24m', likes: 5 },
  { id: 'c3', user: 'kenji.vu', avatar: 'K', text: 'adding to my watchlist for sunday walk', timeAgo: '1h', likes: 2 },
];

function PhotoDetailScreen({ post, onBack }) {
  if (!post) return null;
  const [reacted, setReacted] = React.useState(new Set());
  const [saved, setSaved] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');

  const toggle = (key) => {
    const next = new Set(reacted);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setReacted(next);
  };

  const totalReactions = Object.values(post.reactions || {}).reduce((a, b) => a + b, 0);

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'auto',
      background: THEME.bg, paddingBottom: 84,
    }}>
      {/* Hero photo */}
      <div style={{
        position: 'relative',
        aspectRatio: '1 / 1.18',
        background: `url(${post.photo}) center/cover, ${THEME.surface}`,
      }}>
        {/* Top bar — back + actions */}
        <div style={{
          position: 'absolute', top: 56, left: 16, right: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 10,
        }}>
          <button onClick={onBack} style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'rgba(10,13,18,0.55)', backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="chevronLeft" size={20} color="#F4F1EA"/>
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setSaved(!saved)} style={{
              width: 38, height: 38, borderRadius: 12,
              background: saved ? THEME.gold : 'rgba(10,13,18,0.55)',
              backdropFilter: 'blur(14px)',
              border: `1px solid ${saved ? THEME.gold : 'rgba(255,255,255,0.1)'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="bookmark" size={18} color={saved ? '#1A1410' : '#F4F1EA'}
                fill={saved ? '#1A1410' : 'none'}/>
            </button>
            <button style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'rgba(10,13,18,0.55)', backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="dots" size={18} color="#F4F1EA"/>
            </button>
          </div>
        </div>

        {/* Bottom gradient */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 220,
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))',
          pointerEvents: 'none',
        }}/>

        {/* AI verified badge */}
        <div style={{
          position: 'absolute', top: 110, left: 16,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '6px 11px 6px 8px', borderRadius: 100,
          background: 'rgba(10,13,18,0.72)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(233,184,106,0.45)',
        }}>
          <Icon name="sparkle" size={11} color="#E9B86A"/>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#E9B86A', letterSpacing: 0.3 }}>
            AI verified · 98% match
          </span>
        </div>

        {/* Pinned tags on photo */}
        <div style={{
          position: 'absolute', bottom: 90, left: 16, right: 16,
          display: 'flex', flexWrap: 'wrap', gap: 6,
        }}>
          <Tag>{post.itemLabel || 'Untagged'}</Tag>
          <Tag muted>orange</Tag>
          <Tag muted>indoor</Tag>
          <Tag muted>natural light</Tag>
        </div>

        {/* Collection link */}
        <button style={{
          position: 'absolute', bottom: 16, left: 16, right: 16,
          padding: '12px 14px', borderRadius: 14,
          background: 'rgba(10,13,18,0.7)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>{post.collectionEmoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: 'rgba(244,241,234,0.6)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
              In collection
            </div>
            <div style={{ fontSize: 13.5, color: '#F4F1EA', fontWeight: 700, marginTop: 2 }}>
              {post.collection}
            </div>
          </div>
          <Icon name="chevronRight" size={16} color="rgba(244,241,234,0.6)"/>
        </button>
      </div>

      {/* Author + caption */}
      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Avatar user={post.user} size={40}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>
                {post.user.name}
              </div>
              {post.user.verified && (
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: THEME.gold,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="check" size={9} color="#1A1410" strokeWidth={3.5}/>
                </div>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: THEME.textDim, marginTop: 1 }}>
              @{post.user.handle} · Lvl {post.user.level || 12}
            </div>
          </div>
          <button style={{
            padding: '8px 14px', borderRadius: 100,
            background: THEME.gold, border: 'none',
            color: '#1A1410', fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Follow
          </button>
        </div>

        {/* Caption */}
        <div style={{
          fontSize: 14.5, color: THEME.text, lineHeight: 1.5,
          marginBottom: 16,
        }}>
          {post.caption}
        </div>

        {/* Reactions row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 14px', borderRadius: 16,
          background: THEME.surface, border: `1px solid ${THEME.stroke}`,
          marginBottom: 18,
        }}>
          <ReactionPill type="heart" count={post.reactions.heart || 0} active={reacted.has('heart')} onClick={() => toggle('heart')}/>
          <ReactionPill type="fire" count={post.reactions.fire || 0} active={reacted.has('fire')} onClick={() => toggle('fire')}/>
          <ReactionPill type="sparkle" count={post.reactions.sparkle || 0} active={reacted.has('sparkle')} onClick={() => toggle('sparkle')}/>
          <div style={{ flex: 1 }}/>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 12px', borderRadius: 100,
            background: 'transparent', border: `1px solid ${THEME.strokeHi}`,
            cursor: 'pointer', fontFamily: 'inherit',
            color: THEME.text, fontSize: 12, fontWeight: 600,
          }}>
            <Icon name="share" size={13} color={THEME.text}/>
            Share
          </button>
        </div>
      </div>

      {/* Meta grid */}
      <div style={{ padding: '0 18px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          marginBottom: 18,
        }}>
          <MetaCard icon="pin" iconColor={THEME.coral}
            label="Location" value={post.location} sub="Tap for map"/>
          <MetaCard icon="bolt" iconColor={THEME.gold}
            label="Captured" value={post.timeAgo} sub="iPhone 15 Pro · f/1.78"/>
          <MetaCard icon="trophy" iconColor={THEME.mint}
            label="Earned" value="+60 XP" sub="3 streak bonus"/>
          <MetaCard icon="users" iconColor={THEME.sky}
            label="Reach" value={`${(totalReactions * 18).toLocaleString()}`} sub="Views in 24h"/>
        </div>
      </div>

      {/* Mini map preview */}
      <div style={{ padding: '0 18px 22px' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: THEME.textDim,
          letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
        }}>
          Where it was found
        </div>
        <div style={{
          height: 140, borderRadius: 16, overflow: 'hidden',
          background: '#1A2230',
          border: `1px solid ${THEME.stroke}`,
          position: 'relative',
        }}>
          <svg viewBox="0 0 300 140" style={{ width: '100%', height: '100%', display: 'block' }}>
            <defs>
              <pattern id="grid-md" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M30 0L0 0 0 30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="300" height="140" fill="url(#grid-md)"/>
            <path d="M0 70 L300 70" stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
            <path d="M150 0 L150 140" stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
            <ellipse cx="60" cy="100" rx="36" ry="22" fill="rgba(124,203,166,0.18)"/>
            <g transform="translate(150, 70)">
              <circle r="22" fill={THEME.gold} opacity="0.18"/>
              <circle r="14" fill={THEME.gold} opacity="0.32"/>
              <circle r="7" fill={THEME.gold}/>
              <circle r="3" fill="#1A1410"/>
            </g>
          </svg>
          <div style={{
            position: 'absolute', bottom: 10, left: 10, right: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 11px', borderRadius: 100,
              background: 'rgba(10,13,18,0.72)', backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <Icon name="pin" size={11} color={THEME.gold}/>
              <span style={{ fontSize: 11, color: '#F4F1EA', fontWeight: 600 }}>
                {post.location}
              </span>
            </div>
            <button style={{
              padding: '6px 12px', borderRadius: 100,
              background: 'rgba(10,13,18,0.72)', backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F4F1EA', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Open map
            </button>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div style={{ padding: '0 18px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 14,
        }}>
          <div style={{
            fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600,
            color: THEME.text, letterSpacing: -0.3,
          }}>
            Comments
          </div>
          <div style={{ fontSize: 12, color: THEME.textDim }}>
            {SAMPLE_COMMENTS.length} replies
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SAMPLE_COMMENTS.map(c => (
            <Comment key={c.id} c={c}/>
          ))}
        </div>
      </div>

      {/* Sticky comment composer */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '12px 16px 26px',
        background: `linear-gradient(0deg, ${THEME.bg} 78%, transparent)`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 6px 6px 14px', borderRadius: 100,
          background: THEME.surface, border: `1px solid ${THEME.strokeHi}`,
        }}>
          <Avatar user={USERS.me} size={28}/>
          <input
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Add a comment…"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: THEME.text, fontSize: 13, fontFamily: 'inherit',
              outline: 'none', padding: '8px 4px',
            }}
          />
          <button
            disabled={!commentText.trim()}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: commentText.trim()
                ? `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.gold})`
                : THEME.bg,
              border: 'none',
              cursor: commentText.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
          >
            <Icon name="arrowRight" size={16} color={commentText.trim() ? '#1A1410' : THEME.textMuted} strokeWidth={2.6}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function Tag({ children, muted }) {
  return (
    <div style={{
      padding: '5px 10px', borderRadius: 100,
      background: muted ? 'rgba(10,13,18,0.55)' : 'rgba(233,184,106,0.92)',
      backdropFilter: 'blur(14px)',
      border: muted
        ? '1px solid rgba(255,255,255,0.08)'
        : '1px solid rgba(233,184,106,0.5)',
      fontSize: 11, fontWeight: 700,
      color: muted ? '#F4F1EA' : '#1A1410',
      letterSpacing: 0.1,
    }}>
      {children}
    </div>
  );
}

function ReactionPill({ type, count, active, onClick }) {
  const colors = {
    heart: THEME.coral,
    fire: '#F0A848',
    sparkle: THEME.gold,
  };
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '7px 12px', borderRadius: 100,
      background: active ? `${colors[type]}24` : 'transparent',
      border: `1px solid ${active ? colors[type] : THEME.strokeHi}`,
      cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all 0.15s ease',
    }}>
      <Icon name={type} size={14} color={active ? colors[type] : THEME.text}
        fill={active ? colors[type] : 'none'}/>
      <span style={{
        fontSize: 12, fontWeight: 700,
        color: active ? colors[type] : THEME.text,
      }}>
        {count + (active ? 1 : 0)}
      </span>
    </button>
  );
}

function MetaCard({ icon, iconColor, label, value, sub }) {
  return (
    <div style={{
      padding: '14px', borderRadius: 16,
      background: THEME.surface, border: `1px solid ${THEME.stroke}`,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 8,
          background: `${iconColor}24`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={13} color={iconColor}/>
        </div>
        <div style={{
          fontSize: 10.5, fontWeight: 700, color: THEME.textDim,
          letterSpacing: 1, textTransform: 'uppercase',
        }}>
          {label}
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: THEME.textMuted, lineHeight: 1.3 }}>
        {sub}
      </div>
    </div>
  );
}

function Comment({ c }) {
  const [liked, setLiked] = React.useState(false);
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: `linear-gradient(145deg, ${THEME.goldLo}, ${THEME.coral})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: '#1A1410',
        flexShrink: 0,
      }}>
        {c.avatar}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          padding: '10px 12px', borderRadius: 14,
          background: THEME.surface, border: `1px solid ${THEME.stroke}`,
        }}>
          <div style={{
            fontSize: 12.5, fontWeight: 700, color: THEME.text,
            marginBottom: 2,
          }}>
            @{c.user}
          </div>
          <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.45 }}>
            {c.text}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '6px 4px 0',
        }}>
          <div style={{ fontSize: 11, color: THEME.textMuted }}>{c.timeAgo}</div>
          <button
            onClick={() => setLiked(!liked)}
            style={{
              background: 'transparent', border: 'none', padding: 0,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              color: liked ? THEME.coral : THEME.textDim,
              fontSize: 11, fontWeight: 600,
            }}
          >
            <Icon name="heart" size={11} color={liked ? THEME.coral : THEME.textDim}
              fill={liked ? THEME.coral : 'none'}/>
            {c.likes + (liked ? 1 : 0)}
          </button>
          <button style={{
            background: 'transparent', border: 'none', padding: 0,
            cursor: 'pointer', fontFamily: 'inherit',
            color: THEME.textDim, fontSize: 11, fontWeight: 600,
          }}>
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PhotoDetailScreen });
