// Collecta — theme tokens + shared UI primitives

const THEMES = {
  midnight: {
    name: 'Midnight',
    swatches: ['#0E1116', '#E9B86A'],
    bg: '#0E1116', surface: '#171B22', surfaceHi: '#1F252E', surfaceLo: '#0A0D12',
    stroke: 'rgba(255,255,255,0.06)', strokeHi: 'rgba(255,255,255,0.12)',
    text: '#F4F1EA', textDim: 'rgba(244,241,234,0.62)', textMuted: 'rgba(244,241,234,0.38)',
    gold: '#E9B86A', goldHi: '#F4CE88', goldLo: '#B8894A', goldGlow: 'rgba(233,184,106,0.25)',
    coral: '#F07A63', mint: '#7CCBA6', sky: '#6BA8D4',
    phoneBezel: '#1A1A1E', phoneBezel2: '#2A2A2E',
    appShellBg: '#06080B',
    overlay: 'rgba(14,17,22,0.82)', overlayHi: 'rgba(14,17,22,0.9)',
    mapBg: '#1A2230', mapBgDeep: '#0E1722', mapStreet: 'rgba(255,255,255,0.06)',
    isLight: false,
  },
  forest: {
    name: 'Forest',
    swatches: ['#101A15', '#9EC879'],
    bg: '#101A15', surface: '#182721', surfaceHi: '#21342C', surfaceLo: '#0A120E',
    stroke: 'rgba(255,255,255,0.06)', strokeHi: 'rgba(255,255,255,0.12)',
    text: '#ECF2EA', textDim: 'rgba(236,242,234,0.62)', textMuted: 'rgba(236,242,234,0.38)',
    gold: '#9EC879', goldHi: '#BEDB93', goldLo: '#6F9A4F', goldGlow: 'rgba(158,200,121,0.25)',
    coral: '#E89570', mint: '#7CCBA6', sky: '#77B5C7',
    phoneBezel: '#151E1A', phoneBezel2: '#24302A',
    appShellBg: '#070B09',
    overlay: 'rgba(16,26,21,0.82)', overlayHi: 'rgba(16,26,21,0.9)',
    mapBg: '#18281E', mapBgDeep: '#0C1811', mapStreet: 'rgba(255,255,255,0.06)',
    isLight: false,
  },
  plum: {
    name: 'Plum',
    swatches: ['#160F1E', '#E26D9C'],
    bg: '#160F1E', surface: '#221829', surfaceHi: '#2F2338', surfaceLo: '#0E0914',
    stroke: 'rgba(255,255,255,0.06)', strokeHi: 'rgba(255,255,255,0.12)',
    text: '#F3EEF4', textDim: 'rgba(243,238,244,0.62)', textMuted: 'rgba(243,238,244,0.38)',
    gold: '#E26D9C', goldHi: '#F290B6', goldLo: '#B04872', goldGlow: 'rgba(226,109,156,0.28)',
    coral: '#EF8D7A', mint: '#9AC9AE', sky: '#8AA6D4',
    phoneBezel: '#1E1627', phoneBezel2: '#2E2538',
    appShellBg: '#0A0610',
    overlay: 'rgba(22,15,30,0.82)', overlayHi: 'rgba(22,15,30,0.9)',
    mapBg: '#221A2E', mapBgDeep: '#130C1C', mapStreet: 'rgba(255,255,255,0.06)',
    isLight: false,
  },
  paper: {
    name: 'Paper',
    swatches: ['#F3EEE3', '#A05932'],
    bg: '#F3EEE3', surface: '#FFFFFF', surfaceHi: '#F8F2E5', surfaceLo: '#E8E1D0',
    stroke: 'rgba(40,32,24,0.08)', strokeHi: 'rgba(40,32,24,0.15)',
    text: '#1F1912', textDim: 'rgba(31,25,18,0.6)', textMuted: 'rgba(31,25,18,0.38)',
    gold: '#A05932', goldHi: '#C4724A', goldLo: '#7A4122', goldGlow: 'rgba(160,89,50,0.18)',
    coral: '#C25A44', mint: '#5E9A7B', sky: '#4F7DA6',
    phoneBezel: '#D8CFBA', phoneBezel2: '#C9BEA4',
    appShellBg: '#DCD4C2',
    overlay: 'rgba(255,252,245,0.86)', overlayHi: 'rgba(255,252,245,0.94)',
    mapBg: '#E6DECB', mapBgDeep: '#D0C6AE', mapStreet: 'rgba(31,25,18,0.12)',
    isLight: true,
  },
};

// Mutable THEME object — we swap its properties on theme change.
// All screens read from THEME by reference, so a key bump re-renders them.
const THEME = { ...THEMES.midnight, radius: { sm: 10, md: 16, lg: 22, xl: 28 } };

function applyTheme(id) {
  const t = THEMES[id] || THEMES.midnight;
  Object.keys(THEME).forEach(k => { if (k !== 'radius') delete THEME[k]; });
  Object.assign(THEME, t);
  THEME.radius = { sm: 10, md: 16, lg: 22, xl: 28 };
}

// Tab bar — 5 items, camera is prominent center button
function TabBar({ current, onChange }) {
  const items = [
    { id: 'feed', label: 'Feed', icon: 'home' },
    { id: 'map', label: 'Map', icon: 'map' },
    { id: 'camera', label: '', icon: 'camera' },
    { id: 'collections', label: 'Finds', icon: 'grid' },
    { id: 'profile', label: 'Me', icon: 'user' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
      paddingBottom: 28, paddingTop: 10,
        background: `linear-gradient(180deg, transparent 0%, ${THEME.surfaceLo} 35%)`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
        padding: '0 12px',
      }}>
        {items.map(it => {
          const active = current === it.id;
          if (it.id === 'camera') {
            return (
              <button key={it.id} onClick={() => onChange(it.id)} style={{
                width: 62, height: 62, borderRadius: 22,
                border: 'none', cursor: 'pointer',
                background: `linear-gradient(145deg, ${THEME.goldHi} 0%, ${THEME.gold} 50%, ${THEME.goldLo} 100%)`,
                boxShadow: `0 8px 20px ${THEME.goldGlow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: 'translateY(-10px)', position: 'relative',
              }}>
                <Icon name="camera" size={30} color="#1A1410" strokeWidth={2.2}/>
                <div style={{
                  position: 'absolute', inset: -3, borderRadius: 25,
                  border: `1.5px solid ${THEME.surfaceLo}`, pointerEvents: 'none',
                }}/>
              </button>
            );
          }
          return (
            <button key={it.id} onClick={() => onChange(it.id)} style={{
              flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '6px 0', minWidth: 0,
            }}>
              <Icon name={it.icon} size={24} color={active ? THEME.gold : THEME.textMuted} strokeWidth={active ? 2.4 : 2}/>
              <span style={{
                fontSize: 10.5, fontWeight: active ? 600 : 500,
                color: active ? THEME.gold : THEME.textMuted,
                letterSpacing: 0.2,
              }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Progress ring (SVG)
function ProgressRing({ size = 72, stroke = 6, progress, color = THEME.gold, trackColor = 'rgba(255,255,255,0.08)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (progress * c);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}/>
      </svg>
      {children && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>{children}</div>
      )}
    </div>
  );
}

// Bar-style progress
function ProgressBar({ progress, height = 4, color = THEME.gold }) {
  return (
    <div style={{
      width: '100%', height, borderRadius: height/2,
      background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
    }}>
      <div style={{
        width: `${progress * 100}%`, height: '100%', borderRadius: height/2,
        background: `linear-gradient(90deg, ${THEME.goldLo}, ${color})`,
        transition: 'width 0.5s ease',
      }}/>
    </div>
  );
}

// Avatar
function Avatar({ src, size = 36, ring = false, ringColor = THEME.gold }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `url(${src}) center/cover, ${THEME.surfaceHi}`,
      border: ring ? `2px solid ${ringColor}` : `0.5px solid ${THEME.strokeHi}`,
      boxShadow: ring ? `0 0 0 2px ${THEME.surfaceLo}` : 'none',
      flexShrink: 0,
    }}/>
  );
}

// Pill tag
function Pill({ children, icon, color = THEME.text, bg = 'rgba(255,255,255,0.08)', style }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 9px', borderRadius: 100,
      background: bg, color,
      fontSize: 11.5, fontWeight: 600, letterSpacing: 0.1,
      ...style,
    }}>
      {icon && <Icon name={icon} size={12} color={color}/>}
      {children}
    </div>
  );
}

Object.assign(window, { THEME, THEMES, applyTheme, TabBar, ProgressRing, ProgressBar, Avatar, Pill });
