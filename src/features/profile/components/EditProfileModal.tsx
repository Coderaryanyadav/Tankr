import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

const CITIES = ['Mumbai', 'Navi Mumbai', 'Thane', 'Pune'];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ visible, onClose }) => {
  const { user, profile, updateProfile } = useAuthStore();

  const [fullName, setFullName] = useState(profile?.full_name || 'Jeet');
  const [phoneNumber, setPhoneNumber] = useState(
    profile?.phone_number || user?.phone || '919876543210'
  );
  const [city, setCity] = useState(profile?.city || 'Mumbai');
  const [preferredAddress, setPreferredAddress] = useState(
    profile?.preferred_address || 'Building A, Flat 301, Near ruby bar'
  );
  const [pincode, setPincode] = useState(profile?.pincode || '400059');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) return;

    setIsSaving(true);
    setSavedSuccess(false);

    try {
      await updateProfile({
        fullName: fullName.trim(),
        phone: phoneNumber.trim(),
        city,
        preferredAddress: preferredAddress.trim(),
        pincode: pincode.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        setSavedSuccess(false);
        onClose();
      }, 600);
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header with clear cross (X) button */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close edit profile"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={24} color={colors.darkNavy} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <Text style={styles.headerSubtitle}>Personal & delivery details</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save profile"
            onPress={handleSave}
            disabled={isSaving || !fullName.trim()}
            style={[styles.saveHeaderBtn, (!fullName.trim() || isSaving) && { opacity: 0.5 }]}
          >
            <Text style={styles.saveHeaderBtnText}>{isSaving ? 'Saving...' : 'Done'}</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar Preview */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarChar}>
                  {fullName.trim().charAt(0).toUpperCase() || 'J'}
                </Text>
              </View>
              <Text style={styles.avatarRoleBadge}>Verified Customer</Text>
            </View>

            {savedSuccess && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={styles.successBannerText}>Profile updated successfully!</Text>
              </View>
            )}

            {/* Field: Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            {/* Field: Phone Number */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                <View style={styles.verifiedTag}>
                  <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
                  <Text style={styles.verifiedTagText}>Active</Text>
                </View>
              </View>
              <TextInput
                style={styles.textInput}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              <Text style={styles.helperText}>
                Primary contact number used for tanker delivery alerts & dispatch coordination.
              </Text>
            </View>

            {/* Field: City Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>SERVICE CITY</Text>
              <View style={styles.cityChipsRow}>
                {CITIES.map((c) => {
                  const isSelected = city.toLowerCase() === c.toLowerCase();
                  return (
                    <Pressable
                      key={c}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${c}`}
                      onPress={() => setCity(c)}
                      style={[styles.cityChip, isSelected && styles.cityChipActive]}
                    >
                      <Text style={[styles.cityChipText, isSelected && styles.cityChipTextActive]}>
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Field: Preferred Delivery Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PREFERRED SUMP / DELIVERY ADDRESS</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={preferredAddress}
                onChangeText={setPreferredAddress}
                placeholder="Flat / Building, Street, Landmark"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Field: Pincode */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DELIVERY PINCODE</Text>
              <TextInput
                style={styles.textInput}
                value={pincode}
                onChangeText={setPincode}
                placeholder="400059"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            {/* Bottom Save Action Button */}
            <View style={styles.buttonContainer}>
              <Button
                title={isSaving ? 'Saving Updates...' : 'Save Profile Changes'}
                variant="primary"
                size="lg"
                onPress={handleSave}
                loading={isSaving}
                disabled={isSaving || !fullName.trim()}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  saveHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  saveHeaderBtnText: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  avatarChar: {
    fontSize: 32,
    fontWeight: fontWeights.heavy,
    color: '#FFFFFF',
  },
  avatarRoleBadge: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: '#15803D',
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#15803D',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.darkNavy,
    fontWeight: fontWeights.medium,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  disabledInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  disabledInputText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  cityChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#334155',
  },
  cityChipTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
});
