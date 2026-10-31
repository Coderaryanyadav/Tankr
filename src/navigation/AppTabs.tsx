import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomNav, TabId } from '../components/common/Navigation/BottomNav';
import { BookingsListScreen } from '../features/booking/screens/BookingsListScreen';
import { HomeScreen } from '../features/discovery/screens/HomeScreen';
import { LiveTrackingScreen } from '../features/tracking/screens/LiveTrackingScreen';
import { AccountScreen } from '../features/profile/screens/AccountScreen';
import { useBookingStore } from '../stores/bookingStore';
import { colors } from '../theme';

export const AppTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('discovery');
  const { setActiveBooking } = useBookingStore();

  return (
    <View style={styles.container}>
      <View style={styles.screenWrapper}>
        {activeTab === 'discovery' ? (
          <HomeScreen
            onNavigateToBookings={() => setActiveTab('bookings')}
            onNavigateToTracking={() => setActiveTab('activity')}
          />
        ) : activeTab === 'bookings' ? (
          <BookingsListScreen
            onBack={() => setActiveTab('discovery')}
            onSelectBooking={(b) => {
              setActiveBooking(b);
              setActiveTab('activity');
            }}
          />
        ) : activeTab === 'activity' ? (
          <LiveTrackingScreen onBack={() => setActiveTab('discovery')} />
        ) : (
          <AccountScreen onNavigateToBookings={() => setActiveTab('bookings')} />
        )}
      </View>

      <BottomNav
        activeTab={activeTab}
        onTabPress={(tab) => setActiveTab(tab)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenWrapper: {
    flex: 1,
  },
});
