import { Colors } from '@constants/colors';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';

type Variant = 'primary' | 'secondary';

export type ButtonProps = Omit<TouchableOpacityProps, 'children'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

const containerByVariant: Record<Variant, string> = {
  primary: 'bg-gold',
  secondary: 'border border-stroke-hi',
};

const labelByVariant: Record<Variant, string> = {
  primary: 'text-on-gold font-bold text-base',
  secondary: 'text-text font-semibold text-base',
};

const spinnerColorByVariant: Record<Variant, string> = {
  primary: Colors.onGold,
  secondary: Colors.text,
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      disabled={disabled || loading}
      className={`w-full py-4 rounded-full items-center active:opacity-75 disabled:opacity-50 ${containerByVariant[variant]} ${className ?? ''}`}
      {...props}>
      {loading ? (
        <ActivityIndicator color={spinnerColorByVariant[variant]} />
      ) : (
        <Text className={labelByVariant[variant]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
