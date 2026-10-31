import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, fontWeights, spacing } from '../../../theme';

export interface WaterQualityProps {
  sourceType?: string;
  tdsPpm?: number;
  phLevel?: number;
  labName?: string;
  testedDate?: string;
  isPotable?: boolean;
}

export const WaterQualityBadge: React.FC<WaterQualityProps> = ({
  sourceType = 'Certified Deep Borewell',
  tdsPpm = 185,
  phLevel = 7.2,
  labName = 'Envirocare Laboratories Mumbai (NABL Accredited)',
  testedDate = '14 Oct 2026',
  isPotable = true,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.badgeHeader}>
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
          <Text style={styles.badgeTitle}>NABL Lab Certified Potable</Text>
        </View>
        <Text style={styles.testedDate}>Valid till Jan 2027</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>TDS LEVEL</Text>
          <Text style={styles.metricValue}>{tdsPpm} PPM</Text>
          <Text style={styles.metricSub}>Optimal (50-300)</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>pH VALUE</Text>
          <Text style={styles.metricValue}>{phLevel}</Text>
          <Text style={styles.metricSub}>Balanced Alkaline</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>SOURCE</Text>
          <Text style={styles.metricValue} numberOfLines={1}>Borewell</Text>
          <Text style={styles.metricSub}>Depth 650 ft</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#166534',
  },
  testedDate: {
    fontSize: 11,
    color: '#15803D',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#15803D',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#14532D',
    marginTop: 1,
  },
  metricSub: {
    fontSize: 9,
    color: '#166534',
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#BBF7D0',
  },
});
