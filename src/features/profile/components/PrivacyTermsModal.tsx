import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button/Button';
import { borderRadius, colors, fontWeights, spacing } from '../../../theme';

interface PrivacyTermsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyTermsModal: React.FC<PrivacyTermsModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.darkNavy} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Privacy & Terms of Service</Text>
            <Text style={styles.headerSubtitle}>TANKR Municipal Compliance Charter v1.0</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1 */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>1. Two-Way Delivery PIN Protocol</Text>
            </View>
            <Text style={styles.bodyText}>
              Every booking is assigned a unique, cryptographically generated 4-digit PIN. The assigned driver cannot initiate water discharge or mark the order as arriving without customer PIN validation. Customers are instructed strictly to share this PIN only after verifying the tanker has docked at their designated sump.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>2. Location & Telemetry Privacy</Text>
            </View>
            <Text style={styles.bodyText}>
              Your GPS coordinates and sump location are encrypted using AES-256 in transit and at rest. Location telemetry is shared with assigned fleet drivers strictly during the active delivery window and is automatically masked once the delivery is complete.
            </Text>
          </View>

          {/* Section 3 */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>3. BMC Commercial Water Compliance</Text>
            </View>
            <Text style={styles.bodyText}>
              All fleet partners operating on the TANKR platform comply with Brihanmumbai Municipal Corporation (BMC) water tanker extraction regulations and state groundwater authority mandates. Water is sourced strictly from licensed, lab-audited potable reservoirs.
            </Text>
          </View>

          {/* Section 4 */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>4. Payment Protection & Escrow</Text>
            </View>
            <Text style={styles.bodyText}>
              Pre-authorized payments (UPI, Card, NetBanking) are held securely until digital flow-meter handshake verifies delivery completion. In case of cancellation before tanker dispatch, 100% of the funds are refunded immediately with zero cancellation fees.
            </Text>
          </View>

          {/* Section 5 */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trash" size={18} color={colors.error} />
              <Text style={styles.sectionTitle}>5. Data Retention & Account Rights</Text>
            </View>
            <Text style={styles.bodyText}>
              Under the Digital Personal Data Protection (DPDP) Act, you have the right to request a full export of your delivery and invoice records or request complete deletion of your profile and saved sump addresses at any time via the 24/7 Support Desk.
            </Text>
          </View>

          <Button
            title="I Understand and Agree"
            variant="primary"
            size="lg"
            onPress={onClose}
          />
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
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  bodyText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
