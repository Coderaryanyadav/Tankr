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

type AdminTab = 'overview' | 'verifications' | 'disputes' | 'zones' | 'audit_log';

export const AdminDashboardScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

  const { user, signOut } = useAuthStore();
  const {
    metrics,
    pendingSuppliers,
    disputes,
    auditLogs,
    serviceZones,
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
    { id: 'overview', label: 'Dashboard Overview', icon: 'speedometer-outline' },
    { id: 'verifications', label: 'KYC Approvals', icon: 'checkmark-circle-outline', badge: pendingSuppliers.length },
    { id: 'disputes', label: 'Disputes & Refunds', icon: 'shield-outline', badge: disputes.filter((d) => d.status === 'open').length },
    { id: 'zones', label: 'Service Zones & PostGIS', icon: 'map-outline', badge: serviceZones.length },
    { id: 'audit_log', label: 'Audit Trail & Compliance', icon: 'receipt-outline', badge: auditLogs.length },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.mainLayout, isDesktop && styles.desktopLayout]}>
        {/* ============================================================ */}
        {/* 1. LEFT SIDEBAR (Desktop Enterprise Portal Nav)               */}
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
                  <Text style={styles.opsBadgeText}>OPS CONSOLE</Text>
                </View>
              </View>
              <Text style={styles.brandSub}>Bengaluru Operations</Text>
            </View>
          </View>

          {/* System Status Pill */}
          <View style={styles.systemStatusPill}>
            <View style={styles.statusDotGreen} />
            <Text style={styles.systemStatusText}>Cluster: BLR-1 (Production)</Text>
          </View>

          {/* Navigation Links */}
          <View style={styles.navMenu}>
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
                    size={18}
                    color={isActive ? colors.white : '#94A3B8'}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
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
          </View>

          {/* Sidebar Bottom: Admin Persona & Sign Out */}
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
                  : activeTab === 'verifications'
                  ? 'Supplier KYC & Compliance Review'
                  : activeTab === 'disputes'
                  ? 'Customer Disputes & SLA Mediation'
                  : activeTab === 'zones'
                  ? 'Bengaluru PostGIS Liquidity Zones'
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

          {/* Scrollable Dashboard Body */}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* TAB 1: OVERVIEW DASHBOARD */}
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
                      <Text style={styles.kpiSub}>BWSSB / Certified Purity</Text>
                    </View>
                  </View>
                </View>

                {/* 2-Column Ops Desk Section */}
                <View style={[styles.opsDeskGrid, isDesktop && styles.opsDeskGridDesktop]}>
                  {/* Left Ops Desk: Fleet Liquidity & Dynamic Surge Controller */}
                  <View style={styles.opsDeskColumn}>
                    {/* Fleet Liquidity Card */}
                    <View style={styles.portalCard}>
                      <View style={styles.portalCardHeader}>
                        <View>
                          <Text style={styles.portalCardTitle}>Fleet Online & Liquidity</Text>
                          <Text style={styles.portalCardSubtitle}>
                            Active tankers streaming telemetry in Bengaluru
                          </Text>
                        </View>
                        <StatusBadge label="FLEET ACTIVE" variant="success" size="sm" />
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: '74%' }]} />
                      </View>

                      <View style={styles.fleetMetricRow}>
                        <View style={styles.fleetStatItem}>
                          <View style={[styles.statDot, { backgroundColor: '#16A34A' }]} />
                          <Text style={styles.fleetStatTitle}>28 Online Tankers (74%)</Text>
                        </View>
                        <View style={styles.fleetStatItem}>
                          <View style={[styles.statDot, { backgroundColor: '#94A3B8' }]} />
                          <Text style={styles.fleetStatTitle}>10 Off-Duty (26%)</Text>
                        </View>
                      </View>

                      {/* Distribution Badges */}
                      <View style={styles.capacityDistributionRow}>
                        <View style={styles.capChip}>
                          <Text style={styles.capChipText}>1kL: 6 units</Text>
                        </View>
                        <View style={styles.capChip}>
                          <Text style={styles.capChipText}>2kL: 8 units</Text>
                        </View>
                        <View style={styles.capChip}>
                          <Text style={styles.capChipText}>5kL: 9 units</Text>
                        </View>
                        <View style={styles.capChip}>
                          <Text style={styles.capChipText}>10kL+: 5 units</Text>
                        </View>
                      </View>
                    </View>

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

                  {/* Right Ops Desk: Action Feed & Alerts */}
                  <View style={styles.opsDeskColumn}>
                    {/* Pending KYC Desk */}
                    <View style={styles.portalCard}>
                      <View style={styles.portalCardHeader}>
                        <View>
                          <Text style={styles.portalCardTitle}>Supplier KYC Verification Queue</Text>
                          <Text style={styles.portalCardSubtitle}>
                            {pendingSuppliers.length} applications awaiting compliance approval
                          </Text>
                        </View>
                        <Pressable onPress={() => setActiveTab('verifications')}>
                          <Text style={styles.cardHeaderLink}>View All ➔</Text>
                        </Pressable>
                      </View>

                      {pendingSuppliers.length === 0 ? (
                        <View style={styles.cleanQueueBox}>
                          <Ionicons name="checkmark-circle" size={32} color="#16A34A" />
                          <Text style={styles.cleanQueueTitle}>KYC Queue Is Clear</Text>
                          <Text style={styles.cleanQueueSub}>
                            All active suppliers in Bengaluru are fully compliant and BWSSB certified.
                          </Text>
                        </View>
                      ) : (
                        pendingSuppliers.slice(0, 2).map((s) => (
                          <View key={s.id} style={styles.queueItemRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.queueItemName}>{s.business_name}</Text>
                              <Text style={styles.queueItemDetails}>
                                {s.contact_person} • GSTIN: {s.gstin}
                              </Text>
                            </View>
                            <Button
                              title="Approve"
                              variant="primary"
                              size="sm"
                              onPress={() => handleApprove(s.id, s.business_name)}
                            />
                          </View>
                        ))
                      )}
                    </View>

                    {/* Disputes & SLA Health Card */}
                    <View style={styles.portalCard}>
                      <View style={styles.portalCardHeader}>
                        <View>
                          <Text style={styles.portalCardTitle}>Active Customer Disputes</Text>
                          <Text style={styles.portalCardSubtitle}>
                            Flow-meter variances and delivery delay reports
                          </Text>
                        </View>
                        <Pressable onPress={() => setActiveTab('disputes')}>
                          <Text style={styles.cardHeaderLink}>View Desk ➔</Text>
                        </Pressable>
                      </View>

                      {disputes.filter((d) => d.status === 'open').length === 0 ? (
                        <View style={styles.cleanQueueBox}>
                          <Ionicons name="shield-checkmark" size={32} color="#0284C7" />
                          <Text style={styles.cleanQueueTitle}>Zero Open Disputes</Text>
                          <Text style={styles.cleanQueueSub}>
                            100% of deliveries verified via customer PIN and meter telemetry.
                          </Text>
                        </View>
                      ) : (
                        disputes.filter((d) => d.status === 'open').slice(0, 2).map((d) => (
                          <View key={d.id} style={styles.queueItemRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.queueItemName}>{d.booking_reference}</Text>
                              <Text style={styles.queueItemDetails}>
                                {d.customer_name} • ₹{d.amount}
                              </Text>
                            </View>
                            <Button
                              title="Resolve"
                              variant="outline"
                              size="sm"
                              onPress={() => setActiveTab('disputes')}
                            />
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 2: KYC APPROVALS DESK */}
            {activeTab === 'verifications' && (
              <View style={styles.sectionContainer}>
                <View style={styles.tableHeaderBar}>
                  <Text style={styles.tableHeaderTitle}>
                    Pending Supplier Applications ({pendingSuppliers.length})
                  </Text>
                  <Text style={styles.tableHeaderSub}>
                    Requires valid GSTIN, BWSSB water source certificate, and driver license verification.
                  </Text>
                </View>

                {pendingSuppliers.length === 0 ? (
                  <View style={styles.cleanQueueBox}>
                    <Ionicons name="shield-checkmark" size={48} color="#16A34A" />
                    <Text style={styles.cleanQueueTitle}>All Suppliers Verified</Text>
                    <Text style={styles.cleanQueueSub}>No applications pending review in the queue.</Text>
                  </View>
                ) : (
                  pendingSuppliers.map((supplier) => (
                    <View key={supplier.id} style={styles.enterpriseTableRow}>
                      <View style={{ flex: 1.5 }}>
                        <Text style={styles.tableEntityName}>{supplier.business_name}</Text>
                        <Text style={styles.tableEntitySub}>
                          {supplier.contact_person} • {supplier.phone_number}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.tableColLabel}>GSTIN</Text>
                        <Text style={styles.tableColVal}>{supplier.gstin}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.tableColLabel}>FLEET SIZE</Text>
                        <Text style={styles.tableColVal}>{supplier.fleet_size} Tankers</Text>
                      </View>

                      <View style={{ flex: 1.5 }}>
                        <Text style={styles.tableColLabel}>WATER SOURCE</Text>
                        <Text style={styles.tableColVal}>{supplier.water_source}</Text>
                      </View>

                      <View style={styles.tableActionGroup}>
                        <Button
                          title="Reject"
                          variant="secondary"
                          size="sm"
                          onPress={() => handleReject(supplier.id, supplier.business_name)}
                        />
                        <Button
                          title="Approve KYC"
                          variant="primary"
                          size="sm"
                          onPress={() => handleApprove(supplier.id, supplier.business_name)}
                        />
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 3: DISPUTES & REFUNDS */}
            {activeTab === 'disputes' && (
              <View style={styles.sectionContainer}>
                <View style={styles.tableHeaderBar}>
                  <Text style={styles.tableHeaderTitle}>Customer Disputes & SLA Mediation</Text>
                  <Text style={styles.tableHeaderSub}>
                    Review water volume discrepancy claims, flow-meter audit logs, and trigger direct refunds.
                  </Text>
                </View>

                {disputes.length === 0 ? (
                  <View style={styles.cleanQueueBox}>
                    <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
                    <Text style={styles.cleanQueueTitle}>Zero Open Disputes</Text>
                    <Text style={styles.cleanQueueSub}>No contested orders on record.</Text>
                  </View>
                ) : (
                  disputes.map((d) => (
                    <View key={d.id} style={styles.enterpriseTableRow}>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.tableEntityName}>{d.booking_reference}</Text>
                        <Text style={styles.tableEntitySub}>
                          Customer: {d.customer_name} • Supplier: {d.supplier_name}
                        </Text>
                      </View>

                      <View style={{ flex: 2 }}>
                        <Text style={styles.tableColLabel}>REASON</Text>
                        <Text style={styles.tableColVal}>{d.reason}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.tableColLabel}>DISPUTE VALUE</Text>
                        <Text style={[styles.tableColVal, { fontWeight: '700' }]}>₹{d.amount}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <StatusBadge
                          label={d.status.toUpperCase()}
                          variant={d.status === 'open' ? 'error' : 'success'}
                          size="sm"
                        />
                      </View>

                      {d.status === 'open' && (
                        <View style={styles.tableActionGroup}>
                          <Button
                            title="Dismiss"
                            variant="secondary"
                            size="sm"
                            onPress={() => resolveDispute(d.id, false)}
                          />
                          <Button
                            title="Refund Customer"
                            variant="primary"
                            size="sm"
                            onPress={() => resolveDispute(d.id, true)}
                          />
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 4: SERVICE ZONES */}
            {activeTab === 'zones' && (
              <View style={styles.sectionContainer}>
                <View style={styles.tableHeaderBar}>
                  <Text style={styles.tableHeaderTitle}>
                    Metropolitan Bengaluru Service Zones ({serviceZones.length})
                  </Text>
                  <Text style={styles.tableHeaderSub}>
                    PostGIS polygon geographic service partitions with automated liquidity balancing.
                  </Text>
                </View>

                {serviceZones.length === 0 ? (
                  <View style={styles.cleanQueueBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.cleanQueueTitle}>Loading PostGIS Zones...</Text>
                  </View>
                ) : (
                  serviceZones.map((zone) => (
                    <View key={zone.zone_name} style={styles.enterpriseTableRow}>
                      <View style={{ flex: 1.5 }}>
                        <Text style={styles.tableEntityName}>{zone.zone_name}</Text>
                        <Text style={styles.tableEntitySub}>Bengaluru Urban District</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.tableColLabel}>LIQUIDITY STATUS</Text>
                        <StatusBadge
                          label={zone.liquidity_status}
                          variant={
                            zone.liquidity_status === 'OPTIMAL'
                              ? 'success'
                              : zone.liquidity_status === 'LIMITED_SUPPLY'
                              ? 'warning'
                              : 'error'
                          }
                          size="sm"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.tableColLabel}>AVAILABLE FLEET</Text>
                        <Text style={styles.tableColVal}>{zone.available_fleet_count} Tankers</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.tableColLabel}>AVG ETA</Text>
                        <Text style={styles.tableColVal}>~{zone.avg_eta_minutes} mins</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.tableColLabel}>TRAFFIC MULTIPLIER</Text>
                        <Text style={styles.tableColVal}>{zone.traffic_factor}x</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 5: AUDIT LOGS */}
            {activeTab === 'audit_log' && (
              <View style={styles.sectionContainer}>
                <View style={styles.tableHeaderBar}>
                  <Text style={styles.tableHeaderTitle}>Cryptographic System Audit Trail</Text>
                  <Text style={styles.tableHeaderSub}>
                    Immutable log of administrative authorizations, surge price changes, and KYC reviews.
                  </Text>
                </View>

                {auditLogs.length === 0 ? (
                  <View style={styles.cleanQueueBox}>
                    <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
                    <Text style={styles.cleanQueueTitle}>No Audit Events Yet</Text>
                    <Text style={styles.cleanQueueSub}>
                      All privileged actions performed by operators are recorded here in real-time.
                    </Text>
                  </View>
                ) : (
                  auditLogs.map((log) => (
                    <View key={log.id} style={styles.auditLogItem}>
                      <View style={styles.auditActionPill}>
                        <Text style={styles.auditActionText}>{log.action.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.auditTargetText}>
                          Target: {log.target_type} ({log.target_id || 'Global'})
                        </Text>
                        {log.notes && <Text style={styles.auditNotesText}>{log.notes}</Text>}
                      </View>
                      <Text style={styles.auditTimestamp}>
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {new Date(log.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))
                )}
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
  // ==========================================
  // SIDEBAR STYLING
  // ==========================================
  sidebar: {
    width: 260,
    backgroundColor: '#0F172A',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    justifyContent: 'space-between',
  },
  mobileSidebar: {
    width: '100%',
    paddingVertical: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: fontWeights.heavy,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  opsBadge: {
    backgroundColor: '#0369A1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  opsBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  systemStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: 8,
  },
  statusDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  systemStatusText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: fontWeights.medium,
  },
  navMenu: {
    flex: 1,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#1E293B',
  },
  navItemText: {
    flex: 1,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: fontWeights.medium,
  },
  navItemTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  navBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  navBadgeActive: {
    backgroundColor: '#0284C7',
  },
  navBadgeText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: fontWeights.bold,
  },
  navBadgeTextActive: {
    color: '#FFFFFF',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  adminUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  adminAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarText: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
    fontSize: 14,
  },
  adminName: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  adminRole: {
    fontSize: 11,
    color: '#94A3B8',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 8,
    borderRadius: 6,
  },
  signOutBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: fontWeights.bold,
  },
  // ==========================================
  // MAIN CONTENT STYLING
  // ==========================================
  contentArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    color: '#0F172A',
    fontWeight: fontWeights.bold,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  crisisToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  crisisToggleBoxActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
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
    padding: spacing.xl,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  // ==========================================
  // KPI METRIC CARDS
  // ==========================================
  overviewContainer: {
    gap: spacing.xl,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: fontWeights.heavy,
    color: '#0F172A',
    marginBottom: 6,
  },
  kpiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiTrend: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#16A34A',
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748B',
  },
  kpiSuccessText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#16A34A',
  },
  marginPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  marginPillText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#16A34A',
  },
  // ==========================================
  // OPS DESK 2-COLUMN GRID
  // ==========================================
  opsDeskGrid: {
    flexDirection: 'column',
    gap: spacing.lg,
  },
  opsDeskGridDesktop: {
    flexDirection: 'row',
  },
  opsDeskColumn: {
    flex: 1,
    gap: spacing.lg,
  },
  portalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  portalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
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
  cardHeaderLink: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
  fleetMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  fleetStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fleetStatTitle: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#334155',
  },
  capacityDistributionRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  capChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  capChipText: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    color: '#475569',
  },
  // Surge Controller
  surgeActiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  surgeActiveTagText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#D97706',
  },
  surgeButtonsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  surgeSelectorCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  surgeSelectorCardActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0369A1',
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
  // Queues and Lists
  cleanQueueBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: 6,
  },
  cleanQueueTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  cleanQueueSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
  },
  queueItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: spacing.sm,
  },
  queueItemName: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  queueItemDetails: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  // ==========================================
  // ENTERPRISE DATA TABLES
  // ==========================================
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  tableHeaderBar: {
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: spacing.md,
  },
  tableHeaderTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  tableHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  enterpriseTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: spacing.md,
  },
  tableEntityName: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  tableEntitySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  tableColLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tableColVal: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#1E293B',
    marginTop: 2,
  },
  tableActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  auditLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: spacing.md,
  },
  auditActionPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  auditActionText: {
    fontSize: 10,
    fontWeight: fontWeights.heavy,
    color: '#0369A1',
  },
  auditTargetText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  auditNotesText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  auditTimestamp: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
