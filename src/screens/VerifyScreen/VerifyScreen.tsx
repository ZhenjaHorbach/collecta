import { Button } from '@components/Button';
import { GoBackButton } from '@components/GoBackButton';
import { Input } from '@components/Input';
import { SafeAreaView } from '@components/SafeAreaView';
import { verifyEmailOtp } from '@services/auth.service';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

export function VerifyScreen() {
  const router = useRouter();
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
      Alert.alert('Verification failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView>
      <GoBackButton />
      <View className="flex-1 px-6 pt-2">
        <Text className="text-3xl font-bold text-text mb-2">Check your email</Text>
        <Text className="text-text-dim text-sm mb-8">
          We sent an 8-digit code to {params.email ?? 'your email'}.
        </Text>

        <Input
          value={token}
          onChangeText={setToken}
          placeholder="8-digit code"
          keyboardType="number-pad"
          maxLength={8}
          className="text-center tracking-[8px] text-lg mb-4"
        />

        <Button
          label="Verify"
          onPress={onVerify}
          loading={submitting}
          disabled={token.length < 8}
        />
      </View>
    </SafeAreaView>
  );
}
