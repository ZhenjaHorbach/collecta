import { GoBackButton } from '@components/GoBackButton';
import { SafeAreaView } from '@components/SafeAreaView';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

export function CreateCollectionScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView>
      <GoBackButton icon="close">
        <Text className="text-xl font-bold text-text flex-1">{t('collections.newCollection')}</Text>
      </GoBackButton>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-text-muted text-base">{t('collections.createComingSoon')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
