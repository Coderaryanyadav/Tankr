import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { useAdminStore } from '../../../stores/adminStore';
import { useAuthStore } from '../../../stores/authStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { confirmAction, notify } from '../../../utils/alertUtils';

import { AdminFleetMapView } from '../components/AdminFleetMapView';
import { AdminEmergencyDispatchView } from '../components/AdminEmergencyDispatchView';
import { AdminPayoutsView } from '../components/AdminPayoutsView';
import { AdminWaterSafetyView } from '../components/AdminWaterSafetyView';
import { AdminSubscriptionsView } from '../components/AdminSubscriptionsView';

type AdminTab =
  | 'overview'
  | 'fleet_map'
  | 'priority_dispatch'
  | 'payouts'
  | 'water_safety'
  | 'subscriptions'
  | 'verifications'
  | 'disputes'
  | 'zones'
  | 'audit_log';

interface AdminDashboardScreenProps {
  initialTab?: AdminTab;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ initialTab }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  const { user, signOut } = useAuthStore();
  const {
    metrics,
    pendingSuppliers,
    disputes,
    auditLogs,
    serviceZones,
    fleetTankers,
    emergencyDispatches,
    waterCertificates,
    corporateSubscriptions,
    emergencyMode,
    fetchDashboardMetrics,
    fetchServiceZones,
    approveSupplier,
    rejectSupplier,
    setSurgeMultiplier,
    toggleEmergencyMode,
    resolveDispute,
    createTestSupplier,
    createTestDispute,
    createServiceZone,
    updateServiceZone,
  } = useAdminStore();

  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || 'overview');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('Goregaon East IT Hub');
  const [newZoneLat, setNewZoneLat] = useState('19.1663');
  const [newZoneLng, setNewZoneLng] = useState('72.8526');
  const [newZoneRadius, setNewZoneRadius] = useState('4.5');
  const [newZoneTraffic, setNewZoneTraffic] = useState('1.15');
  const [isCreatingZone, setIsCreatingZone] = useState(false);

  useEffect(() => {
    fetchDashboardMetrics();
    fetchServiceZones();
  }, [fetchDashboardMetrics, fetchServiceZones]);

  const handleApprove = (id: string, name: string) => {
    confirmAction(
      'Verify Supplier KYC',
      `Approve ${name} to operate on the TANKR dispatch network?`,
      async () => {
        const ok = await approveSupplier(id);
        if (ok) {
          notify('Supplier Verified', `${name} is now approved to receive bookings.`);
        }
      },
      'Approve & Activate'
    );
  };

  const handleReject = (id: string, name: string) => {
    confirmAction(
      'Reject Supplier',
      `Reject ${name}'s application? They will need to resubmit compliance documents.`,
      async () => {
        await rejectSupplier(id);
        notify('Supplier Rejected', `${name}'s application has been rejected.`);
      },
      'Reject'
    );
  };

  const formatLiters = (liters: number) => {
    if (liters >= 1000000) {
      return `${(liters / 1000000).toFixed(2)}M Litres`;
    }
    return `${(liters / 1000).toFixed(0)}kL`;
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number }> = [
    { id: 'overview', label: 'Operations Desk', icon: 'speedometer-outline' },
    {
      id: 'fleet_map',
      label: 'Fleet Map & Heatmap',
      icon: 'map-outline',
      badge: fleetTankers.filter((t) => t.is_online).length,
    },
    {
      id: 'priority_dispatch',
      label: 'Hospital Dispatch (20m SLA)',
      icon: 'flash-outline',
      badge: emergencyDispatches.filter((e) => e.status === 'en_route').length,
    },
    { id: 'payouts', label: 'Financial & Payouts', icon: 'cash-outline' },
    {
      id: 'water_safety',
      label: 'Water Quality Audit',
      icon: 'shield-checkmark-outline',
      badge: waterCertificates.length,
    },
    {
      id: 'subscriptions',
      label: 'Corporate Contracts',
      icon: 'business-outline',
      badge: corporateSubscriptions.length,
    },
    {
      id: 'verifications',
      label: 'KYC Approvals',
      icon: 'checkmark-circle-outline',
      badge: pendingSuppliers.length,
    },
    {
      id: 'disputes',
      label: 'Disputes & Escrow',
      icon: 'alert-circle-outline',
      badge: disputes.filter((d) => d.status === 'open').length,
    },
    {
      id: 'zones',
      label: 'PostGIS Service Zones',
      icon: 'navigate-outline',
      badge: serviceZones.length,
    },
    { id: 'audit_log', label: 'System Audit Trail', icon: 'receipt-outline', badge: auditLogs.length },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.mainLayout, isDesktop && styles.desktopLayout]}>
        {/* ============================================================ */}
        {/* 1. LEFT SIDEBAR (Enterprise Desktop Nav)                     */}
        {/* ============================================================ */}
        <View style={[styles.sidebar, !isDesktop && styles.mobileSidebar]}>
          {/* Brand & Portal Title */}
          <View style={styles.brandRow}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../../../../assets/images/logo.png')}
                style={styles.adminLogoImage}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.brandTitle}>TANKR</Text>
                <View style={styles.opsBadge}>
                  <Text style={styles.opsBadgeText}>OPS COMMAND</Text>
                </View>
              </View>
              <Text style={styles.brandSub}>Mumbai Operations Hub (Marol HQ)</Text>
            </View>
          </View>

          {/* System Status Pill */}
          <View style={styles.systemStatusPill}>
            <View style={styles.statusDotGreen} />
            <Text style={styles.systemStatusText}>Cluster: BOM-1 (Mumbai Metro)</Text>
          </View>

          {/* Navigation Links (Scrollable for 10 items) */}
          <ScrollView style={styles.navMenu} showsVerticalScrollIndicator={false}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => setActiveTab(item.id)}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                >
                  <Ionicons
                    name={item.icon}
                    size={17}
                    color={isActive ? colors.white : '#94A3B8'}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[styles.navItemText, isActive && styles.navItemTextActive]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <View style={[styles.navBadge, isActive && styles.navBadgeActive]}>
                      <Text style={[styles.navBadgeText, isActive && styles.navBadgeTextActive]}>
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Sidebar Footer */}
          <View style={styles.sidebarFooter}>
            <View style={styles.adminUserRow}>
              <View style={styles.adminAvatar}>
                <Text style={styles.adminAvatarText}>A</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminName}>Super Admin</Text>
                <Text style={styles.adminRole}>{user?.phone || 'admin@tankr.in'}</Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out of Admin Ops"
              onPress={() => signOut()}
              style={styles.signOutBtn}
            >
              <Ionicons name="log-out-outline" size={16} color="#EF4444" />
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </Pressable>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 2. MAIN CONTENT AREA                                         */}
        {/* ============================================================ */}
        <View style={styles.contentArea}>
          {/* Top Command Bar */}
          <View style={styles.topBar}>
            <View>
              <View style={styles.breadcrumbRow}>
                <Text style={styles.breadcrumbMuted}>Operations</Text>
                <Ionicons name="chevron-forward" size={12} color="#64748B" />
                <Text style={styles.breadcrumbActive}>
                  {navItems.find((n) => n.id === activeTab)?.label}
                </Text>
              </View>
              <Text style={styles.pageTitle}>
                {activeTab === 'overview'
                  ? 'Real-Time Dispatch Command Desk'
                  : activeTab === 'fleet_map'
                  ? 'Mumbai Live Geospatial Fleet & Deficit Heatmap'
                  : activeTab === 'priority_dispatch'
                  ? 'Hospital & Critical Sump Priority Dispatch (20m SLA)'
                  : activeTab === 'payouts'
                  ? 'Financial Reconciliation & Automated Payout Engine'
                  : activeTab === 'water_safety'
                  ? 'Water Purity & Lab Compliance Audit Desk'
                  : activeTab === 'subscriptions'
                  ? 'Corporate Tech Park & Society Recurring Contracts'
                  : activeTab === 'verifications'
                  ? 'Supplier KYC & Compliance Review'
                  : activeTab === 'disputes'
                  ? 'Customer Disputes & SLA Mediation'
                  : activeTab === 'zones'
                  ? 'Mumbai PostGIS Liquidity Zones'
                  : 'Immutable System Audit Trail'}
              </Text>
            </View>

            {/* Top Right Actions */}
            <View style={styles.topRightActions}>
              {/* Emergency Mode Switch */}
              <View style={[styles.crisisToggleBox, emergencyMode && styles.crisisToggleBoxActive]}>
                <Ionicons
                  name={emergencyMode ? 'warning' : 'shield-checkmark-outline'}
                  size={16}
                  color={emergencyMode ? '#FFFFFF' : '#0F172A'}
                />
                <Text style={[styles.crisisToggleText, emergencyMode && { color: '#FFFFFF' }]}>
                  {emergencyMode ? 'CRISIS MODE' : 'Standard Grid'}
                </Text>
                <Switch
                  value={emergencyMode}
                  onValueChange={toggleEmergencyMode}
                  trackColor={{ false: '#CBD5E1', true: '#DC2626' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Refresh Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh Admin Data"
                onPress={() => {
                  fetchDashboardMetrics();
                  fetchServiceZones();
                }}
                style={styles.refreshBtn}
              >
                <Ionicons name="refresh" size={16} color="#0F172A" />
              </Pressable>
            </View>
          </View>

          {/* Body Content */}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. OVERVIEW DESK */}
            {activeTab === 'overview' && (
              <View style={styles.overviewContainer}>
                {/* 4 KPI Metrics Row */}
                <View style={styles.kpiRow}>
                  {/* KPI 1: Gross Volume */}
                  <View style={styles.kpiCard}>
                    <View style={styles.kpiTop}>
                      <Text style={styles.kpiLabel}>GROSS VOLUME (GMV)</Text>
                      <View style={[styles.kpiIconWrap, { backgroundColor: '#E0F2FE' }]}>
                        <Ionicons name="cash-outline" size={18} color="#0284C7" />
                      </View>
                    </View>
                    <Text style={styles.kpiValue}>
                      ₹{metrics.total_gmv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                    <View style={styles.kpiFooter}>
                      <Ionicons name="trending-up" size={13} color="#16A34A" />
                      <Text style={styles.kpiTrend}>Live Supabase RPC</Text>
                      <Text style={styles.kpiSub}>• All-time bookings</Text>
                    </View>
                  </View>

                  {/* KPI 2: Platform Revenue */}
                  <View style={styles.kpiCard}>
                    <View style={styles.kpiTop}>
                      <Text style={styles.kpiLabel}>PLATFORM REVENUE</Text>
                      <View style={[styles.kpiIconWrap, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="wallet-outline" size={18} color="#16A34A" />
                      </View>
                    </View>
                    <Text style={[styles.kpiValue, { color: '#16A34A' }]}>
                      ₹{metrics.platform_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                    <View style={styles.kpiFooter}>
                      <View style={styles.marginPill}>
                        <Text style={styles.marginPillText}>10% TAKE RATE</Text>
                      </View>
                      <Text style={styles.kpiSub}>Commission captured</Text>
                    </View>
                  </View>

                  {/* KPI 3: Fulfillment Rate */}
                  <View style={styles.kpiCard}>
                    <View style={styles.kpiTop}>
                      <Text style={styles.kpiLabel}>TOTAL DELIVERIES</Text>
                      <View style={[styles.kpiIconWrap, { backgroundColor: '#EDE9FE' }]}>
                        <Ionicons name="checkmark-done" size={18} color="#7C3AED" />
                      </View>
                    </View>
                    <Text style={styles.kpiValue}>
                      {metrics.completed_bookings} / {metrics.total_bookings}
                    </Text>
                    <View style={styles.kpiFooter}>
                      <Text style={styles.kpiSuccessText}>
                        {((metrics.completed_bookings / (metrics.total_bookings || 1)) * 100).toFixed(1)}% fulfillment rate
                      </Text>
                    </View>
                  </View>

                  {/* KPI 4: Water Volume */}
                  <View style={styles.kpiCard}>
                    <View style={styles.kpiTop}>
                      <Text style={styles.kpiLabel}>WATER DISPATCHED</Text>
                      <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="water" size={18} color="#D97706" />
                      </View>
                    </View>
                    <Text style={[styles.kpiValue, { color: colors.primary }]}>
                      {formatLiters(metrics.total_liters_delivered)}
                    </Text>
                    <View style={styles.kpiFooter}>
                      <Ionicons name="shield-checkmark" size={13} color="#0284C7" />
                      <Text style={styles.kpiSub}>BMC / Certified Purity</Text>
                    </View>
                  </View>
                </View>

                {/* Quick Access to Approved Enterprise Modules */}
                <View style={styles.quickModulesGrid}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open Fleet Map"
                    onPress={() => setActiveTab('fleet_map')}
                    style={styles.moduleCard}
                  >
                    <View style={[styles.moduleIconBox, { backgroundColor: '#E0F2FE' }]}>
                      <Ionicons name="map-outline" size={20} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleTitle}>Live Geospatial Fleet Map</Text>
                      <Text style={styles.moduleSub}>
                        {fleetTankers.filter((t) => t.is_online).length} online tankers streaming telemetry with deficit heatmaps
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open Hospital Dispatch"
                    onPress={() => setActiveTab('priority_dispatch')}
                    style={styles.moduleCard}
                  >
                    <View style={[styles.moduleIconBox, { backgroundColor: '#FEE2E2' }]}>
                      <Ionicons name="flash-outline" size={20} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleTitle}>Hospital 20m SLA Dispatch</Text>
                      <Text style={styles.moduleSub}>
                        Priority console for dialysis units, ICUs, and critical society sumps
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open Payouts Engine"
                    onPress={() => setActiveTab('payouts')}
                    style={styles.moduleCard}
                  >
                    <View style={[styles.moduleIconBox, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="cash-outline" size={20} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleTitle}>Payout Reconciliation Engine</Text>
                      <Text style={styles.moduleSub}>
                        Automated 85/5/10 breakdown, GST invoicing & dispute escrow
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open Water Compliance"
                    onPress={() => setActiveTab('water_safety')}
                    style={styles.moduleCard}
                  >
                    <View style={[styles.moduleIconBox, { backgroundColor: '#EDE9FE' }]}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleTitle}>Water Purity & Safety Audit</Text>
                      <Text style={styles.moduleSub}>
                        TDS sensors (&lt;250 ppm), pH balances, and BMC lab certificate repository
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
                  </Pressable>
                </View>

                {/* 2-Column Ops Desk Section: Surge Pricing & Fleet Liquidity */}
                <View style={[styles.opsDeskGrid, isDesktop && styles.opsDeskGridDesktop]}>
                  {/* Left Column: Fleet Liquidity & Dynamic Surge Controller */}
                  <View style={styles.opsDeskColumn}>
                    {/* Surge Multiplier Controller Card */}
                    <View style={styles.portalCard}>
                      <View style={styles.portalCardHeader}>
                        <View>
                          <Text style={styles.portalCardTitle}>Dynamic Surge Pricing Engine</Text>
                          <Text style={styles.portalCardSubtitle}>
                            Current Base Multiplier: {metrics.surge_multiplier.toFixed(2)}x
                          </Text>
                        </View>
                        <View style={styles.surgeActiveTag}>
                          <Ionicons name="flash" size={13} color="#D97706" />
                          <Text style={styles.surgeActiveTagText}>
                            {metrics.surge_multiplier > 1.0 ? 'SURGE ACTIVE' : 'BASE PRICING'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.surgeButtonsGrid}>
                        {[
                          { rate: 1.0, title: '1.00x', sub: 'Standard Base' },
                          { rate: 1.25, title: '1.25x', sub: 'Peak Morning' },
                          { rate: 1.5, title: '1.50x', sub: 'High Demand' },
                          { rate: 2.0, title: '2.00x', sub: 'Crisis Cap' },
                        ].map(({ rate, title, sub }) => {
                          const isSelected = metrics.surge_multiplier === rate;
                          return (
                            <Pressable
                              key={rate}
                              accessibilityRole="button"
                              accessibilityLabel={`Set Surge to ${title}`}
                              onPress={() => setSurgeMultiplier(rate)}
                              style={[
                                styles.surgeSelectorCard,
                                isSelected && styles.surgeSelectorCardActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.surgeRateNumber,
                                  isSelected && styles.surgeTextActive,
                                ]}
                              >
                                {title}
                              </Text>
                              <Text
                                style={[
                                  styles.surgeRateSub,
                                  isSelected && styles.surgeTextActive,
                                ]}
                              >
                                {sub}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  {/* Right Column: Pending Supplier KYC Applications */}
                  <View style={styles.opsDeskColumn}>
                    <View style={styles.portalCard}>
                      <View style={styles.portalCardHeader}>
                        <View>
                          <Text style={styles.portalCardTitle}>Supplier KYC Verification Queue</Text>
                          <Text style={styles.portalCardSubtitle}>
                            {pendingSuppliers.length} pending review
                          </Text>
                        </View>
                        <StatusBadge
                          label={`${pendingSuppliers.length} PENDING`}
                          variant={pendingSuppliers.length > 0 ? 'warning' : 'neutral'}
                          size="sm"
                        />
                      </View>

                      {pendingSuppliers.length === 0 ? (
                        <View style={styles.emptyCardBox}>
                          <Ionicons name="shield-checkmark" size={36} color="#16A34A" />
                          <Text style={styles.emptyCardTitle}>KYC Queue Clear</Text>
                          <Text style={styles.emptyCardSub}>
                            All active water suppliers in Mumbai are verified.
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.kycList}>
                          {pendingSuppliers.slice(0, 3).map((sup) => (
                            <View key={sup.id} style={styles.kycItemBox}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.kycItemTitle}>{sup.business_name}</Text>
                                <Text style={styles.kycItemSub}>
                                  {sup.contact_person} • {sup.phone_number}
                                </Text>
                                <Text style={styles.kycGstText}>GSTIN: {sup.gstin}</Text>
                              </View>
                              <View style={styles.kycActions}>
                                <Button
                                  title="Approve"
                                  size="sm"
                                  variant="primary"
                                  fullWidth={false}
                                  onPress={() => handleApprove(sup.id, sup.business_name)}
                                />
                                <Button
                                  title="Reject"
                                  size="sm"
                                  variant="outline"
                                  fullWidth={false}
                                  onPress={() => handleReject(sup.id, sup.business_name)}
                                />
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 2: LIVE GEOSPATIAL FLEET MAP & DEFICIT HEATMAP */}
            {activeTab === 'fleet_map' && <AdminFleetMapView isDesktop={isDesktop} />}

            {/* TAB 3: EMERGENCY HOSPITAL PRIORITY DISPATCH CONSOLE */}
            {activeTab === 'priority_dispatch' && <AdminEmergencyDispatchView isDesktop={isDesktop} />}

            {/* TAB 4: FINANCIAL RECONCILIATION & AUTOMATED PAYOUT ENGINE */}
            {activeTab === 'payouts' && <AdminPayoutsView isDesktop={isDesktop} />}

            {/* TAB 5: WATER PURITY & LAB COMPLIANCE AUDIT DESK */}
            {activeTab === 'water_safety' && <AdminWaterSafetyView isDesktop={isDesktop} />}

            {/* TAB 6: SCHEDULED SOCIETY SUBSCRIPTIONS & CORPORATE CONTRACTS */}
            {activeTab === 'subscriptions' && <AdminSubscriptionsView isDesktop={isDesktop} />}

            {/* TAB 7: SUPPLIER KYC APPROVALS */}
            {activeTab === 'verifications' && (
              <View style={styles.portalCard}>
                <View style={styles.portalCardHeader}>
                  <View>
                    <Text style={styles.portalCardTitle}>Supplier Onboarding & KYC Queue</Text>
                    <Text style={styles.portalCardSubtitle}>
                      Verify GSTIN, water source lab test, and tanker registrations
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Seed Test Supplier"
                    onPress={async () => {
                      const num = Math.floor(1000 + Math.random() * 9000);
                      const ok = await createTestSupplier({
                        business_name: `Aqua Express Logistics Hub ${num}`,
                        contact_person: 'Ramesh Yadav',
                        contact_phone: `+9198200${Math.floor(10000 + Math.random() * 90000)}`,
                        water_source: 'BMC Municipal / Deep Aquifer Sump',
                        gstin: `27AABC${num}1Z5`,
                      });
                      if (ok) notify('Test Supplier Created', `Aqua Express Logistics Hub ${num} added to pending review.`);
                    }}
                    style={styles.addTestBtn}
                  >
                    <Ionicons name="add" size={15} color="#0284C7" />
                    <Text style={styles.addTestBtnText}>+ Add Test Supplier</Text>
                  </Pressable>
                </View>
                {pendingSuppliers.length === 0 ? (
                  <View style={styles.emptyCardBox}>
                    <Ionicons name="checkmark-circle-outline" size={44} color="#16A34A" />
                    <Text style={styles.emptyCardTitle}>No Pending KYC Reviews</Text>
                    <Text style={styles.emptyCardSub}>
                      All commercial water suppliers currently meet operational compliance.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.kycList}>
                    {pendingSuppliers.map((sup) => (
                      <View key={sup.id} style={styles.kycItemBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.kycItemTitle}>{sup.business_name}</Text>
                          <Text style={styles.kycItemSub}>
                            {sup.contact_person} • {sup.phone_number}
                          </Text>
                          <Text style={styles.kycGstText}>GSTIN: {sup.gstin}</Text>
                          <Text style={styles.kycGstText}>Source: {sup.water_source}</Text>
                        </View>
                        <View style={styles.kycActions}>
                          <Button
                            title="Approve & Verify"
                            size="sm"
                            variant="primary"
                            fullWidth={false}
                            onPress={() => handleApprove(sup.id, sup.business_name)}
                          />
                          <Button
                            title="Reject"
                            size="sm"
                            variant="outline"
                            fullWidth={false}
                            onPress={() => handleReject(sup.id, sup.business_name)}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* TAB 8: CUSTOMER DISPUTES & MEDIATION */}
            {activeTab === 'disputes' && (
              <View style={styles.portalCard}>
                <View style={styles.portalCardHeader}>
                  <View>
                    <Text style={styles.portalCardTitle}>Disputes & Volume Short-Delivery Mediation</Text>
                    <Text style={styles.portalCardSubtitle}>
                      {disputes.length} recorded incidents
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create Test Dispute"
                    onPress={async () => {
                      const num = Math.floor(100 + Math.random() * 900);
                      const ok = await createTestDispute({
                        customer_name: 'Pooja Bhatt',
                        supplier_name: 'Marol Potable Water Hub',
                        amount: 650.0,
                        reason: `Flow meter reported 3,800L delivered instead of 5,000L ordered (Incident #${num})`,
                        category: 'volume_shortage',
                      });
                      if (ok) notify('Test Dispute Logged', 'Volume shortage dispute created in queue.');
                    }}
                    style={styles.addTestBtn}
                  >
                    <Ionicons name="add" size={15} color="#0284C7" />
                    <Text style={styles.addTestBtnText}>+ Create Test Dispute</Text>
                  </Pressable>
                </View>

                {disputes.length === 0 ? (
                  <View style={styles.emptyCardBox}>
                    <Ionicons name="shield-checkmark-outline" size={44} color="#16A34A" />
                    <Text style={styles.emptyCardTitle}>Zero Active Disputes</Text>
                    <Text style={styles.emptyCardSub}>
                      Delivery meter confirmations and PIN handoffs are 100% satisfied.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.kycList}>
                    {disputes.map((disp) => (
                      <View key={disp.id} style={styles.kycItemBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.kycItemTitle}>{disp.booking_reference}</Text>
                          <Text style={styles.kycItemSub}>
                            {disp.customer_name} vs {disp.supplier_name} • ₹{disp.amount}
                          </Text>
                          <Text style={styles.kycGstText}>{disp.reason}</Text>
                        </View>
                        <View style={styles.kycActions}>
                          {disp.status === 'open' ? (
                            <>
                              <Button
                                title="Approve Refund"
                                size="sm"
                                variant="outline"
                                fullWidth={false}
                                onPress={() => resolveDispute(disp.id, true)}
                              />
                              <Button
                                title="Dismiss / Resolve"
                                size="sm"
                                variant="primary"
                                fullWidth={false}
                                onPress={() => resolveDispute(disp.id, false)}
                              />
                            </>
                          ) : (
                            <StatusBadge
                              label={disp.status.toUpperCase()}
                              variant={disp.status === 'refunded' ? 'error' : 'success'}
                              size="sm"
                            />
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* TAB 9: POSTGIS SERVICE ZONES */}
            {activeTab === 'zones' && (
              <View style={styles.portalCard}>
                <View style={styles.portalCardHeader}>
                  <View>
                    <Text style={styles.portalCardTitle}>Mumbai Service Zones & PostGIS Telemetry</Text>
                    <Text style={styles.portalCardSubtitle}>
                      Zone polygon liquidity and traffic ETA multipliers
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add Service Zone"
                    onPress={() => setIsAddZoneModalOpen(true)}
                    style={styles.addTestBtn}
                  >
                    <Ionicons name="add" size={15} color="#0284C7" />
                    <Text style={styles.addTestBtnText}>+ Add Zone</Text>
                  </Pressable>
                </View>

                <View style={styles.zonesGrid}>
                  {serviceZones.map((zone, idx) => (
                    <View key={idx} style={styles.zoneCard}>
                      <View style={styles.zoneTop}>
                        <Text style={styles.zoneName}>{zone.zone_name}</Text>
                        <StatusBadge
                          label={zone.liquidity_status}
                          variant={zone.liquidity_status === 'OPTIMAL' ? 'success' : 'warning'}
                          size="sm"
                        />
                      </View>
                      <View style={styles.zoneSpecs}>
                        <Text style={styles.zoneSpecText}>
                          Online Tankers: <Text style={{ fontWeight: fontWeights.bold }}>{zone.online_fleet_count}</Text>
                        </Text>
                        <Text style={styles.zoneSpecText}>
                          Available: <Text style={{ fontWeight: fontWeights.bold }}>{zone.available_fleet_count}</Text>
                        </Text>
                        <Text style={styles.zoneSpecText}>
                          Active Deliveries: <Text style={{ fontWeight: fontWeights.bold }}>{zone.active_deliveries}</Text>
                        </Text>
                        <Text style={styles.zoneSpecText}>
                          Avg ETA: <Text style={{ fontWeight: fontWeights.bold }}>~{zone.avg_eta_minutes} mins</Text>
                        </Text>
                      </View>

                      {/* Zone CRUD Actions */}
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                        <Pressable
                          onPress={async () => {
                            const nextMulti = Number((Number(zone.traffic_multiplier || 1.1) + 0.1).toFixed(2));
                            const ok = await updateServiceZone(zone.zone_name, { traffic_multiplier: nextMulti });
                            if (ok) notify('Multiplier Updated', `Zone traffic multiplier set to ${nextMulti}x.`);
                          }}
                          style={styles.zoneMiniBtn}
                        >
                          <Ionicons name="trending-up" size={12} color="#0284C7" />
                          <Text style={styles.zoneMiniBtnText}>+0.1x Surge</Text>
                        </Pressable>

                        <Pressable
                          onPress={async () => {
                            const nextOp = zone.liquidity_status === 'OFFLINE' ? true : false;
                            const ok = await updateServiceZone(zone.zone_name, { is_operational: nextOp });
                            if (ok) notify('Zone Updated', 'Zone operational state toggled.');
                          }}
                          style={styles.zoneMiniBtn}
                        >
                          <Ionicons name="power" size={12} color="#64748B" />
                          <Text style={styles.zoneMiniBtnText}>Toggle Status</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* TAB 10: IMMUTABLE AUDIT TRAIL */}
            {activeTab === 'audit_log' && (
              <View style={styles.portalCard}>
                <View style={styles.portalCardHeader}>
                  <View>
                    <Text style={styles.portalCardTitle}>Immutable System Audit Trail</Text>
                    <Text style={styles.portalCardSubtitle}>
                      Append-only log of admin actions, dispatches, and KYC decisions
                    </Text>
                  </View>
                </View>

                <View style={styles.auditList}>
                  {auditLogs.map((log) => (
                    <View key={log.id} style={styles.auditItem}>
                      <View style={styles.auditDot} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.auditAction}>{log.action.replace(/_/g, ' ').toUpperCase()}</Text>
                          <Text style={styles.auditTarget}>
                            • {log.target_type} ({log.target_id.substring(0, 8)})
                          </Text>
                        </View>
                        {log.notes && <Text style={styles.auditNotes}>{log.notes}</Text>}
                        <Text style={styles.auditTime}>
                          {new Date(log.created_at).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* CRUD MODAL: ADD POSTGIS SERVICE ZONE */}
      <Modal visible={isAddZoneModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="map" size={20} color="#0284C7" />
                <Text style={styles.modalTitle}>Add Mumbai Service Zone</Text>
              </View>
              <Pressable onPress={() => setIsAddZoneModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Zone Name / Sector</Text>
              <TextInput
                value={newZoneName}
                onChangeText={setNewZoneName}
                placeholder="e.g. Goregaon East IT Hub"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Center Latitude</Text>
                  <TextInput
                    value={newZoneLat}
                    onChangeText={setNewZoneLat}
                    placeholder="19.1663"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Center Longitude</Text>
                  <TextInput
                    value={newZoneLng}
                    onChangeText={setNewZoneLng}
                    placeholder="72.8526"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Radius (km)</Text>
                  <TextInput
                    value={newZoneRadius}
                    onChangeText={setNewZoneRadius}
                    keyboardType="numeric"
                    placeholder="4.5"
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Traffic Multiplier</Text>
                  <TextInput
                    value={newZoneTraffic}
                    onChangeText={setNewZoneTraffic}
                    keyboardType="numeric"
                    placeholder="1.15"
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setIsAddZoneModalOpen(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={isCreatingZone}
                onPress={async () => {
                  const lat = parseFloat(newZoneLat);
                  const lng = parseFloat(newZoneLng);
                  const rad = parseFloat(newZoneRadius);
                  const traf = parseFloat(newZoneTraffic);

                  if (!newZoneName.trim() || isNaN(lat) || isNaN(lng)) {
                    notify('Missing Information', 'Please provide a valid zone name and coordinates.');
                    return;
                  }

                  setIsCreatingZone(true);
                  const ok = await createServiceZone({
                    zone_name: newZoneName.trim(),
                    center_lat: lat,
                    center_lng: lng,
                    radius_km: rad || 4.0,
                    traffic_multiplier: traf || 1.1,
                  });
                  setIsCreatingZone(false);

                  if (ok) {
                    notify('Service Zone Created', `Zone ${newZoneName} added with PostGIS polygon.`);
                    setIsAddZoneModalOpen(false);
                  } else {
                    notify('Error', 'Failed to create zone.');
                  }
                }}
                style={styles.modalSubmitBtn}
              >
                {isCreatingZone ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Create Zone</Text>
                )}
              </Pressable>
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
    backgroundColor: '#0F172A',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F8FAFC',
  },
  desktopLayout: {
    flexDirection: 'row',
  },

  // 1. LEFT SIDEBAR STYLES
  sidebar: {
    width: 295,
    backgroundColor: '#0F172A',
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  mobileSidebar: {
    width: '100%',
    paddingBottom: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 2,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  adminLogoImage: {
    width: 40,
    height: 40,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  opsBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  opsBadgeText: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
    color: '#38BDF8',
  },
  systemStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  systemStatusText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: fontWeights.medium,
  },
  navMenu: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#1E293B',
  },
  navItemText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: fontWeights.medium,
    color: '#94A3B8',
  },
  navItemTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  navBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    flexShrink: 0,
    marginLeft: 6,
  },
  navBadgeActive: {
    backgroundColor: colors.primary,
  },
  navBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#94A3B8',
  },
  navBadgeTextActive: {
    color: '#FFFFFF',
  },
  sidebarFooter: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 10,
  },
  adminUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarText: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  adminName: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  adminRole: {
    fontSize: 11,
    color: '#64748B',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
  },
  signOutBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: fontWeights.semibold,
  },

  // 2. MAIN CONTENT STYLES
  contentArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  breadcrumbMuted: {
    fontSize: 11,
    color: '#64748B',
  },
  breadcrumbActive: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  crisisToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  crisisToggleBoxActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  crisisToggleText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyScrollContent: {
    padding: spacing.lg,
    paddingBottom: 60,
  },

  // KPI CARDS ROW
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: 8,
    ...shadows.card,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#64748B',
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  kpiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiTrend: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#16A34A',
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748B',
  },
  kpiSuccessText: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: fontWeights.semibold,
  },
  marginPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  marginPillText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#16A34A',
  },

  // QUICK MODULES GRID
  quickModulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.lg,
  },
  moduleCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.card,
  },
  moduleIconBox: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  moduleSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },

  // OPS DESK 2-COL SECTION
  overviewContainer: {
    gap: spacing.md,
  },
  opsDeskGrid: {
    gap: spacing.md,
  },
  opsDeskGridDesktop: {
    flexDirection: 'row',
  },
  opsDeskColumn: {
    flex: 1,
    gap: spacing.md,
  },
  portalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    ...shadows.card,
  },
  portalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  portalCardTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  portalCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  surgeActiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  surgeActiveTagText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#D97706',
  },
  surgeButtonsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  surgeSelectorCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surgeSelectorCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  surgeRateNumber: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  surgeRateSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  surgeTextActive: {
    color: '#FFFFFF',
  },
  emptyCardBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#334155',
  },
  emptyCardSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  kycList: {
    marginTop: 12,
    gap: 10,
  },
  kycItemBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  kycItemTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  kycItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  kycGstText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  kycActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 8,
  },
  zonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  zoneCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  zoneTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoneName: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  zoneSpecs: {
    gap: 4,
  },
  zoneSpecText: {
    fontSize: 12,
    color: '#475569',
  },
  auditList: {
    marginTop: 12,
    gap: 12,
  },
  auditItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  auditAction: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  auditTarget: {
    fontSize: 11,
    color: '#64748B',
  },
  auditNotes: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  auditTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },

  // CRUD Test Buttons & Zone Action Styles
  addTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addTestBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: fontWeights.bold,
  },
  zoneMiniBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  zoneMiniBtnText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#334155',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    overflow: 'hidden',
    ...shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#475569',
    marginBottom: 5,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: fontWeights.semibold,
  },
  modalSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
});
