import { SafeAreaView } from '@/src/components/SafeAreaView';
import { GoBackButton } from '@components/GoBackButton';
import { Text, View } from 'react-native';

export function CameraScreen() {
  return (
    <SafeAreaView>
      <View className="flex-1 justify-center">
        <GoBackButton icon="close" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-base">Camera coming soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
