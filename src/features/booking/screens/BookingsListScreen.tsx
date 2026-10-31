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
import { Button } from '../../../components/common/Button/Button';
import { EmptyState } from '../../../components/common/Feedback/EmptyState';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { BOOKING_STATUS_CONFIG, BookingRecord } from '../../../types/booking';
import { InvoiceViewModal } from '../../orders/components/InvoiceViewModal';
import { invoiceService, InvoiceRecord } from '../../../services/invoice/invoiceService';

interface BookingsListScreenProps {
  onBack?: () => void;
  onSelectBooking?: (booking: BookingRecord) => void;
}

export const BookingsListScreen: React.FC<BookingsListScreenProps> = ({
  onBack,
  onSelectBooking,
}) => {
  const { user } = useAuthStore();
  const { userBookings, isLoadingBookings, fetchUserBookings } = useBookingStore();
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<BookingRecord | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceRecord | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'recurring'>('all');

  useEffect(() => {
    if (user?.id) {
      fetchUserBookings(user.id);
    }
  }, [user, fetchUserBookings]);

  const filteredBookings = userBookings.filter((b) => {
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.darkNavy} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Water Orders</Text>
          <Text style={styles.headerSubtitle}>
            {userBookings.length} total tanker deliveries
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabBar}>
        {[
          { id: 'all' as const, label: `All Orders (${userBookings.length})` },
          { id: 'active' as const, label: 'Active Trips' },
          { id: 'recurring' as const, label: 'Subscriptions 🔁' },
        ].map((tab) => (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${tab.label}`}
            onPress={() => setFilterTab(tab.id)}
            style={[styles.filterTabPill, filterTab === tab.id && styles.filterTabPillActive]}
          >
            <Text
              style={[
                styles.filterTabPillText,
                filterTab === tab.id && styles.filterTabPillTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoadingBookings ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading order history...</Text>
          </View>
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            title="No Bookings Found"
            description="No orders match the selected tab filter."
            actionTitle="Find Tankers Now"
            onAction={onBack}
          />
        ) : (
          filteredBookings.map((b) => {
            const config = BOOKING_STATUS_CONFIG[b.status];

            return (
              <Pressable
                key={b.id}
                onPress={() => onSelectBooking?.(b)}
                style={({ pressed }) => [styles.bookingCard, pressed && styles.cardPressed]}
              >
                {/* Top Row: Ref + Status */}
                <View style={styles.cardTopRow}>
                  <View>
                    <Text style={styles.referenceNumber}>{b.booking_reference}</Text>
                    <Text style={styles.dateText}>{formatDate(b.created_at)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <StatusBadge
                      label={config.label}
                      variant={config.badgeVariant}
                      size="sm"
                    />
                    {b.delivery_type === 'recurring' && (
                      <View style={styles.subPill}>
                        <Ionicons name="repeat" size={10} color="#0284C7" />
                        <Text style={styles.subPillText}>
                          {b.recurring_days ? b.recurring_days.join(', ') : 'WEEKLY'}
                        </Text>
                      </View>
                    )}
                    {b.delivery_type === 'scheduled_once' && (
                      <View style={styles.scheduledPill}>
                        <Ionicons name="calendar" size={10} color="#7C3AED" />
                        <Text style={styles.scheduledPillText}>SCHEDULED</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Prorated Flow Meter Refund Alert if short delivered */}
                {typeof b.volume_discrepancy_liters === 'number' && b.volume_discrepancy_liters > 0 && (
                  <View style={styles.proratedAlertBox}>
                    <Ionicons name="shield-checkmark" size={13} color="#16A34A" />
                    <Text style={styles.proratedAlertText}>
                      Flow Meter Verified: {b.delivered_liters || b.capacity_liters - b.volume_discrepancy_liters}L pumped ({b.volume_discrepancy_liters}L shortfall refunded instantly to UPI)
                    </Text>
                  </View>
                )}

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* Body Row: Details + Price */}
                <View style={styles.cardBodyRow}>
                  <View style={styles.detailsCol}>
                    <Text style={styles.capacityText}>
                      {b.capacity_liters.toLocaleString('en-IN')} Litres • {b.water_type}
                    </Text>
                    <Text numberOfLines={1} style={styles.supplierText}>
                      {b.supplier_name || 'Sri Cauvery Water Supplies'}
                    </Text>
                    <Text numberOfLines={1} style={styles.addressText}>
                      {b.delivery_address}
                    </Text>
                  </View>

                  <View style={styles.priceCol}>
                    <Text style={styles.priceText}>
                      ₹{b.final_payable_amount.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.paymentMethodText}>
                      {b.payment_preference.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Footer Actions: Tax Invoice for completed/delivered orders */}
                <View style={styles.cardFooterRow}>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleOpenInvoice(b);
                    }}
                    style={styles.invoiceBtn}
                  >
                    <Ionicons name="document-text-outline" size={15} color={colors.primary} />
                    <Text style={styles.invoiceBtnText}>View Tax Invoice</Text>
                  </Pressable>

                  {b.status !== 'delivered' && b.status !== 'cancelled' && (
                    <Text style={styles.pinHintText}>
                      PIN: <Text style={{ fontWeight: fontWeights.bold, color: colors.darkNavy }}>{b.delivery_pin}</Text>
                    </Text>
                  )}
                </View>
              </Pressable>
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
  backBtn: {
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterTabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: '#FFFFFF',
  },
  filterTabPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: '#F1F5F9',
  },
  filterTabPillActive: {
    backgroundColor: colors.primary,
  },
  filterTabPillText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#64748B',
  },
  filterTabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  subPillText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#0284C7',
  },
  scheduledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  scheduledPillText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#7C3AED',
  },
  proratedAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    padding: 8,
    borderRadius: borderRadius.sm,
    marginTop: 8,
  },
  proratedAlertText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: fontWeights.semibold,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['4xl'],
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
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  cardPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referenceNumber: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  dateText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.sm,
  },
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  capacityText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  supplierText: {
    fontSize: 12,
    color: colors.darkNavy,
    fontWeight: fontWeights.semibold,
    marginTop: 2,
  },
  addressText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
  },
  paymentMethodText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 0.5,
    borderTopColor: colors.cardBorder,
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundMuted,
  },
  invoiceBtnText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    marginLeft: 4,
  },
  pinHintText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
