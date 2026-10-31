import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminStore, WaterCertificateItem } from '../../../stores/adminStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

export const AdminWaterSafetyView: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = true }) => {
  const { waterCertificates, suspendWaterCertificate } = useAdminStore();
  const [suspendingId, setSuspendingId] = useState<string | null>(null);

  const handleSuspend = (cert: WaterCertificateItem) => {
    Alert.alert(
      'Emergency Water Quality Action',
      `Suspend certificate ${cert.test_report_number} issued by ${cert.lab_name}? Tankers linked to this water source will be immediately taken offline.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend Source',
          style: 'destructive',
          onPress: async () => {
            setSuspendingId(cert.id);
            const success = await suspendWaterCertificate(cert.id, 'TDS threshold or potability audit violation');
            setSuspendingId(null);
            if (success) {
              Alert.alert('Source Suspended', 'The water source certificate has been marked non-potable and suspended.');
            }
          },
        },
      ]
    );
  };

  const getTdsStatus = (tds: number) => {
    if (tds <= 150) return { label: 'OPTIMAL POTABLE', color: '#16A34A', bg: '#DCFCE7' };
    if (tds <= 250) return { label: 'ACCEPTABLE (BIS-10500)', color: '#0284C7', bg: '#E0F2FE' };
    return { label: 'CRITICAL / PURITY ALERT', color: '#DC2626', bg: '#FEE2E2' };
  };

  return (
    <View style={styles.container}>
      {/* Safety Compliance Overview Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIconWrap}>
          <Ionicons name="shield-checkmark" size={22} color="#0284C7" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.bannerTitle}>Water Purity & Compliance Audit Desk</Text>
            <View style={styles.bisBadge}>
              <Text style={styles.bisBadgeText}>BIS-10500 & BWSSB ENFORCED</Text>
            </View>
          </View>
          <Text style={styles.bannerSub}>
            Automated sensor surveillance tracking TDS (PPM), pH balances, microbial coliform screenings, and lab certificates.
          </Text>
        </View>
      </View>

      {/* Safety Standard KPI Counters */}
      <View style={styles.standardsRow}>
        <View style={styles.standardCard}>
          <Text style={styles.standardLabel}>MAX POTABLE TDS LIMIT</Text>
          <Text style={styles.standardValue}>250 ppm</Text>
          <Text style={styles.standardSub}>Auto-lockout if exceeded</Text>
        </View>
        <View style={styles.standardCard}>
          <Text style={styles.standardLabel}>PERMISSIBLE PH RANGE</Text>
          <Text style={styles.standardValue}>6.5 – 8.5</Text>
          <Text style={styles.standardSub}>Alkaline neutral potable range</Text>
        </View>
        <View style={styles.standardCard}>
          <Text style={styles.standardLabel}>MAX TURBIDITY</Text>
          <Text style={styles.standardValue}>&lt; 5.0 NTU</Text>
          <Text style={styles.standardSub}>Optical clarity standard</Text>
        </View>
        <View style={styles.standardCard}>
          <Text style={styles.standardLabel}>COLIFORM BACTERIA</Text>
          <Text style={[styles.standardValue, { color: '#16A34A' }]}>0 / ZERO</Text>
          <Text style={styles.standardSub}>Zero tolerance microbiological</Text>
        </View>
      </View>

      {/* Water Quality Certificates Grid */}
      <View style={styles.certsContainer}>
        <View style={styles.certsHeader}>
          <Text style={styles.certsTitle}>Active Source Certificates & Lab Reports</Text>
          <Text style={styles.certsSub}>{waterCertificates.length} verified water source nodes</Text>
        </View>

        {waterCertificates.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Certificates on File</Text>
            <Text style={styles.emptySub}>Supplier laboratory tests will appear here once submitted.</Text>
          </View>
        ) : (
          <View style={styles.certsGrid}>
            {waterCertificates.map((cert) => {
              const tds = getTdsStatus(cert.tds_ppm);
              const isSuspending = suspendingId === cert.id;

              return (
                <View key={cert.id} style={styles.certCard}>
                  {/* Top Bar with Lab & Report Number */}
                  <View style={styles.certTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sourceType}>{cert.source_type}</Text>
                      <Text style={styles.labName}>{cert.lab_name}</Text>
                      <Text style={styles.reportNo}>Report #{cert.test_report_number}</Text>
                    </View>
                    <View
                      style={[
                        styles.potableTag,
                        cert.is_potable
                          ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }
                          : { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
                      ]}
                    >
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: cert.is_potable ? '#16A34A' : '#DC2626' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.potableTagText,
                          { color: cert.is_potable ? '#16A34A' : '#DC2626' },
                        ]}
                      >
                        {cert.is_potable ? 'CERTIFIED POTABLE' : 'SUSPENDED'}
                      </Text>
                    </View>
                  </View>

                  {/* Sensor Reading Meters */}
                  <View style={styles.readingsRow}>
                    {/* TDS */}
                    <View style={styles.readingBox}>
                      <Text style={styles.readingLabel}>TDS LEVEL</Text>
                      <Text style={[styles.readingValue, { color: tds.color }]}>
                        {cert.tds_ppm} <Text style={{ fontSize: 11 }}>ppm</Text>
                      </Text>
                      <View style={[styles.readingBadge, { backgroundColor: tds.bg }]}>
                        <Text style={[styles.readingBadgeText, { color: tds.color }]}>{tds.label}</Text>
                      </View>
                    </View>

                    {/* pH */}
                    <View style={styles.readingBox}>
                      <Text style={styles.readingLabel}>PH BALANCE</Text>
                      <Text style={styles.readingValue}>{cert.ph_level.toFixed(1)}</Text>
                      <Text style={styles.readingSub}>Neutral Drinking</Text>
                    </View>

                    {/* Turbidity */}
                    <View style={styles.readingBox}>
                      <Text style={styles.readingLabel}>TURBIDITY</Text>
                      <Text style={styles.readingValue}>{cert.turbidity_ntu.toFixed(1)} NTU</Text>
                      <Text style={styles.readingSub}>Clear & Filtered</Text>
                    </View>

                    {/* Coliform */}
                    <View style={styles.readingBox}>
                      <Text style={styles.readingLabel}>MICROBIAL</Text>
                      <Text style={[styles.readingValue, { color: cert.coliform_detected ? '#DC2626' : '#16A34A' }]}>
                        {cert.coliform_detected ? 'DETECTED' : 'CLEAR'}
                      </Text>
                      <Text style={styles.readingSub}>E. coli negative</Text>
                    </View>
                  </View>

                  {/* Validity & Action Footer */}
                  <View style={styles.certFooter}>
                    <View style={styles.datesRow}>
                      <Ionicons name="calendar-outline" size={13} color="#64748B" />
                      <Text style={styles.dateText}>
                        Certified: {cert.certified_date} • Expires: {cert.expiry_date}
                      </Text>
                    </View>

                    {cert.is_potable && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Suspend Certificate"
                        disabled={isSuspending}
                        onPress={() => handleSuspend(cert)}
                        style={[styles.suspendBtn, isSuspending && { opacity: 0.6 }]}
                      >
                        {isSuspending ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <>
                            <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                            <Text style={styles.suspendBtnText}>SUSPEND SOURCE</Text>
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  banner: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0369A1',
  },
  bannerSub: {
    fontSize: 12,
    color: '#0284C7',
    marginTop: 2,
    lineHeight: 18,
  },
  bisBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  bisBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  standardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  standardCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: 4,
    ...shadows.card,
  },
  standardLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
  },
  standardValue: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  standardSub: {
    fontSize: 11,
    color: '#64748B',
  },
  certsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    ...shadows.card,
  },
  certsHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  certsTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  certsSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  certsGrid: {
    gap: 12,
    marginTop: 12,
  },
  certCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  certTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  sourceType: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  labName: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  reportNo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  potableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  potableTagText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
  },
  readingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  readingBox: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 2,
  },
  readingLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#64748B',
  },
  readingValue: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  readingBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  readingBadgeText: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
  },
  readingSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  certFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  suspendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  suspendBtnText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#DC2626',
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#475569',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
