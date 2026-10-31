import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomNav, TabId } from '../components/common/Navigation/BottomNav';
import { BookingsListScreen } from '../features/booking/screens/BookingsListScreen';
import { HomeScreen } from '../features/discovery/screens/HomeScreen';
import { LiveTrackingScreen } from '../features/tracking/screens/LiveTrackingScreen';
import { AccountScreen } from '../features/profile/screens/AccountScreen';
import { useBookingStore } from '../stores/bookingStore';
import { PREVIEW_BOOKING } from '../utils/previewDemoData';
import { colors } from '../theme';

interface AppTabsProps {
  initialTab?: TabId;
  initialModal?: string;
}

export const AppTabs: React.FC<AppTabsProps> = ({
  initialTab = 'discovery',
  initialModal,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const { setActiveBooking, activeBooking } = useBookingStore();

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === 'activity' && !activeBooking) {
      setActiveBooking(PREVIEW_BOOKING);
    }
  }, [activeTab, activeBooking, setActiveBooking]);

  return (
    <View style={styles.container}>
      <View style={styles.screenWrapper}>
        {activeTab === 'discovery' ? (
          <HomeScreen
            onNavigateToBookings={() => setActiveTab('bookings')}
            onNavigateToTracking={() => setActiveTab('activity')}
            onNavigateToProfile={() => setActiveTab('profile')}
            initialModal={initialModal}
          />
        ) : activeTab === 'bookings' ? (
          <BookingsListScreen
            onBack={() => setActiveTab('discovery')}
            onSelectBooking={(b) => {
              setActiveBooking(b);
              setActiveTab('activity');
            }}
            initialModal={initialModal}
          />
        ) : activeTab === 'activity' ? (
          <LiveTrackingScreen onBack={() => setActiveTab('discovery')} />
        ) : (
          <AccountScreen
            onNavigateToBookings={() => setActiveTab('bookings')}
            initialModal={initialModal}
          />
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
