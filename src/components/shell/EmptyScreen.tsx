import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
};

/** Placeholder body for empty tab / section screens. */
export function EmptyScreen({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
