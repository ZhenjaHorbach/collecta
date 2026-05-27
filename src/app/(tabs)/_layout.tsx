import { notify } from '@components/ConfirmDialog';
import { HapticTab } from '@components/HapticTab';
import { IconSymbol } from '@components/IconSymbol';
import { MAX_CONTENT_WIDTH } from '@constants/layout';
import { useColors } from '@hooks/useColors';
import { useHasCamera } from '@hooks/useHasCamera';
import { useMyCollections } from '@hooks/useMyCollections';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CameraTabButton({
  onPress,
  label,
  bgColor,
  iconColor,
  glowColor,
  iconName,
  disabled,
}: {
  onPress?: (e: unknown) => void;
  label: string;
  bgColor: string;
  iconColor: string;
  glowColor: string;
  iconName: 'camera.fill' | 'photo.fill';
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
        <IconSymbol name={iconName} size={28} color={iconColor} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // Camera flow needs at least one collection to drop the find into. Without
  // any (own or picked-up), there's nothing to commit to — disable the tab
  // until the user creates or joins one. `useMyCollections` refetches on
  // focus, which catches the post-creation refresh.
  const { mine, pickedUp, loading } = useMyCollections();
  const cameraDisabled = !loading && mine.length === 0 && pickedUp.length === 0;
  // No camera on the device → swap the shutter icon for a photo-library icon
  // so the affordance matches what the screen now does (file picker).
  // `null` (web probe in flight) keeps the camera icon by default.
  const hasCamera = useHasCamera();
  const tabIconName: 'camera.fill' | 'photo.fill' =
    hasCamera === false ? 'photo.fill' : 'camera.fill';

  return (
    <View className="flex-1 bg-bg">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: colors.surfaceLo,
            borderTopColor: colors.stroke,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            // On Android, gesture-nav devices report a non-zero bottom inset
            // that the bar must clear, otherwise labels are clipped by the
            // pill. iOS already gets its home-indicator gap from the asymmetric
            // paddingBottom below.
            height: 88 + (Platform.OS === 'android' ? insets.bottom : 0),
            paddingTop: Platform.OS === 'ios' ? 10 : 19,
            paddingBottom: Platform.OS === 'ios' ? 28 : 19 + insets.bottom,
            // Match the SafeAreaView content cap so the tab row centres on
            // tablet / desktop web instead of stretching edge-to-edge. The
            // wrapping <View className="bg-bg"> paints behind the gap so the
            // sides aren't transparent (html background was showing through).
            width: '100%',
            maxWidth: MAX_CONTENT_WIDTH,
            alignSelf: 'center',
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
                        void notify({
                          title: t('tabs.cameraDisabled.title'),
                          body: t('tabs.cameraDisabled.body'),
                          buttonLabel: t('common.close'),
                        });
                      }
                    : (props.onPress as ((e: unknown) => void) | undefined)
                }
                label={t('tabs.camera')}
                bgColor={colors.gold}
                iconColor={colors.onGold}
                glowColor={colors.gold}
                iconName={tabIconName}
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
    </View>
  );
}
