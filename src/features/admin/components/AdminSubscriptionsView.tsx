import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminStore } from '../../../stores/adminStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

export const AdminSubscriptionsView: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = true }) => {
  const { corporateSubscriptions, toggleSubscriptionStatus, createCorporateSubscription } = useAdminStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Contract State
  const [clientName, setClientName] = useState('');
  const [category, setCategory] = useState<'tech_park' | 'society' | 'hospital' | 'commercial'>('tech_park');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [dailyLiters, setDailyLiters] = useState('20000');
  const [timeSlot, setTimeSlot] = useState('06:00 AM - 08:00 AM');
  const [monthlyRate, setMonthlyRate] = useState('75000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSubscriptions = corporateSubscriptions.filter((s) => {
    if (selectedCategory === 'all') return true;
    return s.category === selectedCategory;
  });

  const totalDailyLiters = corporateSubscriptions.reduce((acc, cur) => acc + (cur.status === 'active' ? cur.daily_liters : 0), 0);
  const totalMonthlyRunRate = corporateSubscriptions.reduce((acc, cur) => acc + (cur.status === 'active' ? cur.monthly_rate : 0), 0);

  const handleToggle = async (id: string, name: string, currentStatus: string) => {
    const next = currentStatus === 'active' ? 'pause' : 'activate';
    Alert.alert(
      `${next.toUpperCase()} CONTRACT`,
      `Are you sure you want to ${next} recurring bulk water deliveries for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await toggleSubscriptionStatus(id, currentStatus);
          },
        },
      ]
    );
  };

  const handleCreateContract = async () => {
    if (!clientName.trim() || !contactPerson.trim() || !contactPhone.trim() || !deliveryAddress.trim()) {
      Alert.alert('Required Fields', 'Please complete all contract fields.');
      return;
    }

    setIsSubmitting(true);
    const success = await createCorporateSubscription({
      client_name: clientName.trim(),
      category,
      contact_person: contactPerson.trim(),
      contact_phone: contactPhone.trim(),
      delivery_address: deliveryAddress.trim(),
      latitude: 12.9260,
      longitude: 77.6762,
      daily_liters: Number(dailyLiters) || 15000,
      preferred_time_slot: timeSlot,
      monthly_rate: Number(monthlyRate) || 60000,
      status: 'active',
      assigned_supplier_name: 'Seema Water Hub',
      start_date: new Date().toISOString().split('T')[0],
    });
    setIsSubmitting(false);

    if (success) {
      Alert.alert('Corporate Contract Created', `Recurring delivery contract for ${clientName} is now active.`);
      setIsAddModalOpen(false);
      setClientName('');
      setContactPerson('');
      setContactPhone('');
      setDeliveryAddress('');
    } else {
      Alert.alert('Error', 'Failed to create contract. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Contract Volume Counters */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>ACTIVE CONTRACTS</Text>
          <Text style={styles.metricValue}>
            {corporateSubscriptions.filter((s) => s.status === 'active').length} / {corporateSubscriptions.length}
          </Text>
          <Text style={styles.metricSub}>Commercial tech parks & sumps</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>COMMITTED WATER DISPATCH</Text>
          <Text style={[styles.metricValue, { color: colors.primary }]}>
            {(totalDailyLiters / 1000).toFixed(0)}kL / day
          </Text>
          <Text style={styles.metricSub}>Guaranteed morning delivery</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>MONTHLY CONTRACT RUN-RATE</Text>
          <Text style={[styles.metricValue, { color: '#16A34A' }]}>
            ₹{(totalMonthlyRunRate / 100000).toFixed(2)}L / mo
          </Text>
          <Text style={styles.metricSub}>Automated monthly invoicing</Text>
        </View>
      </View>

      {/* Contracts Table Header & Filters */}
      <View style={styles.tableCard}>
        <View style={styles.tableHeaderRow}>
          <View>
            <Text style={styles.tableTitle}>Scheduled Society Subscriptions & Tech Parks</Text>
            <Text style={styles.tableSub}>
              Recurring daily bulk dispatches managed by Seema Water Hub
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* Filter Chips */}
            <View style={styles.filterGroup}>
              {[
                { id: 'all', label: 'All' },
                { id: 'tech_park', label: 'Tech Parks' },
                { id: 'society', label: 'Apartments' },
                { id: 'hospital', label: 'Hospitals' },
              ].map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter ${c.label}`}
                  onPress={() => setSelectedCategory(c.id)}
                  style={[
                    styles.filterChip,
                    selectedCategory === c.id && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategory === c.id && styles.filterChipTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Add Contract CTA */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add New Corporate Contract"
              onPress={() => setIsAddModalOpen(true)}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addBtnText}>NEW CONTRACT</Text>
            </Pressable>
          </View>
        </View>

        {/* Contract List */}
        <View style={styles.contractList}>
          {filteredSubscriptions.map((sub) => {
            const isActive = sub.status === 'active';
            return (
              <View key={sub.id} style={styles.contractCard}>
                <View style={styles.contractTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.clientName}>{sub.client_name}</Text>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{sub.category.replace('_', ' ').toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.contactText}>
                      Contact: {sub.contact_person} • {sub.contact_phone}
                    </Text>
                    <Text style={styles.addressText}>{sub.delivery_address}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View
                      style={[
                        styles.statusTag,
                        isActive
                          ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }
                          : { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
                      ]}
                    >
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: isActive ? '#16A34A' : '#D97706' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusTagText,
                          { color: isActive ? '#16A34A' : '#D97706' },
                        ]}
                      >
                        {isActive ? 'ACTIVE DISPATCH' : 'PAUSED'}
                      </Text>
                    </View>
                    <Text style={styles.rateText}>
                      ₹{sub.monthly_rate.toLocaleString('en-IN')}{' '}
                      <Text style={{ fontSize: 11, color: '#64748B' }}>/mo</Text>
                    </Text>
                  </View>
                </View>

                {/* Logistics Schedule & Actions */}
                <View style={styles.contractFooter}>
                  <View style={styles.scheduleInfo}>
                    <Ionicons name="time-outline" size={14} color="#0284C7" />
                    <Text style={styles.scheduleText}>
                      Slot: <Text style={{ fontWeight: fontWeights.bold }}>{sub.preferred_time_slot}</Text> • Volume:{' '}
                      <Text style={{ fontWeight: fontWeights.bold }}>
                        {(sub.daily_liters / 1000).toFixed(0)}kL Daily
                      </Text>{' '}
                      • Partner: {sub.assigned_supplier_name}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isActive ? 'Pause contract' : 'Resume contract'}
                    onPress={() => handleToggle(sub.id, sub.client_name, sub.status)}
                    style={[
                      styles.toggleBtn,
                      isActive ? styles.pauseBtn : styles.resumeBtn,
                    ]}
                  >
                    <Ionicons
                      name={isActive ? 'pause' : 'play'}
                      size={12}
                      color={isActive ? '#D97706' : '#16A34A'}
                    />
                    <Text
                      style={[
                        styles.toggleBtnText,
                        { color: isActive ? '#D97706' : '#16A34A' },
                      ]}
                    >
                      {isActive ? 'PAUSE' : 'RESUME'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Modal: Add New Corporate Contract */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Bulk Water Delivery Contract</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close modal"
                onPress={() => setIsAddModalOpen(false)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CORPORATE / SOCIETY NAME</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Embassy Tech Village, Prestige Shantiniketan"
                  placeholderTextColor="#94A3B8"
                  value={clientName}
                  onChangeText={setClientName}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CATEGORY</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {(['tech_park', 'society', 'hospital'] as const).map((cat) => (
                      <Pressable
                        key={cat}
                        accessibilityRole="button"
                        accessibilityLabel={`Select category ${cat}`}
                        onPress={() => setCategory(cat)}
                        style={[
                          styles.smallChip,
                          category === cat && styles.smallChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.smallChipText,
                            category === cat && styles.smallChipTextActive,
                          ]}
                        >
                          {cat === 'tech_park' ? 'Tech' : cat === 'society' ? 'Society' : 'Hospital'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>DAILY LITRES</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="25000"
                    placeholderTextColor="#94A3B8"
                    value={dailyLiters}
                    onChangeText={setDailyLiters}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CONTACT PERSON</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Facility Director"
                    placeholderTextColor="#94A3B8"
                    value={contactPerson}
                    onChangeText={setContactPerson}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CONTACT PHONE</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="+91 98450 XXXXX"
                    placeholderTextColor="#94A3B8"
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DELIVERY ADDRESS / SUMP LOCATION</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Outer Ring Road, Bengaluru"
                  placeholderTextColor="#94A3B8"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>DAILY TIME SLOT</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="06:00 AM - 08:00 AM"
                    placeholderTextColor="#94A3B8"
                    value={timeSlot}
                    onChangeText={setTimeSlot}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>MONTHLY CONTRACT RATE (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="85000"
                    placeholderTextColor="#94A3B8"
                    value={monthlyRate}
                    onChangeText={setMonthlyRate}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={() => setIsAddModalOpen(false)}
                style={styles.cancelModalBtn}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Activate Corporate Contract"
                disabled={isSubmitting}
                onPress={handleCreateContract}
                style={[styles.submitModalBtn, isSubmitting && { opacity: 0.6 }]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitModalBtnText}>Activate Contract</Text>
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
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: 4,
    ...shadows.card,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  metricSub: {
    fontSize: 11,
    color: '#64748B',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: 12,
    ...shadows.card,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  tableSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: fontWeights.bold,
  },
  contractList: {
    gap: 10,
  },
  contractCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  contractTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  clientName: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  categoryPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  categoryPillText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#334155',
  },
  contactText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  addressText: {
    fontSize: 11,
    color: '#334155',
    marginTop: 2,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },
  rateText: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  contractFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleText: {
    fontSize: 11,
    color: '#475569',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
  },
  pauseBtn: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  resumeBtn: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalBox: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 12,
    ...shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  modalBody: {
    gap: 10,
  },
  inputGroup: {
    gap: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    color: '#0F172A',
  },
  smallChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.xs,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  smallChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  smallChipText: {
    fontSize: 10,
    color: '#475569',
  },
  smallChipTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelModalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  submitModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  submitModalBtnText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
});
