import { GoBackButton } from '@components/GoBackButton';
import { SafeAreaView } from '@components/SafeAreaView';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

export function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  return (
    <SafeAreaView>
      <GoBackButton>
        <Text className="text-xl font-bold text-text flex-1">{t('collections.detailTitle')}</Text>
      </GoBackButton>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-text-muted text-base">
            {t('collections.detailComingSoon', { id })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
