import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from '@components/SafeAreaView';

export function ProfileScreen() {
  return (
    <SafeAreaView>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-5 pt-4 pb-3">
          <Text className="text-2xl font-bold text-text">Profile</Text>
        </View>
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-text-muted text-base">Profile coming soon</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
