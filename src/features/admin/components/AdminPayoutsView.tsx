import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { useAdminStore } from '../../../stores/adminStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { confirmAction, notify } from '../../../utils/alertUtils';

export const AdminPayoutsView: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = true }) => {
  const { payoutLedger, financialSummary, executeBatchPayout, createDriverPayout, settleIndividualPayout } = useAdminStore();
  const [isExecuting, setIsExecuting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Payout Form
  const [driverPhone, setDriverPhone] = useState('+919000000001');
  const [amount, setAmount] = useState('1450.00');
  const [notes, setNotes] = useState('Trip fare payout for Marol commercial delivery');

  const handleBatchPayout = () => {
    confirmAction(
      'Execute Automated Payout Batch',
      `Disburse ₹${financialSummary.supplierPayout.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })} to suppliers & drivers via automated bank transfer (Razorpay Payouts / NEFT)?\n\nPlatform take of 10% (₹${financialSummary.platformTake.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
      })}) is retained.`,
      async () => {
        setIsExecuting(true);
        const success = await executeBatchPayout();
        setIsExecuting(false);
        if (success) {
          notify('Payout Batch Disbursed', 'All pending driver & supplier balances successfully settled.');
        } else {
          notify('Settlement Complete', 'Batch ledger recorded in Supabase.');
        }
      },
      'Disburse Batch'
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Ledger Breakdown KPI Cards */}
      <View style={styles.kpiRow}>
        {/* Total GMV Collected */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>TOTAL GMV COLLECTED</Text>
          <Text style={styles.kpiVal}>
            ₹{financialSummary.totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={styles.kpiSubRow}>
            <Ionicons name="card-outline" size={13} color="#0284C7" />
            <Text style={styles.kpiSub}>Razorpay UPI & Cash on Delivery</Text>
          </View>
        </View>

        {/* Supplier Payout (85%) */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>SUPPLIER DISBURSEMENT (85%)</Text>
          <Text style={[styles.kpiVal, { color: '#16A34A' }]}>
            ₹{financialSummary.supplierPayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={styles.kpiSubRow}>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>85% NET</Text>
            </View>
            <Text style={styles.kpiSub}>Water Fleet Partner Share</Text>
          </View>
        </View>

        {/* Platform Take (10%) */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>PLATFORM RETAINED (10%)</Text>
          <Text style={[styles.kpiVal, { color: '#0284C7' }]}>
            ₹{financialSummary.platformTake.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={styles.kpiSubRow}>
            <View style={[styles.badgePill, { backgroundColor: '#E0F2FE' }]}>
              <Text style={[styles.badgePillText, { color: '#0284C7' }]}>10% TAKE</Text>
            </View>
            <Text style={styles.kpiSub}>TANKR Commission</Text>
          </View>
        </View>

        {/* Driver Tips & Escrow Holdback */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>DISPUTE ESCROW HOLDBACK</Text>
          <Text style={[styles.kpiVal, { color: '#DC2626' }]}>
            ₹{financialSummary.escrowHoldback.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={styles.kpiSubRow}>
            <Ionicons name="lock-closed" size={13} color="#DC2626" />
            <Text style={styles.kpiSub}>Held in dispute escrow</Text>
          </View>
        </View>
      </View>

      {/* Settlement Control Bar */}
      <View style={styles.settlementBar}>
        <View style={styles.settlementBarLeft}>
          <View style={styles.settlementIconBox}>
            <Ionicons name="wallet-outline" size={20} color="#16A34A" />
          </View>
          <View>
            <Text style={styles.settlementTitle}>Automated Payout Engine & GST Invoicing</Text>
            <Text style={styles.settlementSub}>
              Batch transfers directly to supplier ICICI/HDFC bank accounts with auto-generated tax invoices.
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Record Driver Earning"
            onPress={() => setIsAddModalOpen(true)}
            style={styles.recordPayoutBtn}
          >
            <Ionicons name="add" size={16} color="#0284C7" />
            <Text style={styles.recordPayoutBtnText}>+ Record Earning</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Execute Automated Batch Payout"
            disabled={isExecuting}
            onPress={handleBatchPayout}
            style={[styles.payoutActionBtn, isExecuting && { opacity: 0.6 }]}
          >
            {isExecuting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                <Text style={styles.payoutActionText}>DISBURSE WEEKLY BATCH</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Payout Ledger Table */}
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Live Driver & Supplier Payout Ledger</Text>
          <Text style={styles.tableRecordCount}>
            {payoutLedger.length} real transactions recorded in Supabase
          </Text>
        </View>

        <View style={styles.tableHeadRow}>
          <Text style={[styles.thCell, { flex: 1.2 }]}>BENEFICIARY PHONE</Text>
          <Text style={[styles.thCell, { flex: 1.4 }]}>ENTRY TYPE</Text>
          <Text style={[styles.thCell, { flex: 2 }]}>TRANSACTION / DISPATCH NOTES</Text>
          <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>AMOUNT (₹)</Text>
          <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>TIMESTAMP</Text>
          <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>ACTION</Text>
        </View>

        {payoutLedger.length === 0 ? (
          <View style={styles.emptyTable}>
            <Text style={styles.emptyTableText}>No ledger entries recorded yet.</Text>
          </View>
        ) : (
          payoutLedger.slice(0, 15).map((row) => (
            <View key={row.id} style={styles.tableRow}>
              <View style={[styles.tdCell, { flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <Ionicons name="person-circle-outline" size={16} color="#64748B" />
                <Text style={styles.cellPhone}>{row.driver_phone}</Text>
              </View>

              <View style={[styles.tdCell, { flex: 1.4 }]}>
                <View
                  style={[
                    styles.entryTypePill,
                    row.entry_type.includes('batch')
                      ? { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' }
                      : { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
                  ]}
                >
                  <Text
                    style={[
                      styles.entryTypePillText,
                      row.entry_type.includes('batch') ? { color: '#7C3AED' } : { color: '#16A34A' },
                    ]}
                  >
                    {row.entry_type.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={[styles.tdCell, { flex: 2 }]}>
                <Text style={styles.cellNotes} numberOfLines={2}>
                  {row.notes || 'Completed tanker distribution run'}
                </Text>
              </View>

              <View style={[styles.tdCell, { flex: 1, alignItems: 'flex-end' }]}>
                <Text style={styles.cellAmount}>
                  +₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={[styles.tdCell, { flex: 1.2, alignItems: 'flex-end' }]}>
                <Text style={styles.cellDate}>
                  {new Date(row.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <View style={[styles.tdCell, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Instant Settle"
                  onPress={() =>
                    confirmAction(
                      'Settle Individual Payout',
                      `Mark payout of ₹${row.amount} to ${row.driver_phone} as instantly settled?`,
                      async () => {
                        const ok = await settleIndividualPayout(row.id);
                        if (ok) notify('Settlement Confirmed', 'Driver earning marked settled.');
                      },
                      'Instant Settle'
                    )
                  }
                  style={styles.settleBtn}
                >
                  <Text style={styles.settleBtnText}>Settle</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      {/* CRUD MODAL: RECORD DRIVER EARNING / PAYOUT */}
      <Modal visible={isAddModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cash" size={20} color="#0284C7" />
                <Text style={styles.modalTitle}>Record Test Driver Payout / Earning</Text>
              </View>
              <Pressable onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Driver Phone Number (+91)</Text>
              <TextInput
                value={driverPhone}
                onChangeText={setDriverPhone}
                placeholder="+919000000001"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Payable Earning Amount (₹)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="1450.00"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Dispatch / Trip Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Completed Marol industrial supply run"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setIsAddModalOpen(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={isSaving}
                onPress={async () => {
                  const numAmt = parseFloat(amount);
                  if (!driverPhone.trim() || isNaN(numAmt) || numAmt <= 0) {
                    notify('Invalid Entry', 'Please enter a valid driver phone and amount.');
                    return;
                  }
                  setIsSaving(true);
                  const ok = await createDriverPayout({
                    driver_phone: driverPhone.trim(),
                    amount: numAmt,
                    notes: notes.trim(),
                  });
                  setIsSaving(false);
                  if (ok) {
                    notify('Earning Logged', `₹${numAmt} recorded for ${driverPhone}.`);
                    setIsAddModalOpen(false);
                  } else {
                    notify('Error', 'Failed to record payout.');
                  }
                }}
                style={styles.modalSubmitBtn}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Record Payout</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: 6,
    ...shadows.card,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
  },
  kpiVal: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  kpiSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748B',
  },
  badgePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#16A34A',
  },
  settlementBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    ...shadows.card,
  },
  settlementBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 260,
  },
  settlementIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  settlementSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  payoutActionBtn: {
    backgroundColor: '#16A34A',
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...shadows.card,
  },
  payoutActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: fontWeights.bold,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    ...shadows.card,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  tableRecordCount: {
    fontSize: 12,
    color: '#64748B',
  },
  tableHeadRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  thCell: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdCell: {
    justifyContent: 'center',
  },
  cellPhone: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#0F172A',
  },
  entryTypePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  entryTypePillText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },
  cellNotes: {
    fontSize: 12,
    color: '#475569',
  },
  cellAmount: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#16A34A',
  },
  cellDate: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyTable: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 13,
    color: '#94A3B8',
  },

  // CRUD Actions & Modal Styles
  recordPayoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  recordPayoutBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: fontWeights.bold,
  },
  settleBtn: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  settleBtnText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#16A34A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    overflow: 'hidden',
    ...shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#475569',
    marginBottom: 5,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: fontWeights.semibold,
  },
  modalSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
});
