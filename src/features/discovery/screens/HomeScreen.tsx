import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../../../components/common/Overlay/Modal';
import { SavedAddressesSheet } from '../../location/components/SavedAddressesSheet';
import { DiscoveryHeader } from '../components/DiscoveryHeader';
import { DiscoveryBottomSheet } from '../components/DiscoveryBottomSheet';
import { InteractiveMap } from '../components/InteractiveMap';
import { BookingReviewModal } from '../../booking/components/BookingReviewModal';
import { BookingSearchingOverlay } from '../../booking/components/BookingSearchingOverlay';
import { ActiveBookingCard } from '../../booking/components/ActiveBookingCard';
import { NotificationsModal } from '../../notifications/screens/NotificationsModal';
import { CommunityPoolModal } from '../../community/components/CommunityPoolModal';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { useDiscoveryStore } from '../../../stores/discoveryStore';
import { useLocationStore } from '../../../stores/locationStore';
import { useNotificationStore } from '../../../stores/notificationStore';
import { colors } from '../../../theme';
import { NearbyTanker } from '../../../types/discovery';

interface HomeScreenProps {
  onNavigateToBookings?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToTracking?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToBookings,
  onNavigateToProfile,
  onNavigateToTracking,
}) => {
  const { user, profile, signOut } = useAuthStore();
  const {
    activeCoordinates,
    activeAddressText,
    setActiveLocation,
    locateUserViaGps,
    initializeLocation,
    fetchSavedAddresses,
    addSavedAddress,
    isLocating,
  } = useLocationStore();

  const {
    activeBooking,
    isSearchingDriver,
    cancelBooking,
  } = useBookingStore();

  const {
    filteredTankers,
    selectedTankerId,
    selectedTanker,
    selectedCapacityFilter,
    sortOption,
    isLoading,
    isRefreshing,
    fetchNearbyTankers,
    subscribeToLiveTankers,
    selectTanker,
    setCapacityFilter,
    setSortOption,
  } = useDiscoveryStore();

  // Overlay states
  const [addressSheetVisible, setAddressSheetVisible] = useState<boolean>(false);
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState<boolean>(false);
  const [communityPoolModalVisible, setCommunityPoolModalVisible] = useState<boolean>(false);
  const [tankerToBook, setTankerToBook] = useState<NearbyTanker | null>(null);

  const { notifications, unreadCount, fetchNotifications, subscribeToNotifications } = useNotificationStore();

  // Initialize live customer location from database or GPS
  useEffect(() => {
    initializeLocation(user?.id);
  }, [user?.id, initializeLocation]);

  // Initial fetch on mount & when coordinates change
  useEffect(() => {
    fetchNearbyTankers(activeCoordinates.latitude, activeCoordinates.longitude);
  }, [activeCoordinates.latitude, activeCoordinates.longitude, fetchNearbyTankers]);

  // Subscribe to live Realtime tanker movement and availability updates from Supabase
  useEffect(() => {
    const unsubscribe = subscribeToLiveTankers();
    return () => {
      unsubscribe();
    };
  }, [subscribeToLiveTankers]);

  useEffect(() => {
    if (user?.id) {
      fetchSavedAddresses(user.id);
      fetchNotifications(user.id);
      const unsub = subscribeToNotifications(user.id);
      return () => {
        unsub();
      };
    }
  }, [user, fetchSavedAddresses, fetchNotifications, subscribeToNotifications]);

  // Recenter GPS
  const handleRecenterGps = async () => {
    const res = await locateUserViaGps();
    if (res) {
      fetchNearbyTankers(res.latitude, res.longitude, true);
    } else {
      Alert.alert(
        'GPS Signal',
        'Unable to acquire high-accuracy GPS coordinates. Keeping current delivery address.'
      );
    }
  };

  const handleBookTanker = (tanker: NearbyTanker) => {
    setTankerToBook(tanker);
    setReviewModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* 1. Top Section: Discovery Header */}
      <DiscoveryHeader
        onAddressPress={() => setAddressSheetVisible(true)}
        onNotificationsPress={() => setNotificationsModalVisible(true)}
        onProfilePress={() => {
          Alert.alert(
            'My Account',
            `Phone: ${user?.phone || 'Verified'}\nAccount Role: ${(profile?.role || 'Customer').toUpperCase()}\nCity: ${profile?.city || 'Mumbai'}`,
            [
              {
                text: 'Sign Out',
                style: 'destructive',
                onPress: () => signOut(),
              },
              { text: 'Close', style: 'cancel' },
            ]
          );
        }}
        unreadNotificationsCount={unreadCount}
      />

      {/* 2. Main Section: Interactive Google Map */}
      <View style={styles.mapSection}>
        <InteractiveMap
          userLocation={activeCoordinates}
          tankers={filteredTankers}
          selectedTankerId={selectedTankerId}
          onSelectTanker={(id) => selectTanker(id)}
          onRecenterGps={handleRecenterGps}
          isLocating={isLocating}
        />

        {/* Floating Community Sump Pooling Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Community Sump Pooling"
          onPress={() => setCommunityPoolModalVisible(true)}
          style={styles.communityPoolPill}
        >
          <Ionicons name="people" size={15} color="#FFFFFF" />
          <Text style={styles.communityPoolPillText}>Community Sump Pool (20kL)</Text>
          <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Active Live Booking Card (Uber/Ola in-trip card) */}
      {activeBooking && activeBooking.status !== 'cancelled' && (
        <View style={styles.activeBookingWrapper}>
          <ActiveBookingCard
            booking={activeBooking}
            onViewDetails={onNavigateToTracking || onNavigateToBookings}
          />
        </View>
      )}

      {/* 3. Bottom Section: Polished Draggable Bottom Sheet */}
      <View style={styles.bottomSheetSection}>
        <DiscoveryBottomSheet
          tankers={filteredTankers}
          selectedTankerId={selectedTankerId}
          selectedCapacityFilter={selectedCapacityFilter}
          sortOption={sortOption}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          deliveryAddress={activeAddressText}
          onChangeAddress={() => setAddressSheetVisible(true)}
          onRefresh={() =>
            fetchNearbyTankers(
              activeCoordinates.latitude,
              activeCoordinates.longitude,
              true
            )
          }
          onSelectTanker={(id) => selectTanker(id)}
          onSelectCapacityFilter={(cap) => setCapacityFilter(cap)}
          onSelectSortOption={(sort) => setSortOption(sort)}
          onBookSelectedTanker={handleBookTanker}
        />
      </View>

      {/* Saved Addresses Modal */}
      <SavedAddressesSheet
        visible={addressSheetVisible}
        onClose={() => setAddressSheetVisible(false)}
        onAddNewAddress={() => {
          setAddressSheetVisible(false);
          Alert.prompt
            ? Alert.prompt('Add Address', 'Enter apartment or society name', async (text) => {
                if (text && user?.id) {
                  await addSavedAddress(user.id, {
                    label: 'home',
                    flat_or_building: text,
                    street_address: activeAddressText || 'Delivery Point',
                    city: profile?.city || 'Mumbai',
                    pincode: '560001',
                    latitude: activeCoordinates.latitude,
                    longitude: activeCoordinates.longitude,
                    is_default: false,
                  });
                }
              })
            : Alert.alert('Add Address', 'Enter your address in the profile settings.');
        }}
        onSelectAddress={(addr) => {
          setActiveLocation(
            `${addr.flat_or_building}, ${addr.street_address}`,
            { latitude: addr.latitude, longitude: addr.longitude },
            addr.label.toUpperCase()
          );
        }}
      />

      {/* Booking Review & Authoritative Price Breakdown Sheet */}
      <BookingReviewModal
        visible={reviewModalVisible}
        tanker={tankerToBook}
        onClose={() => setReviewModalVisible(false)}
        onBookingConfirmed={() => {
          // Trigger searching overlay
        }}
      />

      {/* Searching / Dispatching Supplier Radar Overlay */}
      <BookingSearchingOverlay
        visible={isSearchingDriver}
        onCancel={() => {
          if (activeBooking?.id) {
            cancelBooking(activeBooking.id, 'User cancelled during driver dispatch');
          }
        }}
        onDispatchConfirmed={() => {
          if (onNavigateToTracking) {
            onNavigateToTracking();
          }
        }}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
      />

      {/* Community Sump Pooling Modal */}
      <CommunityPoolModal
        visible={communityPoolModalVisible}
        onClose={() => setCommunityPoolModalVisible(false)}
        defaultAddress={activeAddressText}
        defaultLat={activeCoordinates.latitude}
        defaultLng={activeCoordinates.longitude}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapSection: {
    height: 280,
    width: '100%',
    position: 'relative',
  },
  communityPoolPill: {
    position: 'absolute',
    top: 10,
    left: 16,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 25,
    borderWidth: 1,
    borderColor: '#334155',
  },
  communityPoolPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeBookingWrapper: {
    position: 'absolute',
    top: 65,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  bottomSheetSection: {
    flex: 1,
    marginTop: -20, // Overlap slightly with map for modern rounded sheet look
    zIndex: 10,
  },
});
