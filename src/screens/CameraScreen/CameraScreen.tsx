import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as ExpoImage } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

import { GoBackButton } from '@components/GoBackButton';
import { SafeAreaView } from '@components/SafeAreaView';
import { Spinner } from '@components/Spinner';
import { ValidationResultSheet } from '@components/ValidationResultSheet';
import { useAuth } from '@hooks/useAuth';
import { useCapture, type CaptureStage } from '@hooks/useCapture';
import { useUserLocation } from '@hooks/useUserLocation';
import {
  getCollection,
  listMyCollections,
  listPickedUpCollections,
  type CollectionDetail,
  type CollectionWithProgress,
} from '@services/collections.service';
import { extractGpsFromExif } from '@utils/exif.utils';

const STAGE_TO_LABEL_KEY: Partial<Record<CaptureStage, string>> = {
  compressing: 'camera.compressing',
  uploading: 'camera.uploading',
  creating: 'camera.uploading',
  validating: 'camera.validating',
};

export function CameraScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ collection_item_id?: string }>();
  const initialItemId = params.collection_item_id ?? null;

  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [rawPhotoUri, setRawPhotoUri] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [chosenItemId, setChosenItemId] = useState<string | null>(initialItemId);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraSettled, setCameraSettled] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const capture = useCapture();
  // Triggers location-permission prompt on Camera mount; result is read at shutter.
  const { location: deviceLocation } = useUserLocation();

  useEffect(() => {
    if (!cameraReady) {
      setCameraSettled(false);
      return;
    }
    let cancelled = false;
    const warmup = async () => {
      const cam = cameraRef.current;
      if (!cam) return;
      try {
        await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;
        await cam.takePictureAsync({
          quality: 0.1,
          exif: false,
          skipProcessing: true,
          shutterSound: false,
        });
      } catch (e) {
        console.warn('[warmup] failed', e);
      }
      if (!cancelled) setCameraSettled(true);
    };
    void warmup();
    return () => {
      cancelled = true;
    };
  }, [cameraReady]);

  const reset = useCallback((): void => {
    setPhotoUri(null);
    setRawPhotoUri(null);
    setPendingLocation(null);
    setChosenItemId(initialItemId);
    capture.reset();
  }, [initialItemId, capture]);

  const resetRef = useRef(reset);
  useEffect(() => {
    resetRef.current = reset;
  }, [reset]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        resetRef.current();
      };
    }, [])
  );

  const onShutter = useCallback(async (): Promise<void> => {
    const cam = cameraRef.current;
    if (!cam || !cameraSettled) return;
    try {
      const photo = await cam.takePictureAsync({ quality: 0.7, exif: false });
      if (!photo?.uri) return;

      const stableUri = `${FileSystem.documentDirectory}photo_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: photo.uri, to: stableUri });

      setPhotoUri(stableUri);
      setRawPhotoUri(stableUri);
      setPendingLocation(deviceLocation);
    } catch (e) {
      console.warn('[onShutter] takePictureAsync failed', e);
    }
  }, [cameraSettled, deviceLocation]);

  const onClose = useCallback((): void => {
    reset();
    router.back();
  }, [reset]);

  const onPickFromLibrary = useCallback(async (): Promise<void> => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        console.warn('[onPickFromLibrary] permission denied');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        exif: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const picked = result.assets[0];
      const stableUri = `${FileSystem.documentDirectory}photo_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: picked.uri, to: stableUri });
      setPhotoUri(stableUri);
      setRawPhotoUri(stableUri);
      setPendingLocation(extractGpsFromExif(picked.exif));
    } catch (e) {
      console.warn('[onPickFromLibrary] failed', e);
    }
  }, []);

  const onPickItem = useCallback(
    (itemId: string): void => {
      const upload = rawPhotoUri ?? photoUri;
      if (!upload || !user) return;
      setChosenItemId(itemId);
      void capture.capture({
        rawPhotoUri: upload,
        userId: user.id,
        collectionItemId: itemId,
        locationLat: pendingLocation?.lat ?? null,
        locationLng: pendingLocation?.lng ?? null,
      });
    },
    [rawPhotoUri, photoUri, user, capture, pendingLocation]
  );

  const onSavePreselected = useCallback((): void => {
    const upload = rawPhotoUri ?? photoUri;
    if (!upload || !user || !chosenItemId) return;
    void capture.capture({
      rawPhotoUri: upload,
      userId: user.id,
      collectionItemId: chosenItemId,
      locationLat: pendingLocation?.lat ?? null,
      locationLng: pendingLocation?.lng ?? null,
    });
  }, [rawPhotoUri, photoUri, user, chosenItemId, capture, pendingLocation]);

  const onRetake = useCallback((): void => {
    setPhotoUri(null);
    setRawPhotoUri(null);
    setPendingLocation(null);
    setChosenItemId(initialItemId);
    capture.reset();
  }, [initialItemId, capture]);

  if (!permission) return <Spinner />;

  if (!permission.granted) {
    return (
      <SafeAreaView>
        <GoBackButton icon="close" />
        <View className="flex-1 items-center justify-center p-6 gap-4">
          <Text className="text-text text-xl font-semibold">{t('camera.permissionTitle')}</Text>
          <Text className="text-text-dim text-base text-center">{t('camera.permissionBody')}</Text>
          <Pressable
            onPress={requestPermission}
            className="bg-gold rounded-md p-4 items-center w-full">
            <Text className="text-on-gold font-semibold">{t('camera.permissionGrant')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (capture.stage !== 'idle' && capture.stage !== 'done' && capture.stage !== 'error') {
    const labelKey = STAGE_TO_LABEL_KEY[capture.stage];
    return (
      <SafeAreaView>
        <View className="flex-1 items-center justify-center gap-4">
          <Spinner />
          {labelKey && <Text className="text-text-dim">{t(labelKey)}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  if (capture.stage === 'done') {
    return (
      <SafeAreaView>
        <View className="flex-1 justify-end p-4">
          <ValidationResultSheet
            status={capture.validationStatus ?? 'vision_failed'}
            result={capture.validation}
            onSave={() => {
              reset();
              router.back();
            }}
            onRetake={onRetake}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (capture.stage === 'error') {
    console.warn('[capture] error state', capture.error);
    return (
      <SafeAreaView>
        <GoBackButton icon="close" onPress={onClose} />
        <View className="flex-1 items-center justify-center gap-4 p-6">
          <Text className="text-text text-base text-center">{t('camera.errorCapture')}</Text>
          {capture.error ? (
            <Text className="text-coral text-xs text-center" selectable>
              {capture.error}
            </Text>
          ) : null}
          <Pressable onPress={onRetake} className="bg-gold rounded-md p-4 items-center w-full">
            <Text className="text-on-gold font-semibold">{t('camera.retake')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (photoUri) {
    return (
      <PhotoPreview
        photoUri={photoUri}
        hasPreselectedItem={!!initialItemId}
        onClose={onClose}
        onRetake={onRetake}
        onSavePreselected={onSavePreselected}
        onPick={onPickItem}
      />
    );
  }

  return (
    <View className="flex-1 bg-app-shell">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      />
      <RNSafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View className="flex-1 justify-between p-4" pointerEvents="box-none">
          <GoBackButton icon="close" onPress={onClose} />
          <View className="items-center pb-8 gap-4" pointerEvents="box-none">
            {cameraSettled ? (
              <TouchableOpacity
                onPress={onShutter}
                accessibilityLabel={t('camera.shutter')}
                className="w-20 h-20 rounded-xl bg-gold items-center justify-center"
              />
            ) : (
              <Spinner />
            )}
            <TouchableOpacity
              onPress={onPickFromLibrary}
              accessibilityRole="button"
              className="px-5 py-3 rounded-full bg-surface-hi border border-stroke active:opacity-75">
              <Text className="text-text text-sm font-semibold">{t('camera.pickFromLibrary')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RNSafeAreaView>
    </View>
  );
}

interface PhotoPreviewProps {
  photoUri: string;
  hasPreselectedItem: boolean;
  onClose: () => void;
  onRetake: () => void;
  onSavePreselected: () => void;
  onPick: (itemId: string) => void;
}

function PhotoPreview({
  photoUri,
  hasPreselectedItem,
  onClose,
  onRetake,
  onSavePreselected,
  onPick,
}: PhotoPreviewProps) {
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <ExpoImage
        source={{ uri: photoUri }}
        style={{ flex: 1 }}
        contentFit="cover"
        recyclingKey={photoUri}
      />
      <RNSafeAreaView
        edges={['top']}
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <GoBackButton icon="close" onPress={onClose} />
      </RNSafeAreaView>
      <RNSafeAreaView
        edges={['bottom']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        className="bg-surface">
        {hasPreselectedItem ? (
          <View className="flex-row gap-3 p-4">
            <Pressable
              onPress={onRetake}
              className="flex-1 bg-surface-hi rounded-md p-4 items-center">
              <Text className="text-text">{t('camera.retake')}</Text>
            </Pressable>
            <Pressable
              onPress={onSavePreselected}
              className="flex-1 bg-gold rounded-md p-4 items-center">
              <Text className="text-on-gold font-semibold">{t('camera.save')}</Text>
            </Pressable>
          </View>
        ) : (
          <ItemPickerSheet onPick={onPick} onRetake={onRetake} />
        )}
      </RNSafeAreaView>
    </View>
  );
}

interface ItemPickerSheetProps {
  onPick: (itemId: string) => void;
  onRetake: () => void;
}

function ItemPickerSheet({ onPick, onRetake }: ItemPickerSheetProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const [mine, pickedUp] = await Promise.all([
          listMyCollections(user.id),
          listPickedUpCollections(user.id),
        ]);
        if (!cancelled) {
          const merged = [...mine, ...pickedUp];
          const seen = new Set<string>();
          const unique = merged.filter((c) => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
          });
          setCollections(unique);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <View className="bg-surface rounded-t-xl p-4 gap-3" style={{ maxHeight: 420 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-text text-base font-semibold flex-1">{t('camera.chooseItem')}</Text>
        <Pressable
          onPress={onRetake}
          className="px-3 py-2 rounded-full bg-surface-hi border border-stroke">
          <Text className="text-text text-xs">{t('camera.retake')}</Text>
        </Pressable>
      </View>
      {loading ? (
        <Spinner />
      ) : collections.length === 0 ? (
        <Text className="text-text-dim text-sm">{t('camera.noCollections')}</Text>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(c) => c.id}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          renderItem={({ item }) => (
            <CollectionRow
              collection={item}
              userId={user?.id}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId((id) => (id === item.id ? null : item.id))}
              onPick={onPick}
            />
          )}
        />
      )}
    </View>
  );
}

interface CollectionRowProps {
  collection: CollectionWithProgress;
  userId: string | undefined;
  expanded: boolean;
  onToggle: () => void;
  onPick: (itemId: string) => void;
}

function CollectionRow({ collection, userId, expanded, onToggle, onPick }: CollectionRowProps) {
  const [detail, setDetail] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded || detail || !userId) return;
    setLoading(true);
    let cancelled = false;
    void (async () => {
      try {
        const data = await getCollection(collection.id, userId);
        if (!cancelled) setDetail(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded, detail, userId, collection.id]);

  return (
    <View className="rounded-md bg-surface-lo border border-stroke">
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        className="px-3 py-3 flex-row items-center gap-2">
        <Text className="flex-1 text-sm font-semibold text-text" numberOfLines={1}>
          {collection.title}
        </Text>
        <Text className="text-text-dim text-xs">{expanded ? '▾' : '▸'}</Text>
      </Pressable>
      {expanded ? (
        <View className="px-3 pb-3 border-t border-stroke">
          {loading ? (
            <View className="py-4 items-center">
              <Spinner />
            </View>
          ) : detail && detail.items.length > 0 ? (
            <ScrollView style={{ maxHeight: 180 }}>
              {detail.items.map((it) => (
                <Pressable
                  key={it.id}
                  onPress={() => onPick(it.id)}
                  className="px-2 py-2 rounded-md active:bg-surface-hi">
                  <Text className="text-text text-sm" numberOfLines={1}>
                    {it.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
