import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { Card } from '../../../components/common/Card/Card';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { Modal } from '../../../components/common/Overlay/Modal';
import { useSupplyStore } from '../../../stores/supplyStore';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../services/supabase/client';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { BOOKING_STATUS_CONFIG } from '../../../types/booking';

export const DriverDashboardScreen: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const {
    assignedDelivery,
    driverDutyStatus,
    toggleDriverDuty,
    driverUpdateStatus,
    loadDriverData,
  } = useSupplyStore();

  useEffect(() => {
    loadDriverData(user?.id || '', user?.phone);
  }, [user, loadDriverData]);

  const [pinModalVisible, setPinModalVisible] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [meterStart, setMeterStart] = useState<string>('14200.0');
  const [meterEnd, setMeterEnd] = useState<string>('19200.0');
  const [pinError, setPinError] = useState<string | null>(null);

  const handleOpenMapsNavigation = () => {
    if (!assignedDelivery) return;
    const { delivery_latitude, delivery_longitude } = assignedDelivery;
    const url = Platform.select({
      ios: `maps:0,0?q=${delivery_latitude},${delivery_longitude}`,
      android: `geo:0,0?q=${delivery_latitude},${delivery_longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${delivery_latitude},${delivery_longitude}`,
    });
    Linking.openURL(url as string);
  };

  const handleReportCustomerNoShow = () => {
    if (!assignedDelivery) return;
    Alert.alert(
      'Customer No-Show Protocol',
      'Have you arrived at the customer location and waited for at least 10 minutes with no response to calls?',
      [
        { text: 'Keep Waiting', style: 'cancel' },
        {
          text: 'Confirm No-Show (₹200 Fee)',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('customer_cancel_booking_with_policy', {
              p_booking_id: assignedDelivery.id,
              p_reason: 'Customer no-show at delivery gate (10 min wait timer elapsed)',
            });

            if (!error) {
              Alert.alert(
                'No-Show Recorded',
                'Tanker has been freed for next dispatch. ₹200 gate arrival compensation has been credited to your payout ledger.'
              );
              loadDriverData(user?.id || '', user?.phone);
            } else {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleAdvanceStatus = async () => {
    if (!assignedDelivery) return;
    const currentStatus = assignedDelivery.status;

    if (currentStatus === 'accepted' || currentStatus === 'driver_assigned') {
      await driverUpdateStatus(assignedDelivery.id, 'en_route');
      Alert.alert('Trip Started', 'Customer has been notified that you are en route.');
    } else if (currentStatus === 'en_route') {
      await driverUpdateStatus(assignedDelivery.id, 'arrived');
      Alert.alert('Arrived at Location', 'Customer notified that tanker is parked outside.');
    } else if (currentStatus === 'arrived') {
      await driverUpdateStatus(assignedDelivery.id, 'delivering');
      Alert.alert('Pumping Started', 'Hose connected and filling water into customer sump.');
    } else if (currentStatus === 'delivering') {
      // Prompt for PIN and Meter
      setEnteredPin('');
      setPinError(null);
      setPinModalVisible(true);
    }
  };

  const handleVerifyPinAndComplete = async () => {
    if (!assignedDelivery) return;
    if (enteredPin.length !== 4) {
      setPinError('Please enter the 4-digit code shown on the customer app.');
      return;
    }

    const startVal = parseFloat(meterStart) || 0;
    const endVal = parseFloat(meterEnd) || (startVal + (assignedDelivery.capacity_liters || 5000));
    const deliveredLiters = Math.round(endVal - startVal);

    try {
      const { data, error } = await supabase.rpc('driver_complete_delivery_with_meter', {
        p_booking_id: assignedDelivery.id,
        p_delivery_pin: enteredPin,
        p_flow_start: startVal,
        p_flow_end: endVal,
        p_delivered_liters: deliveredLiters,
      });

      if (error) {
        setPinError(error.message);
        return;
      }

      setPinModalVisible(false);
      loadDriverData(user?.id || '', user?.phone);
      Alert.alert(
        'Delivery Verified & Audited! 🎉',
        `Flow meter confirmed: ${deliveredLiters.toLocaleString('en-IN')}L pumped.\n₹${Math.round(assignedDelivery.final_payable_amount * 0.85)} earnings credited to driver ledger.`
      );
    } catch (err: any) {
      setPinError(err?.message || 'Verification failed');
    }
  };

  const getStatusButtonTitle = () => {
    if (!assignedDelivery) return '';
    switch (assignedDelivery.status) {
      case 'accepted':
      case 'driver_assigned':
        return 'Start Trip to Customer';
      case 'en_route':
        return 'Mark Arrived at Gate';
      case 'arrived':
        return 'Connect Hose & Start Pumping';
      case 'delivering':
        return 'Finish & Verify Customer PIN';
      case 'delivered':
        return 'Delivery Completed';
      default:
        return 'Update Trip';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Driver Header */}
      <View style={styles.header}>
        <View style={styles.driverProfileCol}>
          <Text style={styles.driverName}>Basavaraj Patil</Text>
          <Text style={styles.vehicleReg}>Tanker KA-04-TC-5001 (5,000 L)</Text>
        </View>

        <View style={styles.dutySwitchCol}>
          <Text style={styles.dutyLabel}>{driverDutyStatus ? 'ON DUTY' : 'OFF DUTY'}</Text>
          <Switch
            value={driverDutyStatus}
            onValueChange={toggleDriverDuty}
            trackColor={{ false: colors.cardBorder, true: colors.primary }}
          />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Role Header Pill */}
        <View style={styles.modeSwitchRow}>
          <StatusBadge label="Driver Console" variant="primary" size="md" />
          <Pressable onPress={() => signOut()}>
            <Text style={styles.switchModeText}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Assigned Order Card */}
        {assignedDelivery ? (
          <Card variant="elevated" style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <View>
                <Text style={styles.bookingRefText}>{assignedDelivery.booking_reference}</Text>
                <Text style={styles.capacityText}>
                  {assignedDelivery.capacity_liters.toLocaleString('en-IN')} L • {assignedDelivery.water_type}
                </Text>
              </View>

              <StatusBadge
                label={BOOKING_STATUS_CONFIG[assignedDelivery.status].label}
                variant={BOOKING_STATUS_CONFIG[assignedDelivery.status].badgeVariant}
                size="md"
              />
            </View>

            {/* Destination Block */}
            <View style={styles.destinationBox}>
              <Ionicons name="location-sharp" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.destTitle}>CUSTOMER DESTINATION</Text>
                <Text style={styles.destAddress}>{assignedDelivery.delivery_address}</Text>
                <Text style={styles.destDistance}>
                  Distance: {assignedDelivery.delivery_distance_km} km away
                </Text>
              </View>
            </View>

            {/* Action Bar: Navigation & Protected Call */}
            <View style={styles.quickActionsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Navigation in Maps"
                onPress={handleOpenMapsNavigation}
                style={styles.quickActionBtn}
              >
                <Ionicons name="navigate" size={18} color={colors.white} />
                <Text style={styles.quickActionText}>Open Maps</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Call Customer"
                onPress={() => Linking.openURL('tel:+919876543210')}
                style={[styles.quickActionBtn, styles.callBtn]}
              >
                <Ionicons name="call" size={18} color={colors.primary} />
                <Text style={[styles.quickActionText, styles.callBtnText]}>Call Customer</Text>
              </Pressable>
            </View>

            {/* Status Transition Button */}
            <View style={styles.statusCtaWrapper}>
              {assignedDelivery.status === 'arrived' && (
                <Pressable
                  onPress={handleReportCustomerNoShow}
                  style={{ marginBottom: spacing.sm, padding: spacing.xs, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.error, fontSize: 12, fontWeight: fontWeights.bold }}>
                    ⚠️ Customer Not Answering? Report 10-Min No-Show
                  </Text>
                </Pressable>
              )}
              <Button
                title={getStatusButtonTitle()}
                variant="primary"
                size="lg"
                disabled={assignedDelivery.status === 'delivered'}
                onPress={handleAdvanceStatus}
                rightIcon={<Ionicons name="arrow-forward" size={20} color={colors.white} />}
              />
            </View>
          </Card>
        ) : (
          <Card variant="standard" style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Ionicons name="water-outline" size={48} color={colors.textMuted} />
            <Text style={{ fontSize: 16, fontWeight: fontWeights.bold, color: colors.darkNavy, marginTop: spacing.sm }}>
              Waiting for Next Delivery
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
              Keep your duty switch active to receive nearby tanker requests automatically.
            </Text>
          </Card>
        )}
      </ScrollView>

      {/* PIN Verification Hand-off Modal */}
      {pinModalVisible && (
        <View style={styles.pinModalOverlay}>
          <View style={styles.pinDialogCard}>
            <View style={styles.pinIconCircle}>
              <Ionicons name="keypad" size={32} color={colors.primary} />
            </View>

            <Text style={styles.pinModalTitle}>Verify Delivery & Flow Meter</Text>
            <Text style={styles.pinModalSubtitle}>
              Record the digital flow meter reading and enter customer's 4-digit PIN.
            </Text>

            {pinError && (
              <View style={styles.pinErrorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.pinErrorText}>{pinError}</Text>
              </View>
            )}

            <View style={{ width: '100%', flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xs }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: fontWeights.bold, color: colors.textSecondary, marginBottom: 2 }}>
                  METER START (L)
                </Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="14200.0"
                  placeholderTextColor={colors.textMuted}
                  value={meterStart}
                  onChangeText={setMeterStart}
                  style={[styles.pinInputField, { width: '100%', fontSize: 15, paddingVertical: 8 }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: fontWeights.bold, color: colors.textSecondary, marginBottom: 2 }}>
                  METER END (L)
                </Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="19200.0"
                  placeholderTextColor={colors.textMuted}
                  value={meterEnd}
                  onChangeText={setMeterEnd}
                  style={[styles.pinInputField, { width: '100%', fontSize: 15, paddingVertical: 8 }]}
                />
              </View>
            </View>

            <Text style={{ fontSize: 12, fontWeight: fontWeights.bold, color: colors.darkNavy, marginTop: spacing.xs, marginBottom: 2 }}>
              CUSTOMER 4-DIGIT PIN
            </Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={4}
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
              value={enteredPin}
              onChangeText={setEnteredPin}
              style={styles.pinInputField}
              textAlign="center"
              autoFocus
            />

            <View style={{ width: '100%', marginTop: spacing.md }}>
              <Button
                title="Verify & Complete Order"
                variant="primary"
                size="lg"
                onPress={handleVerifyPinAndComplete}
              />
            </View>

            <Pressable
              onPress={() => setPinModalVisible(false)}
              style={{ marginTop: spacing.md, padding: spacing.xs }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: fontWeights.semibold }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  driverProfileCol: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  vehicleReg: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dutySwitchCol: {
    alignItems: 'center',
  },
  dutyLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  modeSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  switchModeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  assignmentCard: {
    padding: spacing.lg,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bookingRefText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: fontWeights.bold,
  },
  capacityText: {
    fontSize: 17,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 2,
  },
  destinationBox: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  destTitle: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  destAddress: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 2,
  },
  destDistance: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: borderRadius.lg,
    ...shadows.subtle,
  },
  quickActionText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
  callBtn: {
    backgroundColor: colors.primaryLight,
  },
  callBtnText: {
    color: colors.primary,
  },
  statusCtaWrapper: {
    marginTop: spacing.xs,
  },
  pinModalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 50,
  },
  pinDialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['3xl'],
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.modal,
  },
  pinIconCircle: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pinModalTitle: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    textAlign: 'center',
  },
  pinModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  pinErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.errorLight,
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  pinErrorText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: fontWeights.semibold,
  },
  pinInputField: {
    width: 160,
    height: 56,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.primary,
    fontSize: 26,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
    letterSpacing: 8,
  },
});
