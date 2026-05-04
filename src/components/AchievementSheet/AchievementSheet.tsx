import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';

import type { ProfileAchievement } from '@hooks/useUserProfile';

export interface AchievementSheetProps {
  achievement: ProfileAchievement | null;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function AchievementSheet({ achievement, onClose }: AchievementSheetProps) {
  const { t } = useTranslation();
  const visible = !!achievement;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-overlay justify-end" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface rounded-t-xl border-t border-stroke pt-3 px-5 pb-9">
          <View className="self-center w-9 h-1 rounded-full bg-stroke-hi mb-5" />

          {achievement ? (
            <View className="items-center gap-3">
              <View
                className={`h-20 w-20 items-center justify-center rounded-lg ${
                  achievement.unlocked ? 'bg-gold' : 'bg-surface-hi border border-stroke'
                }`}>
                <Text className="text-4xl">{achievement.icon}</Text>
              </View>

              <Text className="text-xl font-bold text-text text-center">{achievement.title}</Text>

              <Text className="text-sm text-text-dim text-center leading-relaxed">
                {achievement.description}
              </Text>

              <View className="flex-row gap-2 mt-1">
                <View className="rounded-md bg-gold-glow border border-gold px-3 py-1.5">
                  <Text className="text-xs font-bold text-gold">
                    {t('profile.achievements.detail.xpReward', { xp: achievement.xp_reward })}
                  </Text>
                </View>
                <View
                  className={`rounded-md px-3 py-1.5 border ${
                    achievement.unlocked
                      ? 'bg-mint-glow border-mint'
                      : 'bg-surface-hi border-stroke'
                  }`}>
                  <Text
                    className={`text-xs font-bold ${
                      achievement.unlocked ? 'text-mint' : 'text-text-dim'
                    }`}>
                    {achievement.unlocked
                      ? achievement.unlockedAt
                        ? t('profile.achievements.detail.unlockedOn', {
                            date: formatDate(achievement.unlockedAt),
                          })
                        : t('profile.achievements.detail.unlocked')
                      : t('profile.achievements.detail.locked')}
                  </Text>
                </View>
              </View>

              {!achievement.unlocked ? (
                <Text className="text-xs text-text-muted text-center mt-2 leading-snug">
                  {t('profile.achievements.detail.lockedHint')}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
