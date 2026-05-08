import { t } from 'i18next';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (reset: () => void, error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[error-boundary] caught', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset, error);
    return <DefaultFallback message={error.message} onRetry={this.reset} />;
  }
}

function DefaultFallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center bg-bg px-6">
      <Text className="text-5xl mb-4">⚠️</Text>
      <Text className="text-text text-lg font-bold text-center mb-2">{t('common.error')}</Text>
      <Text className="text-text-dim text-sm text-center mb-6 leading-snug">{message}</Text>
      <TouchableOpacity
        testID="error-boundary-retry-button"
        onPress={onRetry}
        accessibilityRole="button"
        className="px-6 py-3 rounded-full bg-gold">
        <Text className="text-on-gold font-bold text-base">{t('common.tryAgain')}</Text>
      </TouchableOpacity>
    </View>
  );
}
