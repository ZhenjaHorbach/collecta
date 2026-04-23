import { Button } from '@components/Button';
import { GoBackButton } from '@components/GoBackButton';
import { Input } from '@components/Input';
import { SafeAreaView } from '@components/SafeAreaView';
import { verifyEmailOtp } from '@services/auth.service';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, View } from 'react-native';

export function VerifyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ email?: string }>();
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onVerify = async () => {
    if (!params.email || !token) return;
    setSubmitting(true);
    try {
      await verifyEmailOtp(params.email, token.trim());
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert(
        t('auth.verify.errorTitle'),
        err instanceof Error ? err.message : t('common.unknownError')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView>
      <GoBackButton />
      <View className="flex-1 px-6 pt-2">
        <Text className="text-3xl font-bold text-text mb-2">{t('auth.verify.title')}</Text>
        <Text className="text-text-dim text-sm mb-8">
          {t('auth.verify.subtitle', { email: params.email ?? t('auth.verify.fallbackEmail') })}
        </Text>

        <Input
          value={token}
          onChangeText={setToken}
          placeholder={t('auth.verify.codePlaceholder')}
          keyboardType="number-pad"
          maxLength={8}
          className="text-center tracking-[8px] text-lg mb-4"
        />

        <Button
          label={t('auth.verify.submit')}
          onPress={onVerify}
          loading={submitting}
          disabled={token.length < 8}
        />
      </View>
    </SafeAreaView>
  );
}
