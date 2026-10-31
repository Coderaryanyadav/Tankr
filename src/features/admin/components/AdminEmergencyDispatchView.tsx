import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminStore } from '../../../stores/adminStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { confirmAction, notify } from '../../../utils/alertUtils';

export const AdminEmergencyDispatchView: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = true }) => {
  const { emergencyDispatches, triggerEmergencyDispatch } = useAdminStore();

  const [institutionName, setInstitutionName] = useState('');
  const [institutionType, setInstitutionType] = useState<'hospital_dialysis' | 'icu_facility' | 'critical_sump' | 'elderly_care'>('hospital_dialysis');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [requiredLiters, setRequiredLiters] = useState<number>(10000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleForceDispatch = async () => {
    if (!institutionName.trim() || !contactPerson.trim() || !contactPhone.trim() || !deliveryAddress.trim()) {
      notify('Required Fields', 'Please complete all emergency facility details before dispatching.');
      return;
    }

    setIsSubmitting(true);
    const success = await triggerEmergencyDispatch({
      institution_name: institutionName.trim(),
      institution_type: institutionType,
      contact_person: contactPerson.trim(),
      contact_phone: contactPhone.trim(),
      delivery_address: deliveryAddress.trim(),
      latitude: 19.1235,
      longitude: 72.8815,
      required_liters: requiredLiters,
      sla_minutes: 20,
    });
    setIsSubmitting(false);

    if (success) {
      notify(
        'Priority Tanker Dispatched',
        `Top-of-queue priority tanker dispatched to ${institutionName} under 20-minute SLA guarantee.`
      );
      setInstitutionName('');
      setContactPerson('');
      setContactPhone('');
      setDeliveryAddress('');
    } else {
      notify('Dispatch Error', 'Failed to dispatch emergency tanker. Please try again.');
    }
  };

  const calculateRemainingSla = (dispatchedAt: string, slaMinutes: number) => {
    const dispatchTime = new Date(dispatchedAt).getTime();
    const targetTime = dispatchTime + slaMinutes * 60 * 1000;
    const now = Date.now();
    const remainingMs = targetTime - now;

    if (remainingMs <= 0) return { label: 'SLA BREACH RISK', color: '#DC2626', minutes: 0 };
    const mins = Math.floor(remainingMs / (60 * 1000));
    const secs = Math.floor((remainingMs % (60 * 1000)) / 1000);
    return {
      label: `${mins}m ${secs}s remaining`,
      color: mins < 5 ? '#DC2626' : mins < 10 ? '#D97706' : '#16A34A',
      minutes: mins,
    };
  };

  return (
    <View style={styles.container}>
      {/* Red Alert Banner */}
      <View style={styles.alertBanner}>
        <View style={styles.alertIconWrap}>
          <Ionicons name="medical" size={20} color="#DC2626" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.alertBannerTitle}>Emergency Hospital & Priority Dispatch Console</Text>
            <View style={styles.slaTag}>
              <Text style={styles.slaTagText}>GUARANTEED 20-MIN SLA</Text>
            </View>
          </View>
          <Text style={styles.alertBannerSub}>
            Direct force-dispatch protocol for dialysis centers, hospitals, and critical apartment sumps during severe water cuts.
          </Text>
        </View>
      </View>

      {/* Grid: Dispatch Form (Left) + Active Dispatches Queue (Right) */}
      <View style={[styles.consoleGrid, !isDesktop && { flexDirection: 'column' }]}>
        {/* Force-Dispatch Form */}
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="flash" size={18} color="#D97706" />
            <Text style={styles.cardTitle}>Immediate Force-Dispatch Protocol</Text>
          </View>

          {/* Facility Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CRITICAL FACILITY / HOSPITAL NAME</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. SevenHills Hospital (Marol), Holy Spirit ICU"
              placeholderTextColor="#94A3B8"
              value={institutionName}
              onChangeText={setInstitutionName}
            />
          </View>

          {/* Facility Type Chips */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>FACILITY CATEGORY</Text>
            <View style={styles.typeSelectorRow}>
              {[
                { id: 'hospital_dialysis', label: 'Dialysis Center' },
                { id: 'icu_facility', label: 'ICU / Hospital' },
                { id: 'critical_sump', label: 'Dry Sump RWA' },
                { id: 'elderly_care', label: 'Elderly Care' },
              ].map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Select category ${item.label}`}
                  onPress={() => setInstitutionType(item.id as any)}
                  style={[
                    styles.typeChip,
                    institutionType === item.id && styles.typeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      institutionType === item.id && styles.typeChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Contact Person & Phone */}
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>CONTACT DOCTOR / FACILITY MGR</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Dr. Rao / Col. Sharma"
                placeholderTextColor="#94A3B8"
                value={contactPerson}
                onChangeText={setContactPerson}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>DIRECT 24/7 PHONE</Text>
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

          {/* Delivery Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DELIVERY ADDRESS / INLET POINT</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Inpatient Block B, Marol Maroshi Road, Andheri East"
              placeholderTextColor="#94A3B8"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
            />
          </View>

          {/* Litres Required */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>REQUIRED VOLUME</Text>
            <View style={styles.volumeRow}>
              {[5000, 10000, 12000, 20000].map((vol) => (
                <Pressable
                  key={vol}
                  accessibilityRole="button"
                  accessibilityLabel={`Select volume ${vol}L`}
                  onPress={() => setRequiredLiters(vol)}
                  style={[
                    styles.volBtn,
                    requiredLiters === vol && styles.volBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.volBtnText,
                      requiredLiters === vol && styles.volBtnTextActive,
                    ]}
                  >
                    {vol >= 1000 ? `${vol / 1000}kL` : `${vol}L`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Submit Action */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Force-Dispatch Emergency Tanker"
            disabled={isSubmitting}
            onPress={handleForceDispatch}
            style={[styles.dispatchSubmitBtn, isSubmitting && { opacity: 0.6 }]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="flash" size={18} color="#FFFFFF" />
                <Text style={styles.dispatchSubmitText}>
                  FORCE-DISPATCH EMERGENCY TANKER (20m SLA)
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Active Emergency Dispatches Queue */}
        <View style={styles.queueCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="timer-outline" size={18} color="#DC2626" />
            <Text style={styles.cardTitle}>
              Active Priority Dispatches ({emergencyDispatches.length})
            </Text>
          </View>

          {emergencyDispatches.length === 0 ? (
            <View style={styles.emptyQueueBox}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#16A34A" />
              <Text style={styles.emptyQueueTitle}>All Emergency Sumps Replenished</Text>
              <Text style={styles.emptyQueueSub}>
                No hospital or critical society dispatches currently open in the 20-minute SLA buffer.
              </Text>
            </View>
          ) : (
            <View style={styles.dispatchList}>
              {emergencyDispatches.map((disp) => {
                const sla = calculateRemainingSla(disp.dispatched_at, disp.sla_minutes);
                return (
                  <View key={disp.id} style={styles.dispatchItemCard}>
                    <View style={styles.dispatchItemTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.institutionTitle}>{disp.institution_name}</Text>
                        <Text style={styles.institutionSub}>
                          {disp.contact_person} • {disp.contact_phone}
                        </Text>
                        <Text style={styles.deliveryAddr}>{disp.delivery_address}</Text>
                      </View>
                      <View style={[styles.slaBadge, { borderColor: sla.color }]}>
                        <Ionicons name="time" size={13} color={sla.color} />
                        <Text style={[styles.slaBadgeText, { color: sla.color }]}>{sla.label}</Text>
                      </View>
                    </View>

                    <View style={styles.dispatchItemFooter}>
                      <View style={styles.assignedVehicleBox}>
                        <Ionicons name="car" size={14} color="#0284C7" />
                        <Text style={styles.assignedVehicleText}>
                          {disp.vehicle_number || 'Tanker MH-02-TC-5001'} ({disp.required_liters.toLocaleString('en-IN')}L)
                        </Text>
                      </View>
                      <View style={styles.driverBox}>
                        <Text style={styles.driverText}>
                          Driver: {disp.driver_name || 'Sunil Shinde'} ({disp.driver_phone || '+91 98201 10010'})
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  alertBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBannerTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#991B1B',
  },
  alertBannerSub: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 18,
  },
  slaTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  slaTagText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  consoleGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formCard: {
    flex: 1.1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: 12,
    ...shadows.card,
  },
  queueCard: {
    flex: 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
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
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  typeChipActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: '#475569',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  volumeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  volBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  volBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  volBtnText: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#334155',
  },
  volBtnTextActive: {
    color: '#FFFFFF',
  },
  dispatchSubmitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    ...shadows.card,
  },
  dispatchSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
  emptyQueueBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 320,
    paddingHorizontal: spacing.lg,
  },
  emptyQueueTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#16A34A',
    marginTop: 10,
  },
  emptyQueueSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  dispatchList: {
    gap: 10,
    marginTop: 10,
  },
  dispatchItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  dispatchItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  institutionTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  institutionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  deliveryAddr: {
    fontSize: 11,
    color: '#334155',
    marginTop: 2,
  },
  slaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
  },
  slaBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
  },
  dispatchItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    flexWrap: 'wrap',
    gap: 4,
  },
  assignedVehicleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignedVehicleText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#0284C7',
  },
  driverBox: {
    alignItems: 'flex-end',
  },
  driverText: {
    fontSize: 11,
    color: '#475569',
  },
});
