import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { borderRadius, colors, fontWeights, shadows, spacing } from '../../../theme';

interface SupportDeskModalProps {
  visible: boolean;
  onClose: () => void;
  userPhone?: string;
}

const SUPPORT_TOPICS = [
  { id: 'delayed', label: 'Tanker Delayed / ETA Issue', icon: 'time-outline' as const },
  { id: 'quality', label: 'Water Quality / Potability Concern', icon: 'water-outline' as const },
  { id: 'meter', label: 'Flow-Meter Shortfall / Refund', icon: 'speedometer-outline' as const },
  { id: 'driver', label: 'Driver Communication / Unreachable', icon: 'call-outline' as const },
  { id: 'emergency', label: 'Critical Care / Hospital Sump Emergency', icon: 'medkit-outline' as const },
];

export const SupportDeskModal: React.FC<SupportDeskModalProps> = ({
  visible,
  onClose,
  userPhone,
}) => {
  const [selectedTopic, setSelectedTopic] = useState('delayed');
  const [description, setDescription] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCallTollFree = () => {
    Linking.openURL('tel:180082657');
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello TANKR Support. I need immediate assistance regarding my water dispatch.`
    );
    Linking.openURL(`https://wa.me/919876543210?text=${text}`);
  };

  const handleSubmitTicket = () => {
    if (!description.trim()) {
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const ticketId = `TKR-SUP-${Math.floor(1000 + Math.random() * 9000)}`;
      setTicketSubmitted(ticketId);
      setIsSubmitting(false);
    }, 600);
  };

  const handleReset = () => {
    setTicketSubmitted(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.darkNavy} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>24/7 Water Support Desk</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Mumbai Ops Center Active</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Direct Contacts */}
          <Text style={styles.sectionTitle}>DIRECT PRIORITY CHANNELS</Text>
          <View style={styles.directChannelRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Call toll-free helpline"
              style={[styles.channelCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
              onPress={handleCallTollFree}
            >
              <View style={[styles.channelIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="call" size={22} color={colors.primary} />
              </View>
              <Text style={styles.channelTitle}>Toll-Free Hotline</Text>
              <Text style={styles.channelSub}>1800-826-57</Text>
              <Text style={styles.channelBadge}>Instant Connection</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chat on WhatsApp"
              style={[styles.channelCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
              onPress={handleWhatsApp}
            >
              <View style={[styles.channelIconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
              </View>
              <Text style={styles.channelTitle}>WhatsApp Live Desk</Text>
              <Text style={styles.channelSub}>Direct Chat</Text>
              <Text style={[styles.channelBadge, { backgroundColor: '#DCFCE7', color: '#166534' }]}>
                &lt; 2 min reply
              </Text>
            </Pressable>
          </View>

          {/* Ticket Confirmation Banner if submitted */}
          {ticketSubmitted ? (
            <View style={styles.successCard}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-done-circle" size={36} color="#16A34A" />
              </View>
              <Text style={styles.successTitle}>Support Request Created!</Text>
              <Text style={styles.ticketIdText}>Ticket Reference: #{ticketSubmitted}</Text>
              <Text style={styles.successDesc}>
                A dedicated Mumbai operations dispatcher has been assigned to your order. You will receive an immediate callback at {userPhone || 'your registered mobile number'}.
              </Text>
              <Button title="Done" variant="primary" size="md" onPress={handleReset} />
            </View>
          ) : (
            <>
              {/* Request Immediate Callback Form */}
              <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
                REQUEST OPERATIONAL CALLBACK
              </Text>

              <Text style={styles.inputLabel}>SELECT INCIDENT CATEGORY</Text>
              <View style={styles.topicChips}>
                {SUPPORT_TOPICS.map((topic) => {
                  const isSelected = selectedTopic === topic.id;
                  return (
                    <Pressable
                      key={topic.id}
                      onPress={() => setSelectedTopic(topic.id)}
                      style={[styles.topicChip, isSelected && styles.topicChipActive]}
                    >
                      <Ionicons
                        name={topic.icon}
                        size={15}
                        color={isSelected ? colors.white : colors.darkNavy}
                      />
                      <Text
                        style={[
                          styles.topicChipText,
                          isSelected && styles.topicChipTextActive,
                        ]}
                      >
                        {topic.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
                DESCRIBE SITUATION
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Tanker MH-02-TC-5001 delayed by 20 mins, sump water level is low..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />

              <View style={styles.assuranceNote}>
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                <Text style={styles.assuranceText}>
                  Priority callbacks are monitored 24/7 by BMC-compliant emergency dispatchers in Marol.
                </Text>
              </View>

              <Button
                title={isSubmitting ? 'Routing to Dispatcher...' : 'Request Priority Callback'}
                variant="primary"
                size="lg"
                onPress={handleSubmitTicket}
                loading={isSubmitting}
                disabled={!description.trim() || isSubmitting}
              />
            </>
          )}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: fontWeights.semibold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: fontWeights.heavy,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  directChannelRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  channelCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    ...shadows.subtle,
  },
  channelIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  channelTitle: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    textAlign: 'center',
  },
  channelSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  channelBadge: {
    marginTop: 8,
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  topicChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  topicChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    color: colors.darkNavy,
  },
  topicChipTextActive: {
    color: colors.white,
    fontWeight: fontWeights.bold,
  },
  textInput: {
    backgroundColor: colors.cardSurface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 13,
    color: colors.darkNavy,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  assuranceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: spacing.lg,
  },
  assuranceText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 16,
  },
  successCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: spacing.md,
    ...shadows.card,
  },
  successIconCircle: {
    marginBottom: spacing.sm,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: 4,
  },
  ticketIdText: {
    fontSize: 14,
    fontWeight: fontWeights.heavy,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  successDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
});
