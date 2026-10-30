import React from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { StatusBadge } from '../../../components/common/Card/StatusBadge';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { BookingRecord } from '../../../types/booking';
import { InvoiceRecord } from '../../../services/invoice/invoiceService';

interface InvoiceViewModalProps {
  visible: boolean;
  booking: BookingRecord | null;
  invoice?: InvoiceRecord | null;
  onClose: () => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  visible,
  booking,
  invoice,
  onClose,
}) => {
  if (!booking && !invoice) return null;

  const invoiceNo =
    invoice?.invoice_number ||
    `INV-2026-${(booking?.booking_reference || 'TKR-9482').replace('TKR-', '')}`;
  const issueDate = invoice?.issued_at
    ? new Date(invoice.issued_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const supplierName =
    invoice?.supplier_name || booking?.supplier_name || 'Sri Cauvery Water Supplies';
  const supplierGstin = invoice?.supplier_gstin || '29AABCS1429B1Z8';
  const vehicleNo =
    invoice?.vehicle_number || booking?.vehicle_number || 'KA-04-TC-5001';
  const customerName = invoice?.customer_name || 'Valued Customer';
  const customerPhone = invoice?.customer_phone || '+91 98765 43210';
  const deliveryAddress =
    invoice?.delivery_address || booking?.delivery_address || 'Bengaluru, Karnataka';

  const basePrice = invoice?.base_amount ?? (booking?.base_price || 750);
  const deliveryCharge =
    invoice?.delivery_charge ?? (booking?.delivery_charge || 85);
  const surcharge = invoice?.surcharge ?? (booking?.surcharge || 0);
  const taxAmount = invoice?.tax_amount ?? (booking?.tax_amount || 42);
  const totalAmount =
    invoice?.total_amount ?? (booking?.final_payable_amount || 877);
  const paymentMethod = (
    invoice?.payment_method || booking?.payment_preference || 'UPI'
  ).toUpperCase();

  const handleShare = async () => {
    try {
      await Share.share({
        title: `TANKR Tax Invoice - ${invoiceNo}`,
        message: `TANKR Tax Invoice ${invoiceNo}\nSupplier: ${supplierName}\nAmount: ₹${totalAmount}\nStatus: PAID\nDelivered to: ${deliveryAddress}`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.darkNavy} />
          </Pressable>
          <Text style={styles.headerTitle}>Tax Invoice</Text>
          <Pressable onPress={handleShare} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Printable Invoice Card */}
          <View style={styles.invoiceCard}>
            {/* Top Brand & Title */}
            <View style={styles.brandRow}>
              <View>
                <Text style={styles.tankrBrand}>TANKR</Text>
                <Text style={styles.tagline}>Water delivery, just a tap away.</Text>
              </View>
              <View style={styles.invoiceTag}>
                <Text style={styles.invoiceTagText}>TAX INVOICE</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Meta Row */}
            <View style={styles.metaRow}>
              <View>
                <Text style={styles.metaLabel}>INVOICE NUMBER</Text>
                <Text style={styles.metaValue}>{invoiceNo}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.metaLabel}>DATE & TIME</Text>
                <Text style={styles.metaValue}>{issueDate}</Text>
              </View>
            </View>

            {/* Supplier & Customer Columns */}
            <View style={styles.partyGrid}>
              <View style={styles.partyCol}>
                <Text style={styles.sectionHeader}>ISSUED BY (SUPPLIER)</Text>
                <Text style={styles.partyName}>{supplierName}</Text>
                <Text style={styles.partyDetail}>GSTIN: {supplierGstin}</Text>
                <Text style={styles.partyDetail}>Vehicle: {vehicleNo}</Text>
                <Text style={styles.partyDetail}>Bengaluru, Karnataka</Text>
              </View>

              <View style={styles.partyCol}>
                <Text style={styles.sectionHeader}>BILLED TO (CUSTOMER)</Text>
                <Text style={styles.partyName}>{customerName}</Text>
                <Text style={styles.partyDetail}>{customerPhone}</Text>
                <Text numberOfLines={3} style={styles.partyDetail}>
                  {deliveryAddress}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Line Items Table */}
            <Text style={styles.sectionHeader}>DELIVERY BREAKDOWN</Text>

            <View style={styles.lineItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineItemTitle}>
                  {booking?.capacity_liters || invoice?.capacity_liters || 5000}L{' '}
                  {booking?.water_type || 'Potable Water'}
                </Text>
                <Text style={styles.lineItemSubtitle}>
                  Certified clean bulk water delivery
                </Text>
              </View>
              <Text style={styles.lineItemAmount}>₹{basePrice.toFixed(2)}</Text>
            </View>

            <View style={styles.lineItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineItemTitle}>Transit & Fleet Dispatch</Text>
                <Text style={styles.lineItemSubtitle}>
                  Direct GPS route to delivery point
                </Text>
              </View>
              <Text style={styles.lineItemAmount}>
                ₹{deliveryCharge.toFixed(2)}
              </Text>
            </View>

            {surcharge > 0 && (
              <View style={styles.lineItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineItemTitle}>Peak Demand Surcharge</Text>
                  <Text style={styles.lineItemSubtitle}>
                    High-demand surge balancing
                  </Text>
                </View>
                <Text style={styles.lineItemAmount}>₹{surcharge.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.lineItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineItemTitle}>Goods & Services Tax (GST 5%)</Text>
                <Text style={styles.lineItemSubtitle}>CGST 2.5% + SGST 2.5%</Text>
              </View>
              <Text style={styles.lineItemAmount}>₹{taxAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL AMOUNT PAID</Text>
              <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            {/* Payment Verification Footer */}
            <View style={styles.paymentInfoRow}>
              <View>
                <Text style={styles.metaLabel}>PAYMENT METHOD</Text>
                <Text style={styles.metaValue}>{paymentMethod}</Text>
              </View>
              <StatusBadge label="PAID" variant="success" size="md" />
            </View>

            <View style={styles.taxComplianceNote}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={colors.success}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.complianceText}>
                Digitally generated tax invoice authorized by TANKR Platform. No physical signature required.
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <View style={styles.actions}>
            <Button
              title="Share / Save PDF Invoice"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleShare}
            />
            <View style={{ height: spacing.sm }} />
            <Button
              title="Close"
              variant="secondary"
              size="md"
              fullWidth
              onPress={onClose}
            />
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  shareBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  invoiceCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tankrBrand: {
    fontSize: 24,
    fontWeight: fontWeights.heavy,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  invoiceTag: {
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  invoiceTagText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  partyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  partyCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: fontWeights.heavy,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  partyName: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  lineItemTitle: {
    fontSize: 13,
    fontWeight: fontWeights.semibold,
    color: colors.darkNavy,
  },
  lineItemSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  lineItemAmount: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: fontWeights.heavy,
    color: colors.primary,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  taxComplianceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundMuted,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  complianceText: {
    flex: 1,
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  actions: {
    marginTop: spacing.lg,
  },
});
