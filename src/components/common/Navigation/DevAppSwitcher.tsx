import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontWeights, shadows } from '../../../theme';

interface ScreenLink {
  app: string;
  label: string;
  screen?: string;
  tab?: string;
  modal?: string;
  desk?: string;
}

const APPS: Array<{ title: string; icon: keyof typeof Ionicons.glyphMap; color: string; links: ScreenLink[] }> = [
  {
    title: 'Customer App',
    icon: 'person',
    color: '#0284C7',
    links: [
      { app: 'customer', tab: 'discovery', label: '1. Home Discovery & Map' },
      { app: 'customer', modal: 'booking_review', label: '2. Booking Review & Quote Modal' },
      { app: 'customer', modal: 'searching', label: '3. Searching Driver Overlay' },
      { app: 'customer', tab: 'bookings', label: '4. My Bookings & Stepper' },
      { app: 'customer', screen: 'bookings', modal: 'invoice', label: '5. Official Tax Invoice Modal' },
      { app: 'customer', tab: 'activity', label: '6. Live GPS Tracking & PIN' },
      { app: 'customer', tab: 'account', label: '7. Account & Sump Profile' },
      { app: 'customer', modal: 'saved_addresses', label: '8. Saved Addresses Sheet' },
      { app: 'customer', screen: 'account', modal: 'water_quality', label: '9. BIS-10500 Lab Certificate' },
      { app: 'customer', screen: 'account', modal: 'fair_metering', label: '10. Fair Metering Guarantee' },
      { app: 'customer', modal: 'dispute', label: '11. File Delivery Dispute' },
      { app: 'customer', modal: 'community_pool', label: '12. Community Sump Pooling' },
      { app: 'customer', modal: 'notifications', label: '13. Notifications Drawer' },
      { app: 'customer', screen: 'account', modal: 'support', label: '14. 24/7 Support Desk' },
    ],
  },
  {
    title: 'Fleet Driver App',
    icon: 'car',
    color: '#10B981',
    links: [
      { app: 'driver', label: '1. Driver Active Delivery Dashboard' },
      { app: 'driver', modal: 'verify_pin', label: '2. Flow Meter & Customer PIN Verification' },
    ],
  },
  {
    title: 'Water Supplier App',
    icon: 'business',
    color: '#8B5CF6',
    links: [
      { app: 'supplier', label: '1. Supplier Fleet & Dispatch Dashboard' },
      { app: 'supplier', modal: 'add_vehicle', label: '2. Onboard Tanker Vehicle Modal' },
      { app: 'supplier', screen: 'registration', label: '3. Supplier KYC Compliance Screen' },
    ],
  },
  {
    title: 'Operations Admin Desks',
    icon: 'shield-checkmark',
    color: '#EF4444',
    links: [
      { app: 'admin', desk: 'overview', label: '1. Demand Deficit Radar & Overview' },
      { app: 'admin', desk: 'fleet_map', label: '2. Fleet Map & Live Heatmap' },
      { app: 'admin', desk: 'priority_dispatch', label: '3. Hospital Priority Dispatch (20m SLA)' },
      { app: 'admin', desk: 'payouts', label: '4. Driver Payouts & Settlements' },
      { app: 'admin', desk: 'water_safety', label: '5. Water Safety Lab Audits' },
      { app: 'admin', desk: 'subscriptions', label: '6. Corporate Recurring Contracts' },
      { app: 'admin', desk: 'verifications', label: '7. Supplier KYC Approvals' },
      { app: 'admin', desk: 'disputes', label: '8. Disputes & Escrow Arbitration' },
      { app: 'admin', desk: 'zones', label: '9. Service Zones & Surges' },
      { app: 'admin', desk: 'audit_log', label: '10. Authoritative System Audit Log' },
    ],
  },
  {
    title: 'Auth & Design System',
    icon: 'color-palette',
    color: '#F59E0B',
    links: [
      { app: 'auth', screen: 'login', label: '1. Phone Login & Demo Switcher' },
      { app: 'auth', screen: 'verify', label: '2. SMS OTP Verification' },
      { app: 'auth', screen: 'onboarding', label: '3. Customer Onboarding Screen' },
      { app: 'showcase', label: '4. Design System Component Gallery' },
    ],
  },
];

export const DevAppSwitcher: React.FC = () => {
  if (Platform.OS !== 'web') return null;

  // Hide switcher floating badge completely during automated screenshot runs
  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('screenshot') === '1') {
      return null;
    }
  }

  const [isOpen, setIsOpen] = useState(false);

  const navigateTo = (link: ScreenLink) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (link.app) params.set('app', link.app);
    if (link.screen) params.set('screen', link.screen);
    if (link.tab) params.set('tab', link.tab);
    if (link.modal) params.set('modal', link.modal);
    if (link.desk) params.set('desk', link.desk);

    window.location.search = params.toString();
  };

  const resetToAuth = () => {
    if (typeof window === 'undefined') return;
    window.location.search = '';
  };

  return (
    <>
      {/* Floating launcher button in bottom-right corner */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open TANKR App & Screen Switcher"
        onPress={() => setIsOpen(true)}
        style={styles.floatingButton}
      >
        <Ionicons name="apps" size={18} color="#FFFFFF" />
        <Text style={styles.floatingButtonText}>Screens</Text>
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>TANKR Screen & App Switcher</Text>
                <Text style={styles.modalSubtitle}>Quickly preview any app, desk, or screen</Text>
              </View>
              <Pressable onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={styles.scrollList} contentContainerStyle={{ padding: 16, gap: 16 }}>
              {APPS.map((group) => (
                <View key={group.title} style={styles.groupCard}>
                  <View style={styles.groupHeader}>
                    <Ionicons name={group.icon} size={16} color={group.color} />
                    <Text style={[styles.groupTitle, { color: group.color }]}>{group.title}</Text>
                  </View>
                  <View style={styles.linksGrid}>
                    {group.links.map((link) => (
                      <Pressable
                        key={link.label}
                        style={styles.linkItem}
                        onPress={() => {
                          setIsOpen(false);
                          navigateTo(link);
                        }}
                      >
                        <Ionicons name="chevron-forward" size={12} color="#94A3B8" />
                        <Text style={styles.linkLabel}>{link.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}

              <Pressable style={styles.resetBtn} onPress={resetToAuth}>
                <Ionicons name="refresh" size={14} color="#64748B" />
                <Text style={styles.resetBtnText}>Reset to Default App Flow</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    zIndex: 99999,
    ...shadows.modal,
    cursor: 'pointer' as any,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: fontWeights.bold,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 680,
    maxHeight: '85%',
    overflow: 'hidden',
    ...shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: fontWeights.heavy,
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  scrollList: {
    maxHeight: 520,
  },
  groupCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  linkLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: fontWeights.medium,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginTop: 8,
    cursor: 'pointer' as any,
  },
  resetBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: fontWeights.semibold,
  },
});
