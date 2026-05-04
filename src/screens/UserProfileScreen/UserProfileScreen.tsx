import { Redirect } from 'expo-router';
import type { ReactElement } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { GoBackButton } from '@components/GoBackButton';
import { ProgressBar } from '@components/ProgressBar';
import { SafeAreaView } from '@components/SafeAreaView';
import { Spinner } from '@components/Spinner';
import { useAuth } from '@hooks/useAuth';
import { useUserProfile, type ProfileAchievement } from '@hooks/useUserProfile';
import { getDisplayStreak, levelForXp } from '@utils/streak.utils';

export interface UserProfileScreenProps {
  userId: string;
}

export function UserProfileScreen({ userId }: UserProfileScreenProps): ReactElement {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, loading, error } = useUserProfile(userId);

  if (user?.id === userId) {
    return <Redirect href="/(tabs)/profile" />;
  }

  if (loading) {
    return (
      <SafeAreaView>
        <GoBackButton />
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView>
        <GoBackButton />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-text">{t('common.error')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { level, xpForCurrentLevel, xpForNextLevel } = levelForXp(profile.xp);
  const xpInLevel = profile.xp - xpForCurrentLevel;
  const xpProgress = (profile.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel);
  const displayStreak = getDisplayStreak(profile.streakDays, profile.lastFindDate);
  const unlockedCount = profile.achievements.filter((a) => a.unlocked).length;

  return (
    <SafeAreaView>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <GoBackButton />

        <View className="gap-5 px-5">
          <View className="flex-row items-end gap-4">
            <View className="relative">
              <View className="h-24 w-24 overflow-hidden rounded-xl bg-surface-hi">
                {profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} className="h-full w-full" />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Text className="text-3xl text-text-dim">
                      {profile.displayName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View className="absolute -bottom-1 -right-1 rounded-md bg-gold px-2 py-1">
                <Text className="text-xs font-extrabold text-on-gold">
                  {t('profile.levelBadge', { level })}
                </Text>
              </View>
            </View>
            <View className="flex-1 pb-1">
              <Text className="text-xl font-bold text-text" numberOfLines={1}>
                {profile.displayName}
              </Text>
              <Text className="text-sm text-text-dim" numberOfLines={1}>
                @{profile.username}
              </Text>
            </View>
          </View>

          {profile.bio && <Text className="text-sm leading-snug text-text">{profile.bio}</Text>}

          <View className="rounded-md border border-stroke bg-surface p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-bold text-text">
                {t('profile.levelLine', { level })}
              </Text>
              <Text className="text-xs font-semibold text-text-dim">
                {t('profile.xpFraction', {
                  current: xpInLevel,
                  total: xpForNextLevel - xpForCurrentLevel,
                })}
              </Text>
            </View>
            <ProgressBar value={xpProgress} />
          </View>

          <View className="flex-row rounded-md border border-stroke bg-surface">
            <StatCell value={profile.collectionsJoined} label={t('profile.stats.collections')} />
            <View className="w-px bg-stroke" />
            <StatCell value={profile.findsCount} label={t('profile.stats.finds')} />
            <View className="w-px bg-stroke" />
            <StatCell value={displayStreak} label={t('profile.stats.streak')} suffix="🔥" />
          </View>

          <View>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-bold text-text">
                {t('profile.achievements.title')}
              </Text>
              <Text className="text-sm font-semibold text-gold">
                {t('profile.achievements.fraction', {
                  unlocked: unlockedCount,
                  total: profile.achievements.length,
                })}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {profile.achievements.map((a) => (
                <AchievementCell key={a.id} achievement={a} />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatCellProps {
  value: number;
  label: string;
  suffix?: string;
}

function StatCell({ value, label, suffix }: StatCellProps) {
  return (
    <View className="flex-1 items-center py-3">
      <Text className="text-xl font-bold text-text">
        {value}
        {suffix ? ` ${suffix}` : ''}
      </Text>
      <Text className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
        {label}
      </Text>
    </View>
  );
}

interface AchievementCellProps {
  achievement: ProfileAchievement;
}

function AchievementCell({ achievement }: AchievementCellProps) {
  const earned = achievement.unlocked;
  return (
    <View
      className={`w-[22%] items-center justify-center rounded-md border p-2 ${
        earned ? 'border-stroke bg-surface' : 'border-stroke/40 bg-surface-lo opacity-40'
      }`}
      style={{ aspectRatio: 0.9 }}>
      <View
        className={`mb-1 h-9 w-9 items-center justify-center rounded-md ${
          earned ? 'bg-gold' : 'bg-surface-hi'
        }`}>
        <Text className="text-lg">{achievement.icon}</Text>
      </View>
      <Text
        className="text-center text-[10px] font-semibold leading-tight text-text"
        numberOfLines={2}>
        {achievement.title}
      </Text>
    </View>
  );
}
