import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { borderRadius, colors, fontWeights, spacing } from '../../../theme';

interface AddVehicleModalProps {
  visible: boolean;
  onClose: () => void;
  onVehicleAdded: (vehicle: {
    vehicleNumber: string;
    capacityLiters: number;
    waterType: string;
    driverName: string;
    driverPhone: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const CAPACITIES = [1000, 2000, 5000, 10000, 12000, 20000];
const WATER_TYPES = ['Potable (Drinking)', 'Borewell (Domestic)', 'Commercial Bulk'];

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  visible,
  onClose,
  onVehicleAdded,
}) => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [capacity, setCapacity] = useState<number>(5000);
  const [waterType, setWaterType] = useState<string>(WATER_TYPES[0]);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!vehicleNumber.trim() || !driverName.trim() || !driverPhone.trim()) {
      Alert.alert('Missing Details', 'Please enter Vehicle Registration number, Driver name and phone.');
      return;
    }

    const cleanVeh = vehicleNumber.trim().toUpperCase();
    if (cleanVeh.length < 8) {
      Alert.alert('Invalid Vehicle Number', 'Please enter a valid RTO registration (e.g. MH-02-TC-5001).');
      return;
    }

    setIsSubmitting(true);
    const res = await onVehicleAdded({
      vehicleNumber: cleanVeh,
      capacityLiters: capacity,
      waterType,
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim(),
    });
    setIsSubmitting(false);

    if (res.success) {
      Alert.alert('Tanker Added', `Vehicle ${cleanVeh} is onboarded and visible in your active fleet.`);
      setVehicleNumber('');
      setDriverName('');
      setDriverPhone('');
      onClose();
    } else {
      Alert.alert('Onboarding Failed', res.error || 'Could not onboard vehicle.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Onboard New Tanker</Text>
              <Text style={styles.subtitle}>Register vehicle to your supplier fleet</Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: spacing.xs }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Vehicle Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>RTO Vehicle Registration Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="MH-02-TC-5001"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
              />
            </View>

            {/* Capacity Picker */}
            <Text style={styles.label}>Tanker Capacity (Liters) *</Text>
            <View style={styles.capacityGrid}>
              {CAPACITIES.map((cap) => {
                const isSelected = capacity === cap;
                return (
                  <Pressable
                    key={cap}
                    onPress={() => setCapacity(cap)}
                    style={[styles.capBox, isSelected && styles.capBoxSelected]}
                  >
                    <Text style={[styles.capText, isSelected && styles.capTextSelected]}>
                      {cap.toLocaleString('en-IN')} L
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Water Type */}
            <Text style={[styles.label, { marginTop: spacing.md }]}>Water Grade / Source</Text>
            <View style={styles.radioGroup}>
              {WATER_TYPES.map((wt) => {
                const isSelected = waterType === wt;
                return (
                  <Pressable
                    key={wt}
                    onPress={() => setWaterType(wt)}
                    style={[styles.radioItem, isSelected && styles.radioItemSelected]}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.radioText, isSelected && styles.radioTextSelected]}>
                      {wt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Assigned Driver Details */}
            <Text style={[styles.sectionHeading, { marginTop: spacing.md }]}>
              Designated Driver Details
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Driver Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Basavaraj Patil"
                placeholderTextColor={colors.textMuted}
                value={driverName}
                onChangeText={setDriverName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Driver Contact Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98451 50001"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={driverPhone}
                onChangeText={setDriverPhone}
              />
            </View>
          </ScrollView>

          {/* Footer Submit */}
          <View style={styles.footer}>
            <Button
              title={isSubmitting ? 'Registering...' : 'Add Vehicle to Fleet'}
              variant="primary"
              size="lg"
              onPress={handleSubmit}
              loading={isSubmitting}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  dialog: {
    backgroundColor: colors.cardSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '88%',
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  body: {
    padding: spacing.md,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputGroup: {
    marginBottom: spacing.sm,
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
  capacityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  capBox: {
    flexBasis: '31%',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.cardSurface,
  },
  capBoxSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  capText: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  capTextSelected: {
    color: colors.primary,
  },
  radioGroup: {
    marginBottom: spacing.xs,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
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
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});
