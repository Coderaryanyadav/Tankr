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
import { useAdminStore, WaterCertificateItem } from '../../../stores/adminStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';
import { confirmAction, notify } from '../../../utils/alertUtils';

export const AdminWaterSafetyView: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = true }) => {
  const {
    waterCertificates,
    suspendWaterCertificate,
    reinstateWaterCertificate,
    createWaterCertificate,
    deleteWaterCertificate,
  } = useAdminStore();

  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Certificate Form
  const [waterSource, setWaterSource] = useState('Bhandup Complex Aquifer Borewell #2');
  const [sourceType, setSourceType] = useState('Deep Aquifer Borewell');
  const [labName, setLabName] = useState('SGS India Analytical Laboratories, Andheri East');
  const [reportNo, setReportNo] = useState(`SGS-WTR-${Math.floor(1000 + Math.random() * 9000)}`);
  const [tdsPpm, setTdsPpm] = useState<number>(145);
  const [phLevel, setPhLevel] = useState<number>(7.2);
  const [turbidityNtu, setTurbidityNtu] = useState<number>(1.2);

  const handleSuspend = (cert: WaterCertificateItem) => {
    confirmAction(
      'Emergency Water Quality Action',
      `Suspend certificate ${cert.test_report_number} issued by ${cert.lab_name}? Tankers linked to this water source will be immediately taken offline.`,
      async () => {
        setOperatingId(cert.id);
        const success = await suspendWaterCertificate(cert.id, 'TDS threshold or potability audit violation');
        setOperatingId(null);
        if (success) {
          notify('Source Suspended', 'The water source certificate has been marked non-potable and suspended.');
        }
      },
      'Suspend Source'
    );
  };

  const handleReinstate = (cert: WaterCertificateItem) => {
    confirmAction(
      'Reinstate Water Source Certificate',
      `Re-certify and reinstate source "${cert.water_source}" (Report #${cert.test_report_number}) as POTABLE compliance?`,
      async () => {
        setOperatingId(cert.id);
        const success = await reinstateWaterCertificate(cert.id);
        setOperatingId(null);
        if (success) {
          notify('Source Reinstated', 'Water source marked Certified Potable (BIS-10500 compliant).');
        }
      },
      'Reinstate Source'
    );
  };

  const handleDelete = (cert: WaterCertificateItem) => {
    confirmAction(
      'Delete Water Certificate',
      `Permanently archive test report #${cert.test_report_number} from audit registry?`,
      async () => {
        setOperatingId(cert.id);
        const success = await deleteWaterCertificate(cert.id);
        setOperatingId(null);
        if (success) {
          notify('Certificate Deleted', 'Record removed from active audit register.');
        }
      },
      'Delete Certificate'
    );
  };

  const getTdsStatus = (tds: number) => {
    if (tds <= 150) return { label: 'OPTIMAL POTABLE', color: '#16A34A', bg: '#DCFCE7' };
    if (tds <= 250) return { label: 'ACCEPTABLE (BIS-10500)', color: '#0284C7', bg: '#E0F2FE' };
    return { label: 'CRITICAL / PURITY ALERT', color: '#DC2626', bg: '#FEE2E2' };
  };

  return (
    <View style={styles.container}>
      {/* Safety Compliance Overview Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIconWrap}>
          <Ionicons name="shield-checkmark" size={22} color="#0284C7" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.bannerTitle}>Water Purity & Compliance Audit Desk</Text>
            <View style={styles.bisBadge}>
              <Text style={styles.bisBadgeText}>BIS-10500 & BMC ENFORCED</Text>
            </View>
          </View>
          <Text style={styles.bannerSub}>
            Automated sensor surveillance tracking TDS (PPM), pH balances, microbial coliform screenings, and lab certificates.
          </Text>
        </View>
      </View>

      {/* Safety Standard KPI Counters */}
      <View style={styles.standardsRow}>
        <View style={styles.standardCard}>
          <Text style={styles.standardLabel}>MAX POTABLE TDS LIMIT</Text>
          <Text style={styles.standardValue}>250 ppm</Text>
          <Text style={styles.standardSub}>Auto-lockout if exceeded</Text>
        </View>
        <View style={styles.standardCard}>
          <Text style={styles.standardLabel}>PERMISSIBLE PH RANGE</Text>
          <Text style={styles.standardValue}>6.5 – 8.5</Text>
          <Text style={styles.standardSub}>Alkaline neutral potable range</Text>
        </View>
        <View style={styles.standardCard}>
          <Text style={styles.standardLabel}>MAX TURBIDITY</Text>
          <Text style={styles.standardValue}>&lt; 5.0 NTU</Text>
          <Text style={styles.standardSub}>Optical clarity standard</Text>
        </View>
        <View style={styles.standardCard}>
          <Text style={styles.standardLabel}>COLIFORM BACTERIA</Text>
          <Text style={[styles.standardValue, { color: '#16A34A' }]}>0 / ZERO</Text>
          <Text style={styles.standardSub}>Zero tolerance microbiological</Text>
        </View>
      </View>

      {/* Water Quality Certificates Grid */}
      <View style={styles.certsContainer}>
        <View style={styles.certsHeader}>
          <View>
            <Text style={styles.certsTitle}>Active Source Certificates & Lab Reports</Text>
            <Text style={styles.certsSub}>{waterCertificates.length} verified water source nodes</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add Water Certificate"
            onPress={() => {
              setReportNo(`SGS-WTR-${Math.floor(1000 + Math.random() * 9000)}`);
              setIsAddModalOpen(true);
            }}
            style={styles.addCertBtn}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addCertBtnText}>+ Add Lab Report</Text>
          </Pressable>
        </View>

        {waterCertificates.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Certificates on File</Text>
            <Text style={styles.emptySub}>Supplier laboratory tests will appear here once submitted.</Text>
          </View>
        ) : (
          <View style={styles.certsGrid}>
            {waterCertificates.map((cert) => {
              const tds = getTdsStatus(cert.tds_ppm);
              const isOperating = operatingId === cert.id;

              return (
                <View key={cert.id} style={styles.certCard}>
                  {/* Top Bar with Lab & Report Number */}
                  <View style={styles.certTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sourceType}>{cert.source_type}</Text>
                      <Text style={styles.labName}>{cert.lab_name}</Text>
                      <Text style={styles.reportNo}>Report #{cert.test_report_number}</Text>
                    </View>
                    <View
                      style={[
                        styles.potableTag,
                        cert.is_potable
                          ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }
                          : { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
                      ]}
                    >
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: cert.is_potable ? '#16A34A' : '#DC2626' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.potableTagText,
                          { color: cert.is_potable ? '#16A34A' : '#DC2626' },
                        ]}
                      >
                        {cert.is_potable ? 'CERTIFIED POTABLE' : 'SUSPENDED'}
                      </Text>
                    </View>
                  </View>

                  {/* Sensor Reading Meters */}
                  <View style={styles.readingsRow}>
                    {/* TDS */}
                    <View style={styles.readingBox}>
                      <Text style={styles.readingLabel}>TDS LEVEL</Text>
                      <Text style={[styles.readingValue, { color: tds.color }]}>
                        {cert.tds_ppm} <Text style={{ fontSize: 11 }}>ppm</Text>
                      </Text>
                      <View style={[styles.readingBadge, { backgroundColor: tds.bg }]}>
                        <Text style={[styles.readingBadgeText, { color: tds.color }]}>{tds.label}</Text>
                      </View>
                    </View>

                    {/* pH */}
                    <View style={styles.readingBox}>
                      <Text style={styles.readingLabel}>PH BALANCE</Text>
                      <Text style={styles.readingValue}>{cert.ph_level.toFixed(1)}</Text>
                      <Text style={styles.readingSub}>Neutral Drinking</Text>
                    </View>

                    {/* Turbidity */}
                    <View style={styles.readingBox}>
                      <Text style={styles.readingLabel}>TURBIDITY</Text>
                      <Text style={styles.readingValue}>{cert.turbidity_ntu.toFixed(1)} NTU</Text>
                      <Text style={styles.readingSub}>Clear & Filtered</Text>
                    </View>

                    {/* Coliform */}
                    <View style={styles.readingBox}>
                      <Text style={styles.readingLabel}>MICROBIAL</Text>
                      <Text style={[styles.readingValue, { color: cert.coliform_detected ? '#DC2626' : '#16A34A' }]}>
                        {cert.coliform_detected ? 'DETECTED' : 'CLEAR'}
                      </Text>
                      <Text style={styles.readingSub}>E. coli negative</Text>
                    </View>
                  </View>

                  {/* Validity & Action Footer */}
                  <View style={styles.certFooter}>
                    <View style={styles.datesRow}>
                      <Ionicons name="calendar-outline" size={13} color="#64748B" />
                      <Text style={styles.dateText}>
                        Certified: {cert.certified_date} • Expires: {cert.expiry_date}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {cert.is_potable ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Suspend Certificate"
                          disabled={isOperating}
                          onPress={() => handleSuspend(cert)}
                          style={[styles.suspendBtn, isOperating && { opacity: 0.6 }]}
                        >
                          {isOperating ? (
                            <ActivityIndicator size="small" color="#DC2626" />
                          ) : (
                            <>
                              <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                              <Text style={styles.suspendBtnText}>SUSPEND SOURCE</Text>
                            </>
                          )}
                        </Pressable>
                      ) : (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Reinstate Certificate"
                          disabled={isOperating}
                          onPress={() => handleReinstate(cert)}
                          style={[styles.reinstateBtn, isOperating && { opacity: 0.6 }]}
                        >
                          {isOperating ? (
                            <ActivityIndicator size="small" color="#16A34A" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle-outline" size={14} color="#16A34A" />
                              <Text style={styles.reinstateBtnText}>REINSTATE / CERTIFY</Text>
                            </>
                          )}
                        </Pressable>
                      )}

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete Certificate"
                        onPress={() => handleDelete(cert)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={14} color="#64748B" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* CRUD MODAL: ADD WATER PURITY TEST CERTIFICATE */}
      <Modal visible={isAddModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flask" size={20} color="#0284C7" />
                <Text style={styles.modalTitle}>New Water Quality Lab Report</Text>
              </View>
              <Pressable onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Water Source Name</Text>
              <TextInput
                value={waterSource}
                onChangeText={setWaterSource}
                placeholder="e.g. Powai Sub-surface Water Borewell"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Source Type</Text>
              <TextInput
                value={sourceType}
                onChangeText={setSourceType}
                placeholder="e.g. Deep Aquifer Borewell"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>NABL Accredited Testing Lab</Text>
              <TextInput
                value={labName}
                onChangeText={setLabName}
                placeholder="e.g. SGS India Analytical Laboratories"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <Text style={styles.inputLabel}>Test Report Certificate Number</Text>
              <TextInput
                value={reportNo}
                onChangeText={setReportNo}
                placeholder="e.g. SGS-WTR-2026-908"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>TDS (ppm)</Text>
                  <TextInput
                    value={String(tdsPpm)}
                    onChangeText={(t) => setTdsPpm(parseInt(t, 10) || 120)}
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>pH Level</Text>
                  <TextInput
                    value={String(phLevel)}
                    onChangeText={(t) => setPhLevel(parseFloat(t) || 7.0)}
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Turbidity (NTU)</Text>
                  <TextInput
                    value={String(turbidityNtu)}
                    onChangeText={(t) => setTurbidityNtu(parseFloat(t) || 1.0)}
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Quick Purity Presets</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Pressable
                    onPress={() => { setTdsPpm(110); setPhLevel(7.2); setTurbidityNtu(0.8); }}
                    style={styles.presetChip}
                  >
                    <Text style={styles.presetChipText}>Optimal (110 ppm)</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setTdsPpm(220); setPhLevel(7.0); setTurbidityNtu(1.8); }}
                    style={styles.presetChip}
                  >
                    <Text style={styles.presetChipText}>Acceptable (220 ppm)</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setTdsPpm(480); setPhLevel(6.4); setTurbidityNtu(4.2); }}
                    style={styles.presetChip}
                  >
                    <Text style={styles.presetChipText}>Critical (480 ppm)</Text>
                  </Pressable>
                </View>
              </View>
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
                  if (!waterSource.trim() || !reportNo.trim()) {
                    notify('Missing Information', 'Please provide source name and report number.');
                    return;
                  }
                  setIsSaving(true);
                  const ok = await createWaterCertificate({
                    water_source: waterSource.trim(),
                    source_type: sourceType.trim(),
                    lab_name: labName.trim(),
                    test_report_number: reportNo.trim(),
                    tds_ppm: tdsPpm,
                    ph_level: phLevel,
                    turbidity_ntu: turbidityNtu,
                  });
                  setIsSaving(false);
                  if (ok) {
                    notify('Certificate Added', `Lab report ${reportNo} registered.`);
                    setIsAddModalOpen(false);
                  } else {
                    notify('Error', 'Failed to register report.');
                  }
                }}
                style={styles.modalSubmitBtn}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Register Certificate</Text>
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
  banner: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0369A1',
  },
  bannerSub: {
    fontSize: 12,
    color: '#0284C7',
    marginTop: 2,
    lineHeight: 18,
  },
  bisBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  bisBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  standardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  standardCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: 4,
    ...shadows.card,
  },
  standardLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
  },
  standardValue: {
    fontSize: 20,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  standardSub: {
    fontSize: 11,
    color: '#64748B',
  },
  certsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    ...shadows.card,
  },
  certsHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  certsTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  certsSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  certsGrid: {
    gap: 12,
    marginTop: 12,
  },
  certCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  certTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  sourceType: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  labName: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  reportNo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  potableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  potableTagText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
  },
  readingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  readingBox: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 2,
  },
  readingLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#64748B',
  },
  readingValue: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  readingBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  readingBadgeText: {
    fontSize: 8,
    fontWeight: fontWeights.bold,
  },
  readingSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  certFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  suspendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  suspendBtnText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#DC2626',
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#475569',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // CRUD Actions & Modal Styles
  addCertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    ...shadows.subtle,
  },
  addCertBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: fontWeights.bold,
  },
  reinstateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  reinstateBtnText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#16A34A',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  presetChipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: fontWeights.semibold,
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
