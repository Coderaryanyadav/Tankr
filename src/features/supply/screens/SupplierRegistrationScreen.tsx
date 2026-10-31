import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { supabase } from '../../../services/supabase/client';
import { useAuthStore } from '../../../stores/authStore';
import { borderRadius, colors, fontWeights, spacing } from '../../../theme';

interface SupplierRegistrationScreenProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AVAILABLE_ZONES = [
  'Marol / MIDC',
  'Andheri East',
  'Sakinaka',
  'SEEPZ',
  'Powai',
  'Chandivali',
  'Chakala / JB Nagar',
  'Vile Parle East',
];

const WATER_SOURCES = [
  'BMC Bhandup Filtration Node (Potable TDS < 200)',
  'Certified Private Borewell (Tested TDS < 250)',
  'Commercial RO Filtration Plant',
  'MIDC Marol Potable Bulk Extraction Terminal',
];

export const SupplierRegistrationScreen: React.FC<SupplierRegistrationScreenProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { user, fetchProfile } = useAuthStore();

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState(user?.phone?.replace('+91', '') || '');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [selectedWaterSource, setSelectedWaterSource] = useState(WATER_SOURCES[0]);
  const [selectedZones, setSelectedZones] = useState<string[]>(['Marol / MIDC', 'Andheri East']);
  const [tankerCount, setTankerCount] = useState('2');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessSubmitted, setIsSuccessSubmitted] = useState(false);

  const toggleZone = (zone: string) => {
    if (selectedZones.includes(zone)) {
      if (selectedZones.length > 1) {
        setSelectedZones(selectedZones.filter((z) => z !== zone));
      }
    } else {
      setSelectedZones([...selectedZones, zone]);
    }
  };

  const handleRegister = async () => {
    if (!businessName.trim() || !ownerName.trim() || !address.trim() || !gstin.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in all mandatory business and GSTIN details.');
      return;
    }

    if (gstin.trim().length !== 15) {
      Alert.alert('Invalid GSTIN', 'Indian GSTIN must be exactly 15 characters (e.g. 29AABCS1429B1Z8).');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Attempt authoritative RPC
      const { data, error } = await supabase.rpc('register_supplier', {
        p_business_name: businessName.trim(),
        p_owner_name: ownerName.trim(),
        p_phone_number: `+91${phone.trim()}`,
        p_business_address: address.trim(),
        p_gst_number: gstin.trim().toUpperCase(),
        p_water_source: selectedWaterSource,
        p_operating_areas: selectedZones,
        p_tanker_count: parseInt(tankerCount, 10) || 1,
      });

      if (!error && data?.success) {
        setIsSubmitting(false);
        setIsSuccessSubmitted(true);
        if (user) {
          fetchProfile(user.id);
        }
        return;
      }

      // 2. Resilient Fallback: Insert into public.suppliers directly
      const { error: sErr } = await supabase.from('suppliers').insert({
        business_name: businessName.trim(),
        contact_phone: `+91${phone.trim()}`,
        is_verified: false,
        verification_status: 'pending_review',
        water_source: selectedWaterSource,
        gstin: gstin.trim().toUpperCase(),
      });

      if (sErr) {
        setIsSubmitting(false);
        Alert.alert('Registration Failed', sErr.message);
        return;
      }

      if (user?.id) {
        await supabase
          .from('profiles')
          .update({
            role: 'supplier',
            full_name: ownerName.trim(),
            preferred_address: address.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
        fetchProfile(user.id);
      }

      setIsSubmitting(false);
      setIsSuccessSubmitted(true);
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert('Registration Error', err?.message || 'Could not submit supplier application.');
    }
  };

  if (isSuccessSubmitted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successIconBox}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Application Submitted!</Text>
          <Text style={styles.successSubtitle}>
            Your supplier verification packet for <Text style={{ fontWeight: 'bold' }}>{businessName}</Text> is currently under Admin KYC review.
          </Text>

          <View style={styles.slaCard}>
            <Ionicons name="time-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.slaTitle}>Verification SLA: 12 - 24 Hours</Text>
              <Text style={styles.slaDesc}>
                Our regional compliance team will verify your GSTIN ({gstin}) and water test certificates. You will receive an SMS confirmation once approved.
              </Text>
            </View>
          </View>

          <Button
            title="Return to Main Portal"
            variant="primary"
            size="lg"
            onPress={() => onSuccess?.()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onCancel} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.headerTitle}>Supplier Partner Onboarding</Text>
            <Text style={styles.headerSubtitle}>Join the Mumbai Water Distribution Network</Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Business Details Section */}
          <Text style={styles.sectionHeader}>1. Enterprise Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Registered Business / Agency Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Marol Express Water Logistics"
              placeholderTextColor={colors.textMuted}
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Authorized Owner / Director Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rajesh Sharma"
              placeholderTextColor={colors.textMuted}
              value={ownerName}
              onChangeText={setOwnerName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Contact Mobile *</Text>
            <TextInput
              style={styles.input}
              placeholder="9845110001"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Depot / Filling Station Address *</Text>
            <TextInput
              style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
              placeholder="Plot No. 18, Marol MIDC Road, Andheri East, Mumbai"
              placeholderTextColor={colors.textMuted}
              multiline
              value={address}
              onChangeText={setAddress}
            />
          </View>

          {/* Compliance & Regulatory Section */}
          <Text style={styles.sectionHeader}>2. Regulatory & Quality Compliance</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>15-Digit GSTIN Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="27AABCT8821M1Z5"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              value={gstin}
              onChangeText={setGstin}
            />
          </View>

          <Text style={styles.label}>Primary Water Extraction Source</Text>
          {WATER_SOURCES.map((source) => {
            const isSelected = selectedWaterSource === source;
            return (
              <Pressable
                key={source}
                onPress={() => setSelectedWaterSource(source)}
                style={[styles.radioItem, isSelected && styles.radioItemSelected]}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.radioText, isSelected && styles.radioTextSelected]}>
                  {source}
                </Text>
              </Pressable>
            );
          })}

          {/* Operating Zones Section */}
          <Text style={styles.sectionHeader}>3. Operational Coverage & Fleet</Text>

          <Text style={styles.label}>Select Service Zones (Mumbai Suburban)</Text>
          <View style={styles.chipRow}>
            {AVAILABLE_ZONES.map((zone) => {
              const active = selectedZones.includes(zone);
              return (
                <Pressable
                  key={zone}
                  onPress={() => toggleZone(zone)}
                  style={[styles.zoneChip, active && styles.zoneChipActive]}
                >
                  <Text style={[styles.zoneChipText, active && styles.zoneChipTextActive]}>
                    {active ? `✓ ${zone}` : `+ ${zone}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Initial Fleet Size (Tankers ready for dispatch)</Text>
            <TextInput
              style={styles.input}
              placeholder="2"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={tankerCount}
              onChangeText={setTankerCount}
            />
          </View>

          {/* Submit Button */}
          <View style={{ marginTop: spacing.lg }}>
            <Button
              title={isSubmitting ? 'Submitting Application...' : 'Submit Partner Application'}
              variant="primary"
              size="lg"
              onPress={handleRegister}
              loading={isSubmitting}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.cardSurface,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.xs,
    backgroundColor: colors.cardSurface,
  },
  radioItemSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0F7FF',
  },
  radioText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  radioTextSelected: {
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  zoneChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardSurface,
  },
  zoneChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  zoneChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  zoneChipTextActive: {
    color: colors.white,
    fontWeight: fontWeights.semibold,
  },
  successContainer: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconBox: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  slaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: spacing['2xl'],
  },
  slaTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  slaDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
