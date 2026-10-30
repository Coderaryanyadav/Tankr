import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
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
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { useAdminStore } from '../../../stores/adminStore';
import { useAuthStore } from '../../../stores/authStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

type AdminTab = 'overview' | 'verifications' | 'disputes' | 'zones' | 'audit_log';

export const AdminDashboardScreen: React.FC = () => {
  const { signOut } = useAuthStore();
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Admin Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>TANKR Ops Admin</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>COMMAND</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Bengaluru Metropolitan Operations
          </Text>
        </View>

        <Pressable
          onPress={() => signOut()}
          style={styles.switchModeBtn}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.white} />
          <Text style={styles.switchModeText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Emergency Crisis Mode Bar */}
      <View style={[styles.emergencyBar, emergencyMode && styles.emergencyActive]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons
            name={emergencyMode ? 'warning' : 'shield-checkmark'}
            size={20}
            color={emergencyMode ? colors.white : colors.primary}
            style={{ marginRight: 8 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.emergencyTitle,
                emergencyMode && { color: colors.white },
              ]}
            >
              {emergencyMode ? 'CRISIS DROUGHT MODE ACTIVE' : 'Standard Grid Mode'}
            </Text>
            <Text
              style={[
                styles.emergencySub,
                emergencyMode && { color: 'rgba(255,255,255,0.85)' },
              ]}
            >
              {emergencyMode
                ? 'Price caps enabled. Essential hospital priority routing ON.'
                : 'Free market algorithmic pricing & automated dispatch.'}
            </Text>
          </View>
        </View>
        <Switch
          value={emergencyMode}
          onValueChange={toggleEmergencyMode}
          trackColor={{ false: colors.cardBorder, true: colors.error }}
          thumbColor={colors.white}
        />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('overview')}
          style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
        >
          <Ionicons
            name="stats-chart"
            size={16}
            color={activeTab === 'overview' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'overview' && styles.tabTextActive,
            ]}
          >
            Overview
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('verifications')}
          style={[
            styles.tabItem,
            activeTab === 'verifications' && styles.tabItemActive,
          ]}
        >
          <Ionicons
            name="checkmark-done-circle"
            size={16}
            color={
              activeTab === 'verifications' ? colors.primary : colors.textMuted
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'verifications' && styles.tabTextActive,
            ]}
          >
            KYC Approvals ({pendingSuppliers.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('disputes')}
          style={[styles.tabItem, activeTab === 'disputes' && styles.tabItemActive]}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color={activeTab === 'disputes' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'disputes' && styles.tabTextActive,
            ]}
          >
            Disputes ({disputes.filter((d) => d.status === 'open').length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('zones')}
          style={[styles.tabItem, activeTab === 'zones' && styles.tabItemActive]}
        >
          <Ionicons
            name="map"
            size={16}
            color={activeTab === 'zones' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'zones' && styles.tabTextActive,
            ]}
          >
            Zones ({serviceZones.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('audit_log')}
          style={[styles.tabItem, activeTab === 'audit_log' && styles.tabItemActive]}
        >
          <Ionicons
            name="shield-checkmark"
            size={16}
            color={activeTab === 'audit_log' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'audit_log' && styles.tabTextActive,
            ]}
          >
            Audit Logs ({auditLogs.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && (
          <View>
            {/* KPI Metric Cards 2x2 */}
            <View style={styles.metricGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>GROSS VOLUME (GMV)</Text>
                <Text style={styles.metricValue}>
                  ₹{(metrics.total_gmv).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.metricSub}>All-time platform bookings</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>PLATFORM REVENUE</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  ₹{(metrics.platform_revenue).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.metricSub}>10% commission take rate</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>TOTAL DELIVERIES</Text>
                <Text style={styles.metricValue}>
                  {metrics.completed_bookings} / {metrics.total_bookings}
                </Text>
                <Text style={styles.metricSub}>
                  {((metrics.completed_bookings / (metrics.total_bookings || 1)) * 100).toFixed(1)}% success rate
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>WATER DISPATCHED</Text>
                <Text style={[styles.metricValue, { color: colors.primary }]}>
                  {formatLiters(metrics.total_liters_delivered)}
                </Text>
                <Text style={styles.metricSub}>Clean potable water</Text>
              </View>
            </View>

            {/* Live Fleet Utilization Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Fleet Online & Ready</Text>
                  <Text style={styles.sectionSubtitle}>
                    Active tankers broadcasting GPS coordinates
                  </Text>
                </View>
                <StatusBadge label="28 ONLINE" variant="success" size="sm" />
              </View>

              <View style={styles.fleetBarContainer}>
                <View style={[styles.fleetBarFill, { width: '74%' }]} />
              </View>
              <View style={styles.fleetStatsRow}>
                <Text style={styles.fleetStatText}>28 Online (74%)</Text>
                <Text style={styles.fleetStatText}>10 Off-duty (26%)</Text>
              </View>
            </View>

            {/* Dynamic Surge Pricing Multiplier Controller */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Network Surge Multiplier</Text>
                  <Text style={styles.sectionSubtitle}>
                    Current rate: {metrics.surge_multiplier.toFixed(2)}x base fare
                  </Text>
                </View>
                <Ionicons name="flash" size={20} color={colors.warning} />
              </View>

              <View style={styles.surgeBtnRow}>
                {[1.0, 1.25, 1.5, 2.0].map((rate) => {
                  const isActive = metrics.surge_multiplier === rate;
                  return (
                    <Pressable
                      key={rate}
                      onPress={() => setSurgeMultiplier(rate)}
                      style={[
                        styles.surgeBtn,
                        isActive && styles.surgeBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.surgeBtnText,
                          isActive && styles.surgeBtnTextActive,
                        ]}
                      >
                        {rate.toFixed(2)}x
                      </Text>
                      <Text
                        style={[
                          styles.surgeBtnSub,
                          isActive && styles.surgeBtnTextActive,
                        ]}
                      >
                        {rate === 1.0
                          ? 'Base'
                          : rate === 1.25
                          ? 'Peak'
                          : rate === 1.5
                          ? 'High'
                          : 'Crisis'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Verifications Tab */}
        {activeTab === 'verifications' && (
          <View>
            <Text style={styles.groupHeading}>
              PENDING SUPPLIER ONBOARDING ({pendingSuppliers.length})
            </Text>

            {pendingSuppliers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="shield-checkmark"
                  size={40}
                  color={colors.success}
                />
                <Text style={styles.emptyTitle}>All Suppliers Verified</Text>
                <Text style={styles.emptySub}>
                  No pending compliance reviews in queue.
                </Text>
              </View>
            ) : (
              pendingSuppliers.map((supplier) => (
                <View key={supplier.id} style={styles.kycCard}>
                  <View style={styles.kycTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.kycBusinessName}>
                        {supplier.business_name}
                      </Text>
                      <Text style={styles.kycContact}>
                        {supplier.contact_person} • {supplier.phone_number}
                      </Text>
                    </View>
                    <StatusBadge label="KYC PENDING" variant="warning" size="sm" />
                  </View>

                  <View style={styles.kycDetailGrid}>
                    <View style={styles.kycDetailItem}>
                      <Text style={styles.kycDetailLabel}>GSTIN</Text>
                      <Text style={styles.kycDetailValue}>{supplier.gstin}</Text>
                    </View>
                    <View style={styles.kycDetailItem}>
                      <Text style={styles.kycDetailLabel}>FLEET SIZE</Text>
                      <Text style={styles.kycDetailValue}>
                        {supplier.fleet_size} Tankers
                      </Text>
                    </View>
                  </View>

                  <View style={styles.kycSourceBox}>
                    <Ionicons
                      name="water-outline"
                      size={15}
                      color={colors.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.kycSourceText}>
                      Source: {supplier.water_source}
                    </Text>
                  </View>

                  <View style={styles.kycActionRow}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Button
                        title="Reject"
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onPress={() => handleReject(supplier.id, supplier.business_name)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Approve KYC"
                        variant="primary"
                        size="sm"
                        fullWidth
                        onPress={() => handleApprove(supplier.id, supplier.business_name)}
                      />
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Disputes Tab */}
        {activeTab === 'disputes' && (
          <View>
            <Text style={styles.groupHeading}>CUSTOMER DISPUTES & REFUNDS</Text>

            {disputes.map((d) => (
              <View key={d.id} style={styles.disputeCard}>
                <View style={styles.disputeTopRow}>
                  <Text style={styles.disputeRef}>{d.booking_reference}</Text>
                  <StatusBadge
                    label={d.status.toUpperCase()}
                    variant={d.status === 'open' ? 'error' : 'success'}
                    size="sm"
                  />
                </View>

                <Text style={styles.disputeParties}>
                  Customer: {d.customer_name} • Supplier: {d.supplier_name}
                </Text>

                <View style={styles.disputeReasonBox}>
                  <Text style={styles.disputeReason}>{d.reason}</Text>
                </View>

                <View style={styles.disputeFooterRow}>
                  <Text style={styles.disputeAmount}>
                    Dispute Value: ₹{d.amount}
                  </Text>

                  {d.status === 'open' && (
                    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
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
              </View>
            ))}
          </View>
        )}

        {activeTab === 'zones' && (
          <View>
            <Text style={styles.groupHeading}>BENGALURU SERVICE ZONES & FLEET LIQUIDITY</Text>
            {serviceZones.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="map-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Loading Service Zones</Text>
                <Text style={styles.emptyText}>
                  Computing real-time PostGIS polygon fleet density across metropolitan Bengaluru.
                </Text>
              </View>
            ) : (
              serviceZones.map((zone) => (
                <View key={zone.zone_name} style={styles.disputeCard}>
                  <View style={styles.disputeTopRow}>
                    <Text style={styles.disputeRef}>{zone.zone_name}</Text>
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
                  <Text style={styles.disputeParties}>
                    Available Tankers: {zone.available_fleet_count} • Online: {zone.online_fleet_count} • Active Trips: {zone.active_deliveries}
                  </Text>
                  <View style={styles.disputeReasonBox}>
                    <Text style={styles.disputeReason}>
                      Estimated ETA: ~{zone.avg_eta_minutes} mins • Traffic Multiplier: {zone.traffic_factor}x
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'audit_log' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Administrative Audit Trail</Text>
              <Text style={styles.sectionSub}>
                Cryptographic audit log of KYC approvals, surge pricing overrides and dispute resolutions.
              </Text>
            </View>

            {auditLogs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No administrative events recorded yet.</Text>
              </View>
            ) : (
              auditLogs.map((log) => (
                <View key={log.id} style={styles.auditCard}>
                  <View style={styles.auditHeader}>
                    <View style={styles.auditActionTag}>
                      <Text style={styles.auditActionText}>{log.action.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.auditTime}>
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.auditTarget}>Target: {log.target_type} ({log.target_id})</Text>
                  {log.notes && <Text style={styles.auditNotes}>Notes: {log.notes}</Text>}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.darkNavy,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.darkNavy,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: fontWeights.heavy,
    color: colors.white,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  switchModeText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  emergencyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  emergencyActive: {
    backgroundColor: colors.error,
  },
  emergencyTitle: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  emergencySub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: fontWeights.heavy,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 19,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
  },
  metricSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  fleetBarContainer: {
    height: 8,
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  fleetBarFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  fleetStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  fleetStatText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  surgeBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  surgeBtn: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  surgeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  surgeBtnText: {
    fontSize: 15,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
  },
  surgeBtnSub: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginTop: 1,
  },
  surgeBtnTextActive: {
    color: colors.white,
  },
  groupHeading: {
    fontSize: 11,
    fontWeight: fontWeights.heavy,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  kycCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  kycTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  kycBusinessName: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  kycContact: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  kycDetailGrid: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundMuted,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  kycDetailItem: {
    flex: 1,
  },
  kycDetailLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
  },
  kycDetailValue: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: 1,
  },
  kycSourceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  kycSourceText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  kycActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  disputeCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  disputeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  disputeRef: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  disputeParties: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  disputeReasonBox: {
    backgroundColor: colors.backgroundMuted,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
  },
  disputeReason: {
    fontSize: 12,
    color: colors.darkNavy,
    lineHeight: 16,
  },
  disputeFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  disputeAmount: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.error,
  },
  auditCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  auditActionTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  auditActionText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  auditTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  auditTarget: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
    marginBottom: 2,
  },
  auditNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});

