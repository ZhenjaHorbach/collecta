// Collecta — icon set (simple line icons + app logo)

const Icon = ({ name, size = 24, color = 'currentColor', strokeWidth = 2, fill = 'none' }) => {
  const s = { width: size, height: size, stroke: color, fill, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    home: <><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></>,
    map: <><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
    camera: <><path d="M3 8a2 2 0 012-2h2l2-2h6l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/><circle cx="12" cy="13" r="4"/></>,
    heart: <><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 5.5 5.5 5.5 0 0121.5 12c-2.5 4.5-9.5 9-9.5 9z"/></>,
    fire: <><path d="M12 2s4 5 4 9a4 4 0 11-8 0c0-2 1-3 1-3s-2 3-2 6a5 5 0 0010 0c0-5-5-12-5-12z"/></>,
    sparkle: <><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/></>,
    pin: <><path d="M12 22s7-6.5 7-12a7 7 0 00-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></>,
    share: <><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4M8 13l8 4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    check: <><path d="M4 12l5 5L20 6"/></>,
    chevronRight: <><path d="M9 5l7 7-7 7"/></>,
    chevronLeft: <><path d="M15 5l-7 7 7 7"/></>,
    x: <><path d="M6 6l12 12M18 6L6 18"/></>,
    bolt: <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></>,
    trophy: <><path d="M8 3h8v4a4 4 0 01-8 0V3z"/><path d="M4 5h4M16 5h4M10 14h4M9 21h6M12 14v7"/></>,
    flag: <><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
    bell: <><path d="M18 16V11a6 6 0 00-12 0v5l-2 2h16l-2-2z"/><path d="M10 20a2 2 0 004 0"/></>,
    flash: <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></>,
    refresh: <><path d="M3 12a9 9 0 0115-6.7L21 8M21 12a9 9 0 01-15 6.7L3 16"/><path d="M21 3v5h-5M3 21v-5h5"/></>,
    dots: <><circle cx="5" cy="12" r="1.5" fill={color}/><circle cx="12" cy="12" r="1.5" fill={color}/><circle cx="19" cy="12" r="1.5" fill={color}/></>,
    bookmark: <><path d="M6 3h12v18l-6-4-6 4V3z"/></>,
    pencil: <><path d="M4 20h4l10.5-10.5-4-4L4 16v4z"/><path d="M14 6l4 4"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill={color}/><circle cx="4" cy="12" r="1" fill={color}/><circle cx="4" cy="18" r="1" fill={color}/></>,
    infinity: <><path d="M6 12a3 3 0 016-3l6 6a3 3 0 103-3 3 3 0 00-3 3l-6-6a3 3 0 10-6 3z"/></>,
    users: <><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3 3-5.5 6-5.5s6 2.5 6 5.5"/><circle cx="17" cy="9" r="2.8"/><path d="M15 14c3 0 6 1.8 6 5"/></>,
    arrowRight: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{paths[name]}</svg>;
};

// Collecta logo mark — a geometric "C" made of 3 dots forming a collection
const CollectaMark = ({ size = 28, color = '#E9B86A' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="10" cy="10" r="4.5" fill={color}/>
    <circle cx="22" cy="10" r="4.5" fill={color} opacity="0.55"/>
    <circle cx="10" cy="22" r="4.5" fill={color} opacity="0.8"/>
    <circle cx="22" cy="22" r="4.5" fill="none" stroke={color} strokeWidth="1.8" strokeDasharray="2 2"/>
  </svg>
);

Object.assign(window, { Icon, CollectaMark });
