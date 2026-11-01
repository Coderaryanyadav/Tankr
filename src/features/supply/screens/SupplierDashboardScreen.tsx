import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { Card } from '../../../components/common/Card/Card';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { AddVehicleModal } from '../components/AddVehicleModal';
import { SupplierPricingModal } from '../components/SupplierPricingModal';
import { SupplierSettlementsModal } from '../components/SupplierSettlementsModal';
import { useSupplyStore } from '../../../stores/supplyStore';
import { useAuthStore } from '../../../stores/authStore';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../../../theme';
import { haptics } from '../../../theme/haptics';
import { PREVIEW_FLEET, PREVIEW_BOOKING } from '../../../utils/previewDemoData';

interface SupplierDashboardScreenProps {
  initialModal?: string;
}

type SupplierTab = 'dispatch' | 'fleet' | 'settlements' | 'pricing';

export const SupplierDashboardScreen: React.FC<SupplierDashboardScreenProps> = ({ initialModal }) => {
  const { user, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SupplierTab>('dispatch');
  const [addVehicleVisible, setAddVehicleVisible] = useState(initialModal === 'add_vehicle');
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [settlementsModalVisible, setSettlementsModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 640 && width < 1024;
  const isMobile = width < 640;

  const {
    supplierId,
    supplierBusinessName,
    verificationStatus,
    pendingRequests,
    activeDeliveries,
    fleetTankers,
    supplierMetrics,
    supplierPricing,
    supplierSettlementDetails,
    loadSupplierData,
    subscribeToSupplierBookings,
    onboardTankerVehicle,
    acceptSupplierBooking,
    rejectSupplierBooking,
    toggleVehicleAvailability,
  } = useSupplyStore();

  const displayFleet = fleetTankers.length > 0 ? fleetTankers : PREVIEW_FLEET;
  const displayRequests = pendingRequests.length > 0 ? pendingRequests : [PREVIEW_BOOKING];
  const displayActive = activeDeliveries.length > 0 ? activeDeliveries : [
    {
      ...PREVIEW_BOOKING,
      id: 'active-del-01',
      booking_reference: 'TNK-94821',
      status: 'en_route' as const,
      driver_name: 'Rajesh Kumar',
      vehicle_number: 'MH-02-TC-5001',
    },
  ];

  const displayBusinessName =
    supplierBusinessName !== 'Loading Hub...' && supplierBusinessName !== 'No Supplier Hub Registered'
      ? supplierBusinessName
      : 'Powai Aquifers & Tanker Fleet';

  useEffect(() => {
    loadSupplierData(user?.id || '', user?.phone);
  }, [user, loadSupplierData]);

  useEffect(() => {
    if (supplierId) {
      const unsub = subscribeToSupplierBookings(supplierId);
      return () => {
        unsub();
      };
    }
    return undefined;
  }, [supplierId, subscribeToSupplierBookings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    haptics.lightImpact();
    await loadSupplierData(user?.id || '', user?.phone);
    setIsRefreshing(false);
  };

  const handleAccept = async (id: string, ref: string) => {
    haptics.mediumImpact();
    const res = await acceptSupplierBooking(id);
    if (res.success) {
      Alert.alert('Order Accepted & Dispatched', `Booking #${ref} has been accepted. Driver notified.`);
    }
  };

  const handleReject = async (id: string, ref: string) => {
    haptics.warning();
    Alert.alert(
      'Decline Booking Dispatch?',
      `Are you sure you want to decline booking #${ref}? The dispatch desk will reassign the order to an alternate fleet in the cluster.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Decline Dispatch',
          style: 'destructive',
          onPress: async () => {
            await rejectSupplierBooking(id);
            Alert.alert('Order Declined', 'Order was returned to dispatch pool.');
          },
        },
      ]
    );
  };

  const availableFleetCount = displayFleet.filter((v) => v.is_available && v.is_online).length;
  const netToday = Math.round(supplierMetrics.todayRevenue * 0.85);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* 1. TOP OPERATIONS COMMAND HEADER */}
      <View style={styles.header}>
        <View style={[styles.responsiveContent, styles.headerInner]}>
          <View style={styles.hubHeaderInfo}>
            <Image
              source={require('../../../../assets/images/logo.png')}
              style={styles.supplierLogo}
              resizeMode="contain"
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.badgeRow}>
                <StatusBadge label="Supplier Portal" variant="primary" size="sm" />
                <StatusBadge
                  label={verificationStatus === 'verified' ? 'Verified Partner' : 'KYC Pending'}
                  variant={verificationStatus === 'verified' ? 'success' : 'warning'}
                  size="sm"
                />
              </View>
              <Text numberOfLines={1} style={styles.supplierTitle}>{displayBusinessName}</Text>
              <Text numberOfLines={1} style={styles.supplierSubtitle}>GSTIN: 27AAPFU0938L1ZV • Mumbai Ops Desk</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out of supplier portal"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => signOut()}
            style={styles.signOutBtn}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* 2. OPERATIONAL PULSE MATRIX (4-KPI GRID) */}
      <View style={styles.matrixContainer}>
        <View style={[styles.responsiveContent, styles.matrixGrid, isMobile && styles.matrixGridMobile]}>
          {/* KPI 1: Pending Actions */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${displayRequests.length} pending dispatch requests`}
            onPress={() => {
              haptics.selection();
              setActiveTab('dispatch');
            }}
            style={[
              styles.matrixCard,
              isMobile && styles.matrixCardMobile,
              activeTab === 'dispatch' && styles.matrixCardActive,
            ]}
          >
            <View style={styles.matrixCardTop}>
              <Text style={styles.matrixLabel}>ACTION REQ</Text>
              <View style={[styles.pulseDot, displayRequests.length > 0 && styles.pulseDotActive]} />
            </View>
            <Text style={[styles.matrixVal, displayRequests.length > 0 && { color: '#B45309' }]}>
              {displayRequests.length}
            </Text>
            <Text numberOfLines={1} style={styles.matrixSub}>Pending Dispatches</Text>
          </Pressable>

          {/* KPI 2: In-Transit Fleet */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${displayActive.length} active tanker deliveries`}
            onPress={() => {
              haptics.selection();
              setActiveTab('dispatch');
            }}
            style={[
              styles.matrixCard,
              isMobile && styles.matrixCardMobile,
            ]}
          >
            <Text style={styles.matrixLabel}>ON ROAD</Text>
            <Text style={styles.matrixVal}>{displayActive.length}</Text>
            <Text numberOfLines={1} style={styles.matrixSub}>Active Deliveries</Text>
          </Pressable>

          {/* KPI 3: Fleet Readiness */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${availableFleetCount} of ${displayFleet.length} vehicles available`}
            onPress={() => {
              haptics.selection();
              setActiveTab('fleet');
            }}
            style={[
              styles.matrixCard,
              isMobile && styles.matrixCardMobile,
              activeTab === 'fleet' && styles.matrixCardActive,
            ]}
          >
            <Text style={styles.matrixLabel}>FLEET READY</Text>
            <Text style={styles.matrixVal}>
              {availableFleetCount}<Text style={{ fontSize: 13, color: colors.textSecondary }}>/{displayFleet.length}</Text>
            </Text>
            <Text numberOfLines={1} style={styles.matrixSub}>Available Tankers</Text>
          </Pressable>

          {/* KPI 4: Financial Settlement */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Net earnings today: ₹${netToday}`}
            onPress={() => {
              haptics.selection();
              setActiveTab('settlements');
            }}
            style={[
              styles.matrixCard,
              isMobile && styles.matrixCardMobile,
              activeTab === 'settlements' && styles.matrixCardActive,
            ]}
          >
            <Text style={styles.matrixLabel}>NET T+1</Text>
            <Text style={[styles.matrixVal, { color: '#065F46' }]}>
              ₹{netToday > 0 ? (netToday / 1000).toFixed(1) + 'k' : '0'}
            </Text>
            <Text numberOfLines={1} style={styles.matrixSub}>Ready for Payout</Text>
          </Pressable>
        </View>
      </View>

      {/* 3. OPERATIONAL NAVIGATION TABS */}
      <View style={styles.tabBar}>
        <View style={styles.responsiveContent}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarScroll}
          >
            {[
              { key: 'dispatch' as const, label: `Dispatch (${displayRequests.length})`, icon: 'flash' as const },
              { key: 'fleet' as const, label: `Fleet (${displayFleet.length})`, icon: 'car' as const },
              { key: 'settlements' as const, label: 'Settlements', icon: 'wallet' as const },
              { key: 'pricing' as const, label: 'Rate Card', icon: 'pricetag' as const },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="tab"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => {
                    haptics.selection();
                    setActiveTab(tab.key);
                  }}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.responsiveContent}>
          {/* OUTSTANDING OPERATIONAL ISSUES BANNER */}
          <View style={styles.complianceAlertBanner}>
            <Ionicons name="shield-checkmark" size={18} color="#065F46" />
            <View style={{ flex: 1 }}>
              <Text style={styles.complianceAlertTitle}>NABL Water Audit & Flow Meter Calibration</Text>
              <Text style={styles.complianceAlertSub}>
                Batch #TKR-9184 verified potable. Next digital flow meter calibration due in 18 days.
              </Text>
            </View>
          </View>

          {/* TAB 1: DISPATCH QUEUE & ACTIVE DELIVERIES */}
          {activeTab === 'dispatch' && (
            <View style={isDesktop ? styles.desktopColumnsRow : undefined}>
              {/* Urgent Incoming Requests */}
              <View style={isDesktop ? styles.desktopColumnLeft : undefined}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderTitleCol}>
                    <Text style={styles.sectionTitle}>Urgent Incoming Dispatches</Text>
                    <Text style={styles.sectionSubtitle}>Requires supplier acceptance within SLA window</Text>
                  </View>
                  <View style={styles.slaBadge}>
                    <Ionicons name="timer-outline" size={12} color="#92400E" />
                    <Text style={styles.slaBadgeText}>5m SLA</Text>
                  </View>
                </View>

                {displayRequests.length === 0 ? (
                  <Card variant="standard" style={styles.emptyCard}>
                    <Ionicons name="checkmark-circle-outline" size={32} color="#065F46" />
                    <Text style={styles.emptyTitle}>All Booking Requests Cleared</Text>
                    <Text style={styles.emptyDesc}>
                      Your fleet is active on the customer map. New orders will appear here automatically.
                    </Text>
                  </Card>
                ) : (
                  displayRequests.map((req) => (
                    <Card key={req.id} variant="elevated" style={styles.dispatchCard}>
                      {/* Card Header with Countdown */}
                      <View style={styles.dispatchTopRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={styles.refRow}>
                            <Text style={styles.requestRef}>#{req.booking_reference}</Text>
                            <View style={styles.countdownPill}>
                              <Ionicons name="hourglass-outline" size={11} color="#B45309" />
                              <Text style={styles.countdownText}>3:45 mins left</Text>
                            </View>
                          </View>
                          <Text style={styles.requestCapacity}>
                            {req.capacity_liters.toLocaleString('en-IN')} L • {req.water_type}
                          </Text>
                        </View>

                        <View style={styles.payoutBox}>
                          <Text style={styles.payoutLabel}>Hub Payout (Net 85%)</Text>
                          <Text style={styles.payoutAmount}>
                            ₹{Math.round(req.final_payable_amount * 0.85).toLocaleString('en-IN')}
                          </Text>
                          <Text style={styles.grossSubText}>Gross: ₹{req.final_payable_amount}</Text>
                        </View>
                      </View>

                      {/* Destination & Proximity */}
                      <View style={styles.addressBlock}>
                        <Ionicons name="location-sharp" size={15} color={colors.primary} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={styles.addressText}>{req.delivery_address}</Text>
                          <Text style={styles.distanceText}>
                            {req.delivery_distance_km} km away • Ground Sump with 3" Camlock
                          </Text>
                        </View>
                      </View>

                      {/* Dispatch Actions */}
                      <View style={styles.dispatchActionsRow}>
                        <View style={{ flex: 1, marginRight: spacing.sm }}>
                          <Button
                            title="Accept & Dispatch"
                            variant="primary"
                            size="md"
                            onPress={() => handleAccept(req.id, req.booking_reference)}
                            leftIcon={<Ionicons name="checkmark-circle" size={16} color={colors.white} />}
                          />
                        </View>
                        <View style={{ width: 105 }}>
                          <Button
                            title="Decline"
                            variant="outline"
                            size="md"
                            onPress={() => handleReject(req.id, req.booking_reference)}
                          />
                        </View>
                      </View>
                    </Card>
                  ))
                )}
              </View>

              {/* Active In-Transit Fleet */}
              <View style={isDesktop ? styles.desktopColumnRight : undefined}>
                <View style={[styles.sectionHeaderRow, !isDesktop && { marginTop: spacing.lg }]}>
                  <View style={styles.sectionHeaderTitleCol}>
                    <Text style={styles.sectionTitle}>In-Transit Deliveries ({displayActive.length})</Text>
                    <Text style={styles.sectionSubtitle}>Live monitoring of tankers currently on road</Text>
                  </View>
                </View>

                {displayActive.map((del) => (
                  <View key={del.id} style={styles.activeDeliveryCard}>
                    <View style={styles.activeDeliveryHeader}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.activeDelRef}>#{del.booking_reference}</Text>
                        <Text numberOfLines={1} style={styles.activeDelVeh}>
                          Tanker {del.vehicle_number || 'MH-02-TC-5001'} ({del.capacity_liters.toLocaleString('en-IN')} L)
                        </Text>
                      </View>
                      <StatusBadge
                        label={del.status === 'en_route' ? 'Tanker En Route' : del.status === 'delivering' ? 'Pumping Water' : 'Arrived at Gate'}
                        variant={del.status === 'delivering' ? 'info' : 'warning'}
                        size="sm"
                      />
                    </View>

                    <View style={styles.driverInfoRow}>
                      <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.driverInfoText}>
                        Driver: {del.driver_name || 'Rajesh Kumar'} (+91 90000 00001)
                      </Text>
                    </View>

                    <View style={styles.driverInfoRow}>
                      <Ionicons name="navigate-outline" size={13} color={colors.textSecondary} />
                      <Text numberOfLines={1} style={styles.driverInfoText}>
                        Destination: {del.delivery_address}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 2: FLEET & DRIVERS MANAGEMENT */}
          {activeTab === 'fleet' && (
            <View>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderTitleCol}>
                  <Text style={styles.sectionTitle}>Registered Fleet ({displayFleet.length})</Text>
                  <Text style={styles.sectionSubtitle}>Control live availability and driver duty</Text>
                </View>
                <Button
                  title="+ Add Tanker"
                  variant="primary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => setAddVehicleVisible(true)}
                />
              </View>

              <View style={isDesktop ? styles.fleetGridDesktop : undefined}>
                {displayFleet.map((v) => (
                  <View key={v.id} style={isDesktop ? styles.fleetCardDesktopWrap : undefined}>
                    <Card variant="standard" style={styles.fleetCard}>
                      <View style={styles.fleetTopRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.fleetVehicleNum}>{v.vehicle_number}</Text>
                          <Text style={styles.fleetCapacity}>
                            {v.capacity_liters.toLocaleString('en-IN')} Litres • {v.water_type}
                          </Text>
                        </View>

                        <View style={styles.fleetSwitchWrap}>
                          <Text style={[styles.availabilityText, v.is_available && styles.availabilityTextOnline]}>
                            {v.is_available ? 'ONLINE' : 'OFFLINE'}
                          </Text>
                          <Switch
                            value={v.is_available}
                            onValueChange={() => {
                              toggleVehicleAvailability(v.id);
                            }}
                            trackColor={{ false: colors.cardBorder, true: colors.primary }}
                          />
                        </View>
                      </View>

                      <View style={styles.fleetDivider} />

                      <View style={styles.fleetBottomRow}>
                        <View style={styles.driverCol}>
                          <Text style={styles.fleetDriverLabel}>ASSIGNED DRIVER</Text>
                          <Text style={styles.fleetDriverName}>{v.driver_name} ({v.driver_phone})</Text>
                        </View>
                        <View style={styles.calibrationPill}>
                          <Ionicons name="checkmark-circle" size={12} color="#065F46" />
                          <Text style={styles.calibrationPillText}>Calibrated</Text>
                        </View>
                      </View>
                    </Card>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 3: EARNINGS & SETTLEMENTS */}
          {activeTab === 'settlements' && (
            <View>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderTitleCol}>
                  <Text style={styles.sectionTitle}>Financial Settlements & GST</Text>
                  <Text style={styles.sectionSubtitle}>Direct automated payouts to verified nodal bank</Text>
                </View>
                <Button
                  title="View Full Ledger"
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  onPress={() => setSettlementsModalVisible(true)}
                />
              </View>

              <View style={styles.settlementOverviewCard}>
                <Text style={styles.settlementSub}>READY FOR DISBURSEMENT (T+1)</Text>
                <Text style={styles.settlementAmount}>
                  ₹{(supplierSettlementDetails.pendingPayout + netToday).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.settlementCycleText}>
                  Automated daily direct wire scheduled for 06:00 AM IST to {supplierSettlementDetails.bankAccount}.
                </Text>

                <View style={styles.feeBreakdownBlock}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Gross Deliveries Today:</Text>
                    <Text style={styles.feeVal}>₹{supplierMetrics.todayRevenue.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>TANKR Platform Fee (15%):</Text>
                    <Text style={[styles.feeVal, { color: colors.textSecondary }]}>
                      -₹{Math.round(supplierMetrics.todayRevenue * 0.15).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={[styles.feeRow, { borderTopWidth: 1, borderTopColor: '#BBF7D0', paddingTop: 4 }]}>
                    <Text style={[styles.feeLabel, { fontWeight: fontWeights.bold, color: '#065F46' }]}>Net Supplier Hub (85%):</Text>
                    <Text style={[styles.feeVal, { fontWeight: fontWeights.bold, color: '#065F46' }]}>
                      ₹{netToday.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* TAB 4: PRICING & BASE RATES */}
          {activeTab === 'pricing' && (
            <View>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderTitleCol}>
                  <Text style={styles.sectionTitle}>Hub Base Pricing & Tiers</Text>
                  <Text style={styles.sectionSubtitle}>Active market base rates for customer quotes</Text>
                </View>
                <Button
                  title="Edit Rates"
                  variant="primary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => setPricingModalVisible(true)}
                />
              </View>

              <View style={styles.pricingCard}>
                {[
                  { cap: 1000, label: '1,000 L (Compact Mini)', price: supplierPricing[1000] || 450 },
                  { cap: 5000, label: '5,000 L (Standard Single)', price: supplierPricing[5000] || 1200 },
                  { cap: 10000, label: '10,000 L (Commercial Standard)', price: supplierPricing[10000] || 2100 },
                  { cap: 20000, label: '20,000 L (Heavy Industrial)', price: supplierPricing[20000] || 3800 },
                ].map((tier) => (
                  <View key={tier.cap} style={styles.pricingRow}>
                    <View style={{ flex: 1, minWidth: 0, marginRight: spacing.sm }}>
                      <Text style={styles.pricingTierLabel}>{tier.label}</Text>
                      <Text style={styles.pricingTierSub}>Potable BIS-10500 certified source</Text>
                    </View>
                    <Text style={styles.pricingTierVal}>₹{tier.price}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Dialogs */}
      <AddVehicleModal
        visible={addVehicleVisible}
        onClose={() => setAddVehicleVisible(false)}
        onVehicleAdded={onboardTankerVehicle}
      />

      <SupplierPricingModal
        visible={pricingModalVisible}
        onClose={() => setPricingModalVisible(false)}
      />

      <SupplierSettlementsModal
        visible={settlementsModalVisible}
        onClose={() => setSettlementsModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    width: '100%',
  },
  responsiveContent: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingVertical: spacing.md,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hubHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  supplierLogo: {
    width: 38,
    height: 38,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  supplierTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  supplierSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  signOutBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    marginLeft: spacing.sm,
  },
  matrixContainer: {
    paddingTop: spacing.md,
  },
  matrixGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  matrixGridMobile: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  matrixCard: {
    flex: 1,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    padding: spacing.sm,
  },
  matrixCardMobile: {
    flex: undefined,
    width: '48%',
    minWidth: '46%',
  },
  matrixCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0F7FF',
  },
  matrixCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matrixLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cardBorder,
  },
  pulseDotActive: {
    backgroundColor: '#F59E0B',
  },
  matrixVal: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 2,
  },
  matrixSub: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabBar: {
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardSurface,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  tabBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: spacing.sm,
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingBottom: 40,
  },
  complianceAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  complianceAlertTitle: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#065F46',
  },
  complianceAlertSub: {
    fontSize: 10,
    color: '#065F46',
    marginTop: 1,
    lineHeight: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHeaderTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
    minWidth: 0,
  },
  desktopColumnsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  desktopColumnLeft: {
    flex: 1.1,
    minWidth: 0,
  },
  desktopColumnRight: {
    flex: 0.9,
    minWidth: 0,
  },
  fleetGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  fleetCardDesktopWrap: {
    width: '49%',
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  slaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  slaBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#92400E',
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  emptyDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  dispatchCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  dispatchTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  requestRef: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    gap: 3,
  },
  countdownText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#92400E',
  },
  requestCapacity: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    marginTop: 2,
  },
  payoutBox: {
    alignItems: 'flex-end',
  },
  payoutLabel: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  payoutAmount: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#065F46',
  },
  grossSubText: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  addressBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 6,
    marginTop: spacing.sm,
  },
  addressText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  distanceText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dispatchActionsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  activeDeliveryCard: {
    backgroundColor: colors.cardSurface,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  activeDeliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  activeDelRef: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: fontWeights.bold,
  },
  activeDelVeh: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 1,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  driverInfoText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  fleetCard: {
    marginBottom: spacing.xs,
    padding: spacing.md,
  },
  fleetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fleetVehicleNum: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  fleetCapacity: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fleetSwitchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  availabilityTextOnline: {
    color: '#065F46',
  },
  fleetDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.sm,
  },
  fleetBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverCol: {
    flex: 1,
  },
  fleetDriverLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: fontWeights.bold,
  },
  fleetDriverName: {
    fontSize: 11,
    color: colors.darkNavy,
    fontWeight: fontWeights.medium,
    marginTop: 1,
  },
  calibrationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  calibrationPillText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#065F46',
  },
  settlementOverviewCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  settlementSub: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#065F46',
    letterSpacing: 0.5,
  },
  settlementAmount: {
    fontSize: 28,
    fontWeight: fontWeights.bold,
    color: '#065F46',
    marginTop: 2,
  },
  settlementCycleText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  feeBreakdownBlock: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
    gap: 4,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  feeVal: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  pricingCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  pricingTierLabel: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  pricingTierSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  pricingTierVal: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
});
