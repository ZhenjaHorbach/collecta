import { GoBackButton } from '@components/GoBackButton';
import { SafeAreaView } from '@components/SafeAreaView';
import { ScrollView, Text, View } from 'react-native';

export function CreateCollectionScreen() {
  return (
    <SafeAreaView>
      <GoBackButton icon="close">
        <Text className="text-xl font-bold text-text flex-1">New Collection</Text>
      </GoBackButton>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-text-muted text-base">Create collection coming soon</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
