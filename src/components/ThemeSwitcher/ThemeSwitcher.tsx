import { useTheme, type ThemePreference } from '@hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { preference, setPreference, options } = useTheme();

  return (
    <View className="w-full gap-3">
      <Text className="text-text text-base font-semibold">{t('profile.theme')}</Text>
      <Text className="text-text-dim text-xs">{t('profile.chooseTheme')}</Text>
      <View className="gap-2">
        {options.map((opt: ThemePreference) => {
          const active = opt === preference;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => setPreference(opt)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`w-full px-4 py-3 rounded-md border flex-row items-center justify-between ${
                active ? 'bg-surface-hi border-gold' : 'bg-surface border-stroke'
              }`}>
              <Text className={`text-base ${active ? 'text-gold font-semibold' : 'text-text'}`}>
                {t(`theme.${opt}`)}
              </Text>
              {active && <Text className="text-gold text-base">✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
