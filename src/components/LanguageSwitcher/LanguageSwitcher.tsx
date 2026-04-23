import { SUPPORTED_LANGUAGES, setAppLanguage, type SupportedLanguage } from '@i18n';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  const onSelect = (lang: SupportedLanguage) => {
    if (lang === current) return;
    void setAppLanguage(lang);
  };

  return (
    <View className="w-full gap-3">
      <Text className="text-text text-base font-semibold">{t('profile.language')}</Text>
      <Text className="text-text-dim text-xs">{t('profile.chooseLanguage')}</Text>
      <View className="gap-2">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const active = lang === current;
          return (
            <TouchableOpacity
              key={lang}
              onPress={() => onSelect(lang)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`w-full px-4 py-3 rounded-md border flex-row items-center justify-between ${
                active ? 'bg-surface-hi border-gold' : 'bg-surface border-stroke'
              }`}>
              <Text className={`text-base ${active ? 'text-gold font-semibold' : 'text-text'}`}>
                {t(`languages.${lang}`)}
              </Text>
              {active && <Text className="text-gold text-base">✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
