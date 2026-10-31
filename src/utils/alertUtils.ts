import { Alert, Platform } from 'react-native';

/**
 * Cross-platform action confirmation dialog.
 * On React Native Web, react-native-web's Alert.alert() is a no-op that silently ignores button callbacks.
 * This utility uses window.confirm() on Web and native Alert.alert() with buttons on iOS/Android.
 */
export async function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmLabel: string = 'Confirm'
): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const ok = window.confirm(`${title}\n\n${message}`);
    if (ok) {
      await onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmLabel, onPress: onConfirm },
    ]);
  }
}

/**
 * Cross-platform notification message.
 */
export function notify(title: string, message: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

