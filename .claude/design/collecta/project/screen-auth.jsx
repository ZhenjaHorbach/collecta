// screen-auth.jsx — Welcome / Sign in / Sign up / Verify / Onboarding

const AUTH_CATEGORIES = [
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

// ───────────────────────────────────────────────
// 1. Welcome
// ───────────────────────────────────────────────

function WelcomeScreen({ onSignIn, onSignUp }) {
  // Decorative floating thumbnails (from FEED photos if available)
  const tiles = [
    { src: (typeof FEED !== 'undefined' && FEED[0]?.photo), x: 10, y: 12, r: -8, w: 140, emoji: '🐈' },
    { src: (typeof FEED !== 'undefined' && FEED[1]?.photo), x: 62, y: 8, r: 6, w: 126, emoji: '🎨' },
    { src: (typeof FEED !== 'undefined' && FEED[2]?.photo), x: 4, y: 42, r: 4, w: 116, emoji: '🏔️' },
    { src: (typeof FEED !== 'undefined' && FEED[3]?.photo), x: 58, y: 38, r: -7, w: 148, emoji: '🏛️' },
    { src: (typeof FEED !== 'undefined' && FEED[4]?.photo), x: 28, y: 66, r: 3, w: 132, emoji: '☁️' },
  ];
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `
        radial-gradient(circle at 70% 10%, ${THEME.goldGlow}, transparent 55%),
        radial-gradient(circle at 10% 80%, rgba(107,168,212,0.14), transparent 55%),
        ${THEME.bg}
      `,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Floating polaroids */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {tiles.map((t, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${t.x}%`, top: `${t.y}%`,
            width: t.w, aspectRatio: '0.82',
            padding: 8, paddingBottom: 30,
            background: '#F4F1EA',
            boxShadow: '0 20px 50px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.3)',
            transform: `rotate(${t.r}deg)`,
            borderRadius: 4,
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: 2,
              background: t.src ? `url(${t.src}) center/cover` : '#222',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', bottom: -26, left: 0, right: 0,
                textAlign: 'center', fontSize: 14,
              }}>{t.emoji}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Vignette for contrast */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, transparent 40%, ${THEME.bg} 88%)`,
      }}/>

      {/* Content */}
      <div style={{
        position: 'relative', marginTop: 'auto', padding: '32px 28px 40px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <CollectaMark size={36} color={THEME.gold}/>
          <div style={{
            fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600,
            color: THEME.text, letterSpacing: -0.5,
          }}>
            Collecta
          </div>
        </div>
        <div style={{
          fontFamily: 'Fraunces, serif', fontSize: 40, fontWeight: 600,
          color: THEME.text, lineHeight: 1.02, letterSpacing: -1.2,
          marginBottom: 14,
        }}>
          Collect<br/>the world,<br/>one photo at a time.
        </div>
        <div style={{
          fontSize: 14, color: THEME.textDim, lineHeight: 1.5,
          marginBottom: 26, maxWidth: 300,
        }}>
          Turn everyday finds into curated collections. Bodega cats, street art, cloud types — whatever you spot.
        </div>

        <button onClick={onSignUp} style={{
          width: '100%', padding: '16px 20px', borderRadius: 100,
          background: `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.gold})`,
          border: 'none', color: '#1A1410',
          fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          cursor: 'pointer', marginBottom: 10,
          boxShadow: `0 12px 28px ${THEME.goldGlow}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          Create account
          <Icon name="arrowRight" size={16} color="#1A1410" strokeWidth={2.6}/>
        </button>
        <button onClick={onSignIn} style={{
          width: '100%', padding: '15px 20px', borderRadius: 100,
          background: 'transparent',
          border: `1px solid ${THEME.strokeHi}`,
          color: THEME.text, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          I already have an account
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// 2. Sign in
// ───────────────────────────────────────────────

function SignInScreen({ onBack, onSubmit, onForgot, onSwitchSignUp }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const canSubmit = /\S+@\S+/.test(email) && password.length >= 6;

  return (
    <AuthShell onBack={onBack}>
      <div style={{ padding: '8px 24px 0' }}>
        <div style={{
          fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 600,
          color: THEME.text, letterSpacing: -0.8, lineHeight: 1.05, marginBottom: 8,
        }}>
          Welcome back
        </div>
        <div style={{ fontSize: 14, color: THEME.textDim, marginBottom: 30 }}>
          Sign in to keep your streak going.
        </div>

        <SocialRow/>

        <Divider/>

        <AuthField label="Email">
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={authInputStyle()}
          />
        </AuthField>

        <AuthField label="Password">
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ ...authInputStyle(), paddingRight: 52 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(s => !s)}
              style={{
                position: 'absolute', right: 6, top: 6, bottom: 6,
                width: 40, borderRadius: 10,
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 10, fontWeight: 700, color: THEME.textDim,
                letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </AuthField>

        <button onClick={onForgot} style={{
          background: 'transparent', border: 'none',
          fontSize: 12.5, fontWeight: 600, color: THEME.gold,
          cursor: 'pointer', padding: '4px 0', marginTop: -4, fontFamily: 'inherit',
        }}>
          Forgot password?
        </button>

        <button
          onClick={() => canSubmit && onSubmit({ email, password })}
          disabled={!canSubmit}
          style={authCtaStyle(canSubmit)}
        >
          Sign in
          <Icon name="arrowRight" size={16} color={canSubmit ? '#1A1410' : THEME.textMuted} strokeWidth={2.6}/>
        </button>

        <div style={{ fontSize: 13, color: THEME.textDim, textAlign: 'center', marginTop: 22 }}>
          New to Collecta?{' '}
          <button onClick={onSwitchSignUp} style={{
            background: 'transparent', border: 'none', padding: 0,
            color: THEME.gold, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13,
          }}>
            Create account
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

// ───────────────────────────────────────────────
// 3. Sign up
// ───────────────────────────────────────────────

function SignUpScreen({ onBack, onSubmit, onSwitchSignIn }) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);

  const emailOk = /\S+@\S+/.test(email);
  const pwStrength = passwordStrength(password);
  const canSubmit = name.trim().length >= 2 && emailOk && pwStrength >= 2;

  return (
    <AuthShell onBack={onBack}>
      <div style={{ padding: '8px 24px 0' }}>
        <div style={{
          fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 600,
          color: THEME.text, letterSpacing: -0.8, lineHeight: 1.05, marginBottom: 8,
        }}>
          Create account
        </div>
        <div style={{ fontSize: 14, color: THEME.textDim, marginBottom: 30 }}>
          Start your first collection in under a minute.
        </div>

        <SocialRow/>

        <Divider/>

        <AuthField label="Name">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Riley Chen"
            style={authInputStyle()}
          />
        </AuthField>

        <AuthField label="Email">
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={authInputStyle()}
          />
        </AuthField>

        <AuthField label="Password">
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              style={{ ...authInputStyle(), paddingRight: 52 }}
            />
            <button
              type="button" onClick={() => setShowPw(s => !s)}
              style={{
                position: 'absolute', right: 6, top: 6, bottom: 6,
                width: 40, borderRadius: 10,
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 10, fontWeight: 700, color: THEME.textDim,
                letterSpacing: 1, textTransform: 'uppercase',
              }}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          <StrengthBar strength={pwStrength}/>
        </AuthField>

        <button
          onClick={() => canSubmit && onSubmit({ name, email, password })}
          disabled={!canSubmit}
          style={authCtaStyle(canSubmit)}
        >
          Continue
          <Icon name="arrowRight" size={16} color={canSubmit ? '#1A1410' : THEME.textMuted} strokeWidth={2.6}/>
        </button>

        <div style={{
          fontSize: 11, color: THEME.textMuted,
          textAlign: 'center', marginTop: 14, lineHeight: 1.5,
        }}>
          By continuing you agree to our{' '}
          <span style={{ color: THEME.textDim, textDecoration: 'underline' }}>Terms</span>
          {' '}&{' '}
          <span style={{ color: THEME.textDim, textDecoration: 'underline' }}>Privacy Policy</span>.
        </div>

        <div style={{ fontSize: 13, color: THEME.textDim, textAlign: 'center', marginTop: 18 }}>
          Already have an account?{' '}
          <button onClick={onSwitchSignIn} style={{
            background: 'transparent', border: 'none', padding: 0,
            color: THEME.gold, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13,
          }}>
            Sign in
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

// ───────────────────────────────────────────────
// 4. Verify — 6-digit code
// ───────────────────────────────────────────────

function VerifyScreen({ email = 'you@example.com', onBack, onSubmit, onResend }) {
  const [digits, setDigits] = React.useState(['', '', '', '', '', '']);
  const refs = React.useRef([]);
  const [resendIn, setResendIn] = React.useState(28);

  React.useEffect(() => {
    const t = setInterval(() => setResendIn(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const onChange = (i, val) => {
    const clean = val.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (next.every(d => d !== '') && i === 5) {
      setTimeout(() => onSubmit(next.join('')), 200);
    }
  };

  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const onPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (paste.length >= 4) {
      e.preventDefault();
      const next = [...digits];
      paste.forEach((d, i) => { next[i] = d; });
      setDigits(next);
      refs.current[Math.min(paste.length, 5)]?.focus();
      if (paste.length === 6) setTimeout(() => onSubmit(next.join('')), 200);
    }
  };

  const code = digits.join('');
  const canSubmit = code.length === 6;

  return (
    <AuthShell onBack={onBack}>
      <div style={{ padding: '8px 24px 0' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18, marginBottom: 24,
          background: `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.goldLo})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 12px 28px ${THEME.goldGlow}`,
        }}>
          <Icon name="bell" size={26} color="#1A1410" strokeWidth={2.2}/>
        </div>
        <div style={{
          fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 600,
          color: THEME.text, letterSpacing: -0.8, lineHeight: 1.05, marginBottom: 8,
        }}>
          Check your email
        </div>
        <div style={{
          fontSize: 14, color: THEME.textDim, marginBottom: 34, lineHeight: 1.5,
        }}>
          We sent a 6-digit code to{' '}
          <span style={{ color: THEME.text, fontWeight: 600 }}>{email}</span>.
        </div>

        {/* Code cells */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => refs.current[i] = el}
              value={d}
              onChange={e => onChange(i, e.target.value)}
              onKeyDown={e => onKey(i, e)}
              onPaste={onPaste}
              inputMode="numeric"
              maxLength={1}
              style={{
                width: 48, height: 58, borderRadius: 14,
                background: d ? THEME.surfaceHi : THEME.surface,
                border: `1.5px solid ${d ? THEME.gold : THEME.stroke}`,
                color: THEME.text, textAlign: 'center',
                fontSize: 24, fontWeight: 700, fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.15s ease',
                boxShadow: d ? `0 0 0 3px ${THEME.goldGlow}` : 'none',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => canSubmit && onSubmit(code)}
          disabled={!canSubmit}
          style={authCtaStyle(canSubmit)}
        >
          Verify
          <Icon name="arrowRight" size={16} color={canSubmit ? '#1A1410' : THEME.textMuted} strokeWidth={2.6}/>
        </button>

        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <div style={{ fontSize: 13, color: THEME.textDim }}>
            Didn't get a code?{' '}
            {resendIn > 0 ? (
              <span style={{ color: THEME.textMuted }}>Resend in {resendIn}s</span>
            ) : (
              <button
                onClick={() => { onResend && onResend(); setResendIn(28); }}
                style={{
                  background: 'transparent', border: 'none', padding: 0,
                  color: THEME.gold, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13,
                }}
              >
                Resend code
              </button>
            )}
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

// ───────────────────────────────────────────────
// 5. Onboarding — pick interests
// ───────────────────────────────────────────────

function OnboardingScreen({ onDone, onBack, name = 'there' }) {
  const [picked, setPicked] = React.useState(new Set());
  const toggle = (label) => {
    const next = new Set(picked);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    setPicked(next);
  };
  const canContinue = picked.size >= 3;

  return (
    <AuthShell onBack={onBack} step={2} totalSteps={2}>
      <div style={{ padding: '8px 24px 100px' }}>
        <div style={{
          fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 600,
          color: THEME.text, letterSpacing: -0.8, lineHeight: 1.05, marginBottom: 8,
        }}>
          What do you collect?
        </div>
        <div style={{ fontSize: 14, color: THEME.textDim, marginBottom: 28, lineHeight: 1.5 }}>
          Pick at least 3. We'll show you trending collections in those areas.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {AUTH_CATEGORIES.map(c => {
            const active = picked.has(c.label);
            return (
              <button
                key={c.label}
                onClick={() => toggle(c.label)}
                style={{
                  padding: '18px 14px', borderRadius: 16,
                  background: active ? `linear-gradient(145deg, ${THEME.surfaceHi}, ${THEME.surface})` : THEME.surface,
                  border: `1.5px solid ${active ? THEME.gold : THEME.stroke}`,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: active ? `0 0 0 3px ${THEME.goldGlow}` : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: 26, lineHeight: 1 }}>{c.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text, flex: 1 }}>
                  {c.label}
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
          })}
        </div>

        {/* Sticky CTA */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '14px 24px 30px',
          background: `linear-gradient(0deg, ${THEME.bg} 70%, transparent)`,
        }}>
          <div style={{
            fontSize: 12, color: THEME.textDim, textAlign: 'center', marginBottom: 10,
          }}>
            {picked.size < 3
              ? `Pick ${3 - picked.size} more`
              : `${picked.size} picked · looking good`}
          </div>
          <button
            onClick={() => canContinue && onDone(Array.from(picked))}
            disabled={!canContinue}
            style={authCtaStyle(canContinue, { margin: 0 })}
          >
            {canContinue ? 'Start collecting' : 'Pick at least 3'}
            {canContinue && <Icon name="arrowRight" size={16} color="#1A1410" strokeWidth={2.6}/>}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

// ───────────────────────────────────────────────
// Shared shell
// ───────────────────────────────────────────────

function AuthShell({ onBack, step, totalSteps, children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: THEME.bg,
      display: 'flex', flexDirection: 'column', overflow: 'auto',
    }}>
      {/* Subtle top glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 400,
        background: `radial-gradient(circle at 50% -20%, ${THEME.goldGlow}, transparent 60%)`,
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'relative',
        padding: '56px 16px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: 12,
          background: THEME.surface, border: `1px solid ${THEME.stroke}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="chevronLeft" size={20} color={THEME.text}/>
        </button>
        <div style={{ flex: 1 }}/>
        {step && totalSteps && (
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{
                width: 24, height: 4, borderRadius: 100,
                background: i < step ? THEME.gold : THEME.strokeHi,
              }}/>
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

function SocialRow() {
  const socials = [
    { label: 'Apple', icon: <AppleLogo/>, bg: '#F4F1EA', fg: '#0A0A0A' },
    { label: 'Google', icon: <GoogleLogo/>, bg: '#F4F1EA', fg: '#0A0A0A' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
      {socials.map(s => (
        <button key={s.label} style={{
          flex: 1, padding: '13px 14px', borderRadius: 100,
          background: s.bg, border: 'none', color: s.fg,
          fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {s.icon}
          {s.label}
        </button>
      ))}
    </div>
  );
}

function AppleLogo() {
  return (
    <svg width="15" height="18" viewBox="0 0 17 21" fill="#0A0A0A">
      <path d="M14.3 16.1c-.4 1-.9 1.9-1.5 2.7-.8 1.1-1.5 1.9-2.1 2.3-.9.6-1.9.9-3 1-.8 0-1.7-.2-2.9-.7-1.1-.5-2.1-.7-3-.7-.9 0-2 .2-3.1.7-1.1.5-2 .7-2.7.7-1-.1-2-.4-2.9-1-.6-.5-1.3-1.3-2.2-2.4-1-1.3-1.7-2.7-2.3-4.3-.6-1.7-.9-3.4-.9-5 0-1.9.4-3.5 1.2-4.8C1.5 2.4 2.6 1.6 4 1c1.3-.6 2.6-.9 3.9-.9.6 0 1.5.2 2.7.6 1.2.4 2 .6 2.3.6.3 0 1.1-.2 2.5-.7 1.3-.5 2.3-.7 3.2-.6 2.3.2 4 1.1 5.2 2.8-2.1 1.3-3.1 3-3 5.4 0 1.8.7 3.3 2 4.5.6.5 1.2.9 2 1.2-.2.5-.3.9-.5 1.3zM13.9-1.8c0 1.4-.5 2.7-1.5 3.9-1.2 1.4-2.7 2.2-4.3 2.1 0-.2 0-.3 0-.5 0-1.3.6-2.8 1.6-3.9.5-.6 1.1-1.1 1.9-1.5.8-.4 1.5-.6 2.2-.6 0 .2 0 .3 0 .5z" transform="translate(2)"/>
    </svg>
  );
}
function GoogleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-8.2z"/>
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.2v2.8C4 20.9 7.7 23 12 23z"/>
      <path fill="#FBBC04" d="M5.8 14c-.2-.7-.3-1.4-.3-2.1s.1-1.4.3-2.1V7H2.2C1.4 8.5 1 10.2 1 12s.4 3.5 1.2 5l3.6-3z"/>
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1C17.4 2.1 14.9 1 12 1 7.7 1 4 3.1 2.2 7L5.8 9.8c.9-2.7 3.3-4.4 6.2-4.4z"/>
    </svg>
  );
}

function Divider() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22,
    }}>
      <div style={{ flex: 1, height: 1, background: THEME.stroke }}/>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: THEME.textMuted,
        letterSpacing: 1.5, textTransform: 'uppercase',
      }}>
        or continue with email
      </div>
      <div style={{ flex: 1, height: 1, background: THEME.stroke }}/>
    </div>
  );
}

function AuthField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 11.5, fontWeight: 700, color: THEME.textDim,
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function authInputStyle() {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '14px 16px', borderRadius: 14,
    background: THEME.surface, border: `1.5px solid ${THEME.stroke}`,
    color: THEME.text, fontSize: 15, fontFamily: 'inherit',
    outline: 'none',
  };
}

function authCtaStyle(enabled, extra = {}) {
  return {
    width: '100%',
    marginTop: 24,
    padding: '16px 20px', borderRadius: 100,
    background: enabled
      ? `linear-gradient(145deg, ${THEME.goldHi}, ${THEME.gold})`
      : THEME.surface,
    border: enabled ? 'none' : `1px solid ${THEME.stroke}`,
    color: enabled ? '#1A1410' : THEME.textMuted,
    fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
    cursor: enabled ? 'pointer' : 'not-allowed',
    boxShadow: enabled ? `0 12px 28px ${THEME.goldGlow}` : 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'all 0.15s ease',
    ...extra,
  };
}

function passwordStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function StrengthBar({ strength }) {
  const labels = ['Too short', 'Weak', 'Okay', 'Strong', 'Excellent'];
  const colors = [THEME.textMuted, THEME.coral, THEME.gold, THEME.mint, THEME.mint];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <div style={{ flex: 1, display: 'flex', gap: 3 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 100,
            background: i < strength ? colors[strength] : THEME.strokeHi,
            transition: 'background 0.15s ease',
          }}/>
        ))}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: colors[strength], minWidth: 70, textAlign: 'right' }}>
        {labels[strength]}
      </div>
    </div>
  );
}

Object.assign(window, {
  WelcomeScreen, SignInScreen, SignUpScreen, VerifyScreen, OnboardingScreen,
});
