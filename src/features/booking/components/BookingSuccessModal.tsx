import React, { useEffect, useRef } from 'react';
import {
  Animated,
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
import { borderRadius, colors, fontSizes, fontWeights, shadows, spacing } from '../../../theme';
import { BookingRecord } from '../../../types/booking';
import { haptics } from '../../../theme/haptics';
import { animateSuccessPop, useReducedMotion } from '../../../theme/motion';

export interface BookingSuccessModalProps {
  visible: boolean;
  booking: BookingRecord | null;
  onTrackDelivery: () => void;
  onViewOrders: () => void;
  onClose: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  visible,
  booking,
  onTrackDelivery,
  onViewOrders,
  onClose,
}) => {
  const isReducedMotion = useReducedMotion();
  const iconScale = useRef(new Animated.Value(0.4)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && booking) {
      haptics.success();
      animateSuccessPop(iconScale, iconOpacity, isReducedMotion);
    }
  }, [visible, booking, isReducedMotion]);

  if (!visible || !booking) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Bar with Close Button */}
          <View style={styles.topBar}>
            <View style={styles.successPill}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.successPillText}>Order Placed Successfully</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close confirmation modal"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Hero Confirmation */}
            <View style={styles.heroSection}>
              <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    transform: [{ scale: iconScale }],
                    opacity: iconOpacity,
                  },
                ]}
              >
                <Ionicons name="water" size={38} color={colors.primary} />
              </Animated.View>
              <Text style={styles.referenceNumber}>#{booking.booking_reference}</Text>
              <Text style={styles.heroTitle}>Water Tanker Dispatched</Text>
              <Text style={styles.heroSub}>
                Supplier has accepted your order and driver is preparing for delivery.
              </Text>
            </View>

            {/* Delivery PIN Card (Critical for Sump Security) */}
            <View style={styles.pinCard}>
              <View style={styles.pinHeader}>
                <Ionicons name="key" size={18} color={colors.primary} />
                <Text style={styles.pinCardTitle}>DELIVERY VERIFICATION PIN</Text>
              </View>
              <View style={styles.pinDigitsRow}>
                {booking.delivery_pin.split('').map((digit, idx) => (
                  <View key={idx} style={styles.pinDigitBox}>
                    <Text style={styles.pinDigitText}>{digit}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.pinNotice}>
                Share this 4-digit PIN with the driver only after the tanker arrives and is parked at your sump.
              </Text>
            </View>

            {/* Supplier & Vehicle Details */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeaderRow}>
                <Text style={styles.infoSectionTitle}>DISPATCH DETAILS</Text>
                <StatusBadge label="Connecting" variant="warning" size="sm" />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Supplier Hub</Text>
                <Text style={styles.detailValue}>
                  {booking.supplier_name || 'Marol Water Logistics'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vehicle Number</Text>
                <Text style={styles.detailValue}>
                  {booking.vehicle_number || 'MH-02-TC-5001'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Capacity & Type</Text>
                <Text style={styles.detailValue}>
                  {booking.capacity_liters.toLocaleString('en-IN')} L • {booking.water_type}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Amount</Text>
                <Text style={[styles.detailValue, styles.amountHighlight]}>
                  ₹{booking.final_payable_amount.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>Delivery Sump</Text>
                <Text numberOfLines={2} style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>
                  {booking.delivery_address}
                </Text>
              </View>
            </View>

            {/* Next Steps Roadmap */}
            <View style={styles.roadmapCard}>
              <Text style={styles.roadmapTitle}>WHAT HAPPENS NEXT</Text>

              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, styles.stepCircleActive]}>
                  <Ionicons name="checkmark" size={12} color={colors.white} />
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepName}>1. Order Confirmed</Text>
                  <Text style={styles.stepDesc}>Dispatch instructions sent to tanker depot.</Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepCircle}>
                  <Ionicons name="navigate" size={12} color={colors.primary} />
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepName}>2. Live GPS Tracking</Text>
                  <Text style={styles.stepDesc}>Track the tanker's live location on the map.</Text>
                </View>
              </View>

              <View style={[styles.stepItem, { marginBottom: 0 }]}>
                <View style={styles.stepCircle}>
                  <Ionicons name="speedometer" size={12} color={colors.primary} />
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={styles.stepName}>3. Metered Sump Pumping</Text>
                  <Text style={styles.stepDesc}>Verify start/end digital meter readings before completion.</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Sticky Actions */}
          <View style={styles.footerActions}>
            <Button
              title="Track Live Delivery"
              onPress={onTrackDelivery}
              variant="primary"
              size="lg"
              fullWidth
              rightIcon={<Ionicons name="navigate-circle" size={20} color={colors.white} />}
            />
            <View style={{ height: spacing.xs }} />
            <Button
              title="View My Water Orders"
              onPress={onViewOrders}
              variant="ghost"
              size="md"
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['3xl'],
    overflow: 'hidden',
    ...shadows.modal,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  successPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  successPillText: {
    fontSize: fontSizes.xs - 1,
    fontWeight: fontWeights.bold,
    color: colors.success,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...shadows.subtle,
  },
  referenceNumber: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
    marginTop: 2,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  pinCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(11, 100, 192, 0.25)',
    marginBottom: spacing.md,
  },
  pinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  pinCardTitle: {
    fontSize: fontSizes.xs - 1,
    fontWeight: fontWeights.heavy,
    color: colors.primary,
    letterSpacing: 1,
  },
  pinDigitsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  pinDigitBox: {
    width: 44,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadows.subtle,
  },
  pinDigitText: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.heavy,
    color: colors.primary,
  },
  pinNotice: {
    fontSize: fontSizes.xs - 1,
    color: colors.darkNavy,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  infoCard: {
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoSectionTitle: {
    fontSize: fontSizes.xs - 1,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  detailLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  amountHighlight: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  roadmapCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  roadmapTitle: {
    fontSize: fontSizes.xs - 1,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.success,
  },
  stepTextCol: {
    flex: 1,
  },
  stepName: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  stepDesc: {
    fontSize: fontSizes.xs - 1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  footerActions: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.cardSurface,
  },
});
