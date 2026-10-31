import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { useBookingStore } from '../../../stores/bookingStore';
import { DisputeService } from '../../../services/dispute/disputeService';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface FairMeteringModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FairMeteringModal: React.FC<FairMeteringModalProps> = ({
  visible,
  onClose,
}) => {
  const { userBookings } = useBookingStore();
  const [selectedBookingId, setSelectedBookingId] = useState<string>(
    userBookings.length > 0 ? userBookings[0].id : ''
  );
  const [claimedShortfall, setClaimedShortfall] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disputeSuccessRef, setDisputeSuccessRef] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedBooking = userBookings.find((b) => b.id === selectedBookingId) || userBookings[0];

  const handleSubmitDispute = async () => {
    if (!selectedBooking) {
      setErrorMessage('No booking selected for dispute audit.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Please provide a brief description of the meter discrepancy.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const shortfallLiters = claimedShortfall ? parseInt(claimedShortfall, 10) : undefined;
      const res = await DisputeService.submitDispute({
        bookingId: selectedBooking.id,
        category: 'short_delivery',
        reason: description.trim(),
        litersReceived: shortfallLiters ? Math.max(0, selectedBooking.capacity_liters - shortfallLiters) : undefined,
      });

      if (res.success) {
        setDisputeSuccessRef(`DSP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      } else {
        setErrorMessage(res.error || 'Could not register dispute. Please check connectivity.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit dispute audit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setDisputeSuccessRef(null);
    setDescription('');
    setClaimedShortfall('');
    setErrorMessage(null);
    onClose();
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
            <Text style={styles.headerTitle}>Fair Metering & Guarantee</Text>
            <Text style={styles.headerSubtitle}>Digital Handshake & Instant Refund Policy</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Policy Banner */}
          <View style={styles.guaranteeHeroCard}>
            <View style={styles.guaranteeIconCircle}>
              <Ionicons name="speedometer" size={26} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.guaranteeTitle}>100% Volume or Instant Refund</Text>
              <Text style={styles.guaranteeSub}>
                Every TANKR vehicle is equipped with an ultrasonic flow meter calibrated to Class B commercial accuracy. If volume pumped is less than ordered, you receive an automated prorated refund within minutes.
              </Text>
            </View>
          </View>

          {/* Three Pillars of Fair Metering */}
          <Text style={styles.sectionTitle}>HOW METER AUDITING WORKS</Text>
          <View style={styles.pillarsGrid}>
            <View style={styles.pillarCard}>
              <Ionicons name="keypad-outline" size={20} color={colors.primary} />
              <Text style={styles.pillarTitle}>1. Secure PIN Handshake</Text>
              <Text style={styles.pillarDesc}>
                Driver cannot start the pump motor until your 4-digit PIN is verified on the delivery console.
              </Text>
            </View>

            <View style={styles.pillarCard}>
              <Ionicons name="pulse-outline" size={20} color={colors.primary} />
              <Text style={styles.pillarTitle}>2. Live Flow Telemetry</Text>
              <Text style={styles.pillarDesc}>
                Real-time liters delivered are broadcasted via IoT sensors directly to your TANKR app.
              </Text>
            </View>

            <View style={styles.pillarCard}>
              <Ionicons name="wallet-outline" size={20} color="#16A34A" />
              <Text style={styles.pillarTitle}>3. Instant Prorated Refund</Text>
              <Text style={styles.pillarDesc}>
                Any shortfall below the ordered capacity is calculated per liter and returned to your original payment method.
              </Text>
            </View>
          </View>

          {/* Dispute Confirmation Card if registered */}
          {disputeSuccessRef ? (
            <View style={styles.successCard}>
              <View style={styles.successIconCircle}>
                <Ionicons name="shield-checkmark" size={38} color="#16A34A" />
              </View>
              <Text style={styles.successTitle}>Dispute Audit Registered!</Text>
              <Text style={styles.disputeRefText}>Audit Case: #{disputeSuccessRef}</Text>
              <Text style={styles.successDesc}>
                Our Flow-Meter Calibration Team is auditing the telemetry logs for order #{selectedBooking?.booking_reference}. If a volume discrepancy is verified, your refund of ₹
                {Math.round(
                  ((claimedShortfall ? parseInt(claimedShortfall, 10) : 500) /
                    (selectedBooking?.capacity_liters || 5000)) *
                    (selectedBooking?.final_payable_amount || 840)
                )}{' '}
                will be credited directly to your UPI account.
              </Text>
              <Button title="Done" variant="primary" size="md" onPress={handleReset} />
            </View>
          ) : (
            <>
              {/* Form to Raise Flow-Meter Discrepancy */}
              <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
                RAISE FLOW-METER DISCREPANCY AUDIT
              </Text>

              {userBookings.length === 0 ? (
                <View style={styles.noBookingsNotice}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.noBookingsText}>
                    You have no past or active deliveries to dispute. Disputes can be submitted immediately following delivery completion.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>SELECT DELIVERY TO AUDIT</Text>
                  <View style={styles.bookingChips}>
                    {userBookings.slice(0, 3).map((b) => {
                      const isSel = (selectedBooking?.id || userBookings[0].id) === b.id;
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => setSelectedBookingId(b.id)}
                          style={[styles.bookingChip, isSel && styles.bookingChipActive]}
                        >
                          <Text style={[styles.chipRef, isSel && styles.chipRefActive]}>
                            #{b.booking_reference}
                          </Text>
                          <Text style={[styles.chipSub, isSel && styles.chipSubActive]}>
                            {b.capacity_liters.toLocaleString('en-IN')}L • ₹{b.final_payable_amount}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>
                    ESTIMATED SHORTFALL (LITRES)
                  </Text>
                  <TextInput
                    style={styles.shortfallInput}
                    placeholder="e.g. 500"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={claimedShortfall}
                    onChangeText={setClaimedShortfall}
                  />

                  <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>
                    DESCRIPTION / SUMP READING DETAILS
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Explain discrepancy (e.g. Sump depth measurement before & after fill showed only ~4,500L filled instead of 5,000L ordered)..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    value={description}
                    onChangeText={setDescription}
                  />

                  {errorMessage && (
                    <View style={styles.errorBanner}>
                      <Ionicons name="alert-circle" size={16} color={colors.error} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  )}

                  <Button
                    title={isSubmitting ? 'Submitting Audit Request...' : 'Submit Meter Dispute for Audit'}
                    variant="primary"
                    size="lg"
                    onPress={handleSubmitDispute}
                    loading={isSubmitting}
                    disabled={isSubmitting || !description.trim()}
                  />
                </>
              )}
            </>
          )}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  guaranteeHeroCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  guaranteeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0369A1',
  },
  guaranteeSub: {
    fontSize: 11,
    color: '#0C4A6E',
    marginTop: 3,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: fontWeights.heavy,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  pillarsGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pillarCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    ...shadows.card,
  },
  pillarTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 6,
  },
  pillarDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  noBookingsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardSurface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  noBookingsText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  bookingChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  bookingChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bookingChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipRef: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  chipRefActive: {
    color: colors.white,
  },
  chipSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  chipSubActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  shortfallInput: {
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: spacing.md,
  },
  textInput: {
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 13,
    color: colors.darkNavy,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 11,
    color: colors.error,
  },
  successCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: spacing.md,
    ...shadows.card,
  },
  successIconCircle: {
    marginBottom: spacing.sm,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: 4,
  },
  disputeRefText: {
    fontSize: 14,
    fontWeight: fontWeights.heavy,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  successDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
});
