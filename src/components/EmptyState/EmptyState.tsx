import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, subtitle, icon, action, className }: EmptyStateProps) {
  return (
    <View className={`items-center justify-center px-6 py-20 ${className ?? ''}`}>
      {icon ? <Text className="text-5xl mb-3">{icon}</Text> : null}
      <Text className="text-base text-text-dim text-center font-semibold">{title}</Text>
      {subtitle ? (
        <Text className="text-sm text-text-muted text-center mt-1 leading-snug">{subtitle}</Text>
      ) : null}
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
