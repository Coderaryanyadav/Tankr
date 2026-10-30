import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomNav, TabId } from '../components/common/Navigation/BottomNav';
import { BookingsListScreen } from '../features/booking/screens/BookingsListScreen';
import { HomeScreen } from '../features/discovery/screens/HomeScreen';
import { LiveTrackingScreen } from '../features/tracking/screens/LiveTrackingScreen';
import { DesignSystemShowcase } from '../showcase/DesignSystemShowcase';
import { colors } from '../theme';

export const AppTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('discovery');

  return (
    <View style={styles.container}>
      <View style={styles.screenWrapper}>
        {activeTab === 'discovery' ? (
          <HomeScreen onNavigateToBookings={() => setActiveTab('bookings')} />
        ) : activeTab === 'bookings' ? (
          <BookingsListScreen
            onBack={() => setActiveTab('discovery')}
            onSelectBooking={() => setActiveTab('activity')}
          />
        ) : activeTab === 'activity' ? (
          <LiveTrackingScreen onBack={() => setActiveTab('discovery')} />
        ) : (
          <DesignSystemShowcase />
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
