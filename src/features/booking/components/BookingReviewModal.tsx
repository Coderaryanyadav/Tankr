import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { PriceDisplay } from '../../../components/common/Card/PriceDisplay';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { useLocationStore } from '../../../stores/locationStore';
import { borderRadius, colors, fontSizes, fontWeights, shadows, spacing } from '../../../theme';
import { BookingRecord, PaymentPreference } from '../../../types/booking';
import { NearbyTanker } from '../../../types/discovery';

export interface BookingReviewModalProps {
  visible: boolean;
  tanker: NearbyTanker | null;
  onClose: () => void;
  onBookingConfirmed: (booking: BookingRecord) => void;
  onChangeAddress?: () => void;
}

export const BookingReviewModal: React.FC<BookingReviewModalProps> = ({
  visible,
  tanker,
  onClose,
  onBookingConfirmed,
  onChangeAddress,
}) => {
  const { user } = useAuthStore();
  const { activeAddressText, activeCoordinates } = useLocationStore();
  const {
    activeQuote,
    isLoadingQuote,
    requestPriceQuote,
    createBooking,
    isCreatingBooking,
    bookingError,
  } = useBookingStore();

  const [paymentPref, setPaymentPref] = useState<PaymentPreference>('upi');
  const [deliveryType, setDeliveryType] = useState<'instant' | 'scheduled_once' | 'recurring'>('instant');
  const [scheduledSlot, setScheduledSlot] = useState<string>('07:00 AM - 09:00 AM');
  const [recurringDays, setRecurringDays] = useState<string[]>(['Mon', 'Thu']);
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>('');
  const [showInstructionsInput, setShowInstructionsInput] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Request backend quote whenever modal opens or delivery address changes
  useEffect(() => {
    if (visible && tanker) {
      setErrorMessage(null);
      requestPriceQuote(tanker, activeCoordinates.latitude, activeCoordinates.longitude);
    }
  }, [visible, tanker, activeCoordinates, requestPriceQuote]);

  if (!visible || !tanker) return null;

  const handleConfirm = async () => {
    if (!user?.id) return;
    setErrorMessage(null);

    const fullAddressWithInstructions = deliveryInstructions.trim()
      ? `${activeAddressText} (Notes: ${deliveryInstructions.trim()})`
      : activeAddressText;

    const res = await createBooking(
      tanker,
      user.id,
      fullAddressWithInstructions,
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

    if (res.success && res.booking) {
      onBookingConfirmed(res.booking);
      onClose();
    } else {
      setErrorMessage(res.error || 'Unable to place booking. Please try again.');
    }
  };

  const finalAmount = activeQuote?.final_payable_amount || tanker.estimated_total_price;
  const basePrice = activeQuote?.base_price || tanker.base_price;
  const deliveryCharge = activeQuote?.delivery_charge || Math.round(tanker.distance_km * tanker.price_per_km * 100) / 100;
  const surcharge = activeQuote?.surcharge || 0;
  const taxAmount = activeQuote?.tax_amount || Math.round((basePrice + deliveryCharge + surcharge) * 0.05 * 100) / 100;

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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close review modal"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Error Banner */}
          {(errorMessage || bookingError) && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorBannerText}>{errorMessage || bookingError}</Text>
            </View>
          )}

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. Selected Supplier & Tanker Card */}
            <View style={styles.summaryCard}>
              <View style={styles.vehicleBadge}>
                <Ionicons name="water" size={28} color={colors.primary} />
                <Text style={styles.capacityBadgeText}>
                  {tanker.capacity_liters.toLocaleString('en-IN')} L
                </Text>
              </View>

              <View style={styles.summaryDetails}>
                <View style={styles.supplierTitleRow}>
                  <Text numberOfLines={1} style={styles.supplierName}>
                    {tanker.supplier_name}
                  </Text>
                  <StatusBadge label="BIS-10500 Verified" variant="success" size="sm" />
                </View>
                <Text style={styles.vehicleNumber}>
                  Vehicle: {tanker.vehicle_number} • {tanker.water_type}
                </Text>
                <Text style={styles.etaText}>
                  Estimated Arrival: ~{tanker.eta_minutes} mins ({tanker.distance_km} km away)
                </Text>
              </View>
            </View>

            {/* 2. Delivery Destination & Address Confirmation */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>DELIVERY ADDRESS</Text>
                {onChangeAddress && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Change delivery address"
                    onPress={() => {
                      onClose();
                      onChangeAddress();
                    }}
                    style={styles.changeAddressBtn}
                  >
                    <Text style={styles.changeAddressText}>Change Address</Text>
                    <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                  </Pressable>
                )}
              </View>

              <View style={styles.addressBox}>
                <Ionicons name="location-sharp" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={styles.addressBoxText}>
                    {activeAddressText}
                  </Text>
                  <Text style={styles.addressHint}>Pin accurately aligned to your sump</Text>
                </View>
              </View>

              {/* Delivery Instructions Toggle */}
              {!showInstructionsInput ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add delivery notes or gate instructions"
                  onPress={() => setShowInstructionsInput(true)}
                  style={styles.addNotesBtn}
                >
                  <Ionicons name="chatbox-ellipses-outline" size={14} color={colors.primary} />
                  <Text style={styles.addNotesText}>+ Add Sump Instructions or Gate Code</Text>
                </Pressable>
              ) : (
                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructionsLabel}>Sump & Gate Instructions for Driver:</Text>
                  <TextInput
                    value={deliveryInstructions}
                    onChangeText={setDeliveryInstructions}
                    placeholder="e.g. Sump is behind Building B, call guard on arrival"
                    placeholderTextColor={colors.textMuted}
                    style={styles.instructionsInput}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              )}
            </View>

            {/* 3. Delivery Timing: Instant vs Advance vs Recurring Subscription */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>DELIVERY TIMING & SCHEDULE</Text>
              <View style={styles.timingGrid}>
                {[
                  { id: 'instant' as const, title: 'Instant Dispatch', sub: 'Arriving in ~15 mins', icon: 'flash' },
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

            {/* 4. Transparent Itemized Price Breakdown */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>TRANSPARENT PRICE BREAKDOWN</Text>

              {isLoadingQuote ? (
                <View style={styles.quoteLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.quoteLoadingText}>Validating distance tariff with server...</Text>
                </View>
              ) : (
                <View style={styles.priceCard}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceRowLabel}>Base Water Capacity Tariff</Text>
                    <Text style={styles.priceRowValue}>₹{basePrice.toFixed(2)}</Text>
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={styles.priceRowLabel}>
                      Delivery & Mileage ({activeQuote?.distance_km || tanker.distance_km} km)
                    </Text>
                    <Text style={styles.priceRowValue}>₹{deliveryCharge.toFixed(2)}</Text>
                  </View>

                  {surcharge > 0 && (
                    <View style={styles.priceRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.priceRowLabel, { color: colors.warning }]}>
                          Peak Evening Surcharge (18-22h IST)
                        </Text>
                        <Ionicons name="flash" size={12} color={colors.warning} />
                      </View>
                      <Text style={[styles.priceRowValue, { color: colors.warning }]}>
                        +₹{surcharge.toFixed(2)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.priceRow}>
                    <Text style={styles.priceRowLabel}>GST (5% SAC 9965 Potable Freight)</Text>
                    <Text style={styles.priceRowValue}>₹{taxAmount.toFixed(2)}</Text>
                  </View>

                  <View style={styles.priceDivider} />

                  <View style={styles.totalRow}>
                    <View>
                      <Text style={styles.totalLabel}>Final Payable Amount</Text>
                      <Text style={styles.totalSub}>All inclusive, zero hidden charges</Text>
                    </View>
                    <Text style={styles.totalValue}>₹{finalAmount.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* 5. Payment Selection (Supported Methods Only) */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>SELECT PAYMENT METHOD</Text>

              <View style={styles.paymentOptions}>
                {[
                  {
                    id: 'upi' as const,
                    title: 'Instant UPI (GPay / PhonePe / Paytm)',
                    subtitle: 'Instant authorization upon confirmation',
                    icon: 'flash-outline',
                    badge: 'RECOMMENDED',
                  },
                  {
                    id: 'cash_on_delivery' as const,
                    title: 'Cash on Delivery (Pay at Sump)',
                    subtitle: 'Pay driver cash after water is pumped',
                    icon: 'cash-outline',
                  },
                  {
                    id: 'card_online' as const,
                    title: 'Debit / Credit Card / NetBanking',
                    subtitle: 'RBI compliant secure gateway',
                    icon: 'card-outline',
                  },
                ].map((opt) => {
                  const isSelected = paymentPref === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Select payment method ${opt.title}`}
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.paymentTitle, isSelected && styles.paymentTitleSelected]}>
                            {opt.title}
                          </Text>
                          {opt.badge && (
                            <View style={styles.recBadge}>
                              <Text style={styles.recBadgeText}>{opt.badge}</Text>
                            </View>
                          )}
                        </View>
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

            {/* Bottom Padding */}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Sticky Bottom Action */}
          <View style={styles.footerAction}>
            <Button
              title={
                isCreatingBooking
                  ? 'Reserving Tanker...'
                  : `Book Tanker • ₹${finalAmount.toLocaleString('en-IN')}`
              }
              variant="primary"
              size="lg"
              loading={isCreatingBooking}
              disabled={isLoadingQuote || isCreatingBooking}
              onPress={handleConfirm}
              rightIcon={
                !isCreatingBooking ? (
                  <Ionicons name="checkmark-done" size={20} color={colors.white} />
                ) : undefined
              }
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
    maxHeight: '92%',
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.error,
  },
  errorBannerText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.error,
    fontWeight: fontWeights.semibold,
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
    flexShrink: 1,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  changeAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeAddressText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  addressBoxText: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
    lineHeight: 18,
  },
  addressHint: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  addNotesText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  instructionsContainer: {
    marginTop: spacing.xs,
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  instructionsLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  instructionsInput: {
    fontSize: 12,
    color: colors.darkNavy,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 44,
  },
  timingGrid: {
    flexDirection: 'column',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  timingOptionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardSurface,
  },
  timingOptionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  timingTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  timingTitleActive: {
    color: colors.primary,
  },
  timingSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginLeft: 22,
  },
  recurringConfigBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.backgroundMuted,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  recurringConfigLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: spacing.xs,
  },
  daysRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardSurface,
    alignItems: 'center',
  },
  dayChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  dayChipText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  dayChipTextActive: {
    color: colors.white,
  },
  quoteLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  quoteLoadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceCard: {
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRowLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceRowValue: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  totalSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: fontWeights.heavy,
    color: colors.primary,
  },
  paymentOptions: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardSurface,
    gap: spacing.md,
  },
  paymentCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  paymentIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundMuted,
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
  recBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
  },
  recBadgeText: {
    fontSize: 8,
    fontWeight: fontWeights.heavy,
    color: colors.success,
  },
  footerAction: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardSurface,
  },
});
