import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomNav,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  HeaderBar,
  IconButton,
  LocationPill,
  Modal,
  OtpInput,
  PhoneInput,
  SearchBar,
  Skeleton,
  StatusBadge,
  TabId,
  TankerCard,
  TankerCardSkeleton,
  TextInput,
} from '../components';
import { borderRadius, colors, fontWeights, shadows, spacing, typography } from '../theme';
import { useAuthStore } from '../stores/authStore';
import { useLocationStore } from '../stores/locationStore';
import { SavedAddressesSheet } from '../features/location/components/SavedAddressesSheet';

const { width } = Dimensions.get('window');

type ShowcaseCategory = 'booking' | 'buttons' | 'inputs' | 'feedback';

export const DesignSystemShowcase: React.FC = () => {
  const { user, profile, signOut } = useAuthStore();
  const {
    activeAddressText,
    setActiveLocation,
    locateUserViaGps,
    fetchSavedAddresses,
    addSavedAddress,
    savedAddresses,
  } = useLocationStore();

  // Navigation & Category states
  const [activeCategory, setActiveCategory] = useState<ShowcaseCategory>('booking');
  const [activeTab, setActiveTab] = useState<TabId>('discovery');

  // Booking Flow state
  const [selectedTankerId, setSelectedTankerId] = useState<string>('tanker-standard');
  const [bottomSheetVisible, setBottomSheetVisible] = useState<boolean>(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState<boolean>(false);
  const [addressSheetVisible, setAddressSheetVisible] = useState<boolean>(false);

  useEffect(() => {
    if (user?.id) {
      fetchSavedAddresses(user.id);
    }
  }, [user, fetchSavedAddresses]);

  // Input states
  const [phone, setPhone] = useState<string>('9876543210');
  const [otp, setOtp] = useState<string>('4829');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');

  // Skeletons demo state
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);

  const TANKERS = [
    {
      id: 'tanker-mini',
      name: 'Tanker Mini',
      capacityLiters: 5000,
      waterType: 'Potable (Drinking)' as const,
      etaMinutes: 14,
      priceInRupees: 650,
      tag: 'Fastest',
    },
    {
      id: 'tanker-standard',
      name: 'Tanker Standard',
      capacityLiters: 10000,
      waterType: 'Potable (Drinking)' as const,
      etaMinutes: 22,
      priceInRupees: 1100,
      tag: 'Most Popular',
    },
    {
      id: 'tanker-jumbo',
      name: 'Tanker Jumbo',
      capacityLiters: 20000,
      waterType: 'Filtered Borewell' as const,
      etaMinutes: 38,
      priceInRupees: 1950,
    },
  ];

  const selectedTanker = TANKERS.find((t) => t.id === selectedTankerId) || TANKERS[1];

  const renderBookingFlow = () => (
    <View style={styles.sectionContainer}>
      {/* Map Simulation Container */}
      <View style={styles.mapSimContainer}>
        {/* Subtle Map Background Pattern */}
        <View style={styles.mapGridOverlay}>
          <View style={styles.waterCanalGraphic} />
          <View style={styles.roadGraphicHorizontal} />
          <View style={styles.roadGraphicVertical} />
        </View>

        {/* Floating Delivery Address Pill */}
        <View style={styles.floatingPillWrapper}>
          <LocationPill
            address={activeAddressText}
            onPress={() => setAddressSheetVisible(true)}
          />
        </View>

        {/* Simulated Tanker Pins on Map */}
        <View style={[styles.mapMarkerPin, { top: 90, left: 60 }]}>
          <Ionicons name="water" size={16} color={colors.white} />
          <View style={styles.markerEtaBadge}>
            <Text style={styles.markerEtaText}>14m</Text>
          </View>
        </View>

        <View style={[styles.mapMarkerPin, { top: 120, right: 80, backgroundColor: colors.secondary }]}>
          <Ionicons name="water" size={16} color={colors.white} />
          <View style={styles.markerEtaBadge}>
            <Text style={styles.markerEtaText}>22m</Text>
          </View>
        </View>

        {/* Floating Controls */}
        <View style={styles.floatingControlsWrapper}>
          <IconButton
            icon={<Ionicons name="locate" size={20} color={colors.primary} />}
            accessibilityLabel="Current GPS Location"
            onPress={async () => {
              const res = await locateUserViaGps();
              if (res) {
                Alert.alert('GPS Location Locked', res.formattedAddress);
              } else {
                Alert.alert('Location Notice', 'GPS could not pinpoint exact coordinates.');
              }
            }}
            size="sm"
          />
        </View>

        {/* Bottom Banner Trigger */}
        <View style={styles.mapBottomCard}>
          <View style={styles.mapBottomHeader}>
            <View>
              <Text style={styles.mapBottomSubtitle}>Selected Delivery</Text>
              <Text style={styles.mapBottomTitle}>{selectedTanker.name} • ₹{selectedTanker.priceInRupees}</Text>
            </View>
            <Button
              title="Change Tanker"
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={() => setBottomSheetVisible(true)}
            />
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Button
              title={`Book ${selectedTanker.name} (₹${selectedTanker.priceInRupees})`}
              variant="primary"
              size="lg"
              onPress={() => setConfirmModalVisible(true)}
              rightIcon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
            />
          </View>
        </View>
      </View>

      {/* Available Tankers List */}
      <View style={styles.subsectionHeader}>
        <Text style={styles.subsectionTitle}>Choose Tanker Capacity</Text>
        <Text style={styles.subsectionCaption}>Direct pricing, no surge rates</Text>
      </View>

      {TANKERS.map((tanker) => (
        <TankerCard
          key={tanker.id}
          id={tanker.id}
          name={tanker.name}
          capacityLiters={tanker.capacityLiters}
          waterType={tanker.waterType}
          etaMinutes={tanker.etaMinutes}
          priceInRupees={tanker.priceInRupees}
          selected={selectedTankerId === tanker.id}
          tag={tanker.tag}
          onSelect={(id) => setSelectedTankerId(id)}
        />
      ))}
    </View>
  );

  const renderButtonsDemo = () => (
    <View style={styles.sectionContainer}>
      <Card variant="standard" style={{ marginBottom: spacing.lg }}>
        <Text style={styles.cardHeaderTitle}>Button Hierarchy</Text>
        <Text style={styles.cardHeaderSubtitle}>
          Accessible, haptic-ready touch targets (minimum 48-56px).
        </Text>

        <View style={styles.buttonStack}>
          <Button
            title="Primary CTA (Book Now)"
            variant="primary"
            size="lg"
            onPress={() => {}}
            rightIcon={<Ionicons name="water" size={18} color={colors.white} />}
          />

          <Button
            title="Secondary Button (View History)"
            variant="secondary"
            size="md"
            onPress={() => {}}
          />

          <Button
            title="Outline Button (Schedule for Later)"
            variant="outline"
            size="md"
            onPress={() => {}}
          />

          <Button
            title="Ghost Button (Terms & Water Report)"
            variant="ghost"
            size="md"
            onPress={() => {}}
          />

          <Button
            title="Danger Button (Cancel Dispatch)"
            variant="danger"
            size="md"
            onPress={() => {}}
          />

          <Button
            title="Loading State"
            variant="primary"
            size="lg"
            loading={true}
            onPress={() => {}}
          />
        </View>
      </Card>

      <Card variant="standard">
        <Text style={styles.cardHeaderTitle}>Icon Buttons & Floating Actions</Text>
        <View style={styles.iconButtonsRow}>
          <IconButton
            icon={<Ionicons name="arrow-back" size={20} color={colors.darkNavy} />}
            accessibilityLabel="Back"
            onPress={() => {}}
            size="md"
          />
          <IconButton
            icon={<Ionicons name="locate" size={20} color={colors.primary} />}
            accessibilityLabel="Locate"
            onPress={() => {}}
            size="md"
          />
          <IconButton
            icon={<Ionicons name="call" size={22} color={colors.white} />}
            accessibilityLabel="Call Driver"
            variant="primary"
            onPress={() => {}}
            size="lg"
          />
          <IconButton
            icon={<Ionicons name="share-social-outline" size={20} color={colors.darkNavy} />}
            accessibilityLabel="Share Live Track"
            onPress={() => {}}
            size="md"
          />
        </View>
      </Card>
    </View>
  );

  const renderInputsDemo = () => (
    <View style={styles.sectionContainer}>
      <Card variant="standard" style={{ marginBottom: spacing.lg }}>
        <Text style={styles.cardHeaderTitle}>Location Search Bar</Text>
        <Text style={styles.cardHeaderSubtitle}>
          Uber/Ola-style destination and society picker.
        </Text>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Enter apartment, landmark, or street"
        />
      </Card>

      <Card variant="standard" style={{ marginBottom: spacing.lg }}>
        <Text style={styles.cardHeaderTitle}>Mobile OTP Authentication Input</Text>
        <Text style={styles.cardHeaderSubtitle}>
          Seamless 10-digit mobile login with country code.
        </Text>
        <PhoneInput
          value={phone}
          onChangePhone={setPhone}
          countryCode="+91"
        />
      </Card>

      <Card variant="standard" style={{ marginBottom: spacing.lg }}>
        <Text style={styles.cardHeaderTitle}>Split OTP Verification Code</Text>
        <Text style={styles.cardHeaderSubtitle}>
          Auto-advancing 4-digit delivery or login PIN.
        </Text>
        <OtpInput
          length={4}
          value={otp}
          onChangeOtp={setOtp}
          autoFocus={false}
        />
      </Card>

      <Card variant="standard">
        <Text style={styles.cardHeaderTitle}>Text Field Variants</Text>
        <TextInput
          label="Delivery Instructions"
          placeholder="e.g. Call security gate, sump is near block C"
          value={inputText}
          onChangeText={setInputText}
          helperText="Driver will see this when entering premises"
          leftIcon={<Ionicons name="chatbox-ellipses-outline" size={20} color={colors.textSecondary} />}
        />
      </Card>
    </View>
  );

  const renderFeedbackDemo = () => (
    <View style={styles.sectionContainer}>
      <Card variant="standard" style={{ marginBottom: spacing.lg }}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardHeaderTitle}>Loading Skeletons</Text>
          <Button
            title={loadingDemo ? 'Hide' : 'Show Shimmer'}
            size="sm"
            variant="outline"
            fullWidth={false}
            onPress={() => setLoadingDemo(!loadingDemo)}
          />
        </View>

        {loadingDemo ? (
          <View style={{ marginTop: spacing.md }}>
            <TankerCardSkeleton />
            <TankerCardSkeleton />
          </View>
        ) : (
          <View style={{ marginTop: spacing.md }}>
            <Skeleton width="90%" height={16} radius={borderRadius.sm} style={{ marginBottom: 8 }} />
            <Skeleton width="60%" height={14} radius={borderRadius.sm} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={12} radius={borderRadius.sm} />
          </View>
        )}
      </Card>

      <Card variant="standard" style={{ marginBottom: spacing.lg }}>
        <Text style={styles.cardHeaderTitle}>Status Badges</Text>
        <View style={styles.badgeRow}>
          <StatusBadge label="Delivered" variant="success" size="md" />
          <StatusBadge label="En Route (8m)" variant="warning" size="md" />
          <StatusBadge label="Cancelled" variant="error" size="md" />
          <StatusBadge label="Potable" variant="primary" size="md" />
          <StatusBadge label="Scheduled" variant="neutral" size="md" />
        </View>
      </Card>

      <Card variant="standard" style={{ marginBottom: spacing.lg }}>
        <Text style={styles.cardHeaderTitle}>Inline Error Banner</Text>
        <ErrorBanner
          message="Water tanker dispatch is temporarily busy in your zone. Please check back in 10 minutes."
          onDismiss={() => {}}
        />
      </Card>

      <Card variant="standard">
        <Text style={styles.cardHeaderTitle}>Empty State</Text>
        <EmptyState
          title="No Active Tankers"
          description="You don't have any ongoing water deliveries. Tap below to book an immediate tanker."
          actionTitle="Book a Tanker"
          onAction={() => setActiveCategory('booking')}
        />
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Brand Header Bar */}
      <View style={styles.brandBar}>
        <View style={styles.brandTitleRow}>
          <View style={styles.brandLogoCircle}>
            <Ionicons name="water" size={24} color={colors.white} />
          </View>
          <View>
            <Text style={styles.brandLogoText}>TANKR</Text>
            <Text style={styles.brandTagline}>Water delivery, just a tap away.</Text>
          </View>
        </View>

        {user ? (
          <Button
            title="Log Out"
            variant="outline"
            size="sm"
            fullWidth={false}
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to end your session?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', style: 'destructive', onPress: () => signOut() },
              ]);
            }}
          />
        ) : (
          <StatusBadge label="Design System v1.0" variant="primary" size="sm" />
        )}
      </View>

      {/* Interactive Category Selector Chips */}
      <View style={styles.categoryChipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {[
            { id: 'booking', label: 'Booking Flow & Map' },
            { id: 'buttons', label: 'Buttons & Actions' },
            { id: 'inputs', label: 'Inputs & OTP' },
            { id: 'feedback', label: 'States & Feedback' },
          ].map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <Button
                key={cat.id}
                title={cat.label}
                variant={isSelected ? 'primary' : 'secondary'}
                size="sm"
                fullWidth={false}
                onPress={() => setActiveCategory(cat.id as ShowcaseCategory)}
                style={styles.categoryChip}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Main Showcase Scroll Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeCategory === 'booking' && renderBookingFlow()}
        {activeCategory === 'buttons' && renderButtonsDemo()}
        {activeCategory === 'inputs' && renderInputsDemo()}
        {activeCategory === 'feedback' && renderFeedbackDemo()}
      </ScrollView>

      {/* Interactive Ride-Hailing Bottom Sheet */}
      <BottomSheet
        visible={bottomSheetVisible}
        onClose={() => setBottomSheetVisible(false)}
        title="Select Water Tanker"
        subtitle="Transparent rates with verified purity certifications"
      >
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          {TANKERS.map((tanker) => (
            <TankerCard
              key={tanker.id}
              id={tanker.id}
              name={tanker.name}
              capacityLiters={tanker.capacityLiters}
              waterType={tanker.waterType}
              etaMinutes={tanker.etaMinutes}
              priceInRupees={tanker.priceInRupees}
              selected={selectedTankerId === tanker.id}
              tag={tanker.tag}
              onSelect={(id) => {
                setSelectedTankerId(id);
                setBottomSheetVisible(false);
              }}
            />
          ))}
        </ScrollView>
      </BottomSheet>

      {/* Saved Addresses & Location Picker Sheet */}
      <SavedAddressesSheet
        visible={addressSheetVisible}
        onClose={() => setAddressSheetVisible(false)}
        onAddNewAddress={() => {
          setAddressSheetVisible(false);
          Alert.prompt
            ? Alert.prompt('Add Address', 'Enter apartment / building name', async (text) => {
                if (text && user?.id) {
                  await addSavedAddress(user.id, {
                    label: 'other',
                    flat_or_building: text,
                    street_address: 'Outer Ring Road, Bellandur',
                    city: 'Bengaluru',
                    pincode: '560103',
                    latitude: 12.926,
                    longitude: 77.6762,
                    is_default: false,
                  });
                }
              })
            : Alert.alert('Add Address', 'Tap Onboarding flow or profile to add addresses with GPS integration.');
        }}
        onSelectAddress={(addr) => {
          setActiveLocation(
            `${addr.flat_or_building}, ${addr.street_address}`,
            { latitude: addr.latitude, longitude: addr.longitude },
            addr.label.toUpperCase()
          );
        }}
      />

      {/* Booking Confirmation Dialog Modal */}
      <Modal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        title="Confirm Tanker Booking?"
        message={`Dispatching a ${selectedTanker.name} (${selectedTanker.capacityLiters.toLocaleString()} Liters) to ${activeAddressText}.\n\nTotal: ₹${selectedTanker.priceInRupees}`}
        iconName="water"
        iconColor={colors.primary}
        confirmTitle="Confirm & Dispatch"
        onConfirm={() => {
          Alert.alert('Booking Dispatched!', `Driver matching initiated for ${selectedTanker.name}.`);
        }}
        cancelTitle="Cancel"
      />

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabPress={(tab) => setActiveTab(tab)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandLogoCircle: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  brandLogoText: {
    fontSize: 18,
    fontWeight: fontWeights.heavy,
    color: colors.darkNavy,
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  categoryChipsContainer: {
    backgroundColor: colors.cardSurface,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  categoryScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  categoryChip: {
    marginRight: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  sectionContainer: {
    width: '100%',
  },
  mapSimContainer: {
    width: '100%',
    height: 320,
    borderRadius: borderRadius['2xl'],
    backgroundColor: '#D7E8F7',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  mapGridOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E1EDF8',
  },
  waterCanalGraphic: {
    position: 'absolute',
    top: 40,
    left: -20,
    width: '120%',
    height: 32,
    backgroundColor: '#C5DFF4',
    transform: [{ rotate: '-8deg' }],
  },
  roadGraphicHorizontal: {
    position: 'absolute',
    top: 150,
    width: '100%',
    height: 24,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  roadGraphicVertical: {
    position: 'absolute',
    left: 170,
    width: 24,
    height: '100%',
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  floatingPillWrapper: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  mapMarkerPin: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  markerEtaBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: colors.darkNavy,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  markerEtaText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: fontWeights.bold,
  },
  floatingControlsWrapper: {
    position: 'absolute',
    bottom: 120,
    right: spacing.md,
    zIndex: 10,
  },
  mapBottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardSurface,
    padding: spacing.md,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    ...shadows.modal,
  },
  mapBottomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapBottomSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
  },
  mapBottomTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  subsectionHeader: {
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  subsectionTitle: {
    fontSize: 17,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  subsectionCaption: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
    marginBottom: 2,
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  buttonStack: {
    gap: spacing.sm,
  },
  iconButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
