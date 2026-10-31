import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { useLocationStore } from '../../../stores/locationStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { PaymentPreference } from '../../../types/booking';
import { NearbyTanker } from '../../../types/discovery';

interface BookingReviewModalProps {
  visible: boolean;
  tanker: NearbyTanker | null;
  onClose: () => void;
  onBookingConfirmed: () => void;
}

export const BookingReviewModal: React.FC<BookingReviewModalProps> = ({
  visible,
  tanker,
  onClose,
  onBookingConfirmed,
}) => {
  const { user } = useAuthStore();
  const { activeAddressText, activeCoordinates } = useLocationStore();
  const {
    activeQuote,
    isLoadingQuote,
    requestPriceQuote,
    createBooking,
    isCreatingBooking,
  } = useBookingStore();

  const [paymentPref, setPaymentPref] = useState<PaymentPreference>('upi');
  const [deliveryType, setDeliveryType] = useState<'instant' | 'scheduled_once' | 'recurring'>('instant');
  const [scheduledSlot, setScheduledSlot] = useState<string>('07:00 AM - 09:00 AM');
  const [recurringDays, setRecurringDays] = useState<string[]>(['Mon', 'Thu']);

  // Request backend quote whenever modal opens
  useEffect(() => {
    if (visible && tanker) {
      requestPriceQuote(tanker, activeCoordinates.latitude, activeCoordinates.longitude);
    }
  }, [visible, tanker, activeCoordinates, requestPriceQuote]);

  if (!visible || !tanker) return null;

  const handleConfirm = async () => {
    if (!user?.id) return;

    const res = await createBooking(
      tanker,
      user.id,
      activeAddressText,
      activeCoordinates.latitude,
      activeCoordinates.longitude,
      paymentPref,
      {
        delivery_type: deliveryType,
        scheduled_for:
          deliveryType === 'scheduled_once'
            ? new Date(Date.now() + 24 * 3600 * 1000).toISOString()
            : undefined,
        recurring_days: deliveryType === 'recurring' ? recurringDays : undefined,
        recurring_time_slot: deliveryType !== 'instant' ? scheduledSlot : undefined,
      }
    );

    if (res.success) {
      onBookingConfirmed();
      onClose();
    }
  };

  const finalAmount = activeQuote?.final_payable_amount || tanker.estimated_total_price;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Review & Confirm Order</Text>
              <Text style={styles.headerSubtitle}>Authoritative quote direct from supplier</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Tanker Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.vehicleBadge}>
                <Ionicons name="water" size={28} color={colors.primary} />
                <Text style={styles.capacityBadgeText}>
                  {tanker.capacity_liters.toLocaleString('en-IN')} L
                </Text>
              </View>

              <View style={styles.summaryDetails}>
                <View style={styles.supplierTitleRow}>
                  <Text style={styles.supplierName}>{tanker.supplier_name}</Text>
                  <StatusBadge label="Verified Purity" variant="success" size="sm" />
                </View>
                <Text style={styles.vehicleNumber}>
                  Vehicle: {tanker.vehicle_number} • {tanker.water_type}
                </Text>
                <Text style={styles.etaText}>
                  Estimated Arrival: ~{tanker.eta_minutes} mins ({tanker.distance_km} km away)
                </Text>
              </View>
            </View>

            {/* Delivery Destination */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>DELIVERY ADDRESS</Text>
              <View style={styles.addressBox}>
                <Ionicons name="location-sharp" size={20} color={colors.primary} />
                <Text numberOfLines={2} style={styles.addressBoxText}>
                  {activeAddressText}
                </Text>
              </View>
            </View>

            {/* Delivery Timing: Instant vs Advance vs Recurring Subscription */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>DELIVERY TIMING & SCHEDULE</Text>
              <View style={styles.timingGrid}>
                {[
                  { id: 'instant' as const, title: 'Instant Dispatch', sub: 'Arriving in ~14 mins', icon: 'flash' },
                  { id: 'scheduled_once' as const, title: 'Advance Schedule', sub: 'Tomorrow 07:00 AM', icon: 'calendar-outline' },
                  { id: 'recurring' as const, title: 'Weekly Subscription', sub: 'Mon & Thu 06:00 AM', icon: 'repeat' },
                ].map((t) => {
                  const isSelected = deliveryType === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Select delivery timing ${t.title}`}
                      onPress={() => setDeliveryType(t.id)}
                      style={[
                        styles.timingOptionCard,
                        isSelected && styles.timingOptionCardActive,
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons
                          name={t.icon as any}
                          size={16}
                          color={isSelected ? colors.primary : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.timingTitle,
                            isSelected && styles.timingTitleActive,
                          ]}
                        >
                          {t.title}
                        </Text>
                      </View>
                      <Text style={styles.timingSub}>{t.sub}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Recurring Day Chips when Subscription is selected */}
              {deliveryType === 'recurring' && (
                <View style={styles.recurringConfigBox}>
                  <Text style={styles.recurringConfigLabel}>Repeat Every Week On:</Text>
                  <View style={styles.daysRow}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                      const isDaySelected = recurringDays.includes(day);
                      return (
                        <Pressable
                          key={day}
                          accessibilityRole="button"
                          accessibilityLabel={`Toggle day ${day}`}
                          onPress={() => {
                            if (isDaySelected) {
                              setRecurringDays(recurringDays.filter((d) => d !== day));
                            } else {
                              setRecurringDays([...recurringDays, day]);
                            }
                          }}
                          style={[
                            styles.dayChip,
                            isDaySelected && styles.dayChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayChipText,
                              isDaySelected && styles.dayChipTextActive,
                            ]}
                          >
                            {day}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Itemized Price Breakdown */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>PRICE BREAKDOWN</Text>

              {isLoadingQuote ? (
                <View style={styles.quoteLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.quoteLoadingText}>Calculating distance quote...</Text>
                </View>
              ) : (
                <View style={styles.priceCard}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceRowLabel}>Base Tanker Rate</Text>
                    <Text style={styles.priceRowValue}>
                      ₹{activeQuote?.base_price || tanker.base_price}
                    </Text>
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={styles.priceRowLabel}>
                      Delivery Charges ({activeQuote?.distance_km || tanker.distance_km} km)
                    </Text>
                    <Text style={styles.priceRowValue}>
                      ₹{activeQuote?.delivery_charge || Math.round(tanker.distance_km * tanker.price_per_km)}
                    </Text>
                  </View>

                  {(activeQuote?.surcharge || 0) > 0 && (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceRowLabel}>Peak Hour Surcharge</Text>
                      <Text style={styles.priceRowValue}>₹{activeQuote?.surcharge}</Text>
                    </View>
                  )}

                  <View style={styles.priceRow}>
                    <Text style={styles.priceRowLabel}>GST & Municipal Water Cess (5%)</Text>
                    <Text style={styles.priceRowValue}>
                      ₹{activeQuote?.tax_amount || Math.round(finalAmount * 0.05)}
                    </Text>
                  </View>

                  <View style={styles.priceDivider} />

                  <View style={styles.totalRow}>
                    <View>
                      <Text style={styles.totalLabel}>Total Payable Amount</Text>
                      <Text style={styles.totalSub}>All inclusive, no hidden charges</Text>
                    </View>
                    <Text style={styles.totalValue}>₹{finalAmount.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Payment Preference Selector */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>SELECT PAYMENT PREFERENCE</Text>

              <View style={styles.paymentOptions}>
                {[
                  {
                    id: 'upi' as const,
                    title: 'UPI (GPay / PhonePe / Paytm)',
                    subtitle: 'Instant authorization upon confirmation',
                    icon: 'flash-outline',
                  },
                  {
                    id: 'cash_on_delivery' as const,
                    title: 'Cash on Delivery',
                    subtitle: 'Pay driver cash after water is pumped',
                    icon: 'cash-outline',
                  },
                  {
                    id: 'card_online' as const,
                    title: 'Debit / Credit Card / NetBanking',
                    subtitle: 'Secure Indian payment gateway',
                    icon: 'card-outline',
                  },
                ].map((opt) => {
                  const isSelected = paymentPref === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setPaymentPref(opt.id)}
                      style={[styles.paymentCard, isSelected && styles.paymentCardSelected]}
                    >
                      <View style={[styles.paymentIconBox, isSelected && styles.paymentIconBoxSelected]}>
                        <Ionicons
                          name={opt.icon as any}
                          size={20}
                          color={isSelected ? colors.white : colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.paymentTitle, isSelected && styles.paymentTitleSelected]}>
                          {opt.title}
                        </Text>
                        <Text style={styles.paymentSubtitle}>{opt.subtitle}</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={isSelected ? colors.primary : colors.textMuted}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Sticky Bottom Action */}
          <View style={styles.footerAction}>
            <Button
              title={`Confirm & Dispatch • ₹${finalAmount.toLocaleString('en-IN')}`}
              variant="primary"
              size="lg"
              loading={isCreatingBooking}
              disabled={isLoadingQuote || isCreatingBooking}
              onPress={handleConfirm}
              rightIcon={<Ionicons name="checkmark-done" size={20} color={colors.white} />}
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
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.cardSurface,
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    maxHeight: '88%',
    ...shadows.modal,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.xl,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  vehicleBadge: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  capacityBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.heavy,
    color: colors.primary,
    marginTop: 2,
  },
  summaryDetails: {
    flex: 1,
  },
  supplierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  supplierName: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  vehicleNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  etaText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
    marginTop: 2,
  },
  sectionBlock: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundMuted,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.sm,
  },
  addressBoxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  timingGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  timingOptionCard: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    gap: 4,
  },
  timingOptionCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  timingTitle: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  timingTitleActive: {
    color: colors.primary,
  },
  timingSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recurringConfigBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  recurringConfigLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: '#64748B',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  quoteLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  quoteLoadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceCard: {
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priceRowLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  priceRowValue: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  totalSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: fontWeights.heavy,
    color: colors.primary,
  },
  paymentOptions: {
    gap: spacing.xs,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.cardSurface,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    gap: spacing.sm,
  },
  paymentCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  paymentIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconBoxSelected: {
    backgroundColor: colors.primary,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  paymentTitleSelected: {
    color: colors.primary,
  },
  paymentSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  footerAction: {
    padding: spacing.lg,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardSurface,
  },
});

