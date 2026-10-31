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
import { useCommunityPoolStore } from '../../../stores/communityPoolStore';
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
  const { pools, fetchCommunityPools, subscribeToLivePools } = useCommunityPoolStore();

  // Initialize live customer location from database or GPS
  useEffect(() => {
    initializeLocation(user?.id);
  }, [user?.id, initializeLocation]);

  // Initial fetch on mount & when coordinates change
  useEffect(() => {
    fetchNearbyTankers(activeCoordinates.latitude, activeCoordinates.longitude);
  }, [activeCoordinates.latitude, activeCoordinates.longitude, fetchNearbyTankers]);

  // Fetch real community sump pools from Supabase
  useEffect(() => {
    fetchCommunityPools();
    const unsubPools = subscribeToLivePools();
    return () => {
      unsubPools();
    };
  }, [fetchCommunityPools, subscribeToLivePools]);

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

  const activePool = pools.find((p) => p.status === 'collecting' || p.status === 'funded');

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

        {/* Floating Contextual Community Sump Pooling Map Overlay (Only if active in DB) */}
        {activePool && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open Community Sump Pooling for ${activePool.society_name}`}
            onPress={() => setCommunityPoolModalVisible(true)}
            style={styles.communityPoolPill}
          >
            <View style={styles.communityPoolDot} />
            <Ionicons name="people" size={13} color="#FFFFFF" />
            <Text style={styles.communityPoolPillText} numberOfLines={1}>
              {activePool.society_name} ({Math.round(activePool.target_liters / 1000)}kL)
            </Text>
            <View style={styles.communityPoolPercentBadge}>
              <Text style={styles.communityPoolPercentText}>
                {Math.round((activePool.collected_amount / Math.max(1, activePool.target_amount)) * 100)}%
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.7)" />
          </Pressable>
        )}
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
    maxWidth: 240,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  communityPoolDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  communityPoolPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  communityPoolPercentBadge: {
    backgroundColor: '#0369A1',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  communityPoolPercentText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E0F2FE',
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
