import { subscribeXp } from '@services/achievement-toast.service';
import { useCallback, useEffect, useState } from 'react';

import { XpPopup } from './XpPopup';

export function XpPopupHost() {
  const [queue, setQueue] = useState<number[]>([]);

  useEffect(() => {
    return subscribeXp((delta) => {
      setQueue((prev) => [...prev, delta]);
    });
  }, []);

  // Stable reference so XpPopup's effect (which lists onDismiss in its deps)
  // doesn't restart the slide-up animation whenever the queue updates.
  const onDismiss = useCallback(() => setQueue((prev) => prev.slice(1)), []);

  const current = queue[0] ?? null;

  return <XpPopup delta={current} onDismiss={onDismiss} />;
}
