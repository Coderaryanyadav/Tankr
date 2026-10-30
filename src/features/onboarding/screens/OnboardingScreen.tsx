import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { TextInput } from '../../../components/common/Input/TextInput';
import { LocationService } from '../../../services/location/locationService';
import { useAuthStore } from '../../../stores/authStore';
import { useLocationStore } from '../../../stores/locationStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { OnboardingFormSchema } from '../../../utils/validation';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { user, completeOnboarding, isLoading: isAuthLoading } = useAuthStore();
  const { addSavedAddress, setActiveLocation } = useLocationStore();

  // Profile fields
  const [fullName, setFullName] = useState<string>('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Address fields
  const [flatOrBuilding, setFlatOrBuilding] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [city, setCity] = useState<string>('Bengaluru');
  const [pincode, setPincode] = useState<string>('');
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [addressLabel, setAddressLabel] = useState<'home' | 'work' | 'other'>('home');

  // Status & Validation
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsDetectedText, setGpsDetectedText] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Image Picker for profile photo
  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Permission',
          'Camera roll access is needed to select a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('[ImagePicker] Photo selection cancelled/failed:', err);
    }
  };

  // GPS Auto-Fill
  const handleGpsDetect = async () => {
    setIsDetectingGps(true);
    setValidationErrors({});

    const hasPermission = await LocationService.requestPermission();
    if (!hasPermission) {
      setIsDetectingGps(false);
      Alert.alert(
        'Location Access',
        'Location permission helps us pinpoint your delivery sump, but you can also enter your address details manually below.'
      );
      return;
    }

    const coords = await LocationService.getCurrentLocation();
    if (!coords) {
      setIsDetectingGps(false);
      Alert.alert('GPS Notice', 'Unable to fetch precise GPS signal. Please enter address manually.');
      return;
    }

    setLatitude(coords.latitude);
    setLongitude(coords.longitude);

    const geocoded = await LocationService.reverseGeocode(coords);
    if (geocoded) {
      if (geocoded.flatOrBuilding) setFlatOrBuilding(geocoded.flatOrBuilding);
      if (geocoded.streetAddress) setStreetAddress(geocoded.streetAddress);
      if (geocoded.city) setCity(geocoded.city);
      if (geocoded.pincode) setPincode(geocoded.pincode);
      setGpsDetectedText(`GPS Pin: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    }

    setIsDetectingGps(false);
  };

  // Submit & Save
  const handleSaveAndContinue = async () => {
    setValidationErrors({});

    const formData = {
      fullName: fullName.trim(),
      profilePhotoUrl: profilePhoto,
      flatOrBuilding: flatOrBuilding.trim(),
      streetAddress: streetAddress.trim(),
      landmark: landmark.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      latitude,
      longitude,
      label: addressLabel,
    };

    const parsed = OnboardingFormSchema.safeParse(formData);
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errMap[issue.path[0].toString()] = issue.message;
        }
      });
      setValidationErrors(errMap);
      return;
    }

    const fullDeliveryText = `${flatOrBuilding}, ${streetAddress}, ${city} - ${pincode}`;

    // 1. Update Profile
    const profileRes = await completeOnboarding({
      fullName: formData.fullName,
      preferredAddress: fullDeliveryText,
      city: formData.city,
      pincode: formData.pincode,
    });

    if (!profileRes.success) {
      Alert.alert('Error', profileRes.error || 'Failed to save profile');
      return;
    }

    // 2. Save Address into saved_addresses table
    if (user?.id) {
      await addSavedAddress(user.id, {
        label: addressLabel,
        flat_or_building: formData.flatOrBuilding,
        street_address: formData.streetAddress,
        landmark: formData.landmark || null,
        city: formData.city,
        pincode: formData.pincode,
        latitude,
        longitude,
        is_default: true,
      });
    }

    // 3. Set Active Delivery Location in Zustand
    setActiveLocation(fullDeliveryText, { latitude, longitude }, addressLabel.toUpperCase());

    // 4. Redirect to Main Discovery
    onComplete();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandPill}>
              <Ionicons name="water" size={16} color={colors.primary} />
              <Text style={styles.brandPillText}>TANKR DELIVERY SETUP</Text>
            </View>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Quick setup to discover nearby water tankers and ensure precise delivery.
            </Text>
          </View>

          {/* Profile Photo Selector */}
          <View style={styles.photoContainer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upload profile photo"
              onPress={handlePickPhoto}
              style={styles.avatarWrapper}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={colors.primary} />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={12} color={colors.white} />
              </View>
            </Pressable>
          </View>

          {/* Personal Info Card */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Personal Details</Text>

            <TextInput
              label="Full Name *"
              placeholder="e.g. Anand Murthy"
              value={fullName}
              onChangeText={setFullName}
              error={validationErrors.fullName}
              leftIcon={<Ionicons name="person-outline" size={20} color={colors.textSecondary} />}
            />
          </View>

          {/* Location Details Card */}
          <View style={[styles.card, { marginTop: spacing.lg }]}>
            <View style={styles.locationHeaderRow}>
              <View>
                <Text style={styles.sectionHeader}>Primary Delivery Location</Text>
                <Text style={styles.sectionSubtitle}>Where should tankers deliver water?</Text>
              </View>

              {/* GPS Quick Fill Button */}
              <Button
                title={isDetectingGps ? 'Locating...' : 'Use GPS'}
                variant="secondary"
                size="sm"
                loading={isDetectingGps}
                fullWidth={false}
                onPress={handleGpsDetect}
                leftIcon={<Ionicons name="locate" size={16} color={colors.primary} />}
              />
            </View>

            {gpsDetectedText && (
              <View style={styles.gpsBanner}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.gpsBannerText}>{gpsDetectedText}</Text>
              </View>
            )}

            {/* Address Label Selector */}
            <View style={styles.labelChipsRow}>
              {(['home', 'work', 'other'] as const).map((lbl) => {
                const isSelected = addressLabel === lbl;
                return (
                  <Pressable
                    key={lbl}
                    onPress={() => setAddressLabel(lbl)}
                    style={[styles.labelChip, isSelected && styles.labelChipSelected]}
                  >
                    <Ionicons
                      name={lbl === 'home' ? 'home' : lbl === 'work' ? 'briefcase' : 'location'}
                      size={16}
                      color={isSelected ? colors.white : colors.darkNavy}
                    />
                    <Text
                      style={[
                        styles.labelChipText,
                        isSelected && styles.labelChipTextSelected,
                      ]}
                    >
                      {lbl.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              label="Flat / Building / House No. *"
              placeholder="e.g. Villa 14, Sobha Palm Meadows"
              value={flatOrBuilding}
              onChangeText={setFlatOrBuilding}
              error={validationErrors.flatOrBuilding}
              leftIcon={<Ionicons name="business-outline" size={20} color={colors.textSecondary} />}
            />

            <TextInput
              label="Street / Area / Road *"
              placeholder="e.g. ECC Road, Whitefield"
              value={streetAddress}
              onChangeText={setStreetAddress}
              error={validationErrors.streetAddress}
              leftIcon={<Ionicons name="navigate-outline" size={20} color={colors.textSecondary} />}
            />

            <TextInput
              label="Landmark (Optional)"
              placeholder="e.g. Near Shell Petrol Pump, Opposite Block C"
              value={landmark}
              onChangeText={setLandmark}
              leftIcon={<Ionicons name="flag-outline" size={20} color={colors.textSecondary} />}
            />

            <View style={styles.splitRow}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <TextInput
                  label="City *"
                  value={city}
                  onChangeText={setCity}
                  error={validationErrors.city}
                  leftIcon={<Ionicons name="map-outline" size={20} color={colors.textSecondary} />}
                />
              </View>

              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <TextInput
                  label="Postal PIN Code *"
                  placeholder="560066"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={pincode}
                  onChangeText={(t) => setPincode(t.replace(/\D/g, ''))}
                  error={validationErrors.pincode}
                  leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
                />
              </View>
            </View>
          </View>

          {/* Submit Action */}
          <View style={styles.submitContainer}>
            <Button
              title="Save & Proceed to Tankers"
              variant="primary"
              size="lg"
              loading={isAuthLoading}
              onPress={handleSaveAndContinue}
              rightIcon={<Ionicons name="arrow-forward" size={20} color={colors.white} />}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  header: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  brandPillText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
    lineHeight: 18,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardSurface,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.full,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
    marginTop: 2,
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  card: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  gpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  gpsBannerText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: fontWeights.semibold,
  },
  labelChipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  labelChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  labelChipText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  labelChipTextSelected: {
    color: colors.white,
  },
  splitRow: {
    flexDirection: 'row',
  },
  submitContainer: {
    marginTop: spacing.xl,
  },
});
