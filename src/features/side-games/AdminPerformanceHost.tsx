import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RoundAdminWidget } from '@/features/admin/RoundAdminWidget';
import { colors } from '@/theme';

import {
  AdminPerformanceScrubber,
  type AdminPerformanceView,
} from './AdminPerformanceScrubber';
import { SideGamesAdminWidget } from './SideGamesAdminWidget';

/**
 * Leaders admin mode: Round ↔ Side games scrubber, then the matching widget.
 */
export function AdminPerformanceHost() {
  const [view, setView] = useState<AdminPerformanceView>('round');

  return (
    <View style={styles.root}>
      <View style={styles.scrubberWrap}>
        <AdminPerformanceScrubber mode={view} onChange={setView} />
      </View>
      {view === 'round' ? <RoundAdminWidget /> : <SideGamesAdminWidget />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrubberWrap: {
    paddingHorizontal: '3%',
    marginBottom: 4,
  },
});
