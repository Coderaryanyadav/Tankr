import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { useBookingStore } from '../../../stores/bookingStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface BookingSearchingOverlayProps {
  visible: boolean;
  onCancel: () => void;
  onDispatchConfirmed?: () => void;
}

export const BookingSearchingOverlay: React.FC<BookingSearchingOverlayProps> = ({
  visible,
  onCancel,
  onDispatchConfirmed,
}) => {
  const { activeBooking } = useBookingStore();
  const ripple1 = useRef(new Animated.Value(1)).current;
  const ripple2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      const dispatchTimer = setTimeout(() => {
        useBookingStore.setState({ isSearchingDriver: false });
        if (onDispatchConfirmed) {
          onDispatchConfirmed();
        }
      }, 2500);

      const anim1 = Animated.loop(
        Animated.sequence([
          Animated.timing(ripple1, {
            toValue: 2.2,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(ripple1, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      const anim2 = Animated.loop(
        Animated.sequence([
          Animated.delay(900),
          Animated.timing(ripple2, {
            toValue: 2.2,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(ripple2, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      anim1.start();
      anim2.start();

      return () => {
        clearTimeout(dispatchTimer);
        anim1.stop();
        anim2.stop();
      };
    }
  }, [visible, ripple1, ripple2, onDispatchConfirmed]);

  if (!visible || !activeBooking) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close dispatch searching"
            onPress={onCancel}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>

          {/* Radar Animation Area */}
          <View style={styles.radarArea}>
            <Animated.View
              style={[
                styles.rippleRing,
                {
                  transform: [{ scale: ripple1 }],
                  opacity: ripple1.interpolate({
                    inputRange: [1, 2.2],
                    outputRange: [0.5, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.rippleRing,
                {
                  transform: [{ scale: ripple2 }],
                  opacity: ripple2.interpolate({
                    inputRange: [1, 2.2],
                    outputRange: [0.5, 0],
                  }),
                },
              ]}
            />
            <View style={styles.radarCenterCircle}>
              <Ionicons name="water" size={36} color={colors.white} />
            </View>
          </View>

          {/* Status Text */}
          <Text style={styles.title}>Dispatching Your Tanker...</Text>
          <Text style={styles.subtitle}>
            Connecting with {activeBooking.supplier_name || 'verified water supplier'}
          </Text>

          {/* Booking Metrics */}
          <View style={styles.metricsBox}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Order ID</Text>
              <Text style={styles.metricValue}>{activeBooking.booking_reference}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Capacity</Text>
              <Text style={styles.metricValue}>
                {activeBooking.capacity_liters.toLocaleString('en-IN')} L
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Amount</Text>
              <Text style={styles.metricValue}>
                ₹{activeBooking.final_payable_amount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Abort CTA */}
          <View style={styles.cancelWrapper}>
            <Button
              title="Cancel Request"
              variant="outline"
              size="md"
              onPress={onCancel}
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialogCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['3xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
    ...shadows.modal,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  radarArea: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  rippleRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  radarCenterCircle: {
    width: 68,
    height: 68,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  title: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  metricsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    width: '100%',
    marginBottom: spacing.xl,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.cardBorder,
  },
  cancelWrapper: {
    width: '100%',
  },
});

