import { useColors } from '@hooks/useColors';
import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

export type InputProps = TextInputProps;

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { className, placeholderTextColor, ...props },
  ref
) {
  const colors = useColors();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? colors.textMuted}
      className={`w-full px-4 py-4 rounded-md bg-surface border border-stroke text-text ${className ?? ''}`}
      {...props}
    />
  );
});
