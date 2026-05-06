import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export interface ShareQrProps {
  value: string;
  size?: number;
  // Visual nesting around the QR. The colours below are deliberately fixed:
  // QR scanners assume high contrast, so the wrapper must stay white in both
  // light and dark themes. This is the one place in the codebase where the
  // styling.md hex/rgba rule is intentionally bypassed — keep the exception
  // contained here.
  padding?: number;
  borderRadius?: number;
}

export function ShareQr({
  value,
  size = 88,
  padding = 8,
  borderRadius = 12,
}: ShareQrProps): React.ReactElement {
  return (
    <View style={{ backgroundColor: '#fff', padding, borderRadius }}>
      <QRCode value={value} size={size} backgroundColor="#fff" color="#000" />
    </View>
  );
}
