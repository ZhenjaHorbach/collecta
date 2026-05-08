import { Modal, Pressable, View } from 'react-native';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Override the inner panel className for cases that need bg-bg, max-h, or
  // different padding than the default surface treatment.
  contentClassName?: string;
  showHandle?: boolean;
}

const DEFAULT_CONTENT_CLASSNAME = 'bg-surface rounded-t-xl border-t border-stroke pt-3 px-4 pb-9';

export function BottomSheet({
  visible,
  onClose,
  children,
  contentClassName = DEFAULT_CONTENT_CLASSNAME,
  showHandle = true,
}: BottomSheetProps): React.ReactElement {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        testID="bottom-sheet-backdrop"
        className="flex-1 bg-overlay justify-end"
        onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className={contentClassName}>
          {showHandle ? (
            <View className="self-center w-9 h-1 rounded-full bg-stroke-hi mb-4" />
          ) : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
