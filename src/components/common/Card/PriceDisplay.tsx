import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';

export interface PriceDisplayProps {
  finalAmount: number;
  basePrice?: number;
  deliveryCharge?: number;
  surchargeAmount?: number;
  taxAmount?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBreakdown?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  finalAmount,
  basePrice,
  deliveryCharge,
  surchargeAmount = 0,
  taxAmount,
  size = 'md',
  showBreakdown = false,
  style,
}) => {
  const isSurging = surchargeAmount > 0;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.mainRow}>
        <Text style={[styles.currencySymbol, styles[`currency_${size}`]]}>₹</Text>
        <Text style={[styles.amountText, styles[`amount_${size}`]]}>
          {finalAmount.toLocaleString('en-IN', {
            minimumFractionDigits: finalAmount % 1 !== 0 ? 2 : 0,
            maximumFractionDigits: 2,
          })}
        </Text>

        {isSurging && (
          <View style={styles.surgeBadge}>
            <Ionicons name="flash" size={11} color={colors.warning} />
            <Text style={styles.surgeText}>PEAK</Text>
          </View>
        )}
      </View>

      {showBreakdown && basePrice !== undefined && (
        <View style={styles.breakdownContainer}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Base Tanker Rate</Text>
            <Text style={styles.breakdownValue}>₹{basePrice.toFixed(2)}</Text>
          </View>

          {deliveryCharge !== undefined && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Delivery & Mileage Fee</Text>
              <Text style={styles.breakdownValue}>₹{deliveryCharge.toFixed(2)}</Text>
            </View>
          )}

          {isSurging && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, styles.surgeLabel]}>
                Evening Peak Surcharge (10%)
              </Text>
              <Text style={[styles.breakdownValue, styles.surgeLabel]}>
                +₹{surchargeAmount.toFixed(2)}
              </Text>
            </View>
          )}

          {taxAmount !== undefined && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>GST (5% SAC 9965)</Text>
              <Text style={styles.breakdownValue}>₹{taxAmount.toFixed(2)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    color: colors.darkNavy,
    fontWeight: fontWeights.bold,
    marginRight: 2,
  },
  currency_sm: {
    fontSize: fontSizes.sm,
  },
  currency_md: {
    fontSize: fontSizes.lg,
  },
  currency_lg: {
    fontSize: fontSizes['2xl'],
  },
  currency_xl: {
    fontSize: fontSizes['3xl'],
  },
  amountText: {
    color: colors.darkNavy,
    fontWeight: fontWeights.heavy,
  },
  amount_sm: {
    fontSize: fontSizes.md,
  },
  amount_md: {
    fontSize: fontSizes.xl,
  },
  amount_lg: {
    fontSize: fontSizes['3xl'],
  },
  amount_xl: {
    fontSize: fontSizes['4xl'],
  },
  surgeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginLeft: spacing.xs,
    alignSelf: 'center',
  },
  surgeText: {
    fontSize: 9,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
    marginLeft: 2,
  },
  breakdownContainer: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    width: '100%',
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  surgeLabel: {
    color: colors.warning,
    fontWeight: fontWeights.bold,
  },
});
