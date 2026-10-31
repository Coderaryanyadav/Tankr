import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../../components/common/Feedback/EmptyState';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { BOOKING_STATUS_CONFIG, BookingRecord, BookingStatus } from '../../../types/booking';
import { InvoiceViewModal } from '../../orders/components/InvoiceViewModal';
import { invoiceService, InvoiceRecord } from '../../../services/invoice/invoiceService';
import { PREVIEW_BOOKING, PREVIEW_INVOICE } from '../../../utils/previewDemoData';

interface BookingsListScreenProps {
  onBack?: () => void;
  onSelectBooking?: (booking: BookingRecord) => void;
  initialModal?: string;
}

// Stage configuration for active order delivery progress
const DELIVERY_STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered', label: 'Delivered' },
];

function getActiveStepIndex(status: BookingStatus): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'accepted':
    case 'supplier_assigned':
      return 1;
    case 'driver_assigned':
    case 'en_route':
      return 2;
    case 'arrived':
    case 'delivering':
      return 2.5;
    case 'delivered':
      return 3;
    default:
      return 0;
  }
}

export const BookingsListScreen: React.FC<BookingsListScreenProps> = ({
  onBack,
  onSelectBooking,
  initialModal,
}) => {
  const { user } = useAuthStore();
  const { userBookings, isLoadingBookings, fetchUserBookings } = useBookingStore();
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<BookingRecord | null>(
    initialModal === 'invoice' ? PREVIEW_BOOKING : null
  );
  const [invoiceData, setInvoiceData] = useState<InvoiceRecord | null>(
    initialModal === 'invoice' ? (PREVIEW_INVOICE as any) : null
  );
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'recurring'>('all');

  const sourceBookings = userBookings.length > 0 ? userBookings : [PREVIEW_BOOKING];

  useEffect(() => {
    if (user?.id) {
      fetchUserBookings(user.id);
    }
  }, [user, fetchUserBookings]);

  const activeCount = sourceBookings.filter(
    (b) => b.status !== 'delivered' && b.status !== 'cancelled'
  ).length;

  const recurringCount = sourceBookings.filter(
    (b) => b.delivery_type === 'recurring' || b.delivery_type === 'scheduled_once'
  ).length;

  const filteredBookings = sourceBookings.filter((b) => {
    if (filterTab === 'active') return b.status !== 'delivered' && b.status !== 'cancelled';
    if (filterTab === 'recurring') return b.delivery_type === 'recurring' || b.delivery_type === 'scheduled_once';
    return true;
  });

  const handleOpenInvoice = async (booking: BookingRecord) => {
    setSelectedInvoiceBooking(booking);
    const inv = await invoiceService.getInvoiceByBookingId(booking.id);
    setInvoiceData(inv);
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Today';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Screen Header */}
      <View style={styles.header}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={colors.darkNavy} />
          </Pressable>
        )}
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>My Water Orders</Text>
          <Text style={styles.headerSubtitle}>
            {userBookings.length} total deliveries • {activeCount} active
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { id: 'all' as const, label: `All Orders (${userBookings.length})` },
            { id: 'active' as const, label: `Active Trips (${activeCount})` },
            { id: 'recurring' as const, label: `Subscriptions (${recurringCount})` },
          ].map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityLabel={`Filter ${tab.label}`}
                onPress={() => setFilterTab(tab.id)}
                style={[styles.filterTabPill, isActive && styles.filterTabPillActive]}
              >
                <Text
                  style={[
                    styles.filterTabPillText,
                    isActive && styles.filterTabPillTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoadingBookings ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching your water deliveries...</Text>
          </View>
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            title="No Bookings Found"
            description={
              filterTab === 'active'
                ? 'You have no active water deliveries in transit right now.'
                : filterTab === 'recurring'
                ? 'No scheduled or recurring subscriptions configured.'
                : 'You have not booked any water tankers yet.'
            }
            actionTitle={onBack ? 'Book a Tanker' : undefined}
            onAction={onBack}
          />
        ) : (
          filteredBookings.map((b) => {
            const config = BOOKING_STATUS_CONFIG[b.status] || {
              label: b.status,
              badgeVariant: 'neutral' as const,
              stepIndex: 1,
            };
            const isActiveTrip = b.status !== 'delivered' && b.status !== 'cancelled';
            const activeStep = getActiveStepIndex(b.status);

            return (
              <View key={b.id} style={styles.bookingCard}>
                {/* 1. Top Section: Booking ID, Date, Status */}
                <View style={styles.cardHeader}>
                  <View>
                    <View style={styles.refRow}>
                      <Text style={styles.referenceNumber}>#{b.booking_reference}</Text>
                      {b.delivery_type === 'recurring' && (
                        <View style={styles.subBadge}>
                          <Ionicons name="repeat" size={10} color="#0284C7" />
                          <Text style={styles.subBadgeText}>RECURRING</Text>
                        </View>
                      )}
                      {b.delivery_type === 'scheduled_once' && (
                        <View style={styles.scheduledBadge}>
                          <Ionicons name="calendar-outline" size={10} color="#7C3AED" />
                          <Text style={styles.scheduledBadgeText}>SCHEDULED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.dateText}>{formatDate(b.created_at)}</Text>
                  </View>

                  <StatusBadge
                    label={config.label}
                    variant={config.badgeVariant}
                    size="sm"
                  />
                </View>

                {/* 2. Delivery Progress Stepper (Only for Active Trips) */}
                {isActiveTrip && (
                  <View style={styles.progressContainer}>
                    <View style={styles.stepperTrack}>
                      {DELIVERY_STEPS.map((step, idx) => {
                        const isCompleted = activeStep > idx;
                        const isCurrent = Math.floor(activeStep) === idx;

                        return (
                          <React.Fragment key={step.key}>
                            {/* Step Node */}
                            <View style={styles.stepNodeWrap}>
                              <View
                                style={[
                                  styles.stepDot,
                                  isCompleted && styles.stepDotCompleted,
                                  isCurrent && styles.stepDotCurrent,
                                ]}
                              >
                                {isCompleted ? (
                                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                                ) : (
                                  <View
                                    style={[
                                      styles.stepInnerDot,
                                      isCurrent && styles.stepInnerDotCurrent,
                                    ]}
                                  />
                                )}
                              </View>
                              <Text
                                style={[
                                  styles.stepLabel,
                                  (isCompleted || isCurrent) && styles.stepLabelActive,
                                ]}
                              >
                                {step.label}
                              </Text>
                            </View>

                            {/* Connecting Line between steps */}
                            {idx < DELIVERY_STEPS.length - 1 && (
                              <View
                                style={[
                                  styles.stepLine,
                                  activeStep > idx && styles.stepLineFilled,
                                ]}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* 3. Main Section: Capacity, Water Category, Supplier, Address, Price */}
                <View style={styles.cardMain}>
                  <View style={styles.tankerSpecRow}>
                    <View style={styles.capacityBadge}>
                      <Ionicons name="water" size={14} color={colors.primary} />
                      <Text style={styles.capacityBadgeText}>
                        {b.capacity_liters.toLocaleString('en-IN')} Litres
                      </Text>
                    </View>
                    <View style={styles.gradeBadge}>
                      <Text style={styles.gradeBadgeText}>{b.water_type}</Text>
                    </View>
                  </View>

                  <View style={styles.supplierRow}>
                    <Ionicons name="business-outline" size={13} color={colors.textSecondary} />
                    <Text numberOfLines={1} style={styles.supplierText}>
                      {b.supplier_name || 'Verified Water Fleet'}
                    </Text>
                  </View>

                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                    <Text numberOfLines={1} style={styles.addressText}>
                      {b.delivery_address}
                    </Text>
                  </View>

                  <View style={styles.priceRow}>
                    <View>
                      <Text style={styles.priceLabel}>Total Amount</Text>
                      <Text style={styles.priceText}>
                        ₹{b.final_payable_amount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.paymentMethodPill}>
                      <Ionicons
                        name={b.payment_preference === 'cash_on_delivery' ? 'cash-outline' : 'card-outline'}
                        size={12}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.paymentMethodText}>
                        {b.payment_preference === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online / UPI'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Prorated Flow Meter Refund Alert if short delivered */}
                {typeof b.volume_discrepancy_liters === 'number' && b.volume_discrepancy_liters > 0 && (
                  <View style={styles.flowMeterAlert}>
                    <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
                    <Text style={styles.flowMeterAlertText}>
                      Flow Meter Verified: {b.delivered_liters || b.capacity_liters - b.volume_discrepancy_liters}L delivered • {b.volume_discrepancy_liters}L discrepancy refunded
                    </Text>
                  </View>
                )}

                {/* 4. Bottom Section: Actionable Buttons (Strict PIN Privacy) */}
                <View style={styles.cardActionsRow}>
                  {isActiveTrip ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Track live delivery on map"
                      onPress={() => onSelectBooking?.(b)}
                      style={styles.trackDeliveryBtn}
                    >
                      <Ionicons name="navigate-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.trackDeliveryBtnText}>Track Live Delivery</Text>
                      <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                    </Pressable>
                  ) : (
                    <View style={styles.completedActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="View official tax invoice"
                        onPress={() => handleOpenInvoice(b)}
                        style={styles.invoiceBtn}
                      >
                        <Ionicons name="document-text-outline" size={15} color={colors.primary} />
                        <Text style={styles.invoiceBtnText}>View Tax Invoice</Text>
                      </Pressable>

                      {onSelectBooking && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="View delivery receipt"
                          onPress={() => onSelectBooking(b)}
                          style={styles.detailsBtn}
                        >
                          <Text style={styles.detailsBtnText}>Order Details</Text>
                          <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} />
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Official Tax Invoice Modal */}
      <InvoiceViewModal
        visible={!!selectedInvoiceBooking}
        booking={selectedInvoiceBooking}
        invoice={invoiceData}
        onClose={() => {
          setSelectedInvoiceBooking(null);
          setInvoiceData(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: fontWeights.medium,
  },
  filterTabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  filterTabPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabPillText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#64748B',
  },
  filterTabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100, // Safe clearance above bottom tab bar
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  referenceNumber: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  subBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#0284C7',
  },
  scheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  scheduledBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#7C3AED',
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  progressContainer: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepperTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  stepNodeWrap: {
    alignItems: 'center',
    width: 60,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotCompleted: {
    backgroundColor: '#16A34A',
  },
  stepDotCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
  stepInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  stepInnerDotCurrent: {
    backgroundColor: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    color: '#94A3B8',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.darkNavy,
    fontWeight: fontWeights.bold,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  stepLineFilled: {
    backgroundColor: '#16A34A',
  },
  cardMain: {
    paddingVertical: spacing.sm,
    gap: 6,
  },
  tankerSpecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  capacityBadgeText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  gradeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gradeBadgeText: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  supplierText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: fontWeights.medium,
  },
  priceText: {
    fontSize: 16,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentMethodText: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  flowMeterAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 4,
  },
  flowMeterAlertText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: fontWeights.medium,
    flex: 1,
  },
  cardActionsRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  trackDeliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  trackDeliveryBtnText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  completedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  invoiceBtnText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
});
