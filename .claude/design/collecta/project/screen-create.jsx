// screen-create.jsx — Create a new collection

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

const EMOJI_CHOICES = [
  '🐈','🐕','🦜','🦋','🌸','🌿','🍄','☁️','🌊','🏔️',
  '🏛️','🎨','🪜','🪟','🚇','🚲','🪩','📚','☕','🍕',
  '🧃','🧁','🎭','🎸','⚽','🏀','📸','🎞️','💡','✨',
];

function CreateCollectionScreen({ onBack, onCreate }) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [emoji, setEmoji] = React.useState('📸');
  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState(false);
  const [category, setCategory] = React.useState(null);
  const [mode, setMode] = React.useState('list'); // 'list' | 'free'
  const [items, setItems] = React.useState(['']);
  const [aiHint, setAiHint] = React.useState('');
  const [privacy, setPrivacy] = React.useState('public');

  const addItem = () => setItems([...items, '']);
  const updateItem = (i, val) => {
    const next = [...items];
    next[i] = val;
    setItems(next);
  };
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  // AI generation
  const [aiOpen, setAiOpen] = React.useState(false);
  const [aiPrompt, setAiPrompt] = React.useState('');
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState('');

  const runGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiLoading) return;
    setAiLoading(true);
    setAiError('');
    try {
      const raw = await window.claude.complete({
        messages: [{
          role: 'user',
          content: `You design photo-collection prompts for a photo-collecting app called Collecta. A user wants to make a collection about: "${prompt}".

Respond ONLY with valid JSON (no prose, no code fences) matching this exact shape:
{
  "title": "<short title, 2–4 words, Title Case>",
  "emoji": "<one single emoji, most fitting>",
  "category": "<ONE OF: Nature, Urban, Animals, Food, Transport, Art, Sports, Visual, Seasonal, Travel>",
  "description": "<one short sentence, 8–14 words>",
  "items": ["<item 1>", "<item 2>", "...8 to 12 concrete, visually distinct items a user could photograph>"],
  "aiHint": "<one sentence describing what the photo must contain for AI to validate it>"
}`
        }],
      });
      // Robust JSON extraction
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
        else throw e;
      }
      if (parsed.title) setTitle(parsed.title);
      if (parsed.emoji) setEmoji(parsed.emoji);
      if (parsed.description) setDescription(parsed.description);
      const catMatch = CATEGORIES.find(c => c.label.toLowerCase() === String(parsed.category || '').toLowerCase());
      if (catMatch) setCategory(catMatch);
      if (Array.isArray(parsed.items) && parsed.items.length) {
        setItems(parsed.items.slice(0, 20));
        setMode('list');
      }
      if (parsed.aiHint) setAiHint(parsed.aiHint);
      setAiOpen(false);
      setAiPrompt('');
    } catch (e) {
      setAiError('Generation failed — try a simpler phrase.');
    } finally {
      setAiLoading(false);
    }
  };

  const canCreate = title.trim().length > 0 && category !== null;

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'auto',
      background: THEME.bg, paddingBottom: 120,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        padding: '56px 16px 14px',
        background: `linear-gradient(180deg, ${THEME.bg} 78%, transparent)`,
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: 12,
          background: THEME.surface, border: `1px solid ${THEME.stroke}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chevronLeft" size={20} color={THEME.text}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600,
            color: THEME.text, letterSpacing: -0.4, lineHeight: 1,
          }}>
            New collection
          </div>
          <div style={{ fontSize: 11.5, color: THEME.textDim, marginTop: 4 }}>
            Start collecting anything you can photograph
          </div>
        </div>
      </div>

      {/* Cover preview */}
      <div style={{ padding: '8px 16px 0' }}>
        <div style={{
          borderRadius: 20, padding: 18, position: 'relative',
          background: `
            radial-gradient(circle at 30% 20%, ${THEME.goldGlow}, transparent 60%),
            linear-gradient(145deg, ${THEME.surfaceHi}, ${THEME.surfaceLo})
          `,
          border: `1px solid ${THEME.stroke}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <button
            onClick={() => setEmojiPickerOpen(true)}
            style={{
              width: 72, height: 72, borderRadius: 20,
              background: THEME.bg, border: `1px solid ${THEME.strokeHi}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 36, flexShrink: 0,
              position: 'relative',
            }}
          >
            {emoji}
            <div style={{
              position: 'absolute', bottom: -4, right: -4,
              width: 22, height: 22, borderRadius: 8,
              background: THEME.gold,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${THEME.bg}`,
            }}>
              <Icon name="pencil" size={11} color="#1A1410" strokeWidth={3}/>
            </div>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: THEME.textDim, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
              Preview
            </div>
            <div style={{
              fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600,
              color: THEME.text, marginTop: 4, letterSpacing: -0.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {title || 'Your collection'}
            </div>
            <div style={{ fontSize: 12, color: THEME.textDim, marginTop: 3 }}>
              {category ? `${category.emoji} ${category.label}` : 'Pick a category'}
              {mode === 'list' && items.filter(i => i.trim()).length > 0
                ? ` · ${items.filter(i => i.trim()).length} items`
                : ''}
              {mode === 'free' ? ' · Free collection' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* AI generate banner */}
      <div style={{ padding: '16px 16px 0' }}>
        <button
          onClick={() => setAiOpen(true)}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 16,
            background: `linear-gradient(120deg, rgba(233,184,106,0.18), rgba(107,168,212,0.12))`,
            border: `1px solid rgba(233,184,106,0.35)`,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.goldLo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 24px ${THEME.goldGlow}`,
          }}>
            <Icon name="sparkle" size={20} color="#1A1410" strokeWidth={2.2}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.text, letterSpacing: -0.1 }}>
              Generate with AI
            </div>
            <div style={{ fontSize: 11.5, color: THEME.textDim, marginTop: 2 }}>
              One phrase → title, items & hint
            </div>
          </div>
          <Icon name="chevronRight" size={18} color={THEME.textDim}/>
        </button>
      </div>

      {/* Section: Basics */}
      <Section title="Basics">
        <Field label="Title">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. NYC Bodega Cats"
            style={inputStyle()}
          />
        </Field>
        <Field label="Description" optional>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What makes this collection special?"
            rows={2}
            style={{ ...inputStyle(), resize: 'none', minHeight: 60, fontFamily: 'inherit' }}
          />
        </Field>
      </Section>

      {/* Section: Category */}
      <Section title="Category" required>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6,
        }}>
          {CATEGORIES.map(c => {
            const active = category && category.label === c.label;
            return (
              <button
                key={c.label}
                onClick={() => setCategory(c)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  padding: '10px 2px', borderRadius: 12,
                  background: active ? THEME.gold : THEME.surface,
                  border: `1px solid ${active ? THEME.gold : THEME.stroke}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: 20, lineHeight: 1 }}>{c.emoji}</div>
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: active ? '#1A1410' : THEME.text,
                  letterSpacing: 0.1,
                }}>{c.label}</div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Section: Mode toggle */}
      <Section title="How to collect" required>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ModeCard
            active={mode === 'list'}
            onClick={() => setMode('list')}
            icon="list"
            title="Checklist"
            desc="Add items to find. Users cross them off as they photograph each."
          />
          <ModeCard
            active={mode === 'free'}
            onClick={() => setMode('free')}
            icon="infinity"
            title="Free collection"
            desc="No fixed list — users just take photos and add to the pile."
          />
        </div>
      </Section>

      {/* Section: Items (only if list mode) */}
      {mode === 'list' && (
        <Section title="Items to find" required>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: THEME.surface, border: `1px solid ${THEME.stroke}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: THEME.textDim,
                  flexShrink: 0,
                }}>{i + 1}</div>
                <input
                  value={item}
                  onChange={e => updateItem(i, e.target.value)}
                  placeholder={i === 0 ? 'e.g. ginger cat' : i === 1 ? 'e.g. black cat' : 'Add another item'}
                  style={{ ...inputStyle(), flex: 1 }}
                />
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(i)}
                    style={{
                      width: 32, height: 32, borderRadius: 10,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="x" size={16} color={THEME.textMuted}/>
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addItem}
              style={{
                padding: '10px 14px', borderRadius: 12,
                background: 'transparent',
                border: `1.5px dashed ${THEME.strokeHi}`,
                color: THEME.textDim, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                marginTop: 4,
              }}
            >
              <Icon name="plus" size={14} color={THEME.textDim} strokeWidth={2.4}/>
              Add item
            </button>
          </div>
        </Section>
      )}

      {/* Section: AI hint */}
      <Section
        title="AI validation"
        optional
        hint={
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 700, color: THEME.gold,
            padding: '3px 7px', borderRadius: 100,
            background: THEME.goldGlow, marginLeft: 8,
          }}>
            <Icon name="sparkle" size={10} color={THEME.gold}/>
            SMART
          </span>
        }
      >
        <div style={{
          fontSize: 12, color: THEME.textDim, lineHeight: 1.5, marginBottom: 10,
        }}>
          Help the AI verify each photo. Describe what should be in frame.
        </div>
        <textarea
          value={aiHint}
          onChange={e => setAiHint(e.target.value)}
          placeholder="e.g. The photo must clearly show a cat of the specified color, no other cats in frame."
          rows={3}
          style={{ ...inputStyle(), resize: 'none', minHeight: 80, fontFamily: 'inherit' }}
        />
      </Section>

      {/* Section: Privacy */}
      <Section title="Privacy">
        <div style={{ display: 'flex', gap: 8 }}>
          <PrivacyChip
            active={privacy === 'public'}
            onClick={() => setPrivacy('public')}
            icon="globe" label="Public"
            desc="Anyone can discover"
          />
          <PrivacyChip
            active={privacy === 'friends'}
            onClick={() => setPrivacy('friends')}
            icon="users" label="Friends"
            desc="Only people you follow"
          />
          <PrivacyChip
            active={privacy === 'private'}
            onClick={() => setPrivacy('private')}
            icon="lock" label="Private"
            desc="Just you"
          />
        </div>
      </Section>

      {/* Sticky create CTA */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        padding: '14px 16px 30px',
        background: `linear-gradient(0deg, ${THEME.bg} 70%, transparent)`,
        zIndex: 30,
      }}>
        <div style={{
          maxWidth: 358, margin: '0 auto',
          display: 'flex', gap: 8,
        }}>
          <button
            onClick={onBack}
            style={{
              padding: '15px 20px', borderRadius: 100,
              background: THEME.surface, border: `1px solid ${THEME.stroke}`,
              color: THEME.text, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            disabled={!canCreate}
            onClick={() => onCreate && onCreate({
              title, description, emoji, category, mode, items, aiHint, privacy,
            })}
            style={{
              flex: 1, padding: '15px 20px', borderRadius: 100,
              background: canCreate
                ? `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.gold})`
                : THEME.surface,
              border: 'none',
              color: canCreate ? '#1A1410' : THEME.textMuted,
              fontSize: 14, fontWeight: 700,
              cursor: canCreate ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              boxShadow: canCreate ? `0 8px 20px ${THEME.goldGlow}` : 'none',
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            Create collection
            <Icon name="arrowRight" size={16} color={canCreate ? '#1A1410' : THEME.textMuted} strokeWidth={2.6}/>
          </button>
        </div>
      </div>

      {/* Emoji picker sheet */}
      {emojiPickerOpen && (
        <EmojiPickerSheet
          current={emoji}
          onClose={() => setEmojiPickerOpen(false)}
          onPick={(e) => { setEmoji(e); setEmojiPickerOpen(false); }}
        />
      )}

      {/* AI generate sheet */}
      {aiOpen && (
        <AIGenerateSheet
          prompt={aiPrompt}
          setPrompt={setAiPrompt}
          loading={aiLoading}
          error={aiError}
          onClose={() => { if (!aiLoading) { setAiOpen(false); setAiError(''); } }}
          onGenerate={runGenerate}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function Section({ title, required, optional, hint, children }) {
  return (
    <div style={{ padding: '28px 16px 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: THEME.textDim,
          letterSpacing: 1.5, textTransform: 'uppercase',
        }}>
          {title}
        </div>
        {required && (
          <div style={{
            marginLeft: 6, fontSize: 10, fontWeight: 700, color: THEME.gold,
            letterSpacing: 1.2, textTransform: 'uppercase',
          }}>
            · Required
          </div>
        )}
        {optional && (
          <div style={{
            marginLeft: 6, fontSize: 10, fontWeight: 600, color: THEME.textMuted,
            letterSpacing: 1.2, textTransform: 'uppercase',
          }}>
            · Optional
          </div>
        )}
        {hint}
      </div>
      {children}
    </div>
  );
}

function Field({ label, optional, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: THEME.textDim,
        marginBottom: 6,
      }}>
        {label}
        {optional && <span style={{ color: THEME.textMuted, marginLeft: 6 }}>· optional</span>}
      </div>
      {children}
    </div>
  );
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 14px', borderRadius: 12,
    background: THEME.surface, border: `1px solid ${THEME.stroke}`,
    color: THEME.text, fontSize: 14, fontFamily: 'inherit',
    outline: 'none',
  };
}

function ModeCard({ active, onClick, icon, title, desc }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '14px', borderRadius: 14,
        background: active ? `linear-gradient(145deg, ${THEME.surfaceHi}, ${THEME.surface})` : THEME.surface,
        border: `1.5px solid ${active ? THEME.gold : THEME.stroke}`,
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'relative',
        boxShadow: active ? `0 0 0 3px ${THEME.goldGlow}` : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: active ? `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.goldLo})` : THEME.surfaceHi,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={20} color={active ? '#1A1410' : THEME.text}/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: THEME.textDim, marginTop: 2, lineHeight: 1.35 }}>
          {desc}
        </div>
      </div>
      <div style={{
        width: 20, height: 20, borderRadius: 100,
        border: `1.5px solid ${active ? THEME.gold : THEME.strokeHi}`,
        background: active ? THEME.gold : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {active && <Icon name="check" size={12} color="#1A1410" strokeWidth={3.5}/>}
      </div>
    </button>
  );
}

function PrivacyChip({ active, onClick, icon, label, desc }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '12px 8px', borderRadius: 14,
        background: active ? `linear-gradient(145deg, ${THEME.surfaceHi}, ${THEME.surface})` : THEME.surface,
        border: `1.5px solid ${active ? THEME.gold : THEME.stroke}`,
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        transition: 'all 0.15s ease',
      }}
    >
      <Icon name={icon} size={18} color={active ? THEME.gold : THEME.text}/>
      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.text }}>{label}</div>
      <div style={{ fontSize: 10, color: THEME.textDim, textAlign: 'center', lineHeight: 1.3 }}>{desc}</div>
    </button>
  );
}

function EmojiPickerSheet({ current, onClose, onPick }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          borderRadius: '24px 24px 0 0',
          background: THEME.surface,
          border: `1px solid ${THEME.stroke}`,
          padding: '14px 16px 34px',
          animation: 'sheetUp 0.24s ease',
        }}
      >
        <div style={{
          width: 36, height: 4, borderRadius: 100,
          background: THEME.strokeHi, margin: '0 auto 14px',
        }}/>
        <div style={{
          fontSize: 13, fontWeight: 700, color: THEME.text, marginBottom: 12,
        }}>
          Pick an icon
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8,
        }}>
          {EMOJI_CHOICES.map(e => (
            <button
              key={e}
              onClick={() => onPick(e)}
              style={{
                aspectRatio: '1', borderRadius: 12,
                background: current === e ? THEME.gold : THEME.bg,
                border: `1px solid ${current === e ? THEME.gold : THEME.stroke}`,
                cursor: 'pointer', fontSize: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

Object.assign(window, { CreateCollectionScreen });

// ───────────────────────────────────────────────
// AI Generate sheet
// ───────────────────────────────────────────────

function AIGenerateSheet({ prompt, setPrompt, loading, error, onClose, onGenerate }) {
  const EXAMPLES = ['cat breeds', 'NYC street art', 'cloud types', 'dive bars', 'fire escapes', 'dog breeds'];
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          borderRadius: '24px 24px 0 0',
          background: `
            radial-gradient(circle at 20% 0%, rgba(233,184,106,0.14), transparent 55%),
            ${THEME.surface}
          `,
          border: `1px solid ${THEME.stroke}`,
          padding: '14px 20px 28px',
          animation: 'sheetUp 0.24s ease',
        }}
      >
        <div style={{
          width: 36, height: 4, borderRadius: 100,
          background: THEME.strokeHi, margin: '0 auto 18px',
        }}/>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.goldLo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 20px ${THEME.goldGlow}`,
          }}>
            <Icon name="sparkle" size={20} color="#1A1410" strokeWidth={2.2}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600,
              color: THEME.text, letterSpacing: -0.3, lineHeight: 1,
            }}>
              Generate with AI
            </div>
            <div style={{ fontSize: 11.5, color: THEME.textDim, marginTop: 4 }}>
              Describe what you want to collect
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10,
            background: THEME.bg, border: `1px solid ${THEME.stroke}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="x" size={16} color={THEME.textDim}/>
          </button>
        </div>

        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onGenerate(); }}
          placeholder="e.g. cat breeds"
          autoFocus
          disabled={loading}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '14px 16px', borderRadius: 14,
            background: THEME.bg, border: `1.5px solid ${THEME.strokeHi}`,
            color: THEME.text, fontSize: 15, fontFamily: 'inherit',
            outline: 'none',
          }}
        />

        <div style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginTop: 18, marginBottom: 8 }}>
          Try
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              disabled={loading}
              style={{
                padding: '7px 12px', borderRadius: 100,
                background: THEME.bg, border: `1px solid ${THEME.stroke}`,
                color: THEME.textDim, fontSize: 12, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {ex}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 10,
            background: 'rgba(240,122,99,0.12)', border: '1px solid rgba(240,122,99,0.3)',
            fontSize: 12, color: THEME.coral,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={onGenerate}
          disabled={!prompt.trim() || loading}
          style={{
            width: '100%', marginTop: 20,
            padding: '15px 20px', borderRadius: 100,
            background: (!prompt.trim() || loading)
              ? THEME.bg
              : `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.gold})`,
            border: (!prompt.trim() || loading) ? `1px solid ${THEME.stroke}` : 'none',
            color: (!prompt.trim() || loading) ? THEME.textMuted : '#1A1410',
            fontSize: 14, fontWeight: 700,
            cursor: (!prompt.trim() || loading) ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            boxShadow: (!prompt.trim() || loading) ? 'none' : `0 8px 20px ${THEME.goldGlow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: 14, height: 14, borderRadius: 100,
                border: `2px solid ${THEME.textMuted}`, borderTopColor: 'transparent',
                animation: 'aispin 0.8s linear infinite',
              }}/>
              Generating…
            </>
          ) : (
            <>
              <Icon name="sparkle" size={16} color={prompt.trim() ? '#1A1410' : THEME.textMuted} strokeWidth={2.2}/>
              Generate
            </>
          )}
        </button>

        <div style={{ fontSize: 10.5, color: THEME.textMuted, marginTop: 12, textAlign: 'center', letterSpacing: 0.2 }}>
          Powered by Claude · you can edit anything after
        </div>
      </div>
      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes aispin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
