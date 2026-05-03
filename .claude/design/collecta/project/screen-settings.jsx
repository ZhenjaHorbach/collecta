// screen-settings.jsx — Settings (language, theme, account, notifications, etc.)

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'ru', label: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇵🇹' },
  { code: 'it', label: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', label: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'zh', label: 'Chinese', native: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
];

function SettingsScreen({ onBack, themeId, onThemeChange, onSignOut }) {
  const [lang, setLang] = React.useState(() => localStorage.getItem('collecta.lang') || 'en');
  const [langSheetOpen, setLangSheetOpen] = React.useState(false);
  const [notifPush, setNotifPush] = React.useState(true);
  const [notifFriends, setNotifFriends] = React.useState(true);
  const [notifWeekly, setNotifWeekly] = React.useState(false);
  const [autoLocation, setAutoLocation] = React.useState(true);
  const [aiVerify, setAiVerify] = React.useState(true);
  const [highRes, setHighRes] = React.useState(false);
  const [privateProfile, setPrivateProfile] = React.useState(false);

  React.useEffect(() => {
    localStorage.setItem('collecta.lang', lang);
  }, [lang]);

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const currentTheme = THEMES[themeId] || THEMES.midnight;

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'auto',
      background: THEME.bg, paddingBottom: 60,
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
            Settings
          </div>
          <div style={{ fontSize: 11.5, color: THEME.textDim, marginTop: 4 }}>
            Make Collecta yours
          </div>
        </div>
      </div>

      {/* Account card */}
      <div style={{ padding: '6px 16px 0' }}>
        <div style={{
          padding: 14, borderRadius: 18,
          background: `
            radial-gradient(circle at 30% 20%, ${THEME.goldGlow}, transparent 60%),
            linear-gradient(145deg, ${THEME.surfaceHi}, ${THEME.surfaceLo})
          `,
          border: `1px solid ${THEME.stroke}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: `url(${USERS.me.avatar}) center/cover, ${THEME.surface}`,
            border: `2px solid ${THEME.stroke}`,
          }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text }}>
              {USERS.me.name}
            </div>
            <div style={{ fontSize: 12, color: THEME.textDim, marginTop: 2 }}>
              @{USERS.me.handle} · Lvl {USERS.me.level}
            </div>
          </div>
          <button style={{
            padding: '8px 12px', borderRadius: 100,
            background: THEME.bg, border: `1px solid ${THEME.strokeHi}`,
            color: THEME.text, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Edit
          </button>
        </div>
      </div>

      {/* APPEARANCE */}
      <SettingsSection title="Appearance">
        <SettingsRow
          icon="sparkle" iconBg={THEME.gold}
          label="Theme"
          value={currentTheme.name}
          accessory={
            <div style={{ display: 'flex', gap: 4 }}>
              {currentTheme.swatches.map((s, i) => (
                <div key={i} style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: s, border: `1px solid ${THEME.strokeHi}`,
                }}/>
              ))}
            </div>
          }
        />
        {/* Theme picker grid (always visible — no need to open another sheet) */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
          padding: '6px 14px 14px',
        }}>
          {Object.entries(THEMES).map(([id, t]) => {
            const active = themeId === id;
            return (
              <button
                key={id}
                onClick={() => onThemeChange(id)}
                style={{
                  padding: 10, borderRadius: 14, cursor: 'pointer',
                  background: t.bg, border: `2px solid ${active ? THEME.gold : 'transparent'}`,
                  fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  position: 'relative',
                  boxShadow: active ? `0 0 0 3px ${THEME.goldGlow}` : 'none',
                }}
              >
                <div style={{ display: 'flex', gap: 4 }}>
                  {t.swatches.map((s, i) => (
                    <div key={i} style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: s, border: '1px solid rgba(255,255,255,0.1)',
                    }}/>
                  ))}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: t.text,
                  textAlign: 'left', letterSpacing: 0.1,
                }}>
                  {t.name}
                </div>
                {active && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 16, height: 16, borderRadius: '50%',
                    background: THEME.gold,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="check" size={10} color="#1A1410" strokeWidth={3.5}/>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <SettingsRow
          icon="globe" iconBg={THEME.sky}
          label="Language"
          value={`${currentLang.flag} ${currentLang.native}`}
          chevron
          onClick={() => setLangSheetOpen(true)}
        />
        <SettingsRow
          icon="camera" iconBg={THEME.coral}
          label="High-res uploads"
          subtitle="Better quality, more data"
          accessory={<Toggle on={highRes} onChange={setHighRes}/>}
        />
      </SettingsSection>

      {/* NOTIFICATIONS */}
      <SettingsSection title="Notifications">
        <SettingsRow
          icon="bell" iconBg={THEME.gold}
          label="Push notifications"
          accessory={<Toggle on={notifPush} onChange={setNotifPush}/>}
        />
        <SettingsRow
          icon="users" iconBg={THEME.mint}
          label="Friends activity"
          subtitle="When friends post or complete collections"
          accessory={<Toggle on={notifFriends} onChange={setNotifFriends}/>}
        />
        <SettingsRow
          icon="trophy" iconBg={THEME.coral}
          label="Weekly recap"
          subtitle="Sundays, 7pm local time"
          accessory={<Toggle on={notifWeekly} onChange={setNotifWeekly}/>}
        />
      </SettingsSection>

      {/* CAPTURE */}
      <SettingsSection title="Capture">
        <SettingsRow
          icon="pin" iconBg={THEME.sky}
          label="Auto-tag location"
          subtitle="Add GPS to your captures"
          accessory={<Toggle on={autoLocation} onChange={setAutoLocation}/>}
        />
        <SettingsRow
          icon="sparkle" iconBg={THEME.gold}
          label="AI verification"
          subtitle="Confirm photos match the collection"
          accessory={<Toggle on={aiVerify} onChange={setAiVerify}/>}
        />
      </SettingsSection>

      {/* PRIVACY */}
      <SettingsSection title="Privacy & data">
        <SettingsRow
          icon="lock" iconBg="#7B6BD4"
          label="Private profile"
          subtitle="Only friends can see your collections"
          accessory={<Toggle on={privateProfile} onChange={setPrivateProfile}/>}
        />
        <SettingsRow
          icon="bookmark" iconBg={THEME.mint}
          label="Blocked users"
          chevron
        />
        <SettingsRow
          icon="share" iconBg={THEME.textDim}
          label="Download my data"
          chevron
        />
      </SettingsSection>

      {/* ABOUT */}
      <SettingsSection title="About">
        <SettingsRow icon="flag" iconBg={THEME.coral} label="Help & support" chevron/>
        <SettingsRow icon="check" iconBg={THEME.mint} label="Terms of service" chevron/>
        <SettingsRow icon="lock" iconBg={THEME.sky} label="Privacy policy" chevron/>
      </SettingsSection>

      {/* Sign out */}
      <div style={{ padding: '24px 16px 0' }}>
        <button
          onClick={onSignOut}
          style={{
            width: '100%', padding: '14px 18px', borderRadius: 14,
            background: 'transparent', border: `1px solid ${THEME.stroke}`,
            color: THEME.coral, fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          Sign out
        </button>
      </div>

      <div style={{
        textAlign: 'center', padding: '20px 0 30px',
        fontSize: 11, color: THEME.textMuted, letterSpacing: 0.3,
      }}>
        Collecta · v1.4.2 · Made with ✨ in NYC
      </div>

      {/* Language sheet */}
      {langSheetOpen && (
        <LanguageSheet
          current={lang}
          onClose={() => setLangSheetOpen(false)}
          onPick={(code) => { setLang(code); setLangSheetOpen(false); }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function SettingsSection({ title, children }) {
  return (
    <div style={{ padding: '28px 16px 0' }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: THEME.textDim,
        letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
        padding: '0 4px',
      }}>
        {title}
      </div>
      <div style={{
        background: THEME.surface, border: `1px solid ${THEME.stroke}`,
        borderRadius: 18, overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ icon, iconBg, label, subtitle, value, accessory, chevron, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick && !chevron}
      style={{
        width: '100%', padding: '12px 14px',
        background: 'transparent', border: 'none',
        cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${THEME.stroke}`,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: iconBg || THEME.surfaceHi,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={16} color="#1A1410" strokeWidth={2.2}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text, lineHeight: 1.2 }}>
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11.5, color: THEME.textDim, marginTop: 2, lineHeight: 1.3 }}>
            {subtitle}
          </div>
        )}
      </div>
      {value && (
        <div style={{ fontSize: 13, color: THEME.textDim, fontWeight: 600 }}>
          {value}
        </div>
      )}
      {accessory}
      {chevron && <Icon name="chevronRight" size={16} color={THEME.textMuted}/>}
    </button>
  );
}

function Toggle({ on, onChange }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      style={{
        width: 44, height: 26, borderRadius: 100,
        background: on ? THEME.gold : THEME.strokeHi,
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.18s ease',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: on ? 20 : 2,
        width: 22, height: 22, borderRadius: '50%',
        background: '#FAFAF8',
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        transition: 'left 0.18s ease',
      }}/>
    </div>
  );
}

function LanguageSheet({ current, onClose, onPick }) {
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
          width: '100%', maxHeight: '80%',
          borderRadius: '24px 24px 0 0',
          background: THEME.surface,
          border: `1px solid ${THEME.stroke}`,
          padding: '14px 0 24px',
          animation: 'sheetUp 0.24s ease',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          width: 36, height: 4, borderRadius: 100,
          background: THEME.strokeHi, margin: '0 auto 14px',
        }}/>
        <div style={{
          padding: '0 20px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${THEME.stroke}`,
        }}>
          <div style={{
            fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600,
            color: THEME.text, letterSpacing: -0.3,
          }}>
            Language
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10,
            background: THEME.bg, border: `1px solid ${THEME.stroke}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="x" size={16} color={THEME.textDim}/>
          </button>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {LANGUAGES.map(l => {
            const active = l.code === current;
            return (
              <button
                key={l.code}
                onClick={() => onPick(l.code)}
                style={{
                  width: '100%', padding: '14px 20px',
                  background: active ? THEME.surfaceHi : 'transparent',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                  borderBottom: `1px solid ${THEME.stroke}`,
                }}
              >
                <div style={{ fontSize: 22, lineHeight: 1 }}>{l.flag}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>
                    {l.native}
                  </div>
                  <div style={{ fontSize: 11.5, color: THEME.textDim, marginTop: 2 }}>
                    {l.label}
                  </div>
                </div>
                {active && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: THEME.gold,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="check" size={12} color="#1A1410" strokeWidth={3.5}/>
                  </div>
                )}
              </button>
            );
          })}
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

Object.assign(window, { SettingsScreen });
