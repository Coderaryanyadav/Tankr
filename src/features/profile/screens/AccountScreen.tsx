import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../components/common/Card/Card';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { SavedAddressesSheet } from '../../location/components/SavedAddressesSheet';
import { SignOutConfirmModal } from '../components/SignOutConfirmModal';
import { SupportDeskModal } from '../components/SupportDeskModal';
import { WaterQualityModal } from '../components/WaterQualityModal';
import { FairMeteringModal } from '../components/FairMeteringModal';
import { PrivacyTermsModal } from '../components/PrivacyTermsModal';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { useLocationStore } from '../../../stores/locationStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface AccountScreenProps {
  onNavigateToBookings?: () => void;
  initialModal?: string;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({ onNavigateToBookings, initialModal }) => {
  const { user, profile, signOut } = useAuthStore();
  const { savedAddresses } = useLocationStore();
  const { userBookings } = useBookingStore();

  const [addressSheetVisible, setAddressSheetVisible] = useState(initialModal === 'saved_addresses');
  const [signOutModalVisible, setSignOutModalVisible] = useState(initialModal === 'sign_out');
  const [supportModalVisible, setSupportModalVisible] = useState(initialModal === 'support');
  const [qualityModalVisible, setQualityModalVisible] = useState(initialModal === 'water_quality');
  const [meteringModalVisible, setMeteringModalVisible] = useState(initialModal === 'fair_metering');
  const [privacyModalVisible, setPrivacyModalVisible] = useState(initialModal === 'privacy');

  const displayName = profile?.full_name || (user?.phone ? `Customer (${user.phone.slice(-4)})` : 'Valued Customer');
  const displayPhone = user?.phone || profile?.phone_number || 'Phone verified';
  const displayCity = profile?.city || 'Mumbai';
  const roleName = (profile?.role || 'Customer').toUpperCase();

  const handleSignOut = () => {
    setSignOutModalVisible(true);
  };

  const handleEmergencyCall = () => {
    setSupportModalVisible(true);
  };

  const handleQualityStandard = () => {
    setQualityModalVisible(true);
  };

  const handleTermsAndPrivacy = () => {
    setPrivacyModalVisible(true);
  };

  const handleDisputeResolution = () => {
    setMeteringModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
        <StatusBadge label={roleName} variant="primary" size="sm" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.profileName}>{displayName}</Text>
              <Ionicons name="checkmark-circle" size={17} color={colors.primary} />
            </View>
            <Text style={styles.profilePhone}>{displayPhone}</Text>
            <View style={styles.locationPill}>
              <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
              <Text style={styles.profileCity}>{displayCity}, Maharashtra</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Preferences and Addresses */}
        <Text style={styles.sectionHeader}>PREFERENCES & ADDRESSES</Text>
        <View style={styles.menuCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Saved delivery addresses"
            style={styles.menuItem}
            onPress={() => setAddressSheetVisible(true)}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="location" size={18} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Saved Delivery Addresses</Text>
              <Text style={styles.menuSubtitle}>
                {savedAddresses.length > 0
                  ? `${savedAddresses.length} saved location${savedAddresses.length > 1 ? 's' : ''}`
                  : 'Add home, sump or society address'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Past orders and GST invoices"
            style={styles.menuItem}
            onPress={onNavigateToBookings}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="receipt" size={18} color="#7C3AED" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Past Orders & GST Invoices</Text>
              <Text style={styles.menuSubtitle}>
                {userBookings.length > 0
                  ? `${userBookings.length} order${userBookings.length > 1 ? 's' : ''} on record`
                  : 'View invoices and delivery receipts'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Section 2: Support & Compliance */}
        <Text style={styles.sectionHeader}>SUPPORT & COMPLIANCE</Text>
        <View style={styles.menuCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="24/7 Water Support Desk"
            style={styles.menuItem}
            onPress={handleEmergencyCall}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="headset" size={18} color="#D97706" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>24/7 Water Support Desk</Text>
              <Text style={styles.menuSubtitle}>Instant resolution for tankers & dispatches</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Water quality standard"
            style={styles.menuItem}
            onPress={handleQualityStandard}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>BIS-10500 Potable Water Quality</Text>
              <Text style={styles.menuSubtitle}>TDS standards & certified sanitization</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dispute resolution guarantee"
            style={styles.menuItem}
            onPress={handleDisputeResolution}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#F0F9FF' }]}>
              <Ionicons name="scale-outline" size={18} color="#0284C7" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Fair Metering & Dispute Guarantee</Text>
              <Text style={styles.menuSubtitle}>Digital meter audit & instant refund policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Privacy policy and terms"
            style={styles.menuItem}
            onPress={handleTermsAndPrivacy}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#475569" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Privacy Policy & Terms of Service</Text>
              <Text style={styles.menuSubtitle}>Encrypted data & secure PIN protection</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Section 3: Account Security */}
        <Text style={styles.sectionHeader}>ACCOUNT SECURITY</Text>
        <View style={styles.menuCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out of account"
            style={styles.signOutMenuItem}
            onPress={handleSignOut}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.signOutTitle}>Sign Out of TANKR</Text>
              <Text style={styles.menuSubtitle}>Secure session termination</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.error} />
          </Pressable>
        </View>

        {/* Professional Footer */}
        <View style={styles.footer}>
          <Image
            source={require('../../../../assets/images/logo.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerText}>TANKR v1.0.0 (Production Release)</Text>
          <Text style={styles.footerSubtext}>
            © 2024 TANKR Technologies. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* Saved Addresses Sheet */}
      <SavedAddressesSheet
        visible={addressSheetVisible}
        onClose={() => setAddressSheetVisible(false)}
        onSelectAddress={() => setAddressSheetVisible(false)}
      />

      {/* 24/7 Water Support Desk Modal */}
      <SupportDeskModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        userPhone={displayPhone}
      />

      {/* BIS-10500 Potable Water Quality Certificate Modal */}
      <WaterQualityModal
        visible={qualityModalVisible}
        onClose={() => setQualityModalVisible(false)}
      />

      {/* Fair Metering & Instant Dispute Guarantee Modal */}
      <FairMeteringModal
        visible={meteringModalVisible}
        onClose={() => setMeteringModalVisible(false)}
      />

      {/* Privacy Policy & Terms of Service Modal */}
      <PrivacyTermsModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
      />

      {/* In-App Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        visible={signOutModalVisible}
        onClose={() => setSignOutModalVisible(false)}
        onConfirmSignOut={async () => {
          setSignOutModalVisible(false);
          await signOut();
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100, // Safe clearance above bottom tab bar
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  profileName: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  profilePhone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  profileCity: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: fontWeights.medium,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginLeft: 4,
    marginTop: spacing.xs,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  signOutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  signOutTitle: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: colors.error,
  },
  menuSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 56,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerLogo: {
    width: 90,
    height: 38,
    marginBottom: spacing.xs,
    opacity: 0.8,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: fontWeights.semibold,
  },
  footerSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});
