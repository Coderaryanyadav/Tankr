import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { useAdminStore } from '../../../stores/adminStore';
import { useAuthStore } from '../../../stores/authStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

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

export const AdminDashboardScreen: React.FC = () => {
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
    isLoading,
    emergencyMode,
    fetchDashboardMetrics,
    fetchServiceZones,
    approveSupplier,
    rejectSupplier,
    setSurgeMultiplier,
    toggleEmergencyMode,
    resolveDispute,
  } = useAdminStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  useEffect(() => {
    fetchDashboardMetrics();
    fetchServiceZones();
  }, [fetchDashboardMetrics, fetchServiceZones]);

  const handleApprove = (id: string, name: string) => {
    Alert.alert(
      'Verify Supplier KYC',
      `Approve ${name} to operate on the TANKR dispatch network?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Activate',
          onPress: async () => {
            await approveSupplier(id);
            Alert.alert('Supplier Verified', `${name} is now approved to receive bookings.`);
          },
        },
      ]
    );
  };

  const handleReject = (id: string, name: string) => {
    Alert.alert(
      'Reject Supplier',
      `Reject ${name}'s application? They will need to resubmit compliance documents.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            await rejectSupplier(id);
          },
        },
      ]
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
              <Ionicons name="water" size={20} color={colors.white} />
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
            <Text style={styles.systemStatusText}>Cluster: BLR-1 (Production)</Text>
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
                                  onPress={() => handleApprove(sup.id, sup.business_name)}
                                />
                                <Button
                                  title="Reject"
                                  size="sm"
                                  variant="outline"
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
                            onPress={() => handleApprove(sup.id, sup.business_name)}
                          />
                          <Button
                            title="Reject"
                            size="sm"
                            variant="outline"
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
                                onPress={() => resolveDispute(disp.id, true)}
                              />
                              <Button
                                title="Dismiss / Resolve"
                                size="sm"
                                variant="primary"
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
    width: 270,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#1E293B',
  },
  navItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: fontWeights.medium,
    color: '#94A3B8',
  },
  navItemTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  navBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
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
    gap: 6,
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
});
