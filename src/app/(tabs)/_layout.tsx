import { HapticTab } from '@components/HapticTab';
import { IconSymbol } from '@components/IconSymbol';
import { useColors } from '@hooks/useColors';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, View } from 'react-native';

function CameraTabButton({
  onPress,
  label,
  bgColor,
  iconColor,
  glowColor,
}: {
  onPress?: (e: unknown) => void;
  label: string;
  bgColor: string;
  iconColor: string;
  glowColor: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 22,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -10,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 10,
        }}>
        <IconSymbol name="camera.fill" size={28} color={iconColor} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.surfaceLo,
          borderTopColor: colors.stroke,
          height: 88,
          paddingBottom: 28,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.feed'),
          tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('tabs.map'),
          tabBarIcon: ({ color }) => <IconSymbol name="map" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: '',
          tabBarButton: (props) => (
            <CameraTabButton
              onPress={props.onPress as ((e: unknown) => void) | undefined}
              label={t('tabs.camera')}
              bgColor={colors.gold}
              iconColor={colors.onGold}
              glowColor={colors.gold}
            />
          ),
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: t('tabs.collections'),
          tabBarIcon: ({ color }) => (
            <IconSymbol name="square.grid.2x2.fill" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <IconSymbol name="person.fill" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
