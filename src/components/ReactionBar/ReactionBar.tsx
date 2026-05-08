import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ReactionType } from '@services/reactions.service';

const EMOJI: Record<ReactionType, string> = {
  like: '👍',
  fire: '🔥',
  wow: '😮',
};

const ORDER: ReactionType[] = ['like', 'fire', 'wow'];

export interface ReactionBarProps {
  counts: Record<ReactionType, number>;
  mine: Set<ReactionType>;
  onToggle: (type: ReactionType) => void;
  disabled?: boolean;
  // Prefix for per-button testID. The component is reused per FeedItem, so
  // the prefix ensures Maestro can pick the right button (`<prefix>-like`,
  // `<prefix>-fire`, `<prefix>-wow`). Optional — when omitted, no testID is
  // emitted, keeping the component zero-impact for non-E2E callsites.
  testIDPrefix?: string;
}

export function ReactionBar({
  counts,
  mine,
  onToggle,
  disabled,
  testIDPrefix,
}: ReactionBarProps): ReactElement {
  const { t } = useTranslation();

  return (
    <View className="flex-row gap-2">
      {ORDER.map((type) => {
        const active = mine.has(type);
        const count = counts[type] ?? 0;
        return (
          <Pressable
            key={type}
            testID={testIDPrefix ? `${testIDPrefix}-${type}` : undefined}
            disabled={disabled}
            onPress={() => onToggle(type)}
            accessibilityRole="button"
            accessibilityLabel={t('reactions.aria.toggle', {
              label: t(`reactions.${type}`),
            })}
            className={`flex-row items-center gap-1.5 rounded-md border px-3 py-1.5 ${
              active ? 'border-gold bg-gold-glow' : 'border-stroke bg-surface-hi'
            } ${disabled ? 'opacity-50' : ''}`}>
            <Text className="text-base">{EMOJI[type]}</Text>
            {count > 0 && (
              <Text className={`text-xs font-bold ${active ? 'text-gold' : 'text-text-dim'}`}>
                {count}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
