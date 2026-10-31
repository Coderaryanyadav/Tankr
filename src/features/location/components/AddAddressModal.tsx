import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { useAuthStore } from '../../../stores/authStore';
import { useLocationStore } from '../../../stores/locationStore';
import { borderRadius, colors, fontWeights, spacing } from '../../../theme';

interface AddAddressModalProps {
  visible: boolean;
  onClose: () => void;
  onAddressAdded?: () => void;
}

export const AddAddressModal: React.FC<AddAddressModalProps> = ({
  visible,
  onClose,
  onAddressAdded,
}) => {
  const { user } = useAuthStore();
  const { addSavedAddress, activeCoordinates, locateUserViaGps, isLocating } = useLocationStore();

  const [label, setLabel] = useState<'home' | 'work' | 'other'>('home');
  const [flatBuilding, setFlatBuilding] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [pincode, setPincode] = useState('400059');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleUseGps = async () => {
    setErrorText(null);
    const geocoded = await locateUserViaGps();
    if (geocoded) {
      setStreet(geocoded.formattedAddress);
      if (geocoded.city) setCity(geocoded.city);
      if (geocoded.pincode) setPincode(geocoded.pincode);
    }
  };

  const handleSave = async () => {
    if (!flatBuilding.trim()) {
      setErrorText('Please enter Flat / Floor / Building name');
      return;
    }
    if (!street.trim()) {
      setErrorText('Please enter Street address or landmark');
      return;
    }

    setIsSaving(true);
    setErrorText(null);

    const userId = user?.id || '2644c504-f611-40d3-a1c1-0d97214bf6f9';

    const res = await addSavedAddress(userId, {
      label,
      flat_or_building: flatBuilding.trim(),
      street_address: street.trim(),
      city: city.trim() || 'Mumbai',
      pincode: pincode.trim() || '400059',
      latitude: activeCoordinates.latitude,
      longitude: activeCoordinates.longitude,
      is_default: isDefault,
    });

    setIsSaving(false);

    if (res.success) {
      setFlatBuilding('');
      setStreet('');
      onClose();
      onAddressAdded?.();
    } else {
      setErrorText(res.error || 'Failed to save address. Please retry.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.darkNavy} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Add Delivery Address</Text>
            <Text style={styles.headerSubtitle}>Save home or commercial sump location</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Label selector */}
          <Text style={styles.inputLabel}>ADDRESS TYPE</Text>
          <View style={styles.labelChips}>
            {[
              { id: 'home' as const, title: 'Home', icon: 'home-outline' as const },
              { id: 'work' as const, title: 'Office / Commercial', icon: 'briefcase-outline' as const },
              { id: 'other' as const, title: 'Society Sump', icon: 'water-outline' as const },
            ].map((item) => {
              const isSelected = label === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setLabel(item.id)}
                  style={[styles.labelChip, isSelected && styles.labelChipActive]}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={isSelected ? colors.white : colors.darkNavy}
                  />
                  <Text style={[styles.labelChipText, isSelected && styles.labelChipTextActive]}>
                    {item.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Quick GPS auto-fill */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use current location"
            onPress={handleUseGps}
            disabled={isLocating}
            style={styles.gpsFillBtn}
          >
            <Ionicons name="locate" size={16} color={colors.primary} />
            <Text style={styles.gpsFillText}>
              {isLocating ? 'Detecting current GPS...' : 'Auto-fill from current GPS location'}
            </Text>
          </Pressable>

          {/* Form Fields */}
          <Text style={styles.inputLabel}>FLAT / BUILDING / WING *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Flat 301, Building A, Lake View CHS"
            placeholderTextColor={colors.textMuted}
            value={flatBuilding}
            onChangeText={setFlatBuilding}
          />

          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
            STREET ADDRESS / LANDMARK *
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Military Road, Near Ruby Bar, Marol, Andheri East"
            placeholderTextColor={colors.textMuted}
            value={street}
            onChangeText={setStreet}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>CITY</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Mumbai"
                placeholderTextColor={colors.textMuted}
                value={city}
                onChangeText={setCity}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>PINCODE</Text>
              <TextInput
                style={styles.textInput}
                placeholder="400059"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={pincode}
                onChangeText={setPincode}
              />
            </View>
          </View>

          {/* Make default toggle */}
          <Pressable
            onPress={() => setIsDefault(!isDefault)}
            style={styles.defaultRow}
          >
            <View style={[styles.checkbox, isDefault && styles.checkboxActive]}>
              {isDefault && <Ionicons name="checkmark" size={14} color={colors.white} />}
            </View>
            <Text style={styles.defaultText}>Set as primary delivery address</Text>
          </Pressable>

          {errorText && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          )}

          <Button
            title={isSaving ? 'Saving Address...' : 'Save Delivery Address'}
            variant="primary"
            size="lg"
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  headerSubtitle: {
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
  inputLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  labelChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  labelChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  labelChipText: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    color: colors.darkNavy,
  },
  labelChipTextActive: {
    color: colors.white,
    fontWeight: fontWeights.bold,
  },
  gpsFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  gpsFillText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  textInput: {
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.darkNavy,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
  },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  defaultText: {
    fontSize: 13,
    color: colors.darkNavy,
    fontWeight: fontWeights.medium,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 11,
    color: colors.error,
  },
});
