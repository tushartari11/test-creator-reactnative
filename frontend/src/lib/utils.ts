import { Alert, Platform } from 'react-native';

type AlertButton = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };

/**
 * Cross-platform replacement for Alert.alert — React Native Web's Alert.alert
 * silently does nothing in the browser, so confirmation dialogs never fire there.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  const cancelButton = buttons?.find(b => b.style === 'cancel');
  const actionButton = buttons?.find(b => b.style !== 'cancel');

  if (cancelButton) {
    if (window.confirm(text)) actionButton?.onPress?.();
    else cancelButton.onPress?.();
  } else {
    window.alert(text);
    actionButton?.onPress?.();
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}
