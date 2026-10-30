import React, { useEffect, useState } from 'react';
import {
  Alert,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal } from '../../../components/common/Overlay/Modal';
import { SavedAddressesSheet } from '../../location/components/SavedAddressesSheet';
import { DiscoveryHeader } from '../components/DiscoveryHeader';
import { DiscoveryBottomSheet } from '../components/DiscoveryBottomSheet';
import { InteractiveMap } from '../components/InteractiveMap';
import { BookingReviewModal } from '../../booking/components/BookingReviewModal';
import { BookingSearchingOverlay } from '../../booking/components/BookingSearchingOverlay';
import { ActiveBookingCard } from '../../booking/components/ActiveBookingCard';
import { NotificationsModal } from '../../notifications/screens/NotificationsModal';
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
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToBookings,
  onNavigateToProfile,
}) => {
  const { user, profile, signOut } = useAuthStore();
  const {
    activeCoordinates,
    activeAddressText,
    setActiveLocation,
    locateUserViaGps,
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
    selectTanker,
    setCapacityFilter,
    setSortOption,
  } = useDiscoveryStore();

  // Overlay states
  const [addressSheetVisible, setAddressSheetVisible] = useState<boolean>(false);
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState<boolean>(false);
  const [tankerToBook, setTankerToBook] = useState<NearbyTanker | null>(null);

  const { notifications, unreadCount, fetchNotifications } = useNotificationStore();

  // Initial fetch on mount & when coordinates change
  useEffect(() => {
    fetchNearbyTankers(activeCoordinates.latitude, activeCoordinates.longitude);
  }, [activeCoordinates.latitude, activeCoordinates.longitude, fetchNearbyTankers]);

  useEffect(() => {
    if (user?.id) {
      fetchSavedAddresses(user.id);
      fetchNotifications(user.id);
    }
  }, [user, fetchSavedAddresses, fetchNotifications]);

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
            `Phone: ${user?.phone || 'Verified'}\nAccount Role: ${(profile?.role || 'Customer').toUpperCase()}\nCity: ${profile?.city || 'Bengaluru'}`,
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
      </View>

      {/* Active Live Booking Card (Uber/Ola in-trip card) */}
      {activeBooking && activeBooking.status !== 'cancelled' && (
        <View style={styles.activeBookingWrapper}>
          <ActiveBookingCard
            booking={activeBooking}
            onViewDetails={onNavigateToBookings}
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
                    city: profile?.city || 'Bengaluru',
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
      />

      {/* Notifications Modal */}
      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
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
