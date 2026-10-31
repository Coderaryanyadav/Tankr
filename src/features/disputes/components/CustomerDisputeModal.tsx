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
import { DisputeCategory, DisputeService } from '../../../services/dispute/disputeService';
import { borderRadius, colors, fontWeights, spacing } from '../../../theme';

interface CustomerDisputeModalProps {
  visible: boolean;
  bookingId: string;
  bookingReference: string;
  capacityLiters: number;
  onClose: () => void;
  onDisputeSubmitted?: () => void;
}

const CATEGORIES: Array<{ key: DisputeCategory; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }> = [
  {
    key: 'short_delivery',
    label: 'Short Delivery / Incomplete Fill',
    icon: 'water-outline',
    desc: 'The delivered volume was visibly less than the capacity ordered.',
  },
  {
    key: 'water_contamination',
    label: 'Contaminated / Muddy Water',
    icon: 'alert-circle-outline',
    desc: 'Water has visible sediment, foul odor, or high turbidity/TDS.',
  },
  {
    key: 'overcharge',
    label: 'Driver Demanded Extra Cash',
    icon: 'cash-outline',
    desc: 'Driver refused to pump without unbilled additional cash tips/fees.',
  },
  {
    key: 'driver_behavior',
    label: 'Reckless Driving or Property Damage',
    icon: 'warning-outline',
    desc: 'Damage to gate, sump pipe, or reckless/unprofessional behavior.',
  },
];

export const CustomerDisputeModal: React.FC<CustomerDisputeModalProps> = ({
  visible,
  bookingId,
  bookingReference,
  capacityLiters,
  onClose,
  onDisputeSubmitted,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<DisputeCategory>('short_delivery');
  const [litersReceived, setLitersReceived] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Required Field', 'Please provide a brief explanation of the incident.');
      return;
    }

    setIsSubmitting(true);
    const res = await DisputeService.submitDispute({
      bookingId,
      category: selectedCategory,
      reason: reason.trim(),
      litersReceived: selectedCategory === 'short_delivery' && litersReceived ? parseInt(litersReceived, 10) : undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      Alert.alert(
        'Dispute Registered',
        `Dispute for order #${bookingReference} has been logged. TANKR Operations and water quality supervisors are reviewing this delivery. You will receive an update in the app.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              onDisputeSubmitted?.();
            },
          },
        ]
      );
    } else {
      Alert.alert('Submission Error', res.error || 'Could not register dispute. Please retry.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Report Delivery Issue</Text>
              <Text style={styles.subtitle}>Order {bookingReference} • {capacityLiters.toLocaleString('en-IN')} L</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dispute modal"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Category Selector */}
            <Text style={styles.fieldLabel}>Select Issue Type</Text>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                >
                  <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
                    <Ionicons
                      name={cat.icon}
                      size={20}
                      color={isSelected ? colors.white : colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={[styles.catLabel, isSelected && styles.catLabelSelected]}>
                      {cat.label}
                    </Text>
                    <Text style={styles.catDesc}>{cat.desc}</Text>
                  </View>
                </Pressable>
              );
            })}

            {/* Short Delivery Liters Input */}
            {selectedCategory === 'short_delivery' && (
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Estimated Liters Actually Received</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={`e.g. ${Math.round(capacityLiters * 0.75)}`}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  value={litersReceived}
                  onChangeText={setLitersReceived}
                />
              </View>
            )}

            {/* Detailed Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Explain What Happened</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe the issue, water clarity, smell, or conversation with the driver..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                value={reason}
                onChangeText={setReason}
              />
            </View>

            <View style={styles.guaranteeBox}>
              <Ionicons name="shield-checkmark" size={18} color={colors.success} />
              <Text style={styles.guaranteeText}>
                TANKR Quality Guarantee: Verified contamination or short-fill complaints receive automatic billing adjustment or full credit refunds within 24 hours.
              </Text>
            </View>
          </ScrollView>

          {/* Submit Footer */}
          <View style={styles.footer}>
            <Button
              title={isSubmitting ? 'Registering...' : 'Submit Incident Report'}
              variant="danger"
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
  container: {
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
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scroll: {
    padding: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.cardSurface,
  },
  categoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0F7FF',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxSelected: {
    backgroundColor: colors.primary,
  },
  catLabel: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  catLabelSelected: {
    color: colors.primary,
  },
  catDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inputGroup: {
    marginTop: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.cardSurface,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  guaranteeText: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: 12,
    color: '#065F46',
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});
