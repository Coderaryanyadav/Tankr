import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../../../theme';
import { BookingRecord } from '../../../types/booking';
import { validateDeliveryCompletion } from '../../../services/stateMachineService';

interface DriverStationaryVerificationModalProps {
  visible: boolean;
  activeTrip: BookingRecord;
  onClose: () => void;
  onVerifyAndComplete: (params: {
    pin: string;
    flowStart: number;
    flowEnd: number;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const DriverStationaryVerificationModal: React.FC<DriverStationaryVerificationModalProps> = ({
  visible,
  activeTrip,
  onClose,
  onVerifyAndComplete,
}) => {
  const [pin, setPin] = useState('');
  const [meterStart, setMeterStart] = useState('12400');
  const [meterEnd, setMeterEnd] = useState('22400');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startVal = parseFloat(meterStart) || 0;
  const endVal = parseFloat(meterEnd) || 0;
  const calculatedLiters = Math.max(0, Math.round(endVal - startVal));
  const capacityLiters = activeTrip.capacity_liters;
  const shortfall = Math.max(0, capacityLiters - calculatedLiters);
  const estimatedEarnings = Math.round(activeTrip.final_payable_amount * 0.85);

  const handleComplete = async () => {
    setErrorMessage(null);

    // Call authoritative delivery completion validation (PIN, flow direction, 95% volume)
    const validation = validateDeliveryCompletion({
      enteredPin: pin,
      expectedPin: activeTrip.delivery_pin,
      meterStart: startVal,
      meterEnd: endVal,
      bookedCapacity: activeTrip.capacity_liters,
    });

    if (!validation.valid) {
      setErrorMessage(validation.error || 'PIN or Flow Meter verification failed.');
      return;
    }

    setIsSubmitting(true);
    const result = await onVerifyAndComplete({
      pin,
      flowStart: startVal,
      flowEnd: endVal,
    });
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || 'PIN or Flow Meter verification failed.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', justifyContent: 'flex-end' }}
        >
          <View style={styles.dialogCard}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <View style={styles.stationaryBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#065F46" />
                  <Text style={styles.stationaryBadgeText}>STATIONARY DELIVERY PROTOCOL</Text>
                </View>
                <Text style={styles.title}>Audit Delivery & Enter PIN</Text>
                <Text style={styles.subtitle}>Order #{activeTrip.booking_reference} • {activeTrip.delivery_address}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close verification dialog"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={onClose}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Step 1: Customer PIN */}
              <View style={styles.sectionBlock}>
                <Text style={styles.stepTitle}>STEP 1: CUSTOMER 4-DIGIT DELIVERY PIN</Text>
                <Text style={styles.stepDesc}>
                  Ask the customer for the PIN displayed on their live tracking screen after tanker connects to sump.
                </Text>

                <View style={styles.pinInputWrapper}>
                  <TextInput
                    style={styles.pinInput}
                    accessibilityLabel="4-digit customer delivery PIN"
                    placeholder="• • • •"
                    placeholderTextColor={colors.textMuted}
                    value={pin}
                    onChangeText={(val) => setPin(val.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Use Demo PIN 4182"
                    onPress={() => setPin('4182')}
                    style={styles.demoPinPill}
                  >
                    <Ionicons name="key-outline" size={13} color={colors.primary} />
                    <Text style={styles.demoPinText}>Use Demo PIN (4182)</Text>
                  </Pressable>
                </View>
              </View>

              {/* Step 2: Digital Flow Meter Readings */}
              <View style={styles.sectionBlock}>
                <Text style={styles.stepTitle}>STEP 2: DIGITAL FLOW METER AUDIT (LITRES)</Text>
                <Text style={styles.stepDesc}>
                  Enter the calibrated meter counter before pumping and after closing valve.
                </Text>

                <View style={styles.meterRow}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={styles.meterLabel}>Initial Start (L)</Text>
                    <TextInput
                      style={styles.meterInput}
                      accessibilityLabel="Flow meter start reading"
                      value={meterStart}
                      onChangeText={setMeterStart}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.meterLabel}>Final End (L)</Text>
                    <TextInput
                      style={styles.meterInput}
                      accessibilityLabel="Flow meter end reading"
                      value={meterEnd}
                      onChangeText={setMeterEnd}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Audit Calculation Pill */}
                <View style={[styles.calcBox, shortfall > 0 ? styles.calcBoxWarning : styles.calcBoxSuccess]}>
                  <Ionicons
                    name={shortfall > 0 ? 'warning' : 'checkmark-circle'}
                    size={20}
                    color={shortfall > 0 ? '#92400E' : '#065F46'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.calcTitle, { color: shortfall > 0 ? '#92400E' : '#065F46' }]}>
                      Delivered: {calculatedLiters.toLocaleString('en-IN')} Litres of {capacityLiters.toLocaleString('en-IN')} L
                    </Text>
                    {shortfall > 0 ? (
                      <Text style={styles.calcSubWarning}>
                        {shortfall.toLocaleString('en-IN')}L short delivery will be automatically prorated and refunded to customer UPI.
                      </Text>
                    ) : (
                      <Text style={styles.calcSubSuccess}>
                        Volume matches tanker capacity 100%. Flow meter verified.
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Step 3: Driver Earnings Confirmation */}
              <View style={styles.earningsSummaryBox}>
                <View style={styles.earningsRow}>
                  <Text style={styles.earningsLabel}>Your Net Driver Payout:</Text>
                  <Text style={styles.earningsValue}>₹{estimatedEarnings.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.earningsSub}>Credited immediately to your driver ledger upon PIN verification.</Text>
              </View>

              {/* Error Announcement */}
              {errorMessage && (
                <View
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  style={styles.errorBox}
                >
                  <Ionicons name="alert-circle" size={18} color="#991B1B" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <View style={{ marginTop: spacing.md, marginBottom: spacing.xl }}>
                <Button
                  title={isSubmitting ? 'Verifying Delivery...' : 'Verify PIN & Complete Delivery'}
                  variant="primary"
                  size="lg"
                  onPress={handleComplete}
                  loading={isSubmitting}
                  rightIcon={<Ionicons name="checkmark-done" size={20} color={colors.white} />}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  dialogCard: {
    backgroundColor: colors.cardSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '92%',
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
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  stationaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  stationaryBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#065F46',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    maxWidth: 280,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  body: {
    marginTop: spacing.xs,
  },
  sectionBlock: {
    marginBottom: spacing.lg,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  stepDesc: {
    fontSize: 12,
    color: colors.darkNavy,
    marginTop: 3,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  pinInputWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  demoPinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  demoPinText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  pinInput: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    height: 60,
    width: '100%',
    fontSize: 28,
    fontWeight: fontWeights.bold,
    letterSpacing: 14,
    textAlign: 'center',
    color: colors.darkNavy,
    backgroundColor: colors.background,
  },
  meterRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  meterLabel: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  meterInput: {
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    height: 48,
    fontSize: 16,
    fontWeight: fontWeights.bold,
    paddingHorizontal: spacing.md,
    color: colors.darkNavy,
    backgroundColor: colors.background,
  },
  calcBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  calcBoxSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  calcBoxWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  calcTitle: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
  },
  calcSubSuccess: {
    fontSize: 10,
    color: '#065F46',
    marginTop: 1,
  },
  calcSubWarning: {
    fontSize: 10,
    color: '#92400E',
    marginTop: 1,
  },
  earningsSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  earningsValue: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  earningsSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    fontWeight: fontWeights.semibold,
  },
});
