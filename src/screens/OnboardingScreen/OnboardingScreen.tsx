import { GoBackButton } from '@components/GoBackButton';
import { SafeAreaView } from '@components/SafeAreaView';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

export function OnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView>
      <GoBackButton />
      <View className="flex-1 px-6 pt-2">
        <Text className="text-3xl font-bold text-text mb-2">What do you collect?</Text>
        <Text className="text-text-dim text-sm mb-8">
          Pick at least 3. We&apos;ll show you trending collections in those areas.
        </Text>
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-muted text-base">Interest picker coming soon</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          className="w-full py-4 rounded-full bg-gold items-center mb-4">
          <Text className="text-on-gold font-bold text-base">Start collecting</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
