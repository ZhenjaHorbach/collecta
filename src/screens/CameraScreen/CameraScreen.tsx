import { SafeAreaView } from '@/src/components/SafeAreaView';
import { GoBackButton } from '@components/GoBackButton';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export function CameraScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView>
      <View className="flex-1 justify-center">
        <GoBackButton icon="close" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-base">{t('camera.comingSoon')}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
