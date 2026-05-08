import { subscribeXp } from '@services/achievement-toast.service';
import { useEffect, useState } from 'react';

import { XpPopup } from './XpPopup';

export function XpPopupHost() {
  const [queue, setQueue] = useState<number[]>([]);

  useEffect(() => {
    return subscribeXp((delta) => {
      setQueue((prev) => [...prev, delta]);
    });
  }, []);

  const current = queue[0] ?? null;

  return <XpPopup delta={current} onDismiss={() => setQueue((prev) => prev.slice(1))} />;
}
