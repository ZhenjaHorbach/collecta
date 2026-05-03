import { subscribeAchievements } from '@services/achievement-toast.service';
import { useEffect, useState } from 'react';

import { AchievementToast, type AchievementToastData } from './AchievementToast';

export function AchievementToastHost() {
  const [queue, setQueue] = useState<AchievementToastData[]>([]);

  useEffect(() => {
    return subscribeAchievements((data) => {
      setQueue((prev) => [...prev, data]);
    });
  }, []);

  const current = queue[0] ?? null;

  return (
    <AchievementToast achievement={current} onDismiss={() => setQueue((prev) => prev.slice(1))} />
  );
}
