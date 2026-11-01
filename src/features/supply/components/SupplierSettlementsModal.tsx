import React from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../../../theme';
import { useSupplyStore } from '../../../stores/supplyStore';

interface SupplierSettlementsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SupplierSettlementsModal: React.FC<SupplierSettlementsModalProps> = ({
  visible,
  onClose,
}) => {
  const { supplierMetrics, supplierSettlementDetails } = useSupplyStore();

  const handleDownloadStatement = () => {
    Alert.alert(
      'Tax & Settlement Statement',
      'October 2026 GST & Automated Settlement Statement has been generated and dispatched to your registered supplier email.'
    );
  };

  const handleInitiateExpressTransfer = () => {
    Alert.alert(
      'Automated T+1 Payout Active',
      'All completed trip balances are batched and directly credited to your registered HDFC Bank account every morning at 06:00 AM IST.'
    );
  };

  const netToday = Math.round(supplierMetrics.todayRevenue * 0.85);

  const SETTLEMENT_HISTORY = [
    {
      id: 'SET-90124',
      date: 'Yesterday, 06:00 AM',
      amount: 34200,
      trips: 18,
      status: 'delivered' as const,
      utr: 'UTR2026103009184',
    },
    {
      id: 'SET-89410',
      date: '29 Oct 2026, 06:00 AM',
      amount: 41800,
      trips: 22,
      status: 'delivered' as const,
      utr: 'UTR2026102901248',
    },
    {
      id: 'SET-88902',
      date: '28 Oct 2026, 06:00 AM',
      amount: 28900,
      trips: 15,
      status: 'delivered' as const,
      utr: 'UTR2026102894120',
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Earnings & Bank Settlements</Text>
              <Text style={styles.subtitle}>Direct nodal bank account payouts & GST ledger</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close settlements modal"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Primary Balance Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View>
                  <Text style={styles.heroSub}>UNSETTLED LIVE BALANCE (T+1)</Text>
                  <Text style={styles.heroAmount}>
                    ₹{(supplierSettlementDetails.pendingPayout + netToday).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <Ionicons name="flash" size={12} color="#065F46" />
                  <Text style={styles.statusPillText}>Auto-Disburse 06:00 AM</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownCol}>
                  <Text style={styles.breakdownLabel}>Today's Gross Trips</Text>
                  <Text style={styles.breakdownVal}>₹{supplierMetrics.todayRevenue.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.breakdownCol}>
                  <Text style={styles.breakdownLabel}>Platform Fee (15%)</Text>
                  <Text style={[styles.breakdownVal, { color: colors.textSecondary }]}>
                    -₹{Math.round(supplierMetrics.todayRevenue * 0.15).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.breakdownCol}>
                  <Text style={styles.breakdownLabel}>Net Hub Share (85%)</Text>
                  <Text style={[styles.breakdownVal, { color: '#065F46' }]}>
                    ₹{netToday.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bank Details */}
            <View style={styles.bankCard}>
              <View style={styles.bankHeader}>
                <Ionicons name="business" size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing.xs }}>
                  <Text style={styles.bankName}>HDFC Bank (Current Commercial A/C)</Text>
                  <Text style={styles.bankAccount}>{supplierSettlementDetails.bankAccount} • IFSC {supplierSettlementDetails.ifsc}</Text>
                </View>
                <StatusBadge label="Verified KYC" variant="success" size="sm" />
              </View>
              <View style={styles.upiRow}>
                <Text style={styles.upiLabel}>Linked UPI VPA:</Text>
                <Text style={styles.upiValue}>{supplierSettlementDetails.upiId}</Text>
              </View>
            </View>

            {/* Past Settlements History */}
            <Text style={styles.sectionTitle}>RECENT COMPLETED PAYOUTS</Text>
            {SETTLEMENT_HISTORY.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyTop}>
                  <View>
                    <Text style={styles.historyId}>#{item.id}</Text>
                    <Text style={styles.historyDate}>{item.date}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.historyAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
                    <Text style={styles.historyTrips}>{item.trips} trips settled</Text>
                  </View>
                </View>
                <View style={styles.utrRow}>
                  <Ionicons name="checkmark-done-circle" size={14} color="#065F46" />
                  <Text style={styles.utrText}>NEFT Direct Credit • UTR: {item.utr}</Text>
                </View>
              </View>
            ))}

            <View style={{ marginTop: spacing.md, gap: spacing.sm, marginBottom: spacing.xl }}>
              <Button
                title="Download GST Settlement Statement"
                variant="outline"
                size="md"
                onPress={handleDownloadStatement}
                leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.primary} />}
              />
              <Button
                title="View Payout Transfer Rules"
                variant="ghost"
                size="sm"
                onPress={handleInitiateExpressTransfer}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  dialogCard: {
    backgroundColor: colors.cardSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '88%',
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  body: {
    marginTop: spacing.xs,
  },
  heroCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroSub: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#065F46',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: fontWeights.bold,
    color: '#065F46',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#065F46',
  },
  divider: {
    height: 1,
    backgroundColor: '#BBF7D0',
    marginVertical: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownCol: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 2,
  },
  bankCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankName: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  bankAccount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  upiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 6,
  },
  upiLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  upiValue: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  historyCard: {
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyId: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  historyDate: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  historyTrips: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  utrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  utrText: {
    fontSize: 10,
    color: '#065F46',
    fontWeight: fontWeights.medium,
  },
});
