import React, { useState } from 'react';
import {
  Alert,
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
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { borderRadius, colors, fontSizes, fontWeights, spacing } from '../../../theme';
import { useSupplyStore } from '../../../stores/supplyStore';

interface SupplierPricingModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SupplierPricingModal: React.FC<SupplierPricingModalProps> = ({
  visible,
  onClose,
}) => {
  const { supplierPricing, updateSupplierPricing } = useSupplyStore();

  const [rate1k, setRate1k] = useState(String(supplierPricing[1000] || 450));
  const [rate5k, setRate5k] = useState(String(supplierPricing[5000] || 1200));
  const [rate10k, setRate10k] = useState(String(supplierPricing[10000] || 2100));
  const [rate20k, setRate20k] = useState(String(supplierPricing[20000] || 3800));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const p1 = parseFloat(rate1k);
    const p5 = parseFloat(rate5k);
    const p10 = parseFloat(rate10k);
    const p20 = parseFloat(rate20k);

    if (isNaN(p1) || isNaN(p5) || isNaN(p10) || isNaN(p20) || p1 <= 0 || p5 <= 0 || p10 <= 0 || p20 <= 0) {
      Alert.alert('Invalid Rates', 'All capacity tiers must have a positive base rate in Rupees.');
      return;
    }

    setIsSaving(true);
    await updateSupplierPricing({
      1000: p1,
      5000: p5,
      10000: p10,
      20000: p20,
    });
    setIsSaving(false);
    Alert.alert('Rates Updated', 'Your hub base pricing tiers have been updated live across discovery algorithms.');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', justifyContent: 'flex-end' }}
        >
          <View style={styles.dialogCard}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Hub Base Pricing & Tiers</Text>
                <Text style={styles.subtitle}>Configure competitive base rates per tanker size</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close pricing modal"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={onClose}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.noticeBox}>
                <Ionicons name="information-circle" size={18} color={colors.primary} />
                <Text style={styles.noticeText}>
                  Dynamic Delivery Fees (₹35/km) and 5% Potable GST are calculated automatically during customer checkout.
                </Text>
              </View>

              {/* 1,000L Tier */}
              <View style={styles.tierRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierName}>1,000 Litres (Compact Mini)</Text>
                  <Text style={styles.tierSub}>Emergency domestic supply</Text>
                </View>
                <View style={styles.inputWrap}>
                  <Text style={styles.rupeeSign}>₹</Text>
                  <TextInput
                    style={styles.rateInput}
                    accessibilityLabel="1,000 Litres base price"
                    value={rate1k}
                    onChangeText={setRate1k}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* 5,000L Tier */}
              <View style={styles.tierRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierName}>5,000 Litres (Standard Single)</Text>
                  <Text style={styles.tierSub}>Bungalow & small society</Text>
                </View>
                <View style={styles.inputWrap}>
                  <Text style={styles.rupeeSign}>₹</Text>
                  <TextInput
                    style={styles.rateInput}
                    accessibilityLabel="5,000 Litres base price"
                    value={rate5k}
                    onChangeText={setRate5k}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* 10,000L Tier */}
              <View style={styles.tierRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierName}>10,000 Litres (Commercial Standard)</Text>
                  <Text style={styles.tierSub}>High-demand society sump</Text>
                </View>
                <View style={styles.inputWrap}>
                  <Text style={styles.rupeeSign}>₹</Text>
                  <TextInput
                    style={styles.rateInput}
                    accessibilityLabel="10,000 Litres base price"
                    value={rate10k}
                    onChangeText={setRate10k}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* 20,000L Tier */}
              <View style={styles.tierRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierName}>20,000 Litres (Heavy Industrial)</Text>
                  <Text style={styles.tierSub}>Commercial construction & campuses</Text>
                </View>
                <View style={styles.inputWrap}>
                  <Text style={styles.rupeeSign}>₹</Text>
                  <TextInput
                    style={styles.rateInput}
                    accessibilityLabel="20,000 Litres base price"
                    value={rate20k}
                    onChangeText={setRate20k}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
                <Button
                  title={isSaving ? 'Saving Changes...' : 'Save Hub Rate Card'}
                  variant="primary"
                  size="lg"
                  onPress={handleSave}
                  loading={isSaving}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  dialogCard: {
    backgroundColor: colors.cardSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  body: {
    marginTop: spacing.xs,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: '#09529E',
    lineHeight: 16,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tierName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  tierSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    width: 100,
  },
  rupeeSign: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    marginRight: 4,
  },
  rateInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
});
