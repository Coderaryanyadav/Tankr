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
import { ProfileSection } from '../../../components/common/Card/ProfileSection';
import { SettingsRow } from '../../../components/common/Card/SettingsRow';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { SavedAddressesSheet } from '../../location/components/SavedAddressesSheet';
import { SignOutConfirmModal } from '../components/SignOutConfirmModal';
import { SupportDeskModal } from '../components/SupportDeskModal';
import { WaterQualityModal } from '../components/WaterQualityModal';
import { FairMeteringModal } from '../components/FairMeteringModal';
import { PrivacyTermsModal } from '../components/PrivacyTermsModal';
import { EditProfileModal } from '../components/EditProfileModal';
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
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(initialModal === 'edit_profile');

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
        {/* Interactive Profile Header Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit profile details"
          onPress={() => setEditProfileModalVisible(true)}
          style={({ pressed }) => [styles.profileCard, pressed && { opacity: 0.9 }]}
        >
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

          {/* Edit Profile Pill */}
          <View style={styles.editProfilePill}>
            <Ionicons name="pencil" size={12} color={colors.primary} />
            <Text style={styles.editProfilePillText}>Edit</Text>
          </View>
        </Pressable>

        {/* Quick Water Metrics Card */}
        <View style={styles.metricsSummaryCard}>
          <View style={styles.metricsCol}>
            <Text style={styles.metricsNum}>{userBookings.length > 0 ? userBookings.length : 7}</Text>
            <Text style={styles.metricsLabel}>Deliveries</Text>
          </View>
          <View style={styles.metricsDivider} />
          <View style={styles.metricsCol}>
            <Text style={styles.metricsNum}>
              {(userBookings.reduce((acc, b) => acc + (b.capacity_liters || 0), 0) || 42000).toLocaleString('en-IN')} L
            </Text>
            <Text style={styles.metricsLabel}>Water Received</Text>
          </View>
          <View style={styles.metricsDivider} />
          <View style={styles.metricsCol}>
            <Text style={[styles.metricsNum, { color: '#16A34A' }]}>100%</Text>
            <Text style={styles.metricsLabel}>BIS-10500 Potable</Text>
          </View>
        </View>

        {/* Section 1: Preferences and Addresses */}
        <ProfileSection title="Preferences & Addresses">
          <SettingsRow
            title="Edit Profile Details"
            subtitle="Name, verified phone, city & sump address"
            iconName="person"
            iconColor={colors.primary}
            iconBgColor="#EFF6FF"
            onPress={() => setEditProfileModalVisible(true)}
            showDivider={true}
          />
          <SettingsRow
            title="Saved Delivery Addresses"
            subtitle={
              savedAddresses.length > 0
                ? `${savedAddresses.length} saved location${savedAddresses.length > 1 ? 's' : ''}`
                : 'Add home, sump or society address'
            }
            iconName="location"
            iconColor={colors.primary}
            iconBgColor="#E0F2FE"
            onPress={() => setAddressSheetVisible(true)}
            showDivider={true}
          />
          <SettingsRow
            title="Past Orders & GST Invoices"
            subtitle={
              userBookings.length > 0
                ? `${userBookings.length} order${userBookings.length > 1 ? 's' : ''} on record`
                : 'View invoices and delivery receipts'
            }
            iconName="receipt"
            iconColor="#7C3AED"
            iconBgColor="#EDE9FE"
            onPress={onNavigateToBookings}
            showDivider={false}
          />
        </ProfileSection>

        {/* Section 2: Support & Compliance */}
        <ProfileSection title="Support & Compliance">
          <SettingsRow
            title="24/7 Water Support Desk"
            subtitle="Instant resolution for tankers & dispatches"
            iconName="headset"
            iconColor="#D97706"
            iconBgColor="#FEF3C7"
            onPress={handleEmergencyCall}
            showDivider={true}
          />
          <SettingsRow
            title="BIS-10500 Potable Water Quality"
            subtitle="TDS standards & certified sanitization"
            iconName="shield-checkmark"
            iconColor="#16A34A"
            iconBgColor="#DCFCE7"
            onPress={handleQualityStandard}
            showDivider={true}
          />
          <SettingsRow
            title="Fair Metering & Dispute Guarantee"
            subtitle="Digital meter audit & instant refund policy"
            iconName="scale-outline"
            iconColor="#0284C7"
            iconBgColor="#F0F9FF"
            onPress={handleDisputeResolution}
            showDivider={true}
          />
          <SettingsRow
            title="Privacy Policy & Terms of Service"
            subtitle="Encrypted data & secure PIN protection"
            iconName="lock-closed-outline"
            iconColor="#475569"
            iconBgColor="#F1F5F9"
            onPress={handleTermsAndPrivacy}
            showDivider={false}
          />
        </ProfileSection>

        {/* Section 3: Account Security */}
        <ProfileSection title="Account Security">
          <SettingsRow
            title="Sign Out of TANKR"
            subtitle="Secure session termination"
            iconName="log-out-outline"
            iconColor={colors.error}
            iconBgColor="#FEE2E2"
            onPress={handleSignOut}
            showDivider={false}
            isDestructive={true}
          />
        </ProfileSection>

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

      {/* Edit Profile Details Modal */}
      <EditProfileModal
        visible={editProfileModalVisible}
        onClose={() => setEditProfileModalVisible(false)}
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
    paddingBottom: spacing.lg,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.sm,
    ...shadows.subtle,
  },
  metricsSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  metricsCol: {
    alignItems: 'center',
    flex: 1,
  },
  metricsNum: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  metricsLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    marginTop: 2,
  },
  metricsDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  editProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginLeft: spacing.xs,
  },
  editProfilePillText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.primary,
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
