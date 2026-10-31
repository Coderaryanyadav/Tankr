import React, { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
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
import { useAuthStore } from '../../../stores/authStore';
import { useLocationStore } from '../../../stores/locationStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface AccountScreenProps {
  onNavigateToBookings?: () => void;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({ onNavigateToBookings }) => {
  const { user, profile, signOut } = useAuthStore();
  const { savedAddresses } = useLocationStore();
  const [addressSheetVisible, setAddressSheetVisible] = useState(false);

  const displayName = profile?.full_name || (user?.phone ? `Customer (${user.phone.slice(-4)})` : 'Valued Customer');
  const displayPhone = user?.phone || profile?.phone_number || 'Phone verified';
  const displayCity = profile?.city || 'Mumbai';
  const roleName = (profile?.role || 'Customer').toUpperCase();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of TANKR?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      '24/7 Water Helpline',
      'Need urgent community tanker dispatch for apartment or hospital?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Ops Desk (1800-TANKR)', onPress: () => Linking.openURL('tel:180082657') },
      ]
    );
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
        {/* User Identity Card */}
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              </View>
              <Text style={styles.profilePhone}>{displayPhone}</Text>
              <Text style={styles.profileCity}>📍 {displayCity}, Maharashtra</Text>
            </View>
          </View>
        </Card>

        {/* Account Menu Sections */}
        <Text style={styles.sectionHeader}>PREFERENCES & ADDRESSES</Text>

        <Card variant="outlined" style={styles.menuCard}>
          <Pressable
            style={styles.menuItem}
            onPress={() => setAddressSheetVisible(true)}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="location" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Saved Delivery Addresses</Text>
              <Text style={styles.menuSubtitle}>
                {savedAddresses.length > 0
                  ? `${savedAddresses.length} saved address${savedAddresses.length > 1 ? 'es' : ''} configured`
                  : 'No delivery addresses added yet'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.menuItem}
            onPress={onNavigateToBookings}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="receipt" size={20} color="#7C3AED" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Past Orders & GST Invoices</Text>
              <Text style={styles.menuSubtitle}>View flow-meter verified deliveries</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </Card>

        <Text style={styles.sectionHeader}>SUPPORT & COMPLIANCE</Text>

        <Card variant="outlined" style={styles.menuCard}>
          <Pressable style={styles.menuItem} onPress={handleEmergencyCall}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="call" size={20} color="#D97706" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>24/7 Water Emergency Hotline</Text>
              <Text style={styles.menuSubtitle}>Priority dispatch for hospitals & sumps</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                'Water Quality Guarantee',
                'All TANKR fleet partners use BMC / certified potable sources with TDS testing conducted weekly.'
              );
            }}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Water Quality & Meter Standard</Text>
              <Text style={styles.menuSubtitle}>TDS standards, certified clean tankers</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </Card>

        {/* Sign Out Button */}
        <Pressable
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out of TANKR</Text>
        </Pressable>

        {/* Version Footer */}
        <View style={styles.footer}>
          <Image
            source={require('../../../../assets/images/logo.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerText}>TANKR v1.0.0 • Mumbai Metropolitan Ops (Marol HQ)</Text>
          <Text style={styles.footerSubtext}>Encrypted • BMC Compliant • PostGIS Live Radar</Text>
        </View>
      </ScrollView>

      {/* Saved Addresses Modal */}
      <SavedAddressesSheet
        visible={addressSheetVisible}
        onClose={() => setAddressSheetVisible(false)}
        onAddNewAddress={() => {
          setAddressSheetVisible(false);
          Alert.alert('Add Address', 'Pin your delivery sump directly from the map screen.');
        }}
        onSelectAddress={() => setAddressSheetVisible(false)}
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
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  profileCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  profileName: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  profilePhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  profileCity: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
    marginTop: spacing.xs,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: 0,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 66,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    color: colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  footerLogo: {
    width: 100,
    height: 50,
    marginBottom: spacing.xs,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: fontWeights.medium,
  },
  footerSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});
