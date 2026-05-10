import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Native devices always have a camera; on web we want to distinguish a
// phone-class device (touch primary, rear camera worth using) from a laptop
// or desktop (mouse primary, only an awkward front-facing webcam). We probe
// two signals:
//   1. `(pointer: coarse)` — primary input is touch. False on laptops even
//      when a touchscreen is connected, since the OS reports the mouse as
//      the primary pointer; that's the right call (laptop webcam UX is bad).
//   2. `enumerateDevices()` — returns device kinds without prompting for
//      permission. We require at least one `videoinput`.
// Both must be true. `null` while the probe is in flight (web only) so
// callers can render a spinner instead of flashing the wrong UI.
export function useHasCamera(): boolean | null {
  const [hasCamera, setHasCamera] = useState<boolean | null>(Platform.OS === 'web' ? null : true);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      setHasCamera(false);
      return;
    }
    const isTouchPrimary =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    if (!isTouchPrimary) {
      setHasCamera(false);
      return;
    }
    let cancelled = false;
    void navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (!cancelled) setHasCamera(devices.some((d) => d.kind === 'videoinput'));
      })
      .catch(() => {
        if (!cancelled) setHasCamera(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return hasCamera;
}
