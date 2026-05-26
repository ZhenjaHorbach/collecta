import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@components/Button';
import { ConfirmDialogHost, notify } from '@components/ConfirmDialog';
import { EmojiPickerSheet } from '@components/EmojiPickerSheet';
import { GoBackButton } from '@components/GoBackButton';
import { Input } from '@components/Input';
import { SafeAreaView } from '@components/SafeAreaView';
import { Spinner } from '@components/Spinner';
import {
  CATEGORY_EMOJI,
  COLLECTION_CATEGORIES,
  type CollectionCategory,
} from '@constants/categories';
import { useAuth } from '@hooks/useAuth';
import { useCollection } from '@hooks/useCollection';
import { useColors } from '@hooks/useColors';
import { useCreateCollection } from '@hooks/useCreateCollection';
import { useGenerateCollection } from '@hooks/useGenerateCollection';
import { useUpdateCollection } from '@hooks/useUpdateCollection';
import {
  type AiGeneratedCollection,
  type AiGenerationErrorCode,
  type AiGenerationLocale,
} from '@services/ai-collection-generator.service';
import {
  deleteCollectionItemPhoto,
  isOwnedCollectionItemPhoto,
  uploadCollectionItemPhoto,
} from '@services/collection-item-photo.service';
import type { CreateItemInput } from '@services/collections.service';
import type { Database } from '@typings/database';

type Rarity = Database['public']['Enums']['item_rarity'];
const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare'] as const;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

const CATEGORY_ROWS: CollectionCategory[][] = chunk(COLLECTION_CATEGORIES, 5);

type Mode = 'list' | 'free';
type Privacy = 'public' | 'private';
type CreationMode = 'manual' | 'ai';
const AI_LOCALES: readonly AiGenerationLocale[] = ['en', 'ru', 'pl', 'uk'];

interface ItemDraft {
  id: string;
  // Set for items loaded from the database (edit mode). Undefined for
  // items added during this session — they become INSERTs on save.
  dbId?: string;
  // True for existing items that already have at least one find. Drives
  // the UI gates that protect user data: ✕ button is hidden, and any
  // mode-toggle that would orphan finds is disabled.
  hasFinds?: boolean;
  name: string;
  description: string;
  aiHint: string;
  rarity: Rarity;
  funFact: string;
  // Reference image attached to the draft (Wikipedia or Unsplash via the
  // multi-agent pipeline). Preserved through manual editing so a user
  // tweaking title / rarity doesn't lose the suggested photo.
  exampleImageUrl: string | null;
  expanded: boolean;
}

const DEFAULT_EMOJI = '📸';

let nextItemId = 1;
const newItem = (): ItemDraft => ({
  id: `i-${nextItemId++}`,
  name: '',
  description: '',
  aiHint: '',
  rarity: 'common',
  funFact: '',
  exampleImageUrl: null,
  expanded: false,
});

export interface CreateCollectionScreenProps {
  // When set, the screen runs in EDIT mode: AI affordances are hidden,
  // existing data is loaded and prefilled, and submit calls
  // useUpdateCollection instead of useCreateCollection. The id MUST
  // belong to a collection the caller owns — RLS will reject the save
  // otherwise.
  editingId?: string;
}

export function CreateCollectionScreen({ editingId }: CreateCollectionScreenProps = {}) {
  const isEdit = Boolean(editingId);
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const { user } = useAuth();
  const { submit, submitting } = useCreateCollection();
  const update = useUpdateCollection();
  const { generate, generating, error: aiError, reset: resetAi } = useGenerateCollection();
  const existing = useCollection(editingId);

  const [creationMode, setCreationMode] = useState<CreationMode>('manual');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBannerVisible, setAiBannerVisible] = useState(false);
  const [aiAttempted, setAiAttempted] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [category, setCategory] = useState<CollectionCategory | null>(null);
  const [mode, setMode] = useState<Mode>('list');
  const [items, setItems] = useState<ItemDraft[]>(() => [newItem()]);
  const [aiHint, setAiHint] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [hydrated, setHydrated] = useState(false);
  // Tracks per-item upload progress so the row can show a spinner and we
  // can disable picker buttons while in flight. Keyed by ItemDraft.id, not
  // dbId — the form state is the source of truth for "which row".
  const [uploadingItemIds, setUploadingItemIds] = useState<Set<string>>(() => new Set());

  // Snapshot of the items that exist in the DB when the screen loaded.
  // useUpdateCollection uses this to compute the diff at save time.
  const [existingItemIds, setExistingItemIds] = useState<string[]>([]);

  // One-shot prefill from the loaded collection. Guarded by `hydrated`
  // so the user's in-progress edits aren't trampled by a re-render of
  // useCollection's data reference.
  useEffect(() => {
    if (!isEdit || hydrated) return;
    const data = existing.data;
    if (!data) return;
    setTitle(data.title);
    setDescription(data.description ?? '');
    setEmoji(data.icon ?? (data.category ? CATEGORY_EMOJI[data.category] : DEFAULT_EMOJI));
    setCategory(data.category);
    setMode(data.is_freeform ? 'free' : 'list');
    setAiHint(data.ai_hint ?? '');
    setPrivacy(data.is_public ? 'public' : 'private');
    if (data.is_freeform) {
      setItems([newItem()]);
      setExistingItemIds([]);
    } else {
      const findItemIds = new Set(data.finds.map((f) => f.collection_item_id));
      const drafts: ItemDraft[] = data.items.map((it) => ({
        id: `i-${nextItemId++}`,
        dbId: it.id,
        hasFinds: findItemIds.has(it.id),
        name: it.name,
        description: it.description ?? '',
        aiHint: it.ai_validation_prompt ?? '',
        rarity: it.rarity,
        funFact: it.fun_fact ?? '',
        exampleImageUrl: it.example_image_url ?? null,
        expanded: false,
      }));
      setItems(drafts.length > 0 ? drafts : [newItem()]);
      setExistingItemIds(data.items.map((it) => it.id));
    }
    setHydrated(true);
  }, [isEdit, hydrated, existing.data]);

  useEffect(() => {
    if (!isEdit || !editingId) return;
    if (!hydrated || !existing.data || !user) return;
    if (existing.data.creator_id !== user.id) {
      router.replace(`/collection/${editingId}`);
    }
  }, [isEdit, editingId, hydrated, existing.data, user, router]);

  const applyDraft = (draft: AiGeneratedCollection) => {
    setTitle(draft.title);
    setDescription(draft.description);
    setCategory(draft.category);
    setMode('list');
    setItems(
      draft.items.map((it) => ({
        id: `i-${nextItemId++}`,
        name: it.name,
        description: it.description,
        aiHint: it.ai_hint,
        rarity: it.rarity,
        funFact: it.fun_fact,
        // example_image_url is optional in the draft — multi-agent pipeline
        // populates it when Wikipedia / Unsplash returned a hit. Coerce
        // undefined to null so the form state stays a clean discriminated
        // shape.
        exampleImageUrl: it.example_image_url ?? null,
        expanded: false,
      }))
    );
    setAiBannerVisible(true);
    setCreationMode('manual');
  };

  const onGenerate = async () => {
    const locale: AiGenerationLocale = (AI_LOCALES as readonly string[]).includes(i18n.language)
      ? (i18n.language as AiGenerationLocale)
      : 'en';
    setAiAttempted(true);
    const draft = await generate(aiPrompt, locale);
    if (draft) applyDraft(draft);
  };

  const discardDraft = () => {
    setTitle('');
    setDescription('');
    setCategory(null);
    setItems([newItem()]);
    setAiHint('');
    setAiBannerVisible(false);
    setAiAttempted(false);
    resetAi();
  };

  // True when any draft item already has a find. Switching mode (list ↔
  // free) or removing items in this state would orphan finds, so the
  // affordances are locked.
  const anyItemHasFinds = useMemo(() => items.some((it) => it.hasFinds), [items]);

  const cleanItems = useMemo(
    () =>
      items
        .map((i) => ({
          name: i.name.trim(),
          description: i.description.trim(),
          aiHint: i.aiHint.trim(),
          rarity: i.rarity,
          funFact: i.funFact.trim(),
          exampleImageUrl: i.exampleImageUrl,
        }))
        .filter((i) => i.name.length > 0),
    [items]
  );

  const canCreate =
    title.trim().length > 0 && category !== null && (mode === 'free' || cleanItems.length > 0);

  const onCreate = async () => {
    if (!canCreate || submitting || update.saving) return;
    const isFreeform = mode === 'free';
    const itemsPayload: CreateItemInput[] = isFreeform
      ? []
      : cleanItems.map((it) => ({
          name: it.name,
          description: it.description.length > 0 ? it.description : null,
          ai_validation_prompt: it.aiHint.length > 0 ? it.aiHint : null,
          rarity: it.rarity,
          fun_fact: it.funFact.length > 0 ? it.funFact : null,
          example_image_url: it.exampleImageUrl,
        }));
    // First non-null reference photo becomes the collection cover. Free —
    // saves an extra image lookup just for the cover, and keeps Discover /
    // CollectionCard from falling back to the category emoji.
    const coverImageUrl = isFreeform
      ? null
      : (cleanItems.find((it) => it.exampleImageUrl)?.exampleImageUrl ?? null);

    if (isEdit && editingId) {
      // Build draft items in the form's display order. Each entry keeps
      // its original dbId when present so the diff in useUpdateCollection
      // can tell retained items from new INSERTs.
      const draftItems = isFreeform
        ? []
        : items
            .map((it) => ({
              dbId: it.dbId,
              name: it.name.trim(),
              description: it.description.trim() ? it.description.trim() : null,
              ai_validation_prompt: it.aiHint.trim() ? it.aiHint.trim() : null,
              rarity: it.rarity,
              fun_fact: it.funFact.trim() ? it.funFact.trim() : null,
              example_image_url: it.exampleImageUrl,
            }))
            .filter((it) => it.name.length > 0);
      const ok = await update.save(editingId, {
        collection: {
          title: title.trim(),
          description: description.trim() || null,
          icon: emoji,
          category,
          ai_hint: aiHint.trim() || null,
          cover_image_url: coverImageUrl,
          is_freeform: isFreeform,
          is_public: privacy === 'public',
        },
        existingItemIds,
        draftItems,
      });
      if (ok) {
        router.replace(`/collection/${editingId}`);
      } else {
        void notify({
          title: t('collections.edit.errorTitle'),
          body: t('collections.edit.errorBody'),
          buttonLabel: t('common.close'),
        });
      }
      return;
    }

    const id = await submit({
      collection: {
        title: title.trim(),
        description: description.trim() || null,
        icon: emoji,
        category,
        ai_hint: aiHint.trim() || null,
        cover_image_url: coverImageUrl,
        is_freeform: isFreeform,
        is_public: privacy === 'public',
      },
      items: itemsPayload,
    });
    if (id) {
      router.replace(`/collection/${id}`);
    } else {
      void notify({
        title: t('collections.create.errorTitle'),
        body: t('common.unknownError'),
        buttonLabel: t('common.close'),
      });
    }
  };

  const updateItem = (id: string, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const toggleItemDetails = (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, expanded: !it.expanded } : it)));
  };
  const removeItem = (id: string) => {
    // In edit mode, items that already have at least one find are
    // protected — removing them would cascade-delete the user's photos
    // (`finds.collection_item_id` is `on delete cascade`). The ✕ button
    // is hidden for those, but we double-check here as defence in depth.
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      const target = prev.find((it) => it.id === id);
      if (target?.hasFinds) return prev;
      return prev.filter((it) => it.id !== id);
    });
  };
  const addItem = () => setItems((prev) => [...prev, newItem()]);

  // Picks an image from the gallery and uploads it to the
  // collection-item-images bucket. The previous URL is discarded best-effort:
  // owned (our bucket) → delete the storage object so it doesn't leak;
  // foreign (Wikipedia / Unsplash from the AI pipeline) → just drop the
  // reference, the upstream resource isn't ours to remove.
  const onPickItemImage = async (id: string): Promise<void> => {
    if (!user) return;
    if (uploadingItemIds.has(id)) return;
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        void notify({
          title: t('collections.create.items.fields.image.errorTitle'),
          body: t('collections.create.items.fields.image.permissionDenied'),
          buttonLabel: t('common.close'),
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled || !result.assets?.[0]) return;
      const picked = result.assets[0];

      setUploadingItemIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      const previous = items.find((it) => it.id === id)?.exampleImageUrl ?? null;
      const url = await uploadCollectionItemPhoto(picked.uri, user.id);
      updateItem(id, { exampleImageUrl: url });

      if (previous && isOwnedCollectionItemPhoto(previous, user.id)) {
        deleteCollectionItemPhoto(previous).catch((err) => {
          console.warn('[create-collection] failed to delete old preview', err);
        });
      }
    } catch (err) {
      console.warn('[create-collection] image upload failed', err);
      void notify({
        title: t('collections.create.items.fields.image.errorTitle'),
        body: t('collections.create.items.fields.image.errorBody'),
        buttonLabel: t('common.close'),
      });
    } finally {
      setUploadingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const onRemoveItemImage = (id: string): void => {
    if (uploadingItemIds.has(id)) return;
    const previous = items.find((it) => it.id === id)?.exampleImageUrl ?? null;
    updateItem(id, { exampleImageUrl: null });
    if (previous && user && isOwnedCollectionItemPhoto(previous, user.id)) {
      deleteCollectionItemPhoto(previous).catch((err) => {
        console.warn('[create-collection] failed to delete preview', err);
      });
    }
  };

  const moveItem = (id: string, direction: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  // While the existing collection is loading in edit mode, render an
  // empty shell — submitting a still-empty form would create an INSERT
  // tree that overwrites the real one with blanks.
  if (isEdit && (existing.loading || !hydrated)) {
    return (
      <SafeAreaView>
        <GoBackButton icon="close">
          <View className="flex-1">
            <Text className="text-xl font-bold text-text">{t('collections.edit.title')}</Text>
          </View>
        </GoBackButton>
        <Spinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID="create-collection-screen">
      <GoBackButton icon="close">
        <View className="flex-1">
          <Text className="text-xl font-bold text-text">
            {isEdit ? t('collections.edit.title') : t('collections.newCollection')}
          </Text>
          <Text className="text-xs text-text-dim mt-0.5">
            {isEdit ? t('collections.edit.headerSubtitle') : t('collections.create.headerSubtitle')}
          </Text>
        </View>
      </GoBackButton>

      {/* AI generation is a create-only affordance: editing existing
          curation by re-running the generator would overwrite the
          user's items wholesale. Hide the toggle entirely in edit mode. */}
      {!isEdit ? (
        <View className="px-4 pt-2 pb-1">
          <View className="flex-row p-1 rounded-md bg-surface-lo border border-stroke">
            <ModeToggle
              testID="create-mode-manual"
              active={creationMode === 'manual'}
              label={t('collections.create.mode.manual')}
              onPress={() => setCreationMode('manual')}
            />
            <ModeToggle
              testID="create-mode-ai"
              active={creationMode === 'ai'}
              label={t('collections.create.mode.ai')}
              onPress={() => setCreationMode('ai')}
            />
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled">
        {creationMode === 'ai' ? (
          <View className="px-4 pt-3">
            <View className="rounded-lg p-4 bg-surface-lo border border-stroke">
              <Text className="text-base font-bold text-text">
                {t('collections.create.ai.title')}
              </Text>
              <Text className="text-xs text-text-dim mt-1 leading-5">
                {t('collections.create.ai.subtitle')}
              </Text>
              <View className="mt-4">
                <Text className="text-xs font-semibold text-text-dim mb-1.5">
                  {t('collections.create.ai.promptLabel')}
                </Text>
                <Input
                  testID="create-ai-prompt-input"
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  placeholder={t('collections.create.ai.promptPlaceholder')}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="min-h-[80px]"
                  editable={!generating}
                />
              </View>
              {!aiAttempted && !generating && aiPrompt.trim().length === 0 ? (
                <View className="mt-4 p-3 rounded-sm bg-surface border border-stroke gap-2">
                  <Text className="text-xs font-bold text-text-dim uppercase tracking-wider">
                    {t('collections.create.ai.tips.title')}
                  </Text>
                  <TipRow text={t('collections.create.ai.tips.tip1')} />
                  <TipRow text={t('collections.create.ai.tips.tip2')} />
                  <TipRow text={t('collections.create.ai.tips.tip3')} />
                </View>
              ) : null}
              {generating ? (
                <View className="mt-5 items-center py-6">
                  <ActivityIndicator color={colors.gold} />
                  <Text className="mt-3 text-sm font-semibold text-text">
                    {t('collections.create.ai.loadingTitle')}
                  </Text>
                  <Text className="mt-1 text-xs text-text-dim">
                    {t('collections.create.ai.loadingHint')}
                  </Text>
                </View>
              ) : (
                <View className="mt-5">
                  <Button
                    testID="create-ai-generate-button"
                    label={
                      aiAttempted
                        ? t('collections.create.ai.regenerate')
                        : t('collections.create.ai.generate')
                    }
                    onPress={onGenerate}
                    disabled={aiPrompt.trim().length < 3}
                  />
                </View>
              )}
              {aiError && !generating ? (
                <View className="mt-4 p-3 rounded-sm bg-coral/10 border border-coral">
                  <Text className="text-sm text-coral">
                    {aiErrorMessage(t, aiError.code, aiError)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {creationMode === 'manual' && aiBannerVisible ? (
          <View className="px-4 pt-3">
            <View className="rounded-md p-3 bg-gold-lo border border-gold flex-row items-center gap-3">
              <Text className="text-lg">✨</Text>
              <Text className="flex-1 text-xs text-text font-semibold">
                {t('collections.create.ai.draftBanner')}
              </Text>
              <TouchableOpacity
                testID="create-ai-discard-button"
                onPress={discardDraft}
                accessibilityRole="button"
                className="px-2 py-1">
                <Text className="text-xs font-semibold text-text-dim">
                  {t('collections.create.ai.discard')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {creationMode === 'manual' ? (
          <>
            {/* Cover preview */}
            <View className="px-4 pt-2">
              <View className="rounded-lg p-4 bg-surface-lo border border-stroke flex-row items-center gap-3">
                <TouchableOpacity
                  testID="create-emoji-picker-button"
                  onPress={() => setEmojiPickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('collections.create.emoji.pick')}
                  className="w-[72px] h-[72px] rounded-md bg-bg border border-stroke-hi items-center justify-center">
                  <Text className="text-4xl">{emoji}</Text>
                </TouchableOpacity>
                <View className="flex-1">
                  <Text className="text-xs uppercase tracking-widest font-bold text-text-dim">
                    {t('collections.create.preview.label')}
                  </Text>
                  <Text numberOfLines={1} className="text-xl font-bold text-text mt-1">
                    {title || t('collections.create.preview.titlePlaceholder')}
                  </Text>
                  <Text numberOfLines={1} className="text-xs text-text-dim mt-1">
                    {previewMeta(t, category, mode, cleanItems.length)}
                  </Text>
                </View>
              </View>
            </View>

            <Section title={t('collections.create.sections.basics')}>
              <Field label={t('collections.create.fields.title')}>
                <Input
                  testID="create-title-input"
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('collections.create.fields.titlePlaceholder')}
                />
              </Field>
              <Field label={t('collections.create.fields.description')} optional>
                <Input
                  testID="create-description-input"
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('collections.create.fields.descriptionPlaceholder')}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="min-h-[72px]"
                />
              </Field>
            </Section>

            <Section title={t('collections.create.sections.category')} required>
              {CATEGORY_ROWS.map((row, rowIdx) => (
                <View key={rowIdx} className="flex-row mb-2">
                  {row.map((c) => {
                    const active = category === c;
                    return (
                      <View key={c} className="flex-1 px-1">
                        <TouchableOpacity
                          testID={`create-category-${c}`}
                          onPress={() => setCategory(c)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          className={`h-20 items-center justify-center px-1 rounded-sm border ${active ? 'bg-gold border-gold' : 'bg-surface border-stroke'}`}>
                          <Text className="text-xl">{CATEGORY_EMOJI[c]}</Text>
                          <Text
                            adjustsFontSizeToFit
                            numberOfLines={2}
                            className={`text-xs font-semibold mt-1 text-center ${active ? 'text-on-gold' : 'text-text'}`}>
                            {t(`categories.${c}`)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))}
            </Section>

            <Section title={t('collections.create.sections.mode')} required>
              <ModeCard
                testID="create-collection-mode-list"
                active={mode === 'list'}
                onPress={() => setMode('list')}
                disabled={isEdit && anyItemHasFinds}
                icon="📋"
                title={t('collections.create.modes.list.title')}
                description={t('collections.create.modes.list.description')}
              />
              <ModeCard
                testID="create-collection-mode-free"
                active={mode === 'free'}
                onPress={() => setMode('free')}
                disabled={isEdit && anyItemHasFinds}
                icon="♾️"
                title={t('collections.create.modes.free.title')}
                description={t('collections.create.modes.free.description')}
                className="mt-2"
              />
              {isEdit && anyItemHasFinds ? (
                <Text className="text-xs text-text-muted mt-2 leading-5">
                  {t('collections.edit.modeLocked')}
                </Text>
              ) : null}
            </Section>

            {mode === 'list' ? (
              <Section title={t('collections.create.sections.items')} required>
                {items.map((item, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === items.length - 1;
                  return (
                    <View key={item.id} className="mb-2">
                      <View className="flex-row items-center gap-2">
                        <View className="w-7 h-7 rounded-sm bg-surface border border-stroke items-center justify-center">
                          <Text className="text-xs font-bold text-text-dim">{idx + 1}</Text>
                        </View>
                        {item.exampleImageUrl ? (
                          <TouchableOpacity
                            onPress={() => toggleItemDetails(item.id)}
                            accessibilityRole="imagebutton"
                            accessibilityLabel={t('collections.create.items.fields.image.label')}
                            className="w-10 h-10 rounded-sm overflow-hidden border border-stroke-hi bg-surface">
                            <Image
                              source={{ uri: item.exampleImageUrl }}
                              contentFit="cover"
                              style={{ width: '100%', height: '100%' }}
                            />
                          </TouchableOpacity>
                        ) : null}
                        <View className="flex-1">
                          <Input
                            value={item.name}
                            onChangeText={(name) => updateItem(item.id, { name })}
                            placeholder={t('collections.create.items.placeholder')}
                          />
                        </View>
                        <View className="flex-row gap-1">
                          <TouchableOpacity
                            onPress={() => moveItem(item.id, -1)}
                            disabled={isFirst}
                            accessibilityRole="button"
                            accessibilityLabel={t('collections.create.items.moveUp')}
                            className={`w-8 h-8 rounded-sm border items-center justify-center ${isFirst ? 'border-stroke opacity-40' : 'border-stroke-hi bg-surface'}`}>
                            <Text className="text-text-dim text-sm">↑</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => moveItem(item.id, 1)}
                            disabled={isLast}
                            accessibilityRole="button"
                            accessibilityLabel={t('collections.create.items.moveDown')}
                            className={`w-8 h-8 rounded-sm border items-center justify-center ${isLast ? 'border-stroke opacity-40' : 'border-stroke-hi bg-surface'}`}>
                            <Text className="text-text-dim text-sm">↓</Text>
                          </TouchableOpacity>
                        </View>
                        {items.length > 1 && !item.hasFinds ? (
                          <TouchableOpacity
                            onPress={() => removeItem(item.id)}
                            accessibilityRole="button"
                            accessibilityLabel={t('collections.create.items.remove')}
                            className="w-8 h-8 items-center justify-center">
                            <Text className="text-text-muted text-base">✕</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleItemDetails(item.id)}
                        accessibilityRole="button"
                        className="ml-9 mt-1 self-start">
                        <Text className="text-xs font-semibold text-text-dim">
                          {item.expanded
                            ? `▾ ${t('collections.create.items.detailsHide')}`
                            : `▸ ${t('collections.create.items.details')}`}
                        </Text>
                      </TouchableOpacity>
                      {item.expanded ? (
                        <View className="ml-9 mt-2 p-3 rounded-sm bg-surface-lo border border-stroke gap-3">
                          <ItemImageField
                            url={item.exampleImageUrl}
                            uploading={uploadingItemIds.has(item.id)}
                            onPick={() => onPickItemImage(item.id)}
                            onRemove={() => onRemoveItemImage(item.id)}
                          />
                          <ItemField label={t('collections.create.items.fields.description')}>
                            <Input
                              value={item.description}
                              onChangeText={(description) => updateItem(item.id, { description })}
                              placeholder={t(
                                'collections.create.items.fields.descriptionPlaceholder'
                              )}
                              multiline
                              numberOfLines={2}
                              textAlignVertical="top"
                              className="min-h-[56px]"
                            />
                          </ItemField>
                          <ItemField label={t('collections.create.items.fields.aiHint')}>
                            <Input
                              value={item.aiHint}
                              onChangeText={(aiHint) => updateItem(item.id, { aiHint })}
                              placeholder={t('collections.create.items.fields.aiHintPlaceholder')}
                              multiline
                              numberOfLines={2}
                              textAlignVertical="top"
                              className="min-h-[56px]"
                            />
                          </ItemField>
                          <ItemField label={t('collections.create.items.fields.rarity')}>
                            <View className="flex-row gap-2">
                              {RARITIES.map((r) => {
                                const active = item.rarity === r;
                                return (
                                  <TouchableOpacity
                                    key={r}
                                    onPress={() => updateItem(item.id, { rarity: r })}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: active }}
                                    className={`flex-1 py-2 rounded-sm border items-center ${active ? 'bg-gold border-gold' : 'bg-surface border-stroke'}`}>
                                    <Text
                                      className={`text-xs font-semibold ${active ? 'text-on-gold' : 'text-text'}`}>
                                      {t(`collections.rarity.${r}`)}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </ItemField>
                          <ItemField label={t('collections.create.items.fields.funFact')}>
                            <Input
                              value={item.funFact}
                              onChangeText={(funFact) => updateItem(item.id, { funFact })}
                              placeholder={t('collections.create.items.fields.funFactPlaceholder')}
                              multiline
                              numberOfLines={2}
                              textAlignVertical="top"
                              className="min-h-[56px]"
                            />
                          </ItemField>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                <TouchableOpacity
                  testID="create-add-item-button"
                  onPress={addItem}
                  accessibilityRole="button"
                  className="py-3 px-4 rounded-sm border border-dashed border-stroke-hi items-center justify-center mt-1">
                  <Text className="text-sm font-semibold text-text-dim">
                    + {t('collections.create.items.add')}
                  </Text>
                </TouchableOpacity>
              </Section>
            ) : null}

            <Section title={t('collections.create.sections.aiHint')} optional>
              <Text className="text-xs text-text-dim leading-5 mb-3">
                {t('collections.create.aiHint.help')}
              </Text>
              <Input
                value={aiHint}
                onChangeText={setAiHint}
                placeholder={t('collections.create.aiHint.placeholder')}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="min-h-[80px]"
              />
            </Section>

            <Section title={t('collections.create.sections.privacy')}>
              <View className="flex-row gap-2">
                <PrivacyChip
                  testID="create-privacy-public"
                  active={privacy === 'public'}
                  onPress={() => setPrivacy('public')}
                  icon="🌐"
                  label={t('collections.create.privacy.public.label')}
                  description={t('collections.create.privacy.public.description')}
                />
                <PrivacyChip
                  testID="create-privacy-private"
                  active={privacy === 'private'}
                  onPress={() => setPrivacy('private')}
                  icon="🔒"
                  label={t('collections.create.privacy.private.label')}
                  description={t('collections.create.privacy.private.description')}
                />
              </View>
            </Section>
          </>
        ) : null}
      </ScrollView>

      {creationMode === 'manual' ? (
        <View className="absolute left-0 right-0 bottom-0 p-4 pt-3 bg-bg border-t border-stroke flex-row gap-2">
          <View className="flex-1">
            <Button
              testID="create-cancel-button"
              label={t('collections.create.cancel')}
              variant="secondary"
              onPress={() => router.back()}
              disabled={submitting || update.saving}
            />
          </View>
          <View className="flex-[2]">
            <Button
              testID="create-submit-button"
              label={isEdit ? t('collections.edit.submit') : t('collections.create.submit')}
              onPress={onCreate}
              disabled={!canCreate}
              loading={submitting || update.saving}
            />
          </View>
        </View>
      ) : null}

      <EmojiPickerSheet
        visible={emojiPickerOpen}
        current={emoji}
        onPick={(e) => {
          setEmoji(e);
          setEmojiPickerOpen(false);
        }}
        onClose={() => setEmojiPickerOpen(false)}
      />
      {/* Per-screen host so notify/confirm overlays render above iOS's
          native modal presentation of this Stack.Screen. */}
      <ConfirmDialogHost />
    </SafeAreaView>
  );
}

function previewMeta(
  t: (key: string, opts?: Record<string, unknown>) => string,
  category: CollectionCategory | null,
  mode: Mode,
  itemCount: number
): string {
  const parts: string[] = [];
  if (category) parts.push(`${CATEGORY_EMOJI[category]} ${t(`categories.${category}`)}`);
  else parts.push(t('collections.create.preview.pickCategory'));
  if (mode === 'list' && itemCount > 0) {
    parts.push(t('collections.create.preview.itemCount', { count: itemCount }));
  }
  if (mode === 'free') parts.push(t('collections.create.preview.freeMode'));
  return parts.join(' · ');
}

interface SectionProps {
  title: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}

function Section({ title, required, optional, children }: SectionProps) {
  const { t } = useTranslation();
  return (
    <View className="px-4 pt-7">
      <View className="flex-row items-center mb-3">
        <Text className="text-xs font-bold uppercase tracking-widest text-text-dim">{title}</Text>
        {required ? (
          <Text className="ml-2 text-xs font-bold uppercase tracking-wider text-gold">
            · {t('collections.create.required')}
          </Text>
        ) : null}
        {optional ? (
          <Text className="ml-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            · {t('collections.create.optional')}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

interface FieldProps {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}

function Field({ label, optional, children }: FieldProps) {
  const { t } = useTranslation();
  return (
    <View className="mb-3">
      <Text className="text-xs font-semibold text-text-dim mb-1.5">
        {label}
        {optional ? (
          <Text className="text-text-muted"> · {t('collections.create.optional')}</Text>
        ) : null}
      </Text>
      {children}
    </View>
  );
}

interface ModeCardProps {
  active: boolean;
  onPress: () => void;
  icon: string;
  title: string;
  description: string;
  className?: string;
  disabled?: boolean;
  testID?: string;
}

function ModeCard({
  active,
  onPress,
  icon,
  title,
  description,
  className,
  disabled,
  testID,
}: ModeCardProps) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      className={`p-4 rounded-md flex-row items-center gap-3 border ${active ? 'bg-surface-hi border-gold' : 'bg-surface border-stroke'} ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}>
      <View
        className={`w-10 h-10 rounded-sm items-center justify-center ${active ? 'bg-gold' : 'bg-surface-hi'}`}>
        <Text className="text-xl">{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-text">{title}</Text>
        <Text className="text-xs text-text-dim mt-0.5 leading-5">{description}</Text>
      </View>
      <View
        className={`w-5 h-5 rounded-full border-2 items-center justify-center ${active ? 'border-gold bg-gold' : 'border-stroke-hi'}`}>
        {active ? <Text className="text-on-gold text-xs font-bold">✓</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

interface ModeToggleProps {
  active: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
}

function ModeToggle({ active, label, onPress, testID }: ModeToggleProps) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-1 py-2 rounded-sm items-center ${active ? 'bg-gold' : 'bg-transparent'}`}>
      <Text className={`text-sm font-bold ${active ? 'text-on-gold' : 'text-text-dim'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function aiErrorMessage(
  t: (key: string, opts?: Record<string, unknown>) => string,
  code: AiGenerationErrorCode,
  meta: { used?: number; limit?: number }
): string {
  switch (code) {
    case 'rate_limited':
      return t('collections.create.ai.errors.rateLimited', {
        used: meta.used ?? 0,
        limit: meta.limit ?? 5,
      });
    case 'invalid_output':
      return t('collections.create.ai.errors.invalidOutput');
    case 'network':
    case 'unauthorized':
      return t('collections.create.ai.errors.network');
    case 'prompt_too_short':
      return t('collections.create.ai.errors.promptTooShort');
    case 'prompt_too_long':
      return t('collections.create.ai.errors.promptTooLong');
    default:
      return t('collections.create.ai.errors.unknown');
  }
}

function TipRow({ text }: { text: string }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-text-dim text-xs">·</Text>
      <Text className="flex-1 text-xs text-text-dim leading-5">{text}</Text>
    </View>
  );
}

interface ItemFieldProps {
  label: string;
  children: React.ReactNode;
}

function ItemField({ label, children }: ItemFieldProps) {
  return (
    <View>
      <Text className="text-xs font-semibold text-text-dim mb-1.5">{label}</Text>
      {children}
    </View>
  );
}

interface ItemImageFieldProps {
  url: string | null;
  uploading: boolean;
  onPick: () => void;
  onRemove: () => void;
}

function ItemImageField({ url, uploading, onPick, onRemove }: ItemImageFieldProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const hasImage = Boolean(url);
  return (
    <View>
      <Text className="text-xs font-semibold text-text-dim mb-1.5">
        {t('collections.create.items.fields.image.label')}
      </Text>
      <View className="flex-row items-start gap-3">
        <TouchableOpacity
          onPress={onPick}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel={t(
            hasImage
              ? 'collections.create.items.fields.image.replace'
              : 'collections.create.items.fields.image.pick'
          )}
          className={`w-20 h-20 rounded-sm overflow-hidden border ${hasImage ? 'border-stroke-hi' : 'border-dashed border-stroke-hi'} bg-surface items-center justify-center ${uploading ? 'opacity-60' : ''}`}>
          {hasImage ? (
            <Image
              source={{ uri: url ?? undefined }}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <Text className="text-2xl">🖼️</Text>
          )}
          {uploading ? (
            <View className="absolute inset-0 items-center justify-center bg-surface-lo/70">
              <ActivityIndicator color={colors.gold} />
            </View>
          ) : null}
        </TouchableOpacity>
        <View className="flex-1 gap-2">
          <Text className="text-xs text-text-dim leading-5">
            {t('collections.create.items.fields.image.hint')}
          </Text>
          <View className="flex-row gap-2 flex-wrap">
            <TouchableOpacity
              onPress={onPick}
              disabled={uploading}
              accessibilityRole="button"
              className={`py-2 px-3 rounded-sm border border-stroke-hi bg-surface ${uploading ? 'opacity-60' : ''}`}>
              <Text className="text-xs font-semibold text-text">
                {uploading
                  ? t('collections.create.items.fields.image.uploading')
                  : hasImage
                    ? t('collections.create.items.fields.image.replace')
                    : t('collections.create.items.fields.image.pick')}
              </Text>
            </TouchableOpacity>
            {hasImage ? (
              <TouchableOpacity
                onPress={onRemove}
                disabled={uploading}
                accessibilityRole="button"
                className={`py-2 px-3 rounded-sm border border-stroke bg-surface ${uploading ? 'opacity-60' : ''}`}>
                <Text className="text-xs font-semibold text-text-dim">
                  {t('collections.create.items.fields.image.remove')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

interface PrivacyChipProps {
  active: boolean;
  onPress: () => void;
  icon: string;
  label: string;
  description: string;
  testID?: string;
}

function PrivacyChip({ active, onPress, icon, label, description, testID }: PrivacyChipProps) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-1 py-3 px-2 rounded-md border items-center gap-1.5 ${active ? 'bg-surface-hi border-gold' : 'bg-surface border-stroke'}`}>
      <Text className="text-lg">{icon}</Text>
      <Text className={`text-xs font-bold ${active ? 'text-text' : 'text-text'}`}>{label}</Text>
      <Text className="text-xs text-text-dim text-center leading-4">{description}</Text>
    </TouchableOpacity>
  );
}
