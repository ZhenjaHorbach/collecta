import { Button } from '@components/Button';
import { GoBackButton } from '@components/GoBackButton';
import { Input } from '@components/Input';
import { SafeAreaView } from '@components/SafeAreaView';
import { signInWithEmail, signInWithGoogle } from '@services/auth.service';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, View } from 'react-native';

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
      Alert.alert(
        t('auth.signIn.errorTitle'),
        err instanceof Error ? err.message : t('common.unknownError')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert(
        t('auth.signIn.googleErrorTitle'),
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
        <Text className="text-3xl font-bold text-text mb-2">{t('auth.signIn.title')}</Text>
        <Text className="text-text-dim text-sm mb-8">{t('auth.signIn.subtitle')}</Text>

        <View className="gap-3 mb-4">
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.signIn.emailPlaceholder')}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.signIn.passwordPlaceholder')}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        <Button
          label={t('auth.signIn.submit')}
          onPress={onSignIn}
          loading={submitting}
          className="mb-3"
        />

        <View className="flex-row items-center my-4 gap-3">
          <View className="flex-1 h-px bg-stroke" />
          <Text className="text-text-muted text-xs">{t('common.or')}</Text>
          <View className="flex-1 h-px bg-stroke" />
        </View>

        <Button
          label={t('auth.signIn.continueWithGoogle')}
          variant="secondary"
          onPress={onGoogle}
          disabled={submitting}
        />
      </View>
    </SafeAreaView>
  );
}
