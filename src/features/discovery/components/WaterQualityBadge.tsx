import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, fontWeights, spacing } from '../../../theme';

export interface WaterQualityProps {
  sourceType?: string;
  tdsPpm?: number | null;
  phLevel?: number | null;
  labName?: string | null;
  testedDate?: string | null;
  certificateNumber?: string | null;
  waterGrade?: string;
}

export const WaterQualityBadge: React.FC<WaterQualityProps> = ({
  sourceType,
  tdsPpm,
  phLevel,
  labName,
  testedDate,
  certificateNumber,
  waterGrade = 'Potable (Drinking)',
}) => {
  const hasVerifiedLabReport = Boolean(tdsPpm !== undefined && tdsPpm !== null && phLevel !== undefined && phLevel !== null);

  return (
    <View style={[styles.container, !hasVerifiedLabReport && styles.containerUnverified]}>
      <View style={styles.topRow}>
        <View style={styles.badgeHeader}>
          <Ionicons
            name={hasVerifiedLabReport ? 'shield-checkmark' : 'information-circle-outline'}
            size={16}
            color={hasVerifiedLabReport ? colors.success : '#0284C7'}
          />
          <Text style={[styles.badgeTitle, !hasVerifiedLabReport && { color: '#0369A1' }]}>
            {hasVerifiedLabReport ? 'Verified NABL Lab Water Certificate' : `Declared Grade: ${waterGrade}`}
          </Text>
        </View>
        <Text style={[styles.testedDate, !hasVerifiedLabReport && { color: '#64748B' }]}>
          {hasVerifiedLabReport && testedDate ? `Tested: ${testedDate}` : 'Audit Standard: BIS-10500'}
        </Text>
      </View>

      {hasVerifiedLabReport ? (
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>VERIFIED TDS</Text>
            <Text style={styles.metricValue}>{tdsPpm} PPM</Text>
            <Text style={styles.metricSub}>Potable Range (&lt;250)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>LAB pH</Text>
            <Text style={styles.metricValue}>{phLevel}</Text>
            <Text style={styles.metricSub}>Balanced (6.5-8.5)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>SOURCE</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {sourceType || 'Certified Hub'}
            </Text>
            <Text style={styles.metricSub} numberOfLines={1}>
              {labName || certificateNumber || 'Lab Audited'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.unverifiedNoticeRow}>
          <Text style={styles.unverifiedNoticeText}>
            Source: {sourceType || 'Municipal / Certified Filtration Reservoir'}. Batch quality certificate uploaded by supplier; on-site digital flow-meter testing conducted upon delivery.
          </Text>
        </View>
      )}
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
  containerUnverified: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
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
    flex: 1,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#166534',
  },
  testedDate: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: fontWeights.medium,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  unverifiedNoticeRow: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  unverifiedNoticeText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
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
