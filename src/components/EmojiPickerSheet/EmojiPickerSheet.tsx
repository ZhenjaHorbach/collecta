import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '@components/BottomSheet';

const PRESET_EMOJIS = [
  '🐈',
  '🐕',
  '🦜',
  '🦋',
  '🌸',
  '🌿',
  '🍄',
  '☁️',
  '🌊',
  '🏔️',
  '🏛️',
  '🎨',
  '🪜',
  '🪟',
  '🚇',
  '🚲',
  '🪩',
  '📚',
  '☕',
  '🍕',
  '🧃',
  '🧁',
  '🎭',
  '🎸',
  '⚽',
  '🏀',
  '📸',
  '🎞️',
  '💡',
  '✨',
];

const COLUMNS = 6;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

const ROWS: string[][] = chunk(PRESET_EMOJIS, COLUMNS);

export interface EmojiPickerSheetProps {
  visible: boolean;
  current: string | null;
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPickerSheet({ visible, current, onPick, onClose }: EmojiPickerSheetProps) {
  const { t } = useTranslation();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text className="text-sm font-bold text-text mb-3">
        {t('collections.create.emoji.title')}
      </Text>
      {ROWS.map((row, rowIdx) => (
        <View key={rowIdx} className="flex-row mb-2">
          {row.map((emoji) => {
            const active = current === emoji;
            return (
              <View key={emoji} className="flex-1 px-1">
                <TouchableOpacity
                  testID={`emoji-pick-${emoji}`}
                  onPress={() => onPick(emoji)}
                  accessibilityRole="button"
                  accessibilityLabel={emoji}
                  className={`aspect-square rounded-sm items-center justify-center border ${active ? 'bg-gold border-gold' : 'bg-bg border-stroke'}`}>
                  <Text className="text-2xl">{emoji}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ))}
    </BottomSheet>
  );
}
