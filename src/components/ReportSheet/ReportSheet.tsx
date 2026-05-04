import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@components/Button';
import { Input } from '@components/Input';
import type { ReportReason } from '@services/moderation.service';

const REASONS: readonly ReportReason[] = ['spam', 'inappropriate', 'offTopic', 'other'];

export interface ReportSheetProps {
  visible: boolean;
  submitting: boolean;
  onSubmit: (reason: ReportReason, comment: string) => void;
  onClose: () => void;
}

export function ReportSheet({ visible, submitting, onSubmit, onClose }: ReportSheetProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!visible) {
      setReason(null);
      setComment('');
    }
  }, [visible]);

  const onPressSubmit = () => {
    if (!reason || submitting) return;
    onSubmit(reason, comment);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-overlay justify-end" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface rounded-t-xl border-t border-stroke pt-3 px-4 pb-9">
          <View className="self-center w-9 h-1 rounded-full bg-stroke-hi mb-4" />
          <Text className="text-base font-bold text-text">{t('moderation.report.title')}</Text>
          <Text className="text-xs text-text-dim mt-1 leading-5">
            {t('moderation.report.subtitle')}
          </Text>

          <Text className="text-xs font-semibold text-text-dim mt-4 mb-2">
            {t('moderation.report.reasonLabel')}
          </Text>
          <View className="gap-2">
            {REASONS.map((r) => {
              const active = reason === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setReason(r)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`px-3 py-3 rounded-sm border ${active ? 'bg-gold border-gold' : 'bg-bg border-stroke'}`}>
                  <Text
                    className={`text-sm font-semibold ${active ? 'text-on-gold' : 'text-text'}`}>
                    {t(`moderation.report.reasons.${r}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="text-xs font-semibold text-text-dim mt-4 mb-2">
            {t('moderation.report.commentLabel')}
          </Text>
          <Input
            value={comment}
            onChangeText={setComment}
            placeholder={t('moderation.report.commentPlaceholder')}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="min-h-[72px]"
            editable={!submitting}
          />

          <View className="flex-row gap-2 mt-5">
            <View className="flex-1">
              <Button
                label={t('moderation.report.cancel')}
                variant="secondary"
                onPress={onClose}
                disabled={submitting}
              />
            </View>
            <View className="flex-[2]">
              <Button
                label={t('moderation.report.submit')}
                onPress={onPressSubmit}
                disabled={!reason}
                loading={submitting}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
