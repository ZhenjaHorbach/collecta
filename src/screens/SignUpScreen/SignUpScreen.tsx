import { Button } from '@components/Button';
import { GoBackButton } from '@components/GoBackButton';
import { Input } from '@components/Input';
import { SafeAreaView } from '@components/SafeAreaView';
import { signInWithGoogle, signUpWithEmail } from '@services/auth.service';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

export function SignUpScreen() {
  const router = useRouter();
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
      Alert.alert('Sign up failed', err instanceof Error ? err.message : 'Unknown error');
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
      Alert.alert('Google sign in failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView>
      <GoBackButton />
      <View className="flex-1 px-6 pt-2">
        <Text className="text-3xl font-bold text-text mb-2">Create account</Text>
        <Text className="text-text-dim text-sm mb-8">
          Start your first collection in under a minute.
        </Text>

        <View className="gap-3 mb-4">
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Password (min 6 characters)"
            secureTextEntry
            autoComplete="password-new"
          />
        </View>

        <Button label="Sign up" onPress={onSignUp} loading={submitting} className="mb-3" />

        <View className="flex-row items-center my-4 gap-3">
          <View className="flex-1 h-px bg-stroke" />
          <Text className="text-text-muted text-xs">or</Text>
          <View className="flex-1 h-px bg-stroke" />
        </View>

        <Button
          label="Continue with Google"
          variant="secondary"
          onPress={onGoogle}
          disabled={submitting}
        />
      </View>
    </SafeAreaView>
  );
}
