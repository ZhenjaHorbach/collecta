import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@components/Button';
import { EmojiPickerSheet } from '@components/EmojiPickerSheet';
import { GoBackButton } from '@components/GoBackButton';
import { Input } from '@components/Input';
import { SafeAreaView } from '@components/SafeAreaView';
import {
  CATEGORY_EMOJI,
  COLLECTION_CATEGORIES,
  type CollectionCategory,
} from '@constants/categories';
import { useColors } from '@hooks/useColors';
import { useCreateCollection } from '@hooks/useCreateCollection';
import { useGenerateCollection } from '@hooks/useGenerateCollection';
import {
  type AiGeneratedCollection,
  type AiGenerationErrorCode,
  type AiGenerationLocale,
} from '@services/ai-collection-generator.service';
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
  name: string;
  description: string;
  aiHint: string;
  rarity: Rarity;
  funFact: string;
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
  expanded: false,
});

export function CreateCollectionScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const { submit, submitting } = useCreateCollection();
  const { generate, generating, error: aiError, reset: resetAi } = useGenerateCollection();

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

  const cleanItems = useMemo(
    () =>
      items
        .map((i) => ({
          name: i.name.trim(),
          description: i.description.trim(),
          aiHint: i.aiHint.trim(),
          rarity: i.rarity,
          funFact: i.funFact.trim(),
        }))
        .filter((i) => i.name.length > 0),
    [items]
  );

  const canCreate =
    title.trim().length > 0 && category !== null && (mode === 'free' || cleanItems.length > 0);

  const onCreate = async () => {
    if (!canCreate || submitting) return;
    const isFreeform = mode === 'free';
    const itemsPayload: CreateItemInput[] = isFreeform
      ? []
      : cleanItems.map((it) => ({
          name: it.name,
          description: it.description.length > 0 ? it.description : null,
          ai_validation_prompt: it.aiHint.length > 0 ? it.aiHint : null,
          rarity: it.rarity,
          fun_fact: it.funFact.length > 0 ? it.funFact : null,
        }));
    const id = await submit({
      collection: {
        title: title.trim(),
        description: description.trim() || null,
        icon: emoji,
        category,
        ai_hint: aiHint.trim() || null,
        is_freeform: isFreeform,
        is_public: privacy === 'public',
      },
      items: itemsPayload,
    });
    if (id) {
      router.replace(`/collection/${id}`);
    } else {
      Alert.alert(t('collections.create.errorTitle'), t('common.unknownError'));
    }
  };

  const updateItem = (id: string, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const toggleItemDetails = (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, expanded: !it.expanded } : it)));
  };
  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  };
  const addItem = () => setItems((prev) => [...prev, newItem()]);
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

  return (
    <SafeAreaView>
      <GoBackButton icon="close">
        <View className="flex-1">
          <Text className="text-xl font-bold text-text">{t('collections.newCollection')}</Text>
          <Text className="text-xs text-text-dim mt-0.5">
            {t('collections.create.headerSubtitle')}
          </Text>
        </View>
      </GoBackButton>

      <View className="px-4 pt-2 pb-1">
        <View className="flex-row p-1 rounded-md bg-surface-lo border border-stroke">
          <ModeToggle
            active={creationMode === 'manual'}
            label={t('collections.create.mode.manual')}
            onPress={() => setCreationMode('manual')}
          />
          <ModeToggle
            active={creationMode === 'ai'}
            label={t('collections.create.mode.ai')}
            onPress={() => setCreationMode('ai')}
          />
        </View>
      </View>

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
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  placeholder={t('collections.create.ai.promptPlaceholder')}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{ minHeight: 80 }}
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
                  onPress={() => setEmojiPickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('collections.create.emoji.pick')}
                  style={{ width: 72, height: 72 }}
                  className="rounded-md bg-bg border border-stroke-hi items-center justify-center">
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
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('collections.create.fields.titlePlaceholder')}
                />
              </Field>
              <Field label={t('collections.create.fields.description')} optional>
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('collections.create.fields.descriptionPlaceholder')}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{ minHeight: 72 }}
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
                          onPress={() => setCategory(c)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          className={`items-center py-3 rounded-sm border ${active ? 'bg-gold border-gold' : 'bg-surface border-stroke'}`}>
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
                active={mode === 'list'}
                onPress={() => setMode('list')}
                icon="📋"
                title={t('collections.create.modes.list.title')}
                description={t('collections.create.modes.list.description')}
              />
              <ModeCard
                active={mode === 'free'}
                onPress={() => setMode('free')}
                icon="♾️"
                title={t('collections.create.modes.free.title')}
                description={t('collections.create.modes.free.description')}
                className="mt-2"
              />
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
                        {items.length > 1 ? (
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
                              style={{ minHeight: 56 }}
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
                              style={{ minHeight: 56 }}
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
                              style={{ minHeight: 56 }}
                            />
                          </ItemField>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                <TouchableOpacity
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
                style={{ minHeight: 80 }}
              />
            </Section>

            <Section title={t('collections.create.sections.privacy')}>
              <View className="flex-row gap-2">
                <PrivacyChip
                  active={privacy === 'public'}
                  onPress={() => setPrivacy('public')}
                  icon="🌐"
                  label={t('collections.create.privacy.public.label')}
                  description={t('collections.create.privacy.public.description')}
                />
                <PrivacyChip
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
          <View style={{ flex: 1 }}>
            <Button
              label={t('collections.create.cancel')}
              variant="secondary"
              onPress={() => router.back()}
              disabled={submitting}
            />
          </View>
          <View style={{ flex: 2 }}>
            <Button
              label={t('collections.create.submit')}
              onPress={onCreate}
              disabled={!canCreate}
              loading={submitting}
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
}

function ModeCard({ active, onPress, icon, title, description, className }: ModeCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`p-4 rounded-md flex-row items-center gap-3 border ${active ? 'bg-surface-hi border-gold' : 'bg-surface border-stroke'} ${className ?? ''}`}>
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
}

function ModeToggle({ active, label, onPress }: ModeToggleProps) {
  return (
    <TouchableOpacity
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

interface PrivacyChipProps {
  active: boolean;
  onPress: () => void;
  icon: string;
  label: string;
  description: string;
}

function PrivacyChip({ active, onPress, icon, label, description }: PrivacyChipProps) {
  return (
    <TouchableOpacity
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
