import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface WaterQualityModalProps {
  visible: boolean;
  onClose: () => void;
}

const WATER_PARAMETERS = [
  {
    name: 'Total Dissolved Solids (TDS)',
    tested: '165 PPM',
    standard: '< 250 PPM (Potable)',
    status: 'OPTIMAL',
    statusColor: '#16A34A',
    desc: 'Low mineral concentration, soft drinking grade.',
  },
  {
    name: 'pH Level',
    tested: '7.2',
    standard: '6.5 – 8.5',
    status: 'NEUTRAL',
    statusColor: '#16A34A',
    desc: 'Perfect biological balance, non-corrosive.',
  },
  {
    name: 'Turbidity (Clarity)',
    tested: '0.8 NTU',
    standard: '< 1.0 NTU',
    status: 'CRYSTAL CLEAR',
    statusColor: '#16A34A',
    desc: 'Free of suspended particulates and silt.',
  },
  {
    name: 'Residual Free Chlorine',
    tested: '0.2 mg/L',
    standard: '0.2 – 0.5 mg/L',
    status: 'ACTIVE DISINFECTION',
    statusColor: '#0284C7',
    desc: 'Guarantees bacterial elimination in transit.',
  },
  {
    name: 'Total Hardness (CaCO3)',
    tested: '110 mg/L',
    standard: '< 200 mg/L',
    status: 'SOFT',
    statusColor: '#16A34A',
    desc: 'Prevents scaling in overhead sumps and pipelines.',
  },
  {
    name: 'E. Coli & Coliform Count',
    tested: '0 CFU / 100mL',
    standard: 'Zero (Undetected)',
    status: 'STERILE',
    statusColor: '#16A34A',
    desc: 'Microbiologically pure and safe for consumption.',
  },
];

export const WaterQualityModal: React.FC<WaterQualityModalProps> = ({
  visible,
  onClose,
}) => {
  const handleShareCertificate = async () => {
    try {
      await Share.share({
        title: 'TANKR BIS-10500 Potable Water Quality Certificate',
        message: `TANKR Official Water Quality Certificate\nStandard: BIS-10500:2012 Certified\nNABL Accreditation: TC-9281\nTDS: 165 PPM (Optimal Potable)\npH: 7.2 | Turbidity: 0.8 NTU | E.Coli: 0\nVerified by: TANKR Municipal Ops Center, Mumbai`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.darkNavy} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>BIS-10500 Water Quality</Text>
            <Text style={styles.headerSubtitle}>NABL Lab Certified • Standard BIS-10500:2012</Text>
          </View>
          <Pressable onPress={handleShareCertificate} style={styles.shareBtn}>
            <Ionicons name="share-social-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Certificate Badge Card */}
          <View style={styles.certHeroCard}>
            <View style={styles.certHeaderRow}>
              <View style={styles.badgeShield}>
                <Ionicons name="shield-checkmark" size={28} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.certHeroTitle}>Certified Potable Water</Text>
                <Text style={styles.certHeroSub}>
                  Accredited by National Accreditation Board for Testing and Calibration Laboratories (NABL ISO/IEC 17025)
                </Text>
              </View>
            </View>

            <View style={styles.certMetaRow}>
              <View style={styles.certMetaCol}>
                <Text style={styles.metaLabel}>AUDIT STANDARD</Text>
                <Text style={styles.metaValue}>BIS-10500:2012</Text>
              </View>
              <View style={styles.certMetaCol}>
                <Text style={styles.metaLabel}>NABL LAB CERT</Text>
                <Text style={styles.metaValue}>TC-9281-HYD</Text>
              </View>
              <View style={styles.certMetaCol}>
                <Text style={styles.metaLabel}>BATCH STATUS</Text>
                <Text style={[styles.metaValue, { color: '#16A34A' }]}>PASSED</Text>
              </View>
            </View>
          </View>

          {/* Tested Parameters Grid */}
          <Text style={styles.sectionTitle}>NABL LABORATORY TEST RESULTS</Text>
          <View style={styles.paramList}>
            {WATER_PARAMETERS.map((param, idx) => (
              <View
                key={param.name}
                style={[
                  styles.paramCard,
                  idx < WATER_PARAMETERS.length - 1 && styles.paramCardBorder,
                ]}
              >
                <View style={styles.paramTopRow}>
                  <Text style={styles.paramName}>{param.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#F0FDF4' }]}>
                    <Text style={[styles.statusBadgeText, { color: param.statusColor }]}>
                      {param.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.paramValuesRow}>
                  <View>
                    <Text style={styles.valueLabel}>TESTED VALUE</Text>
                    <Text style={styles.paramTested}>{param.tested}</Text>
                  </View>
                  <View>
                    <Text style={styles.valueLabel}>BIS LIMIT</Text>
                    <Text style={styles.paramStandard}>{param.standard}</Text>
                  </View>
                </View>

                <Text style={styles.paramDesc}>{param.desc}</Text>
              </View>
            ))}
          </View>

          {/* Fleet Hygiene Protocol */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
            TANKER HYGIENE & STERILIZATION LOG
          </Text>
          <View style={styles.hygieneCard}>
            <View style={styles.hygieneItem}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text style={styles.hygieneTitle}>Food-Grade SS-304 Stainless Steel Tanks</Text>
                <Text style={styles.hygieneSub}>
                  Zero rust, non-reactive interior liner preserving potable purity during transport.
                </Text>
              </View>
            </View>

            <View style={styles.hygieneItem}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text style={styles.hygieneTitle}>48-Hour Ozone High-Pressure Steam Flush</Text>
                <Text style={styles.hygieneSub}>
                  All fleet tankers undergo automated biological decontamination before daily deployment.
                </Text>
              </View>
            </View>

            <View style={styles.hygieneItem}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text style={styles.hygieneTitle}>Sealed Anti-Backflow Discharge Nozzles</Text>
                <Text style={styles.hygieneSub}>
                  Dust caps and backflow prevention valves ensure zero contamination while pumping into sumps.
                </Text>
              </View>
            </View>
          </View>

          <Button
            title="Export / Share NABL Certificate"
            variant="outline"
            size="md"
            onPress={handleShareCertificate}
            leftIcon={<Ionicons name="download-outline" size={18} color={colors.primary} />}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  certHeroCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  certHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  badgeShield: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certHeroTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#166534',
  },
  certHeroSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 15,
  },
  certMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    paddingTop: spacing.md,
  },
  certMetaCol: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: '#15803D',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: fontWeights.heavy,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  paramList: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  paramCard: {
    padding: spacing.md,
  },
  paramCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  paramTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  paramName: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.heavy,
  },
  paramValuesRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: 4,
  },
  valueLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  paramTested: {
    fontSize: 14,
    fontWeight: fontWeights.heavy,
    color: colors.primary,
  },
  paramStandard: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  paramDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  hygieneCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  hygieneItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  hygieneTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  hygieneSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
});
