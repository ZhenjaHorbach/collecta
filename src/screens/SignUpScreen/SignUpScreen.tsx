import { Button } from '@components/Button';
import { notify } from '@components/ConfirmDialog';
import { GoBackButton } from '@components/GoBackButton';
import { Input } from '@components/Input';
import { SafeAreaView } from '@components/SafeAreaView';
import { WebForm } from '@components/WebForm';
import { signUpWithEmail } from '@services/auth.service';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export function SignUpScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSignUp = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      const { session } = await signUpWithEmail(trimmedEmail, password);
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace(`/auth/verify?email=${encodeURIComponent(trimmedEmail)}` as Href);
      }
    } catch (err) {
      void notify({
        title: t('auth.signUp.errorTitle'),
        body: err instanceof Error ? err.message : t('common.unknownError'),
        buttonLabel: t('common.close'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView>
      <GoBackButton />
      <View testID="signup-screen" className="flex-1 px-6 pt-2">
        <Text className="text-3xl font-bold text-text mb-2">{t('auth.signUp.title')}</Text>
        <Text className="text-text-dim text-sm mb-8">{t('auth.signUp.subtitle')}</Text>

        <WebForm onSubmit={onSignUp}>
          <View className="gap-3 mb-4">
            <Input
              testID="signup-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.signUp.emailPlaceholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              testID="signup-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.signUp.passwordPlaceholder')}
              secureTextEntry
              autoComplete="password-new"
            />
          </View>

          <Button
            testID="signup-submit-button"
            label={t('auth.signUp.submit')}
            onPress={onSignUp}
            loading={submitting}
          />
        </WebForm>
      </View>
    </SafeAreaView>
  );
}
