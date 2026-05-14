import { StyleSheet, Text } from 'react-native';
import { C } from '../lib/theme';

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'PUBLISHED' ? C.SUCCESS
    : status === 'ARCHIVED' ? C.WARNING
    : C.TEXT_SEC;

  return (
    <Text style={[styles.badge, { color, borderColor: color, backgroundColor: `${color}22` }]}>
      {status}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
});
