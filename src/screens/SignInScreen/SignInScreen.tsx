import { Button } from '@components/Button';
import { notify } from '@components/ConfirmDialog';
import { GoBackButton } from '@components/GoBackButton';
import { Input } from '@components/Input';
import { SafeAreaView } from '@components/SafeAreaView';
import { WebForm } from '@components/WebForm';
import { signInWithEmail } from '@services/auth.service';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export function SignInScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSignIn = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      void notify({
        title: t('auth.signIn.errorTitle'),
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
      <View testID="signin-screen" className="flex-1 px-6 pt-2">
        <Text className="text-3xl font-bold text-text mb-2">{t('auth.signIn.title')}</Text>
        <Text className="text-text-dim text-sm mb-8">{t('auth.signIn.subtitle')}</Text>

        <WebForm onSubmit={onSignIn}>
          <View className="gap-3 mb-4">
            <Input
              testID="signin-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.signIn.emailPlaceholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              testID="signin-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.signIn.passwordPlaceholder')}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <Button
            testID="signin-submit-button"
            label={t('auth.signIn.submit')}
            onPress={onSignIn}
            loading={submitting}
          />
        </WebForm>
      </View>
    </SafeAreaView>
  );
}
