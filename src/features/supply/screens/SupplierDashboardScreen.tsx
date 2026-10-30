import React from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { Card } from '../../../components/common/Card/Card';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { useSupplyStore } from '../../../stores/supplyStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

export const SupplierDashboardScreen: React.FC = () => {
  const {
    pendingRequests,
    fleetTankers,
    supplierMetrics,
    acceptSupplierBooking,
    rejectSupplierBooking,
    setActiveRole,
  } = useSupplyStore();

  const handleAccept = async (id: string, ref: string) => {
    const res = await acceptSupplierBooking(id);
    if (res.success) {
      Alert.alert('Order Accepted!', `Order ${ref} has been accepted. Dispatching driver.`);
    }
  };

  const handleReject = async (id: string) => {
    await rejectSupplierBooking(id);
    Alert.alert('Order Declined', 'Order was returned to dispatch pool.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <StatusBadge label="Supplier Portal" variant="primary" size="sm" />
            <StatusBadge label="Verified Partner" variant="success" size="sm" />
          </View>
          <Text style={styles.supplierTitle}>Sri Cauvery Water Supplies</Text>
          <Text style={styles.supplierSubtitle}>Depot #4, Whitefield Main Road</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch to Customer Mode"
          onPress={() => setActiveRole('customer')}
          style={styles.switchModePill}
        >
          <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
          <Text style={styles.switchModeText}>Customer Mode</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Daily Revenue Cards */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TODAY'S REVENUE</Text>
            <Text style={styles.metricValue}>
              ₹{supplierMetrics.todayRevenue.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.metricGrowth}>+18% vs yesterday</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>WATER DELIVERED</Text>
            <Text style={styles.metricValue}>
              {(supplierMetrics.todayLiters / 1000).toFixed(0)}k Litres
            </Text>
            <Text style={styles.metricGrowth}>6 completed sumps</Text>
          </View>
        </View>

        {/* Incoming Booking Requests (Explicit Acceptance Required) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Incoming Booking Requests</Text>
            <View style={styles.pendingCounterPill}>
              <Text style={styles.pendingCounterText}>{pendingRequests.length} Pending</Text>
            </View>
          </View>

          {pendingRequests.length === 0 ? (
            <Card variant="standard" style={{ marginVertical: spacing.xs }}>
              <Text style={styles.emptyRequestsText}>
                No pending requests right now. Your fleet is available on the customer discovery map.
              </Text>
            </Card>
          ) : (
            pendingRequests.map((req) => (
              <Card
                key={req.id}
                variant="elevated"
                style={styles.requestCard}
              >
                <View style={styles.requestTopRow}>
                  <View>
                    <Text style={styles.requestRefText}>{req.booking_reference}</Text>
                    <Text style={styles.requestCapacityText}>
                      {req.capacity_liters.toLocaleString('en-IN')} L • {req.water_type}
                    </Text>
                  </View>
                  <Text style={styles.requestPayoutText}>
                    ₹{req.final_payable_amount.toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                  <Text numberOfLines={2} style={styles.addressText}>
                    {req.delivery_address} ({req.delivery_distance_km} km away)
                  </Text>
                </View>

                {/* Acceptance Actions */}
                <View style={styles.actionButtonsRow}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Button
                      title="Accept Dispatch"
                      variant="primary"
                      size="md"
                      onPress={() => handleAccept(req.id, req.booking_reference)}
                      leftIcon={<Ionicons name="checkmark-circle" size={18} color={colors.white} />}
                    />
                  </View>

                  <View style={{ width: 100 }}>
                    <Button
                      title="Decline"
                      variant="outline"
                      size="md"
                      onPress={() => handleReject(req.id)}
                    />
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Fleet Vehicles Status */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Available Fleet Vehicles</Text>
          {fleetTankers.map((tanker) => (
            <View key={tanker.id} style={styles.fleetCard}>
              <View style={styles.fleetAvatar}>
                <Ionicons name="water" size={20} color={colors.primary} />
              </View>

              <View style={styles.fleetDetails}>
                <Text style={styles.fleetRegText}>{tanker.vehicle_number}</Text>
                <Text style={styles.fleetSubtext}>
                  {tanker.capacity_liters.toLocaleString('en-IN')} L • Driver: {tanker.driver_name}
                </Text>
              </View>

              <StatusBadge
                label={tanker.is_available ? 'Available' : 'On Delivery'}
                variant={tanker.is_available ? 'success' : 'warning'}
                size="sm"
              />
            </View>
          ))}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: 4,
  },
  supplierTitle: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  supplierSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  switchModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  switchModeText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
    marginVertical: 2,
  },
  metricGrowth: {
    fontSize: 11,
    color: colors.success,
    fontWeight: fontWeights.semibold,
  },
  sectionBlock: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  pendingCounterPill: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  pendingCounterText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.warning,
  },
  emptyRequestsText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  requestCard: {
    marginBottom: spacing.sm,
  },
  requestTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  requestRefText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  requestCapacityText: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 2,
  },
  requestPayoutText: {
    fontSize: 18,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  fleetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginTop: spacing.xs,
  },
  fleetAvatar: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  fleetDetails: {
    flex: 1,
  },
  fleetRegText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  fleetSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
});

