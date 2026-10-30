import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { BottomSheet } from '../../../components/common/Overlay/BottomSheet';
import { SavedAddress, useLocationStore } from '../../../stores/locationStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface SavedAddressesSheetProps {
  visible: boolean;
  onClose: () => void;
  onAddNewAddress: () => void;
  onSelectAddress: (address: SavedAddress) => void;
}

export const SavedAddressesSheet: React.FC<SavedAddressesSheetProps> = ({
  visible,
  onClose,
  onAddNewAddress,
  onSelectAddress,
}) => {
  const { savedAddresses, deleteSavedAddress, locateUserViaGps, isLocating } = useLocationStore();

  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home':
        return 'home';
      case 'work':
        return 'briefcase';
      default:
        return 'location';
    }
  };

  const handleUseGps = async () => {
    const res = await locateUserViaGps();
    if (res) {
      onClose();
    } else {
      Alert.alert(
        'GPS Unavailable',
        'Could not fetch your GPS location. Please ensure location permissions are enabled or choose a saved address.'
      );
    }
  };

  const handleDelete = (addr: SavedAddress) => {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete ${addr.flat_or_building}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSavedAddress(addr.id),
        },
      ]
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Choose Delivery Location"
      subtitle="Select a saved location or search a new one"
    >
      <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
        {/* GPS Quick Action */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use current GPS location"
          onPress={handleUseGps}
          disabled={isLocating}
          style={({ pressed }) => [styles.gpsRow, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.gpsIconCircle}>
            <Ionicons name="locate" size={20} color={colors.primary} />
          </View>
          <View style={styles.gpsTextCol}>
            <Text style={styles.gpsTitle}>Use Current GPS Location</Text>
            <Text style={styles.gpsSubtitle}>
              {isLocating ? 'Detecting your coordinates...' : 'Pin delivery point directly on map'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

        <View style={styles.sectionDivider} />

        <View style={styles.savedSectionHeader}>
          <Text style={styles.sectionTitle}>Saved Addresses</Text>
          <Pressable onPress={onAddNewAddress}>
            <Text style={styles.addText}>+ Add New</Text>
          </Pressable>
        </View>

        {savedAddresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No saved addresses yet</Text>
            <Text style={styles.emptySubtitle}>
              Save your home, apartment, or society sump location for rapid 1-tap bookings.
            </Text>
          </View>
        ) : (
          savedAddresses.map((addr) => (
            <Pressable
              key={addr.id}
              accessibilityRole="button"
              accessibilityLabel={`${addr.label}: ${addr.flat_or_building}`}
              onPress={() => {
                onSelectAddress(addr);
                onClose();
              }}
              style={({ pressed }) => [styles.addressCard, pressed && styles.cardPressed]}
            >
              <View style={styles.iconCircle}>
                <Ionicons
                  name={getLabelIcon(addr.label) as any}
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.addrDetails}>
                <View style={styles.labelRow}>
                  <Text style={styles.addrLabel}>{addr.label.toUpperCase()}</Text>
                  {addr.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.buildingText}>
                  {addr.flat_or_building}
                </Text>
                <Text numberOfLines={1} style={styles.streetText}>
                  {addr.street_address}, {addr.city} - {addr.pincode}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Delete saved address"
                onPress={() => handleDelete(addr)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          ))
        )}

        <View style={styles.bottomCtaWrapper}>
          <Button
            title="Add Another Delivery Address"
            variant="outline"
            size="md"
            onPress={onAddNewAddress}
            leftIcon={<Ionicons name="add" size={20} color={colors.primary} />}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetScroll: {
    maxHeight: 460,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  gpsIconCircle: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  gpsTextCol: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  gpsSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.md,
  },
  savedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  addText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    marginTop: 2,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.cardSurface,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginVertical: spacing.xs,
  },
  cardPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  addrDetails: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  addrLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    letterSpacing: 0.5,
  },
  defaultBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: fontWeights.bold,
  },
  buildingText: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  streetText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  bottomCtaWrapper: {
    marginVertical: spacing.lg,
  },
});

