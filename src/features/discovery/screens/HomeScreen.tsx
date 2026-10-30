import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { Modal } from '../../../components/common/Overlay/Modal';
import { SavedAddressesSheet } from '../../location/components/SavedAddressesSheet';
import { DiscoveryHeader } from '../components/DiscoveryHeader';
import { DiscoveryBottomSheet } from '../components/DiscoveryBottomSheet';
import { InteractiveMap } from '../components/InteractiveMap';
import { BookingReviewModal } from '../../booking/components/BookingReviewModal';
import { BookingSearchingOverlay } from '../../booking/components/BookingSearchingOverlay';
import { ActiveBookingCard } from '../../booking/components/ActiveBookingCard';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore } from '../../../stores/bookingStore';
import { useDiscoveryStore } from '../../../stores/discoveryStore';
import { useLocationStore } from '../../../stores/locationStore';
import { useSupplyStore } from '../../../stores/supplyStore';
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
  const { user, signOut } = useAuthStore();
  const { setActiveRole } = useSupplyStore();
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
  const [tankerToBook, setTankerToBook] = useState<NearbyTanker | null>(null);

  // Initial fetch on mount & when coordinates change
  useEffect(() => {
    fetchNearbyTankers(activeCoordinates.latitude, activeCoordinates.longitude);
  }, [activeCoordinates.latitude, activeCoordinates.longitude, fetchNearbyTankers]);

  useEffect(() => {
    if (user?.id) {
      fetchSavedAddresses(user.id);
    }
  }, [user, fetchSavedAddresses]);

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
        onNotificationsPress={() => {
          Alert.alert(
            'TANKR Notifications',
            '• Water quality certified for Sri Cauvery Supplies.\n• No surge pricing active in your zone.'
          );
        }}
        onProfilePress={() => {
          Alert.alert(
            'Account & Mode Switcher',
            `Logged in as: ${user?.phone || 'Customer'}\nCurrent Mode: Customer`,
            [
              { text: 'Supplier Portal', onPress: () => setActiveRole('supplier') },
              { text: 'Driver Console', onPress: () => setActiveRole('driver') },
              {
                text: 'Sign Out',
                style: 'destructive',
                onPress: () => signOut(),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }}
        unreadNotificationsCount={1}
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
                    street_address: 'Outer Ring Road, Bellandur',
                    city: 'Bengaluru',
                    pincode: '560103',
                    latitude: 12.926,
                    longitude: 77.6762,
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapSection: {
    height: 340,
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
