import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { Card } from '../../../components/common/Card/Card';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { InteractiveMap } from '../../discovery/components/InteractiveMap';
import { DriverStationaryVerificationModal } from '../components/DriverStationaryVerificationModal';
import { useSupplyStore } from '../../../stores/supplyStore';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../services/supabase/client';
import { MapplsService } from '../../../services/mappls/mapplsService';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../../../theme';
import { haptics } from '../../../theme/haptics';
import { BOOKING_STATUS_CONFIG } from '../../../types/booking';
import { NearbyTanker } from '../../../types/discovery';
import { PREVIEW_BOOKING } from '../../../utils/previewDemoData';

interface DriverDashboardScreenProps {
  initialModal?: string;
}

export const DriverDashboardScreen: React.FC<DriverDashboardScreenProps> = ({ initialModal }) => {
  const { user, signOut } = useAuthStore();
  const {
    assignedDelivery,
    driverDutyStatus,
    toggleDriverDuty,
    driverUpdateStatus,
    loadDriverData,
    subscribeToDriverTrips,
    driverName,
    driverAssignedVehicle,
  } = useSupplyStore();

  const [verificationModalVisible, setVerificationModalVisible] = useState(initialModal === 'verify_pin');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [showRouteMap, setShowRouteMap] = useState(true);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [safetyChecklist, setSafetyChecklist] = useState({
    chocks: true,
    camlock: true,
    groundWire: false,
    sumpDepth: true,
  });

  const activeTrip = assignedDelivery || PREVIEW_BOOKING;
  const customerPhone = activeTrip?.driver_phone || '+91 98201 99201';

  const driverLocation = useMemo(() => ({
    latitude: activeTrip?.delivery_latitude ? activeTrip.delivery_latitude + 0.008 : 19.1350,
    longitude: activeTrip?.delivery_longitude ? activeTrip.delivery_longitude - 0.006 : 72.8750,
  }), [activeTrip?.delivery_latitude, activeTrip?.delivery_longitude]);

  const deliveryCoords = useMemo(() => ({
    latitude: activeTrip?.delivery_latitude || 19.1255,
    longitude: activeTrip?.delivery_longitude || 72.8890,
  }), [activeTrip?.delivery_latitude, activeTrip?.delivery_longitude]);

  const driverTankerItem = useMemo<NearbyTanker[]>(() => [
    {
      tanker_id: 'a0000000-0000-0000-0000-000000000001',
      supplier_id: 'b0000000-0000-0000-0000-000000000001',
      supplier_name: driverName || 'My Tanker',
      vehicle_number: driverAssignedVehicle?.vehicle_number || 'MH-02-TC-5001',
      driver_name: driverName || 'Rajesh Kumar',
      driver_phone: '+91 90000 00001',
      latitude: driverLocation.latitude,
      longitude: driverLocation.longitude,
      capacity_liters: (activeTrip?.capacity_liters || 10000) as 10000,
      water_type: (activeTrip?.water_type || 'Potable (Drinking)') as string,
      eta_minutes: 11,
      distance_km: activeTrip?.delivery_distance_km || 1.8,
      base_price: 1100,
      price_per_km: 35,
      estimated_total_price: activeTrip?.final_payable_amount || 1224,
      heading_degrees: 45,
      is_available: true,
      is_verified: true,
      rating: 4.95,
      total_deliveries: 142,
    },
  ], [activeTrip, driverName, driverAssignedVehicle, driverLocation]);

  const handleCopyPhone = () => {
    haptics.selection();
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  const handleWhatsAppCustomer = () => {
    haptics.lightImpact();
    const cleanPhone = customerPhone.replace(/[^\d]/g, '');
    const msg = encodeURIComponent(
      `Hello! Your TANKR water delivery (#${activeTrip?.booking_reference}) is en route to ${activeTrip?.delivery_address}. Tanker driver is arriving shortly.`
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`);
  };

  const handleCallCustomerDirect = () => {
    haptics.lightImpact();
    const cleanPhone = customerPhone.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  useEffect(() => {
    loadDriverData(user?.id || '', user?.phone);
    if (user?.phone) {
      const unsub = subscribeToDriverTrips(user.phone);
      return () => {
        unsub();
      };
    }
    return undefined;
  }, [user, loadDriverData, subscribeToDriverTrips]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    haptics.lightImpact();
    await loadDriverData(user?.id || '', user?.phone);
    setIsRefreshing(false);
  };

  const handleOpenMapsNavigation = () => {
    haptics.mediumImpact();
    if (!activeTrip) return;
    const { delivery_latitude, delivery_longitude, delivery_address } = activeTrip;
    MapplsService.openNavigation(delivery_latitude, delivery_longitude, delivery_address || 'Delivery Location');
  };

  const handleCallCustomer = async () => {
    haptics.lightImpact();
    if (!activeTrip) return;
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', activeTrip.customer_id)
        .maybeSingle();

      const phone = prof?.phone_number || activeTrip.driver_phone;
      if (phone) {
        Linking.openURL(`tel:${phone}`);
      } else {
        Alert.alert('Phone Unavailable', 'Customer contact phone is not on file.');
      }
    } catch {
      Alert.alert('Phone Unavailable', 'Could not retrieve customer contact.');
    }
  };

  const handleReportCustomerNoShow = () => {
    haptics.warning();
    if (!activeTrip) return;
    Alert.alert(
      'Customer No-Show Protocol',
      'Have you arrived at the customer location and waited for at least 10 minutes with no response to calls?',
      [
        { text: 'Keep Waiting', style: 'cancel' },
        {
          text: 'Confirm No-Show (₹200 Fee)',
          style: 'destructive',
          onPress: async () => {
            const { data, error } = await supabase.rpc('customer_cancel_booking_with_policy', {
              p_booking_id: activeTrip.id,
              p_reason: 'Customer no-show at delivery gate (10 min wait timer elapsed)',
            });

            if (!error && data?.success) {
              Alert.alert(
                'No-Show Recorded',
                'Tanker has been freed for next dispatch. ₹200 gate arrival compensation has been credited to your payout ledger.'
              );
              loadDriverData(user?.id || '', user?.phone);
            } else {
              Alert.alert('Error', data?.error || error?.message || 'Failed to record customer no-show.');
            }
          },
        },
      ]
    );
  };

  const handleAdvanceStatus = async () => {
    haptics.mediumImpact();
    if (!activeTrip) return;
    const currentStatus = activeTrip.status;

    if (currentStatus === 'accepted' || currentStatus === 'driver_assigned') {
      await driverUpdateStatus(activeTrip.id, 'en_route');
      Alert.alert('Trip Started', 'Customer notified that tanker is en route. Turn-by-turn routing is active.');
    } else if (currentStatus === 'en_route') {
      await driverUpdateStatus(activeTrip.id, 'arrived');
      Alert.alert('Arrived at Location', 'Customer notified. Gate delivery instructions are unlocked.');
    } else if (currentStatus === 'arrived') {
      await driverUpdateStatus(activeTrip.id, 'delivering');
      Alert.alert('Pumping Started', 'Water pumping initiated into customer sump.');
    } else if (currentStatus === 'delivering') {
      // Stationary delivery completion modal
      setVerificationModalVisible(true);
    }
  };

  const handleVerifyAndCompleteDelivery = async (params: {
    pin: string;
    flowStart: number;
    flowEnd: number;
  }) => {
    if (!activeTrip) return { success: false, error: 'No active delivery' };

    const deliveredLiters = Math.round(params.flowEnd - params.flowStart);

    try {
      const { data, error } = await supabase.rpc('driver_complete_delivery_with_meter', {
        p_booking_id: activeTrip.id,
        p_delivery_pin: params.pin,
        p_flow_start: params.flowStart,
        p_flow_end: params.flowEnd,
        p_delivered_liters: deliveredLiters,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      loadDriverData(user?.id || '', user?.phone);

      const shortfall = data?.shortfall_liters || 0;
      const driverShare = data?.driver_earnings || Math.round(activeTrip.final_payable_amount * 0.85);

      if (shortfall > 0) {
        Alert.alert(
          'Delivery Verified with Proration! 💧',
          `Delivered: ${deliveredLiters.toLocaleString('en-IN')}L (${shortfall}L shortfall)\n₹${driverShare} earnings credited to driver ledger.`
        );
      } else {
        Alert.alert(
          'Delivery Completed & Audited! 🎉',
          `Flow meter confirmed: ${deliveredLiters.toLocaleString('en-IN')}L pumped.\n₹${driverShare} earnings credited to driver wallet.`
        );
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Verification failed' };
    }
  };

  const isEnRoute = activeTrip?.status === 'en_route';
  const isPumping = activeTrip?.status === 'delivering';
  const isArrived = activeTrip?.status === 'arrived';
  const isAssigned = activeTrip?.status === 'accepted' || activeTrip?.status === 'driver_assigned';

  const getActionTitle = () => {
    if (isAssigned) return 'Start Trip to Customer';
    if (isEnRoute) return 'I Have Arrived at Gate';
    if (isArrived) return 'Connect Hose & Start Pumping';
    if (isPumping) return 'Finish & Verify PIN with Customer';
    return 'Update Status';
  };

  const getActionColor = () => {
    if (isEnRoute) return colors.primary;
    if (isArrived) return '#0284C7';
    if (isPumping) return '#059669';
    return colors.primary;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* 1. LARGE IN-CAB SHIFT & DUTY STATUS BANNER */}
      <View style={[styles.dutyBanner, driverDutyStatus ? styles.dutyBannerOnline : styles.dutyBannerOffline]}>
        <View style={styles.dutyLeft}>
          <View style={[styles.dutyStatusDot, driverDutyStatus ? styles.dotOnline : styles.dotOffline]} />
          <View>
            <Text style={styles.dutyTitle}>
              {driverDutyStatus ? 'ONLINE • READY FOR TRIPS' : 'OFF DUTY • SHIFT ENDED'}
            </Text>
            <Text style={styles.dutyVehicle}>
              {driverName || 'Verified Driver'} • Tanker {driverAssignedVehicle?.vehicle_number || 'MH-02-TC-5001'} (10kL)
            </Text>
          </View>
        </View>

        <Switch
          accessibilityLabel="Toggle driver duty status"
          value={driverDutyStatus}
          onValueChange={() => {
            haptics.selection();
            toggleDriverDuty();
          }}
          trackColor={{ false: colors.cardBorder, true: '#059669' }}
        />
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
        {activeTrip ? (
          <View>
            {/* 2. OPERATIONAL NEXT ACTION HERO BANNER */}
            <View style={[styles.nextActionBanner, { backgroundColor: isEnRoute ? '#FFFBEB' : '#EFF6FF', borderColor: isEnRoute ? '#FDE68A' : '#BFDBFE' }]}>
              <Ionicons
                name={isEnRoute ? 'navigate' : isPumping ? 'water' : 'flash'}
                size={20}
                color={isEnRoute ? '#92400E' : colors.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.nextActionLabel, { color: isEnRoute ? '#92400E' : colors.primary }]}>
                  {isAssigned && 'NEXT ACTION: START JOURNEY'}
                  {isEnRoute && 'NEXT ACTION: DRIVE TO SUMP GATE (HEAVY CORRIDOR)'}
                  {isArrived && 'NEXT ACTION: CONNECT HOSE TO 3" CAMLOCK'}
                  {isPumping && 'NEXT ACTION: SHUT VALVE & VERIFY PIN'}
                  {activeTrip.status === 'delivered' && 'TRIP COMPLETED • WAITING NEXT ORDER'}
                </Text>
                <Text style={styles.nextActionDesc}>
                  {isEnRoute
                    ? 'Turn-by-turn routing active. Data entry is locked while vehicle is moving.'
                    : isPumping
                    ? 'Flow meter running. Ask customer for 4-digit PIN when complete.'
                    : 'Follow commercial delivery guidelines.'}
                </Text>
              </View>
            </View>

            {/* 3. ASSIGNED TRIP CARD */}
            <Card variant="elevated" style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View>
                  <Text style={styles.bookingRef}>#{activeTrip.booking_reference}</Text>
                  <Text style={styles.capacityHeader}>
                    {activeTrip.capacity_liters.toLocaleString('en-IN')} L • {activeTrip.water_type}
                  </Text>
                </View>
                <StatusBadge
                  label={BOOKING_STATUS_CONFIG[activeTrip.status]?.label || activeTrip.status}
                  variant={BOOKING_STATUS_CONFIG[activeTrip.status]?.badgeVariant || 'primary'}
                  size="md"
                />
              </View>

              {/* Delivery Progress Pipeline Stepper */}
              <View style={styles.stepperContainer}>
                {[
                  { key: 'accepted', label: 'Assigned' },
                  { key: 'en_route', label: 'En Route' },
                  { key: 'arrived', label: 'At Gate' },
                  { key: 'delivering', label: 'Pumping' },
                ].map((step, idx) => {
                  const isCompleted =
                    (step.key === 'accepted' && (isEnRoute || isArrived || isPumping || activeTrip.status === 'delivered')) ||
                    (step.key === 'en_route' && (isArrived || isPumping || activeTrip.status === 'delivered')) ||
                    (step.key === 'arrived' && (isPumping || activeTrip.status === 'delivered')) ||
                    (step.key === 'delivering' && activeTrip.status === 'delivered');
                  const isCurrent =
                    (step.key === 'accepted' && isAssigned) ||
                    (step.key === 'en_route' && isEnRoute) ||
                    (step.key === 'arrived' && isArrived) ||
                    (step.key === 'delivering' && isPumping);

                  return (
                    <React.Fragment key={step.key}>
                      <View style={styles.stepItem}>
                        <View
                          style={[
                            styles.stepCircle,
                            isCompleted && styles.stepCircleCompleted,
                            isCurrent && styles.stepCircleCurrent,
                          ]}
                        >
                          {isCompleted ? (
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          ) : (
                            <Text style={[styles.stepNumber, isCurrent && styles.stepNumberCurrent]}>
                              {idx + 1}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.stepLabel, (isCompleted || isCurrent) && styles.stepLabelActive]}>
                          {step.label}
                        </Text>
                      </View>
                      {idx < 3 && (
                        <View
                          style={[
                            styles.stepConnector,
                            isCompleted && styles.stepConnectorCompleted,
                          ]}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>

              {/* Destination Address Block with High Glanceability */}
              <View style={styles.destinationBox}>
                <Ionicons name="location-sharp" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.destSub}>DELIVERY DESTINATION</Text>
                  <Text style={styles.destAddress}>{activeTrip.delivery_address}</Text>
                  <Text style={styles.destDistance}>
                    {activeTrip.delivery_distance_km} km away • Ground Sump Pipe
                  </Text>
                </View>
              </View>

              {/* Live Interactive Navigation Mini-Map */}
              <View style={styles.mapCard}>
                <View style={styles.mapHeaderRow}>
                  <View style={styles.mapHeaderTitleRow}>
                    <Ionicons name="map" size={15} color={colors.primary} />
                    <Text style={styles.mapHeaderTitle}>LIVE CORRIDOR & NAVIGATION</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showRouteMap ? 'Hide map view' : 'Show map view'}
                    onPress={() => setShowRouteMap(!showRouteMap)}
                    style={styles.toggleMapBtn}
                  >
                    <Text style={styles.toggleMapText}>{showRouteMap ? 'Hide Map' : 'Show Map'}</Text>
                    <Ionicons name={showRouteMap ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} />
                  </Pressable>
                </View>

                {showRouteMap && (
                  <View style={styles.mapContainer}>
                    <InteractiveMap
                      userLocation={deliveryCoords}
                      tankers={driverTankerItem}
                      selectedTankerId="a0000000-0000-0000-0000-000000000001"
                      onSelectTanker={() => {}}
                      onRecenterGps={() => {}}
                      style={styles.mapView}
                    />
                    <View style={styles.mapOverlayBadge}>
                      <Ionicons name="compass" size={12} color="#0369A1" />
                      <Text style={styles.mapOverlayBadgeText}>
                        JVLR Corridor • ~11 mins to Sump Gate
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Heavy Vehicle Routing Block (Safety Compliance) */}
              <View style={styles.heavyTruckBox}>
                <View style={styles.heavyTruckHeader}>
                  <Ionicons name="bus" size={16} color="#92400E" />
                  <Text style={styles.heavyTruckTitle}>Heavy Commercial Corridor Route</Text>
                  <View style={styles.tonnagePill}>
                    <Text style={styles.tonnageText}>16 TONNES</Text>
                  </View>
                </View>
                <Text style={styles.heavyTruckDesc}>
                  Auto-routed via JVLR Outer Ring. Height clearance 3.5m. Residential tight lanes avoided.
                </Text>
              </View>

              {/* Two High-Visibility Action Buttons */}
              <View style={styles.driverActionsGrid}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open Turn-by-Turn Navigation in Maps"
                  onPress={handleOpenMapsNavigation}
                  style={styles.navButton}
                >
                  <Ionicons name="navigate" size={18} color={colors.white} />
                  <Text style={styles.navButtonText}>Open Navigation</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Contact Customer via Phone or WhatsApp"
                  onPress={() => setContactModalVisible(true)}
                  style={styles.callButton}
                >
                  <Ionicons name="call" size={18} color={colors.primary} />
                  <Text style={styles.callButtonText}>Contact Customer</Text>
                </Pressable>
              </View>

              {/* Sump Gate Safety & Connection Checklist */}
              {(isArrived || isPumping) && (
                <View style={styles.safetyBox}>
                  <View style={styles.safetyHeader}>
                    <Ionicons name="shield-checkmark" size={16} color="#065F46" />
                    <Text style={styles.safetyTitle}>MANDATORY PRE-PUMP SAFETY CHECK</Text>
                  </View>

                  <Pressable
                    style={styles.checklistRow}
                    onPress={() => setSafetyChecklist((prev) => ({ ...prev, chocks: !prev.chocks }))}
                  >
                    <Ionicons
                      name={safetyChecklist.chocks ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={safetyChecklist.chocks ? '#065F46' : colors.textSecondary}
                    />
                    <Text style={[styles.checkText, safetyChecklist.chocks && styles.checkTextDone]}>
                      Wheel chocks placed under tanker tires
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.checklistRow}
                    onPress={() => setSafetyChecklist((prev) => ({ ...prev, camlock: !prev.camlock }))}
                  >
                    <Ionicons
                      name={safetyChecklist.camlock ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={safetyChecklist.camlock ? '#065F46' : colors.textSecondary}
                    />
                    <Text style={[styles.checkText, safetyChecklist.camlock && styles.checkTextDone]}>
                      3-inch Male Camlock locked with safety pins
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.checklistRow}
                    onPress={() => setSafetyChecklist((prev) => ({ ...prev, groundWire: !prev.groundWire }))}
                  >
                    <Ionicons
                      name={safetyChecklist.groundWire ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={safetyChecklist.groundWire ? '#065F46' : colors.textSecondary}
                    />
                    <Text style={[styles.checkText, safetyChecklist.groundWire && styles.checkTextDone]}>
                      Static grounding clamp connected to sump earth
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Customer Sump Instructions */}
              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>DELIVERY & SUMP SPECIFICATIONS</Text>
                <View style={styles.specRow}>
                  <Ionicons name="water-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.specText}>Pipe Connector: Standard 3-inch Male Camlock</Text>
                </View>
                <View style={styles.specRow}>
                  <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.specText}>Sump Type: Ground Level Reservoir (20ft hose required)</Text>
                </View>
              </View>

              {/* Customer No-Show Emergency Protocol (If Arrived) */}
              {isArrived && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Report customer no-show"
                  onPress={handleReportCustomerNoShow}
                  style={styles.noShowBtn}
                >
                  <Ionicons name="warning-outline" size={16} color="#B91C1C" />
                  <Text style={styles.noShowText}>Customer Not Answering? Report 10-Min No-Show</Text>
                </Pressable>
              )}

              {/* Giant Context-Aware Action CTA */}
              <View style={styles.primaryCtaWrap}>
                <Button
                  title={getActionTitle()}
                  variant="primary"
                  size="lg"
                  onPress={handleAdvanceStatus}
                  rightIcon={<Ionicons name="arrow-forward" size={22} color={colors.white} />}
                  style={{ backgroundColor: getActionColor() }}
                />
              </View>
            </Card>
          </View>
        ) : (
          <Card variant="standard" style={styles.waitingCard}>
            <Ionicons name="water-outline" size={56} color={colors.textMuted} />
            <Text style={styles.waitingTitle}>Waiting for Next Delivery Dispatch</Text>
            <Text style={styles.waitingSub}>
              Keep your duty switch active. When your supplier assigns an order, your phone will alert you instantly with navigation.
            </Text>
          </Card>
        )}

        {/* 4. DRIVER PERFORMANCE & TODAY'S EARNINGS LEDGER */}
        <View style={styles.earningsLedger}>
          <Text style={styles.ledgerSectionTitle}>TODAY'S SHIFT LEDGER</Text>
          <View style={styles.ledgerGrid}>
            <View style={styles.ledgerCard}>
              <Text style={styles.ledgerLabel}>TRIPS COMPLETED</Text>
              <Text style={styles.ledgerVal}>4</Text>
              <Text style={styles.ledgerSub}>40,000 Litres</Text>
            </View>

            <View style={styles.ledgerCard}>
              <Text style={styles.ledgerLabel}>DRIVER PAYOUT</Text>
              <Text style={[styles.ledgerVal, { color: '#065F46' }]}>₹2,850</Text>
              <Text style={styles.ledgerSub}>85% Share Settled</Text>
            </View>

            <View style={styles.ledgerCard}>
              <Text style={styles.ledgerLabel}>SAFETY RATING</Text>
              <Text style={[styles.ledgerVal, { color: '#D97706' }]}>4.95 ★</Text>
              <Text style={styles.ledgerSub}>Top Tier Driver</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out of driver console"
          onPress={() => signOut()}
          style={styles.driverSignOutBtn}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.driverSignOutText}>Sign Out of Driver Console</Text>
        </Pressable>
      </ScrollView>

      {/* 5. DEDICATED STATIONARY DELIVERY COMPLETION MODAL */}
      {activeTrip && (
        <DriverStationaryVerificationModal
          visible={verificationModalVisible}
          activeTrip={activeTrip}
          onClose={() => setVerificationModalVisible(false)}
          onVerifyAndComplete={handleVerifyAndCompleteDelivery}
        />
      )}

      {/* 6. CONTACT CUSTOMER MULTI-CHANNEL OPTIONS MODAL */}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.contactSheet}>
            <View style={styles.contactHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>Contact Customer</Text>
                <Text numberOfLines={1} style={styles.contactSub}>
                  #{activeTrip?.booking_reference} • {activeTrip?.delivery_address}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close contact modal"
                onPress={() => setContactModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.phoneDisplayBox}>
              <Ionicons name="person-circle" size={32} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.phoneLabel}>Registered Contact Phone</Text>
                <Text style={styles.phoneValue}>{customerPhone}</Text>
              </View>
              {copiedNotice && (
                <View style={styles.copiedBadge}>
                  <Text style={styles.copiedBadgeText}>Copied!</Text>
                </View>
              )}
            </View>

            <View style={styles.contactActionsCol}>
              <Button
                title="Direct Phone Call"
                variant="primary"
                size="md"
                onPress={() => {
                  setContactModalVisible(false);
                  handleCallCustomerDirect();
                }}
                leftIcon={<Ionicons name="call" size={18} color="#FFFFFF" />}
              />

              <Button
                title="Open WhatsApp Chat"
                variant="outline"
                size="md"
                onPress={() => {
                  setContactModalVisible(false);
                  handleWhatsAppCustomer();
                }}
                leftIcon={<Ionicons name="logo-whatsapp" size={18} color="#16A34A" />}
              />

              <Button
                title={copiedNotice ? 'Phone Number Copied!' : 'Copy Phone Number'}
                variant="ghost"
                size="md"
                onPress={handleCopyPhone}
                leftIcon={<Ionicons name="copy-outline" size={18} color={colors.textSecondary} />}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  dutyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1.5,
  },
  dutyBannerOnline: {
    backgroundColor: '#F0FDF4',
    borderBottomColor: '#BBF7D0',
  },
  dutyBannerOffline: {
    backgroundColor: '#F1F5F9',
    borderBottomColor: '#CBD5E1',
  },
  dutyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  dutyStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: '#94A3B8',
  },
  dutyTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    letterSpacing: 0.5,
  },
  dutyVehicle: {
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
  nextActionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  nextActionLabel: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },
  nextActionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  tripCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bookingRef: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  capacityHeader: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 2,
  },
  destinationBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  destSub: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  destAddress: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 2,
  },
  destDistance: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heavyTruckBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: 4,
  },
  heavyTruckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heavyTruckTitle: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#92400E',
    flex: 1,
  },
  tonnagePill: {
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
  },
  tonnageText: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  heavyTruckDesc: {
    fontSize: 10,
    color: '#92400E',
    lineHeight: 14,
  },
  driverActionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    gap: 6,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    gap: 6,
  },
  callButtonText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  instructionsBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: 4,
  },
  instructionsTitle: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specText: {
    fontSize: 11,
    color: colors.darkNavy,
  },
  noShowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  noShowText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#B91C1C',
  },
  primaryCtaWrap: {
    marginTop: spacing.xs,
  },
  waitingCard: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    textAlign: 'center',
  },
  waitingSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  earningsLedger: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  ledgerSectionTitle: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  ledgerGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  ledgerCard: {
    flex: 1,
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  ledgerLabel: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  ledgerVal: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 2,
  },
  ledgerSub: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
  driverSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  driverSignOutText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  // Stepper Styles
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepCircleCurrent: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  stepNumberCurrent: {
    color: colors.primary,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  stepLabelActive: {
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
    marginBottom: 14,
  },
  stepConnectorCompleted: {
    backgroundColor: '#10B981',
  },
  // Map Card Styles
  mapCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  mapHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapHeaderTitle: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  toggleMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  toggleMapText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  mapContainer: {
    height: 175,
    position: 'relative',
  },
  mapView: {
    flex: 1,
  },
  mapOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapOverlayBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#0369A1',
  },
  // Safety Checklist
  safetyBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: 6,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  safetyTitle: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#065F46',
    letterSpacing: 0.5,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  checkText: {
    fontSize: 11,
    color: colors.darkNavy,
  },
  checkTextDone: {
    textDecorationLine: 'line-through',
    color: '#065F46',
  },
  // Contact Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  contactSheet: {
    backgroundColor: colors.cardSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  contactTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  contactSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  phoneDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  phoneLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  phoneValue: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 1,
  },
  copiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  copiedBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#065F46',
  },
  contactActionsCol: {
    gap: spacing.sm,
  },
});
