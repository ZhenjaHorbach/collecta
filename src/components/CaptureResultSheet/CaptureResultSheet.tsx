import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

import { GoBackButton } from '@components/GoBackButton';
import { useColors } from '@hooks/useColors';
import { XP_PER_FIND } from '@utils/streak.utils';

import type { ValidationResult } from '@schemas';

export type CaptureResultMode = 'verify' | 'match-in-collection' | 'discover';

export interface ResultCandidateItem {
  id: string;
  name: string;
  confidence: number;
}

export interface ResultCandidateCollection {
  id: string;
  name: string;
  confidence: number;
}

export interface CaptureResultSheetProps {
  mode: CaptureResultMode;
  status: 'ok' | 'vision_failed' | 'invoke_failed';
  result: ValidationResult | null;
  // True when the user explicitly picked / created the item (vs. it being the
  // AI's auto-pick). Promotes the sheet into the confident layout regardless
  // of whether result.valid was true.
  manuallyResolved?: boolean;
  photoUri: string;
  collection: { id: string; title: string; icon: string | null } | null;
  item: { id: string; name: string; rarity: 'common' | 'uncommon' | 'rare' } | null;
  candidateItems: ResultCandidateItem[];
  candidateCollections: ResultCandidateCollection[];
  location: { lat: number; lng: number } | null;
  note: string;
  onNoteChange: (next: string) => void;
  onSave: () => void;
  onRetake: () => void;
  onClose: () => void;
  // Callbacks active in non-verify modes:
  onPickItem?: (itemId: string) => void;
  onPickCollection?: (collectionId: string) => void;
  onPickManually?: () => void;
  onCreateItem?: () => void;
}

// Verdict tone derived once from status + valid: gold for a confident match,
// coral for a clear mismatch, dim for "we couldn't tell". Save-CTA wording
// follows the same axis (saveAnyway when verdict is negative-but-parseable).
type Tone = 'positive' | 'negative' | 'neutral';

function deriveTone(props: Pick<CaptureResultSheetProps, 'status' | 'result'>): Tone {
  if (props.status !== 'ok' || !props.result) return 'neutral';
  return props.result.valid ? 'positive' : 'negative';
}

// Branch resolution (single source of truth):
//   - confident: an item is known and the verdict is positive enough to commit
//   - ambiguous: we have item candidates but no confident pick
//   - chooseCollection: discover mode that didn't lock onto a collection
//   - noMatch: nothing usable; user manually picks, creates, or retakes
type Branch = 'confident' | 'ambiguous' | 'chooseCollection' | 'noMatch';

function resolveBranch(props: CaptureResultSheetProps): Branch {
  if (props.mode === 'verify') return 'confident';
  // Manual user resolution wins over the AI verdict — once they've picked or
  // created an item, treat it as confident even if Vision flagged the photo
  // as a low-confidence match.
  if (props.manuallyResolved && props.collection && props.item) return 'confident';
  if (props.collection && props.item && props.result?.valid) return 'confident';
  if (props.candidateItems.length > 0) return 'ambiguous';
  if (props.mode === 'discover' && !props.collection && props.candidateCollections.length > 0) {
    return 'chooseCollection';
  }
  return 'noMatch';
}

export function CaptureResultSheet(props: CaptureResultSheetProps): React.ReactElement {
  const branch = resolveBranch(props);
  if (branch === 'confident') return <VerifyBranch {...props} />;
  if (branch === 'ambiguous') return <AmbiguousBranch {...props} />;
  if (branch === 'chooseCollection') return <ChooseCollectionBranch {...props} />;
  return <NoMatchBranch {...props} />;
}

function VerifyBranch(props: CaptureResultSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const tone = deriveTone(props);
  const percent = props.result ? Math.round(props.result.confidence * 100) : null;

  const verdictTitle =
    tone === 'positive'
      ? t('validation.verifiedTitle')
      : tone === 'negative'
        ? t('validation.lowMatchTitle')
        : t('validation.couldNotVerifyTitle');

  const ctaLabel = tone === 'negative' ? t('validation.saveAnyway') : t('camera.saveToCollection');

  return (
    <View className="flex-1 bg-bg">
      <PhotoHeader
        photoUri={props.photoUri}
        verdictTitle={verdictTitle}
        verdictDetail={props.result?.detected ?? props.item?.name ?? ''}
        percent={percent}
        tone={tone}
        onClose={props.onClose}
      />
      <ScrollView contentContainerClassName="p-5 gap-4" keyboardShouldPersistTaps="handled">
        <SectionLabel>{t('camera.addToCollection')}</SectionLabel>
        {props.collection ? (
          <CollectionChip collection={props.collection} />
        ) : (
          <PlaceholderRow text={t('camera.collectionMissing')} />
        )}

        {props.item ? <ItemRow item={props.item} /> : null}

        {/* Even with a confident match, let the user override — they may
            disagree with the AI or want to file under a different item. */}
        {props.onPickManually ? (
          <Pressable
            onPress={props.onPickManually}
            accessibilityRole="button"
            className="self-start px-3 py-2 rounded-full bg-surface-hi border border-stroke">
            <Text className="text-text-dim text-xs">{t('validation.changeItem')}</Text>
          </Pressable>
        ) : null}

        <LocationRow location={props.location} />

        <NoteInput value={props.note} onChange={props.onNoteChange} />

        <XpPreview xp={XP_PER_FIND} />

        {props.result?.suggestion ? (
          <Text className="text-text-dim text-xs">{props.result.suggestion}</Text>
        ) : null}

        <View className="flex-row gap-3">
          <Pressable
            onPress={props.onRetake}
            accessibilityRole="button"
            className="flex-1 bg-surface-hi rounded-md p-4 items-center border border-stroke">
            <Text className="text-text font-semibold">{t('camera.retake')}</Text>
          </Pressable>
          <Pressable
            onPress={props.onSave}
            accessibilityRole="button"
            className="flex-1 bg-gold rounded-md p-4 items-center">
            <Text className="text-on-gold font-semibold">{ctaLabel}</Text>
          </Pressable>
        </View>

        <Text className="text-text-muted text-[11px] text-center">
          {t('validation.advisoryNote')}
        </Text>
      </ScrollView>
    </View>
  );
}

interface PhotoHeaderProps {
  photoUri: string;
  verdictTitle: string;
  verdictDetail: string;
  percent: number | null;
  tone: Tone;
  onClose: () => void;
}

function PhotoHeader({
  photoUri,
  verdictTitle,
  verdictDetail,
  percent,
  tone,
  onClose,
}: PhotoHeaderProps): React.ReactElement {
  const { t } = useTranslation();
  const borderClass =
    tone === 'positive' ? 'border-gold' : tone === 'negative' ? 'border-coral' : 'border-stroke-hi';
  const accentClass =
    tone === 'positive' ? 'text-gold' : tone === 'negative' ? 'text-coral' : 'text-text-dim';

  return (
    <View className="relative" style={{ height: 340 }}>
      <ExpoImage
        source={{ uri: photoUri }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        recyclingKey={photoUri}
      />
      <RNSafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
        <GoBackButton icon="close" onPress={onClose}>
          <Text className="text-text font-semibold">{t('camera.captureTitle')}</Text>
        </GoBackButton>
      </RNSafeAreaView>
      <View
        className={`absolute left-4 right-4 bottom-4 rounded-lg border ${borderClass} bg-overlay-hi p-3 gap-1`}>
        <Text className={`text-[11px] font-bold uppercase tracking-wider ${accentClass}`}>
          {percent !== null ? t('validation.matchPercent', { percent }) : verdictTitle}
        </Text>
        <Text className="text-text text-base font-semibold" numberOfLines={1}>
          {verdictDetail || verdictTitle}
        </Text>
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <Text className="text-text-dim text-[11px] font-bold uppercase tracking-wider">{children}</Text>
  );
}

function PlaceholderRow({ text }: { text: string }): React.ReactElement {
  return (
    <View className="px-4 py-3 rounded-md bg-surface border border-stroke">
      <Text className="text-text-dim text-sm">{text}</Text>
    </View>
  );
}

interface CollectionChipProps {
  collection: { id: string; title: string; icon: string | null };
}

function CollectionChip({ collection }: CollectionChipProps): React.ReactElement {
  return (
    <View className="flex-row items-center gap-3 px-3 py-3 rounded-md bg-surface border border-stroke">
      <View className="w-9 h-9 rounded-md bg-surface-hi items-center justify-center">
        <Text className="text-base">{collection.icon ?? '📚'}</Text>
      </View>
      <Text className="text-text text-sm font-semibold flex-1" numberOfLines={1}>
        {collection.title}
      </Text>
    </View>
  );
}

interface ItemRowProps {
  item: { id: string; name: string; rarity: 'common' | 'uncommon' | 'rare' };
}

function ItemRow({ item }: ItemRowProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-3 px-3 py-3 rounded-md bg-surface-lo border border-stroke">
      <Text className="text-text text-sm font-semibold flex-1" numberOfLines={1}>
        {item.name}
      </Text>
      <View className="px-2 py-0.5 rounded-full bg-surface-hi">
        <Text className="text-[10px] font-bold text-text-dim uppercase">
          {t(`collections.rarity.${item.rarity}`)}
        </Text>
      </View>
    </View>
  );
}

function LocationRow({
  location,
}: {
  location: { lat: number; lng: number } | null;
}): React.ReactElement {
  const { t } = useTranslation();
  const label = location
    ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
    : t('camera.locationUnknown');
  return (
    <View className="flex-row items-center gap-3 px-3 py-3 rounded-md bg-surface border border-stroke">
      <Text className="text-base">📍</Text>
      <View className="flex-1">
        <Text className="text-text text-sm font-semibold">{label}</Text>
        <Text className="text-text-dim text-[11px]">
          {location ? t('camera.locationFromPhoto') : t('camera.locationOptional')}
        </Text>
      </View>
    </View>
  );
}

interface NoteInputProps {
  value: string;
  onChange: (next: string) => void;
}

function NoteInput({ value, onChange }: NoteInputProps): React.ReactElement {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View className="px-3 py-3 rounded-md bg-surface border border-stroke">
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={t('camera.notePlaceholder')}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={200}
        className="text-text text-sm"
      />
    </View>
  );
}

function XpPreview({ xp }: { xp: number }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-3 px-3 py-3 rounded-md bg-gold-glow border border-stroke">
      <Text className="text-base">⚡</Text>
      <Text className="text-text text-sm flex-1">
        <Text className="text-gold font-bold">{t('camera.xpPreview', { xp })}</Text>{' '}
        {t('camera.xpPreviewSuffix')}
      </Text>
    </View>
  );
}

// Ambiguous: the AI returned candidate items but none confident enough to
// auto-pick. User picks one (commits via onPickItem) or falls through to
// no-match by tapping "None of these".
function AmbiguousBranch(props: CaptureResultSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const verdictTitle = t('validation.ambiguousTitle');
  return (
    <View className="flex-1 bg-bg">
      <PhotoHeader
        photoUri={props.photoUri}
        verdictTitle={verdictTitle}
        verdictDetail={props.result?.detected ?? ''}
        percent={null}
        tone="neutral"
        onClose={props.onClose}
      />
      <ScrollView contentContainerClassName="p-5 gap-4" keyboardShouldPersistTaps="handled">
        <SectionLabel>{t('validation.candidatesTitle')}</SectionLabel>
        {props.candidateItems.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => props.onPickItem?.(c.id)}
            accessibilityRole="button"
            className="flex-row items-center gap-3 px-3 py-3 rounded-md bg-surface border border-stroke">
            <Text className="text-text text-sm font-semibold flex-1" numberOfLines={1}>
              {c.name}
            </Text>
            <Text className="text-gold text-xs font-bold">{Math.round(c.confidence * 100)}%</Text>
          </Pressable>
        ))}

        <Pressable
          onPress={props.onPickManually}
          accessibilityRole="button"
          className="px-3 py-3 rounded-md bg-surface-hi border border-stroke items-center">
          <Text className="text-text text-sm font-semibold">{t('validation.noneOfThese')}</Text>
        </Pressable>

        <Pressable
          onPress={props.onRetake}
          accessibilityRole="button"
          className="px-3 py-3 rounded-md bg-surface-lo border border-stroke items-center">
          <Text className="text-text text-sm">{t('camera.retake')}</Text>
        </Pressable>

        <Text className="text-text-muted text-[11px] text-center">
          {t('validation.advisoryNote')}
        </Text>
      </ScrollView>
    </View>
  );
}

// Discover with no confident collection lock — show top-3 candidate
// collections so the user can pick which one this find belongs to. Picking
// one re-runs validation in match-in-collection mode (handled by the parent
// via onPickCollection).
function ChooseCollectionBranch(props: CaptureResultSheetProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-bg">
      <PhotoHeader
        photoUri={props.photoUri}
        verdictTitle={t('validation.chooseCollectionTitle')}
        verdictDetail={props.result?.detected ?? ''}
        percent={null}
        tone="neutral"
        onClose={props.onClose}
      />
      <ScrollView contentContainerClassName="p-5 gap-4" keyboardShouldPersistTaps="handled">
        <SectionLabel>{t('validation.collectionCandidatesTitle')}</SectionLabel>
        {props.candidateCollections.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => props.onPickCollection?.(c.id)}
            accessibilityRole="button"
            className="flex-row items-center gap-3 px-3 py-3 rounded-md bg-surface border border-stroke">
            <Text className="text-base">📚</Text>
            <Text className="text-text text-sm font-semibold flex-1" numberOfLines={1}>
              {c.name}
            </Text>
            <Text className="text-gold text-xs font-bold">{Math.round(c.confidence * 100)}%</Text>
          </Pressable>
        ))}

        <Pressable
          onPress={props.onPickManually}
          accessibilityRole="button"
          className="px-3 py-3 rounded-md bg-surface-hi border border-stroke items-center">
          <Text className="text-text text-sm font-semibold">{t('validation.pickManually')}</Text>
        </Pressable>

        <Pressable
          onPress={props.onRetake}
          accessibilityRole="button"
          className="px-3 py-3 rounded-md bg-surface-lo border border-stroke items-center">
          <Text className="text-text text-sm">{t('camera.retake')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// No usable AI signal — give the user the three escape hatches: drill down
// manually, create a new item in a collection they're saving to, or retake.
function NoMatchBranch(props: CaptureResultSheetProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-bg">
      <PhotoHeader
        photoUri={props.photoUri}
        verdictTitle={t('validation.noMatchTitle')}
        verdictDetail={props.result?.detected ?? ''}
        percent={null}
        tone="neutral"
        onClose={props.onClose}
      />
      <ScrollView contentContainerClassName="p-5 gap-4" keyboardShouldPersistTaps="handled">
        <Text className="text-text-dim text-sm">{t('validation.noMatchHint')}</Text>

        <Pressable
          onPress={props.onPickManually}
          accessibilityRole="button"
          className="px-4 py-4 rounded-md bg-surface border border-stroke">
          <Text className="text-text font-semibold">{t('validation.pickManually')}</Text>
          <Text className="text-text-dim text-xs mt-1">{t('validation.pickManuallyHint')}</Text>
        </Pressable>

        {props.onCreateItem ? (
          <Pressable
            onPress={props.onCreateItem}
            accessibilityRole="button"
            className="px-4 py-4 rounded-md bg-gold-glow border border-gold">
            <Text className="text-text font-semibold">{t('validation.createNewItem')}</Text>
            <Text className="text-text-dim text-xs mt-1">{t('validation.createNewItemHint')}</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={props.onRetake}
          accessibilityRole="button"
          className="px-4 py-4 rounded-md bg-surface-lo border border-stroke">
          <Text className="text-text font-semibold">{t('camera.retake')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
