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
import { useAuthStore } from '../../../stores/authStore';
import { useDiscoveryStore } from '../../../stores/discoveryStore';
import { useLocationStore } from '../../../stores/locationStore';
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
  const [bookingModalVisible, setBookingModalVisible] = useState<boolean>(false);
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
    setBookingModalVisible(true);
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
            'Account Profile',
            `Logged in as ${user?.phone || 'Customer'}\nRole: Customer`,
            [
              { text: 'Close', style: 'cancel' },
              {
                text: 'Sign Out',
                style: 'destructive',
                onPress: () => signOut(),
              },
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

      {/* Booking Confirmation Dialog */}
      {tankerToBook && (
        <Modal
          visible={bookingModalVisible}
          onClose={() => setBookingModalVisible(false)}
          title={`Book ${tankerToBook.capacity_liters.toLocaleString('en-IN')}L Tanker?`}
          message={`Supplier: ${tankerToBook.supplier_name}\nVehicle: ${tankerToBook.vehicle_number}\nETA: ~${tankerToBook.eta_minutes} mins\nDelivery: ${activeAddressText}\n\nTotal Payable: ₹${tankerToBook.estimated_total_price}`}
          iconName="water"
          iconColor={colors.primary}
          confirmTitle="Proceed to Booking"
          onConfirm={() => {
            Alert.alert(
              'Booking Requested!',
              `Your order for ${tankerToBook.capacity_liters}L water tanker has been submitted. Moving to booking management.`
            );
          }}
          cancelTitle="Cancel"
        />
      )}
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
  bottomSheetSection: {
    flex: 1,
    marginTop: -20, // Overlap slightly with map for modern rounded sheet look
    zIndex: 10,
  },
});
