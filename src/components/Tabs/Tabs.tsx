import { Text, TouchableOpacity, View } from 'react-native';

export interface TabOption<T extends string> {
  key: T;
  label: string;
}

export interface TabsProps<T extends string> {
  options: readonly TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  // Prefix for per-tab testID. Reused across screens (Collections has
  // discover/mine/pickedUp; Profile uses similar tabs in the future), so
  // the prefix disambiguates. Optional — when omitted no testID is emitted.
  testIDPrefix?: string;
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className,
  testIDPrefix,
}: TabsProps<T>) {
  return (
    <View
      className={`flex-row gap-1 p-1 bg-surface rounded-full border border-stroke ${className ?? ''}`}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={option.key}
            testID={testIDPrefix ? `${testIDPrefix}-${option.key}` : undefined}
            onPress={() => onChange(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`flex-1 py-2 rounded-full items-center ${active ? 'bg-gold' : ''}`}>
            <Text className={`text-sm font-semibold ${active ? 'text-on-gold' : 'text-text-dim'}`}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
