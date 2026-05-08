import { HapticTab } from '@components/HapticTab';
import { IconSymbol } from '@components/IconSymbol';
import { useColors } from '@hooks/useColors';
import { useMyCollections } from '@hooks/useMyCollections';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, TouchableOpacity, View } from 'react-native';

function CameraTabButton({
  onPress,
  label,
  bgColor,
  iconColor,
  glowColor,
  disabled,
}: {
  onPress?: (e: unknown) => void;
  label: string;
  bgColor: string;
  iconColor: string;
  glowColor: string;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      testID="tabbar-camera"
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.7}
      className="flex-1 items-center justify-center"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
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
          shadowOpacity: disabled ? 0 : 0.4,
          shadowRadius: 20,
          elevation: disabled ? 0 : 10,
          opacity: disabled ? 0.4 : 1,
        }}>
        <IconSymbol name="camera.fill" size={28} color={iconColor} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const colors = useColors();
  // Camera flow needs at least one collection to drop the find into. Without
  // any (own or picked-up), there's nothing to commit to — disable the tab
  // until the user creates or joins one. `useMyCollections` refetches on
  // focus, which catches the post-creation refresh.
  const { mine, pickedUp, loading } = useMyCollections();
  const cameraDisabled = !loading && mine.length === 0 && pickedUp.length === 0;

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
          tabBarButtonTestID: 'tabbar-feed',
          tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('tabs.map'),
          tabBarButtonTestID: 'tabbar-map',
          tabBarIcon: ({ color }) => <IconSymbol name="map" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: '',
          tabBarButton: (props) => (
            <CameraTabButton
              onPress={
                cameraDisabled
                  ? () => {
                      Alert.alert(t('tabs.cameraDisabled.title'), t('tabs.cameraDisabled.body'));
                    }
                  : (props.onPress as ((e: unknown) => void) | undefined)
              }
              label={t('tabs.camera')}
              bgColor={colors.gold}
              iconColor={colors.onGold}
              glowColor={colors.gold}
              disabled={cameraDisabled}
            />
          ),
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: t('tabs.collections'),
          tabBarButtonTestID: 'tabbar-collections',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="square.grid.2x2.fill" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarButtonTestID: 'tabbar-profile',
          tabBarIcon: ({ color }) => <IconSymbol name="person.fill" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
