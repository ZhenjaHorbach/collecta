import { View } from 'react-native';

export interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View className={`h-2 rounded-md bg-surface-hi overflow-hidden ${className ?? ''}`}>
      <View className="h-full bg-gold rounded-md" style={{ width: `${clamped * 100}%` }} />
    </View>
  );
}
