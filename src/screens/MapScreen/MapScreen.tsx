import { Text, View } from 'react-native';
import { SafeAreaView } from '@components/SafeAreaView';
import { useTranslation } from 'react-i18next';

export function MapScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView>
      <View className="flex-1 items-center justify-center">
        <Text className="text-text-muted text-base">{t('map.comingSoon')}</Text>
      </View>
    </SafeAreaView>
  );
}
