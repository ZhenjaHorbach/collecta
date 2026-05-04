import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Spinner } from '@components/Spinner';
import { useColors } from '@hooks/useColors';
import { addCollectionItem } from '@services/collections.service';

import type { CollectionItem } from '@schemas';

export interface CreateItemSheetProps {
  visible: boolean;
  collectionId: string;
  collectionTitle: string;
  defaultName: string;
  onCreated: (item: CollectionItem) => void;
  onClose: () => void;
}

const RARITIES = ['common', 'uncommon', 'rare'] as const;

// Lets the user append a new collection_item on the fly when AI fails to
// match the photo to anything existing. RLS enforces membership/ownership;
// the service helper picks the next sort_order so we don't have to.
export function CreateItemSheet({
  visible,
  collectionId,
  collectionTitle,
  defaultName,
  onCreated,
  onClose,
}: CreateItemSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useColors();
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [rarity, setRarity] = useState<(typeof RARITIES)[number]>('common');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    if (submitting) return;
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError(t('validation.createItem.nameRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const item = await addCollectionItem(collectionId, {
        name: trimmed,
        description: description.trim() || null,
        rarity,
        ai_validation_prompt: null,
        example_image_url: null,
        fun_fact: null,
      });
      onCreated(item);
    } catch (e) {
      console.warn('[CreateItemSheet] addCollectionItem failed', e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-overlay">
        <View className="bg-bg rounded-t-xl p-5 gap-4 max-h-[85%]">
          <View className="flex-row items-center justify-between">
            <Text className="text-text text-base font-semibold">
              {t('validation.createItem.title')}
            </Text>
            <Pressable onPress={onClose} className="px-3 py-1 rounded-full bg-surface-hi">
              <Text className="text-text text-xs">{t('common.close')}</Text>
            </Pressable>
          </View>
          <Text className="text-text-dim text-xs">
            {t('validation.createItem.subtitle', { collection: collectionTitle })}
          </Text>

          <ScrollView contentContainerClassName="gap-3" keyboardShouldPersistTaps="handled">
            <View className="px-3 py-3 rounded-md bg-surface border border-stroke">
              <Text className="text-text-dim text-[11px] uppercase tracking-wider mb-1">
                {t('validation.createItem.nameLabel')}
              </Text>
              <TextInput
                value={name}
                onChangeText={(next) => {
                  setName(next);
                  if (error) setError(null);
                }}
                placeholder={t('validation.createItem.namePlaceholder')}
                placeholderTextColor={colors.textMuted}
                maxLength={200}
                className="text-text text-sm"
                autoFocus
              />
            </View>

            <View className="px-3 py-3 rounded-md bg-surface border border-stroke">
              <Text className="text-text-dim text-[11px] uppercase tracking-wider mb-1">
                {t('validation.createItem.descriptionLabel')}
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t('validation.createItem.descriptionPlaceholder')}
                placeholderTextColor={colors.textMuted}
                maxLength={500}
                multiline
                className="text-text text-sm"
              />
            </View>

            <View className="gap-2">
              <Text className="text-text-dim text-[11px] uppercase tracking-wider">
                {t('validation.createItem.rarityLabel')}
              </Text>
              <View className="flex-row gap-2">
                {RARITIES.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setRarity(r)}
                    accessibilityRole="button"
                    className={`flex-1 px-3 py-2 rounded-md border items-center ${
                      r === rarity ? 'bg-gold-glow border-gold' : 'bg-surface border-stroke'
                    }`}>
                    <Text
                      className={`text-xs font-semibold ${
                        r === rarity ? 'text-gold' : 'text-text-dim'
                      }`}>
                      {t(`collections.rarity.${r}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {error ? <Text className="text-coral text-xs">{error}</Text> : null}
          </ScrollView>

          <Pressable
            onPress={() => {
              void submit();
            }}
            disabled={submitting}
            accessibilityRole="button"
            className={`px-4 py-4 rounded-md items-center ${submitting ? 'bg-surface-hi' : 'bg-gold'}`}>
            {submitting ? (
              <Spinner />
            ) : (
              <Text className="text-on-gold font-semibold">
                {t('validation.createItem.submit')}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
