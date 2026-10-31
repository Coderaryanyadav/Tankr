import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { ConfirmDialog } from '../../../components/common/Overlay/ConfirmDialog';
import { CustomerDisputeModal } from '../../disputes/components/CustomerDisputeModal';
import { useBookingStore } from '../../../stores/bookingStore';
import { notify } from '../../../utils/alertUtils';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { BOOKING_STATUS_CONFIG, BookingRecord } from '../../../types/booking';

interface ActiveBookingCardProps {
  booking: BookingRecord;
  onViewDetails?: () => void;
}

export const ActiveBookingCard: React.FC<ActiveBookingCardProps> = ({
  booking,
  onViewDetails,
}) => {
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const { cancelBooking, clearActiveBooking } = useBookingStore();
  const config = BOOKING_STATUS_CONFIG[booking.status];

  const isAwaitingDriver =
    booking.status === 'pending' ||
    booking.status === 'supplier_assigned' ||
    booking.status === 'accepted';

  const handleCallDriver = () => {
    if (booking.driver_phone) {
      Linking.openURL(`tel:${booking.driver_phone}`);
    } else {
      notify('Driver Contact', 'Calling driver: +91 98451 10001');
    }
  };

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await cancelBooking(booking.id, 'Customer cancelled from active card');
      setIsCancelling(false);
      setCancelModalVisible(false);
      if (res && !res.success) {
        notify('Cancellation Notice', res.error || 'Could not cancel booking.');
      } else {
        clearActiveBooking();
        notify('Booking Cancelled', 'Your tanker request has been successfully cancelled.');
      }
    } catch {
      setIsCancelling(false);
      setCancelModalVisible(false);
    }
  };

  return (
    <View style={styles.cardContainer}>
      {/* Top Status Header */}
      <View style={styles.statusHeader}>
        <View style={styles.statusTitleCol}>
          <View style={styles.statusBadgeRow}>
            <StatusBadge
              label={config.label}
              variant={config.badgeVariant}
              size="md"
            />
            <Text style={styles.bookingRefText}>{booking.booking_reference}</Text>
          </View>
          <Text style={styles.statusDescription}>{config.description}</Text>
        </View>

        {/* 4-Digit Delivery PIN Pill */}
        <View style={styles.pinPill}>
          <Text style={styles.pinLabel}>DELIVERY PIN</Text>
          <Text style={styles.pinValue}>{booking.delivery_pin}</Text>
        </View>
      </View>

      {/* Progress Line */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(100, (config.stepIndex / 6) * 100)}%` },
          ]}
        />
      </View>

      {/* Driver & Tanker Details */}
      <View style={styles.driverSection}>
        <View style={styles.driverAvatar}>
          <Ionicons
            name={isAwaitingDriver ? 'hourglass-outline' : 'person'}
            size={20}
            color={colors.primary}
          />
        </View>

        <View style={styles.driverDetailsCol}>
          <Text style={styles.driverName}>
            {isAwaitingDriver
              ? 'Assigning Driver...'
              : (booking.driver_name || 'Assigned Driver')}
          </Text>
          <Text style={styles.vehicleDetails}>
            {isAwaitingDriver
              ? `Awaiting dispatch confirmation from ${booking.supplier_name || 'supplier'}`
              : `${booking.vehicle_number || 'Vehicle Assigned'} • ${booking.supplier_name || 'Water Logistics'}`}
          </Text>
        </View>

        {/* Contact Actions - Only shown when a driver is assigned and active */}
        {!isAwaitingDriver && (
          <View style={styles.contactActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Call Driver"
              onPress={handleCallDriver}
              style={styles.iconCircle}
            >
              <Ionicons name="call" size={18} color={colors.primary} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Message Driver"
              onPress={() => notify('Driver Chat', 'In-app driver chat is available once tanker is en route.')}
              style={styles.iconCircle}
            >
              <Ionicons name="chatbubble" size={18} color={colors.primary} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionRow}>
        {booking.status === 'delivered' ? (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Button
                title="Complete & Close"
                variant="primary"
                size="md"
                onPress={clearActiveBooking}
              />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Button
                title="Report Issue"
                variant="outline"
                size="md"
                onPress={() => setDisputeModalVisible(true)}
                rightIcon={<Ionicons name="alert-circle-outline" size={16} color={colors.error} />}
              />
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Button
                title={isAwaitingDriver ? 'Track Status' : 'Contact Driver'}
                variant="secondary"
                size="md"
                onPress={isAwaitingDriver ? () => onViewDetails?.() : handleCallDriver}
                rightIcon={<Ionicons name={isAwaitingDriver ? "navigate-circle-outline" : "call-outline"} size={16} color={colors.primary} />}
              />
            </View>

            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Button
                title={isAwaitingDriver ? "Cancel Order" : "Cancel"}
                variant="outline"
                size="md"
                onPress={() => setCancelModalVisible(true)}
              />
            </View>
          </View>
        )}
      </View>

      {/* Confirm Cancellation In-App Dialog with Close (X) button */}
      <ConfirmDialog
        visible={cancelModalVisible}
        title="Cancel Water Order?"
        message="Are you sure you want to cancel this booking? If the tanker is already en route, cancellation policies may apply."
        confirmLabel="Confirm Cancellation"
        cancelLabel="Keep Order"
        isDestructive={true}
        isLoading={isCancelling}
        iconName="close-circle-outline"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelModalVisible(false)}
      />

      {/* Dispute Modal */}
      <CustomerDisputeModal
        visible={disputeModalVisible}
        bookingId={booking.id}
        bookingReference={booking.booking_reference}
        capacityLiters={booking.capacity_liters}
        onClose={() => setDisputeModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    ...shadows.floating,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  statusTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  bookingRefText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: fontWeights.bold,
  },
  statusDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  pinPill: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  pinValue: {
    fontSize: 18,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
    letterSpacing: 2,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  driverDetailsCol: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  vehicleDetails: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  contactActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

