import React from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { useBookingStore } from '../../../stores/bookingStore';
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
  const { cancelBooking, simulateStatusAdvance, clearActiveBooking } = useBookingStore();
  const config = BOOKING_STATUS_CONFIG[booking.status];

  const handleCallDriver = () => {
    if (booking.driver_phone) {
      Linking.openURL(`tel:${booking.driver_phone}`);
    } else {
      Alert.alert('Driver Contact', 'Calling driver: +91 98451 10001');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Tanker Booking?',
      'Are you sure you want to cancel this order? If the tanker is already en route, cancellation policies apply.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: () => cancelBooking(booking.id, 'Customer cancelled from active card'),
        },
      ]
    );
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
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>

        <View style={styles.driverDetailsCol}>
          <Text style={styles.driverName}>
            {booking.driver_name || 'Assigned Driver'}
          </Text>
          <Text style={styles.vehicleDetails}>
            {booking.vehicle_number || 'KA-01-MJ-1001'} • {booking.supplier_name}
          </Text>
        </View>

        {/* Contact Actions */}
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
            onPress={() => Alert.alert('Chat', 'Opening chat with driver...')}
            style={styles.iconCircle}
          >
            <Ionicons name="chatbubble" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionRow}>
        {booking.status === 'delivered' ? (
          <Button
            title="Complete & Close"
            variant="primary"
            size="md"
            onPress={clearActiveBooking}
          />
        ) : (
          <>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Button
                title="Advance Status"
                variant="secondary"
                size="md"
                onPress={simulateStatusAdvance}
                rightIcon={<Ionicons name="play-forward" size={16} color={colors.primary} />}
              />
            </View>

            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Button
                title="Cancel Order"
                variant="outline"
                size="md"
                onPress={handleCancel}
              />
            </View>
          </>
        )}
      </View>
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
