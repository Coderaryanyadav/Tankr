import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCommunityPoolStore } from '../../../stores/communityPoolStore';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface CommunityPoolModalProps {
  visible: boolean;
  onClose: () => void;
  defaultAddress?: string;
  defaultLat?: number;
  defaultLng?: number;
}

export const CommunityPoolModal: React.FC<CommunityPoolModalProps> = ({
  visible,
  onClose,
  defaultAddress = 'Marol, Andheri East, Mumbai',
  defaultLat = 19.1171,
  defaultLng = 72.8809,
}) => {
  const {
    pools,
    isLoading,
    isContributing,
    fetchCommunityPools,
    subscribeToLivePools,
    contributeToPool,
    createCommunityPool,
  } = useCommunityPoolStore();

  const [activeTab, setActiveTab] = useState<'pools' | 'create'>('pools');
  const [selectedPoolCode, setSelectedPoolCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Contribution Form State
  const [contributorName, setContributorName] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [pledgeAmount, setPledgeAmount] = useState<number>(600);

  // New Pool Form State
  const [societyName, setSocietyName] = useState('');
  const [poolAddress, setPoolAddress] = useState(defaultAddress);
  const [targetLiters, setTargetLiters] = useState('20000');
  const [targetAmount, setTargetAmount] = useState('2400');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;

    fetchCommunityPools();
    try {
      const unsub = subscribeToLivePools();
      return () => {
        try {
          unsub();
        } catch {}
      };
    } catch (err) {
      console.warn('[CommunityPoolModal] Subscription notice:', err);
      return undefined;
    }
  }, [visible, fetchCommunityPools, subscribeToLivePools]);

  const handlePledge = async (poolCode: string) => {
    if (!contributorName.trim() || !flatNumber.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your Name and Flat Number to contribute.' });
      return;
    }

    const res = await contributeToPool(poolCode, contributorName.trim(), flatNumber.trim(), pledgeAmount);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `₹${pledgeAmount} pledged from ${flatNumber}! Once the pool reaches 100%, the 20,000L jumbo tanker automatically dispatches.`,
      });
      setSelectedPoolCode(null);
      setContributorName('');
      setFlatNumber('');
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to submit pledge.' });
    }
  };

  const handleCreateNewPool = async () => {
    if (!societyName.trim() || !poolAddress.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your society/apartment name and delivery address.' });
      return;
    }

    setIsCreating(true);
    const res = await createCommunityPool({
      societyName: societyName.trim(),
      deliveryAddress: poolAddress.trim(),
      latitude: defaultLat,
      longitude: defaultLng,
      targetLiters: Number(targetLiters) || 20000,
      targetAmount: Number(targetAmount) || 2400,
    });
    setIsCreating(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Community Sump Pool created! Pool code: ${res.poolCode}. Share this with your society WhatsApp group!`,
      });
      setActiveTab('pools');
      setSocietyName('');
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to create pool.' });
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.headerTitle}>Community Sump Cost-Splitting</Text>
                <View style={styles.jumboBadge}>
                  <Text style={styles.jumboBadgeText}>20,000L JUMBO</Text>
                </View>
              </View>
              <Text style={styles.headerSubtitle}>
                Pool funds with apartment neighbors to split large tanker deliveries
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close community pooling"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Sub Navigation */}
          <View style={styles.tabNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View active society pools"
              onPress={() => setActiveTab('pools')}
              style={[styles.tabBtn, activeTab === 'pools' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, activeTab === 'pools' && styles.tabBtnTextActive]}>
                Active Pools ({pools.length})
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create new pool"
              onPress={() => setActiveTab('create')}
              style={[styles.tabBtn, activeTab === 'create' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, activeTab === 'create' && styles.tabBtnTextActive]}>
                + Start Society Pool
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Feedback Banner */}
            {feedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  feedback.type === 'success'
                    ? styles.feedbackBannerSuccess
                    : styles.feedbackBannerError,
                ]}
              >
                <Ionicons
                  name={feedback.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={feedback.type === 'success' ? '#16A34A' : colors.error}
                />
                <Text
                  style={[
                    styles.feedbackText,
                    { color: feedback.type === 'success' ? '#166534' : colors.error },
                  ]}
                >
                  {feedback.message}
                </Text>
                <Pressable onPress={() => setFeedback(null)}>
                  <Ionicons name="close" size={16} color="#64748B" />
                </Pressable>
              </View>
            )}

            {/* Feature Purpose Explainer Banner */}
            <View style={styles.explainerCard}>
              <View style={styles.explainerIconWrap}>
                <Ionicons name="people" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.explainerTitle}>What is Community Sump Pooling?</Text>
                <Text style={styles.explainerBody}>
                  Instead of individual flats ordering smaller 1,000L or 2,000L tankers at higher rates, neighbors chip in together to fill the shared society sump with a 20,000L Jumbo tanker at 40% lower cost per liter.
                </Text>
              </View>
            </View>

            {activeTab === 'pools' ? (
              <View style={styles.poolsList}>
                {isLoading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : pools.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="people-outline" size={40} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>No Active Community Pools</Text>
                    <Text style={styles.emptySub}>
                      Start a pool for your apartment building to split a 20,000L jumbo tanker.
                    </Text>
                  </View>
                ) : (
                  pools.map((pool) => {
                    const pct = Math.min(100, Math.round((pool.collected_amount / pool.target_amount) * 100));
                    const isPledging = selectedPoolCode === pool.pool_code;

                    return (
                      <View key={pool.id} style={styles.poolCard}>
                        {/* Pool Header */}
                        <View style={styles.poolTopRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.societyTitle}>{pool.society_name}</Text>
                            <Text style={styles.poolCode}>Code: {pool.pool_code}</Text>
                            <Text style={styles.poolAddr}>{pool.delivery_address}</Text>
                          </View>
                          <View style={styles.fundedPill}>
                            <Text style={styles.fundedPillText}>{pct}% FUNDED</Text>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBarTrack}>
                          <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                        </View>

                        <View style={styles.progressLabelRow}>
                          <Text style={styles.progressLabelLeft}>
                            Raised: <Text style={{ fontWeight: fontWeights.bold }}>₹{pool.collected_amount}</Text> / ₹
                            {pool.target_amount}
                          </Text>
                          <Text style={styles.progressLabelRight}>
                            Target: {(pool.target_liters / 1000).toFixed(0)}kL Sump
                          </Text>
                        </View>

                        {/* Contributors List */}
                        <View style={styles.contribsRow}>
                          <Text style={styles.contribsTitle}>
                            Neighbors Pledged ({pool.contributions.length}):
                          </Text>
                          <View style={styles.chipsWrap}>
                            {pool.contributions.map((c) => (
                              <View key={c.id} style={styles.contribChip}>
                                <Text style={styles.contribChipText}>
                                  {c.flat_number} • ₹{c.amount_paid}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        {/* Pledge Trigger or Pledge Form */}
                        {isPledging ? (
                          <View style={styles.pledgeFormBox}>
                            <Text style={styles.pledgeFormTitle}>Join this Sump Pool</Text>

                            <View style={styles.inputRow}>
                              <TextInput
                                style={[styles.textInput, { flex: 1 }]}
                                placeholder="Your Name"
                                placeholderTextColor="#94A3B8"
                                value={contributorName}
                                onChangeText={setContributorName}
                              />
                              <TextInput
                                style={[styles.textInput, { width: 100 }]}
                                placeholder="Flat 404"
                                placeholderTextColor="#94A3B8"
                                value={flatNumber}
                                onChangeText={setFlatNumber}
                              />
                            </View>

                            <View style={styles.amountOptionsRow}>
                              {[300, 600, 800, 1200].map((amt) => (
                                <Pressable
                                  key={amt}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Pledge ₹${amt}`}
                                  onPress={() => setPledgeAmount(amt)}
                                  style={[
                                    styles.amtChip,
                                    pledgeAmount === amt && styles.amtChipActive,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.amtChipText,
                                      pledgeAmount === amt && styles.amtChipTextActive,
                                    ]}
                                  >
                                    ₹{amt}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>

                            <View style={styles.pledgeActionsRow}>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Cancel pledge"
                                onPress={() => setSelectedPoolCode(null)}
                                style={styles.cancelPledgeBtn}
                              >
                                <Text style={styles.cancelPledgeText}>Cancel</Text>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Confirm pledge payment"
                                disabled={isContributing}
                                onPress={() => handlePledge(pool.pool_code)}
                                style={styles.confirmPledgeBtn}
                              >
                                {isContributing ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <Text style={styles.confirmPledgeText}>
                                    Pledge ₹{pledgeAmount} & Pool
                                  </Text>
                                )}
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Contribute to ${pool.society_name}`}
                            onPress={() => setSelectedPoolCode(pool.pool_code)}
                            style={styles.joinPoolBtn}
                          >
                            <Ionicons name="wallet-outline" size={15} color="#FFFFFF" />
                            <Text style={styles.joinPoolBtnText}>CONTRIBUTE TO THIS SUMP POOL</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            ) : (
              /* Create New Community Sump Pool Form */
              <View style={styles.createForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>APARTMENT / GATED COMMUNITY NAME</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Prestige Palms Block B, Sobha Quartz"
                    placeholderTextColor="#94A3B8"
                    value={societyName}
                    onChangeText={setSocietyName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>DELIVERY ADDRESS & SUMP INLET</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Gate 2, Sump Chamber 1"
                    placeholderTextColor="#94A3B8"
                    value={poolAddress}
                    onChangeText={setPoolAddress}
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>TARGET VOLUME</Text>
                    <TextInput
                      style={styles.textInput}
                      value={targetLiters}
                      onChangeText={setTargetLiters}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>TARGET AMOUNT (₹)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={targetAmount}
                      onChangeText={setTargetAmount}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create society pool"
                  disabled={isCreating}
                  onPress={handleCreateNewPool}
                  style={[styles.createSubmitBtn, isCreating && { opacity: 0.6 }]}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.createSubmitText}>START COMMUNITY POOL (20,000L)</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    paddingBottom: 24,
    ...shadows.modal,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  jumboBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  jumboBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#0284C7',
  },
  closeBtn: {
    padding: 4,
  },
  tabNavRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
  },
  scrollContent: {
    padding: spacing.md,
  },
  explainerCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: spacing.md,
  },
  explainerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explainerTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: '#0369A1',
  },
  explainerBody: {
    fontSize: 11,
    color: '#0C4A6E',
    marginTop: 2,
    lineHeight: 16,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  feedbackBannerSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  feedbackBannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    fontWeight: fontWeights.medium,
    lineHeight: 16,
  },
  poolsList: {
    gap: 12,
  },
  poolCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
    ...shadows.card,
  },
  poolTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  societyTitle: {
    fontSize: 15,
    fontWeight: fontWeights.bold,
    color: '#0F172A',
  },
  poolCode: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: fontWeights.semibold,
    marginTop: 2,
  },
  poolAddr: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  fundedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  fundedPillText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#16A34A',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: borderRadius.full,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelLeft: {
    fontSize: 11,
    color: '#334155',
  },
  progressLabelRight: {
    fontSize: 11,
    color: '#64748B',
  },
  contribsRow: {
    gap: 4,
    marginTop: 2,
  },
  contribsTitle: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: '#64748B',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  contribChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  contribChipText: {
    fontSize: 10,
    color: '#334155',
  },
  joinPoolBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  joinPoolBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: fontWeights.bold,
  },
  pledgeFormBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 10,
    gap: 8,
  },
  pledgeFormTitle: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: '#0284C7',
  },
  amountOptionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  amtChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: borderRadius.xs,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  amtChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  amtChipText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#334155',
  },
  amtChipTextActive: {
    color: '#FFFFFF',
  },
  pledgeActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelPledgeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelPledgeText: {
    fontSize: 11,
    color: '#64748B',
  },
  confirmPledgeBtn: {
    backgroundColor: '#16A34A',
    borderRadius: borderRadius.xs,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  confirmPledgeText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  createForm: {
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  createSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  createSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

