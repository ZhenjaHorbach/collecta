import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

import { ActiveCollectionChip, ChooseCollectionSheet } from '@components/ActiveCollectionChip';
import { AnalyzingOverlay } from '@components/AnalyzingOverlay';
import { CaptureResultSheet } from '@components/CaptureResultSheet';
import { CreateItemSheet } from '@components/CreateItemSheet';
import { GoBackButton } from '@components/GoBackButton';
import { SafeAreaView } from '@components/SafeAreaView';
import { Spinner } from '@components/Spinner';
import { useActiveCollection } from '@hooks/useActiveCollection';
import { useAuth } from '@hooks/useAuth';
import { useCapture } from '@hooks/useCapture';
import { useUserLocation } from '@hooks/useUserLocation';
import {
  getCollection,
  getCollectionItemContext,
  listMyCollections,
  listPickedUpCollections,
  type CollectionDetail,
  type CollectionItemContext,
  type CollectionWithProgress,
} from '@services/collections.service';
import { extractGpsFromExif } from '@utils/exif.utils';

export function CameraScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ collection_item_id?: string }>();
  const initialItemId = params.collection_item_id ?? null;

  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [rawPhotoUri, setRawPhotoUri] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraSettled, setCameraSettled] = useState(false);
  // Resolved collection + item — populated either from the verify entry-point
  // (?collection_item_id=…) or after the user resolves an ambiguous match,
  // picks manually, or creates a new item. When set, the result sheet renders
  // its confident layout against this pair regardless of which mode the
  // capture started in.
  const [resolvedContext, setResolvedContext] = useState<CollectionItemContext | null>(null);
  // Tracks whether the user explicitly picked / created the resolved item
  // (vs. it being auto-filled from AI matchedItemId). Manual picks must NOT
  // be overwritten by the auto-resolve effect, and they promote the result
  // sheet to the confident layout regardless of the original verdict.
  const [manualOverride, setManualOverride] = useState(false);
  const [note, setNote] = useState('');
  const [chooseCollectionVisible, setChooseCollectionVisible] = useState(false);
  const [manualPickVisible, setManualPickVisible] = useState(false);
  const [createItemVisible, setCreateItemVisible] = useState(false);
  const [allCollections, setAllCollections] = useState<CollectionWithProgress[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const cameraRef = useRef<CameraView>(null);
  const capture = useCapture();
  const { activeCollectionId, setActive } = useActiveCollection();
  // Triggers location-permission prompt on Camera mount; result is read at shutter.
  const { location: deviceLocation } = useUserLocation();

  const activeCollection = useMemo(
    () => allCollections.find((c) => c.id === activeCollectionId) ?? null,
    [allCollections, activeCollectionId]
  );

  // One-time fetch of joined+own collections, used by the viewfinder chip
  // picker and the manual-pick drill-down. Refreshes on user change only.
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
          setAllCollections(
            merged.filter((c) => {
              if (seen.has(c.id)) return false;
              seen.add(c.id);
              return true;
            })
          );
        }
      } catch (e) {
        console.warn('[CameraScreen] listCollections failed', e);
      } finally {
        if (!cancelled) setCollectionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!initialItemId) {
      setResolvedContext(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const ctx = await getCollectionItemContext(initialItemId);
        if (!cancelled) setResolvedContext(ctx);
      } catch (e) {
        console.warn('[CameraScreen] getCollectionItemContext failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialItemId]);

  // After a non-verify capture lands a confident matched_item_id, fetch its
  // collection+item so the confident layout has the chips it needs without
  // each branch having to do its own lookup. Bails out the moment the user
  // manually overrides — otherwise it would keep snapping back to the AI's
  // pick whenever they choose a different item.
  const matchedItemId = capture.matchedItemId;
  useEffect(() => {
    if (initialItemId) return; // verify entry already handles its own context
    if (manualOverride) return;
    if (!matchedItemId) return;
    if (resolvedContext?.item.id === matchedItemId) return;
    let cancelled = false;
    void (async () => {
      try {
        const ctx = await getCollectionItemContext(matchedItemId);
        if (!cancelled) setResolvedContext(ctx);
      } catch (e) {
        console.warn('[CameraScreen] resolve matched item failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialItemId, manualOverride, matchedItemId, resolvedContext?.item.id]);

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

  const clearLocal = useCallback((): void => {
    setPhotoUri(null);
    setRawPhotoUri(null);
    setPendingLocation(null);
    setNote('');
    setManualOverride(false);
    if (!initialItemId) setResolvedContext(null);
  }, [initialItemId]);

  // Discards: throws away the in-flight photo (storage + local state). Used
  // for Retake and screen-blur cleanup. Safe to call at any stage — no-op when
  // nothing is pending. discard() is async/best-effort; we don't await here.
  const discard = useCallback((): void => {
    clearLocal();
    void capture.discard();
  }, [clearLocal, capture]);

  const discardRef = useRef(discard);
  useEffect(() => {
    discardRef.current = discard;
  }, [discard]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        discardRef.current();
      };
    }, [])
  );

  const captureWithMode = useCallback(
    (rawUri: string, location: { lat: number; lng: number } | null) => {
      if (!user) return;
      // Mode is inferred server-side from which ids we send:
      //  - initialItemId: verify
      //  - activeCollectionId only: match-in-collection
      //  - neither: discover
      void capture.capture({
        rawPhotoUri: rawUri,
        userId: user.id,
        collectionItemId: initialItemId ?? undefined,
        collectionId: !initialItemId && activeCollectionId ? activeCollectionId : undefined,
        locationLat: location?.lat ?? null,
        locationLng: location?.lng ?? null,
      });
    },
    [user, capture, initialItemId, activeCollectionId]
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

      // Skip the intermediate preview entirely — analyzing fires straight from
      // the shutter for every entry mode (matches the design).
      captureWithMode(stableUri, deviceLocation);
    } catch (e) {
      console.warn('[onShutter] takePictureAsync failed', e);
    }
  }, [cameraSettled, deviceLocation, captureWithMode]);

  const onClose = useCallback((): void => {
    discard();
    router.back();
  }, [discard]);

  const onPickFromLibrary = useCallback(async (): Promise<void> => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('camera.permissionTitle'), t('camera.libraryPermissionDenied'));
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
      const exifLoc = extractGpsFromExif(picked.exif);
      setPhotoUri(stableUri);
      setRawPhotoUri(stableUri);
      setPendingLocation(exifLoc);
      captureWithMode(stableUri, exifLoc);
    } catch (e) {
      console.warn('[onPickFromLibrary] failed', e);
    }
  }, [captureWithMode, t]);

  const onRetake = useCallback((): void => discard(), [discard]);

  // Resolve a chosen item (from candidates, manual drill-down, or freshly
  // created) into resolvedContext so the result sheet flips to the confident
  // layout. No new Vision call — we keep the original photo + usage tokens.
  // Sets manualOverride so the auto-resolve effect doesn't snap back to the
  // AI's original matched_item_id.
  const resolveItemId = useCallback(async (itemId: string): Promise<void> => {
    try {
      const ctx = await getCollectionItemContext(itemId);
      setManualOverride(true);
      setResolvedContext(ctx);
    } catch (e) {
      console.warn('[CameraScreen] resolveItemId failed', e);
    }
  }, []);

  const onPickCandidateItem = useCallback(
    (itemId: string): void => {
      void resolveItemId(itemId);
    },
    [resolveItemId]
  );

  // Discover branch picked a collection candidate — re-run capture in
  // match-in-collection mode against the same photo. Discards the existing
  // pending photo so we don't leak storage; reuses rawPhotoUri. Resets
  // manual override + resolvedContext so the new validation's matched item
  // is allowed to auto-fill.
  const onPickCandidateCollection = useCallback(
    async (collectionId: string): Promise<void> => {
      const raw = rawPhotoUri;
      if (!raw || !user) return;
      setManualOverride(false);
      setResolvedContext(null);
      // Await discard so its terminal setState(INITIAL) lands before the next
      // capture starts mutating state. Fire-and-forget here was correct only
      // by accident of React batching — fragile under future refactors.
      await capture.discard();
      void capture.capture({
        rawPhotoUri: raw,
        userId: user.id,
        collectionId,
        locationLat: pendingLocation?.lat ?? null,
        locationLng: pendingLocation?.lng ?? null,
      });
    },
    [rawPhotoUri, user, capture, pendingLocation]
  );

  const onPickManually = useCallback((): void => {
    setManualPickVisible(true);
  }, []);

  const onCreateItem = useCallback((): void => {
    setCreateItemVisible(true);
  }, []);

  const onItemCreated = useCallback(
    (item: { id: string }): void => {
      setCreateItemVisible(false);
      void resolveItemId(item.id);
    },
    [resolveItemId]
  );

  // Save: commit the validated photo to a finds row and pop the screen.
  // commit() throws on DB failure — we surface as Alert and stay on the
  // result screen so the user can retry without re-validating. When the user
  // resolved an item AFTER validation (ambiguous / manual / create flows),
  // resolvedContext.item.id overrides the pending id baked in by useCapture.
  const onSave = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      await capture.commit({
        userId: user.id,
        notes: note.trim() ? note.trim() : null,
        collectionItemIdOverride: resolvedContext?.item.id,
      });
      clearLocal();
      router.back();
    } catch (e) {
      console.warn('[onSave] commit failed', e);
      Alert.alert(t('common.error'), t('camera.errorSave'));
    }
  }, [user, capture, clearLocal, note, resolvedContext, t]);

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
    if (photoUri) {
      return <AnalyzingOverlay photoUri={photoUri} stage={capture.stage} />;
    }
    return (
      <SafeAreaView>
        <View className="flex-1 items-center justify-center gap-4">
          <Spinner />
        </View>
      </SafeAreaView>
    );
  }

  if (capture.stage === 'done' && photoUri) {
    const sheetMode = initialItemId
      ? 'verify'
      : capture.mode === 'match-in-collection'
        ? 'match-in-collection'
        : 'discover';

    const sheet = (
      <CaptureResultSheet
        mode={sheetMode}
        status={capture.validationStatus ?? 'vision_failed'}
        result={capture.validation}
        manuallyResolved={manualOverride}
        photoUri={photoUri}
        collection={
          resolvedContext
            ? {
                id: resolvedContext.collection.id,
                title: resolvedContext.collection.title,
                icon: resolvedContext.collection.icon,
              }
            : activeCollection
              ? {
                  id: activeCollection.id,
                  title: activeCollection.title,
                  icon: activeCollection.icon,
                }
              : null
        }
        item={
          resolvedContext
            ? {
                id: resolvedContext.item.id,
                name: resolvedContext.item.name,
                rarity: resolvedContext.item.rarity,
              }
            : null
        }
        candidateItems={capture.candidateItems}
        candidateCollections={capture.candidateCollections}
        location={pendingLocation}
        note={note}
        onNoteChange={setNote}
        onSave={() => {
          void onSave();
        }}
        onRetake={onRetake}
        onClose={onClose}
        onPickItem={onPickCandidateItem}
        onPickCollection={onPickCandidateCollection}
        onPickManually={onPickManually}
        onCreateItem={
          // Only offer create when we know which collection to insert into:
          // active chip OR a discover-picked collection.
          activeCollectionId || capture.matchedCollectionId ? onCreateItem : undefined
        }
      />
    );

    return (
      <View className="flex-1 bg-bg">
        {sheet}
        <ManualPickModal
          visible={manualPickVisible}
          collections={allCollections}
          loading={collectionsLoading}
          onClose={() => setManualPickVisible(false)}
          onPick={(itemId) => {
            setManualPickVisible(false);
            void resolveItemId(itemId);
          }}
        />
        {(() => {
          const targetCollectionId = activeCollectionId ?? capture.matchedCollectionId ?? null;
          const targetCollection = allCollections.find((c) => c.id === targetCollectionId) ?? null;
          if (!targetCollectionId || !targetCollection) return null;
          return (
            <CreateItemSheet
              visible={createItemVisible}
              collectionId={targetCollectionId}
              collectionTitle={targetCollection.title}
              defaultName={capture.validation?.detected ?? ''}
              onClose={() => setCreateItemVisible(false)}
              onCreated={onItemCreated}
            />
          );
        })()}
      </View>
    );
  }

  if (capture.stage === 'error') {
    console.warn('[capture] error state', capture.error);
    return (
      <SafeAreaView>
        <GoBackButton icon="close" onPress={onClose} />
        <View className="flex-1 items-center justify-center gap-4 p-6">
          <Text className="text-text text-base text-center">{t('camera.errorCapture')}</Text>
          {__DEV__ && capture.error ? (
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
          <View className="gap-3" pointerEvents="box-none">
            <GoBackButton icon="close" onPress={onClose} />
            {!initialItemId ? (
              <ActiveCollectionChip
                collection={
                  activeCollection
                    ? {
                        id: activeCollection.id,
                        title: activeCollection.title,
                        icon: activeCollection.icon,
                      }
                    : null
                }
                onPress={() => setChooseCollectionVisible(true)}
              />
            ) : null}
          </View>
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

      <ChooseCollectionSheet
        visible={chooseCollectionVisible}
        collections={allCollections}
        loading={collectionsLoading}
        activeCollectionId={activeCollectionId}
        onPick={setActive}
        onClose={() => setChooseCollectionVisible(false)}
      />
    </View>
  );
}

// Manual drill-down: collection list → expanded items. Used when AI fails
// (no-match) or the user explicitly rejects all candidates. Reuses the same
// listing the legacy auto-detect path used; rendered here as a Modal so it
// can overlay the result sheet without unmounting it.
interface ManualPickModalProps {
  visible: boolean;
  collections: CollectionWithProgress[];
  loading: boolean;
  onClose: () => void;
  onPick: (itemId: string) => void;
}

function ManualPickModal({ visible, collections, loading, onClose, onPick }: ManualPickModalProps) {
  // Backdrop is a separate absolute-fill Pressable so the content View has no
  // Pressable ancestor — nested Pressable around a FlatList swallows the
  // child press responders and the rows stop being tappable. Plain View on
  // the content side keeps inner taps working.
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          className="absolute top-0 left-0 right-0 bottom-0 bg-overlay"
        />
        <View className="bg-bg rounded-t-xl" style={{ maxHeight: '80%' }}>
          <ItemPickerSheet
            collections={collections}
            loading={loading}
            onPick={onPick}
            onClose={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}

interface ItemPickerSheetProps {
  collections: CollectionWithProgress[];
  loading: boolean;
  onPick: (itemId: string) => void;
  onClose: () => void;
}

function ItemPickerSheet({ collections, loading, onPick, onClose }: ItemPickerSheetProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <View className="bg-surface rounded-t-xl p-4 gap-3" style={{ maxHeight: 420 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-text text-base font-semibold flex-1">{t('camera.chooseItem')}</Text>
        <Pressable
          onPress={onClose}
          className="px-3 py-2 rounded-full bg-surface-hi border border-stroke">
          <Text className="text-text text-xs">{t('common.close')}</Text>
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
