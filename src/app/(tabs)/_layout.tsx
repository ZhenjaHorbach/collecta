import { HapticTab } from '@components/HapticTab';
import { IconSymbol } from '@components/IconSymbol';
import { Colors } from '@constants/colors';
import { Tabs } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';

function CameraTabButton({ onPress }: { onPress?: (e: unknown) => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="button"
      accessibilityLabel="Camera">
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 22,
          backgroundColor: Colors.gold,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -10,
          shadowColor: Colors.gold,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 10,
        }}>
        <IconSymbol name="camera.fill" size={28} color={Colors.onGold} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors.surfaceLo,
          borderTopColor: Colors.stroke,
          height: 88,
          paddingBottom: 28,
          paddingTop: 10,
        },
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <IconSymbol name="map" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: '',
          tabBarButton: (props) => (
            <CameraTabButton onPress={props.onPress as ((e: unknown) => void) | undefined} />
          ),
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Finds',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="square.grid.2x2.fill" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Me',
          tabBarIcon: ({ color }) => <IconSymbol name="person.fill" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
