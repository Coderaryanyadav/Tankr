import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { VerifyOtpScreen } from '../features/auth/screens/VerifyOtpScreen';
import { OnboardingScreen } from '../features/onboarding/screens/OnboardingScreen';
import { SupplierDashboardScreen } from '../features/supply/screens/SupplierDashboardScreen';
import { SupplierRegistrationScreen } from '../features/supply/screens/SupplierRegistrationScreen';
import { DriverDashboardScreen } from '../features/supply/screens/DriverDashboardScreen';
import { AdminDashboardScreen } from '../features/admin/screens/AdminDashboardScreen';
import { DesignSystemShowcase } from '../showcase/DesignSystemShowcase';
import { TabId } from '../components/common/Navigation/BottomNav';
import { AppTabs } from './AppTabs';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../theme';

type AuthStep = 'login' | 'verify' | 'onboarding' | 'main';

export const RootNavigator: React.FC = () => {
  const { session, profile, isInitialized, initialize } = useAuthStore();
  const [authStep, setAuthStep] = useState<AuthStep>('login');
  const { width } = useWindowDimensions();
  const isDesktop = width > 520;

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (session?.user) {
      if (profile && !profile.is_onboarding_completed) {
        setAuthStep('onboarding');
      } else {
        setAuthStep('main');
      }
    } else {
      // Not logged in or logged out
      setAuthStep((prev) => (prev === 'verify' ? 'verify' : 'login'));
    }
  }, [session, profile]);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // URL Query Parameter Override for Automated Screenshot Capture & Navigation
  const getUrlParams = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.search) {
      const sp = new URLSearchParams(window.location.search);
      return {
        app: sp.get('app'),
        screen: sp.get('screen'),
        tab: sp.get('tab'),
        modal: sp.get('modal'),
        desk: sp.get('desk'),
      };
    }
    return null;
  };

  const urlParams = getUrlParams();
  const isExplicitRoute = Boolean(
    urlParams && (urlParams.app || urlParams.screen || urlParams.tab || urlParams.modal || urlParams.desk)
  );

  const renderExplicitRoute = () => {
    if (!urlParams) return null;

    // Design system showcase is public in development
    if (urlParams.app === 'showcase' && __DEV__) {
      return <DesignSystemShowcase />;
    }

    // Role-gated route overrides: only allowed in development with an authenticated session matching role or in __DEV__ preview mode
    if (__DEV__) {
      if (urlParams.app === 'admin') {
        return <AdminDashboardScreen initialTab={urlParams.desk as any} />;
      }

      if (urlParams.app === 'supplier') {
        if (urlParams.screen === 'registration') {
          return <SupplierRegistrationScreen onCancel={() => {}} onSuccess={() => {}} />;
        }
        return <SupplierDashboardScreen initialModal={urlParams.modal || undefined} />;
      }

      if (urlParams.app === 'driver') {
        return <DriverDashboardScreen initialModal={urlParams.modal || undefined} />;
      }
    } else {
      // In production, verify that the authenticated profile role matches the requested portal
      if (urlParams.app === 'admin' && profile?.role === 'admin') {
        return <AdminDashboardScreen initialTab={urlParams.desk as any} />;
      }
      if (urlParams.app === 'supplier' && profile?.role === 'supplier') {
        return <SupplierDashboardScreen initialModal={urlParams.modal || undefined} />;
      }
      if (urlParams.app === 'driver' && profile?.role === 'driver') {
        return <DriverDashboardScreen initialModal={urlParams.modal || undefined} />;
      }
    }

    if (urlParams.app === 'auth' || urlParams.screen === 'login' || urlParams.screen === 'verify' || urlParams.screen === 'onboarding') {
      if (urlParams.screen === 'verify') {
        return <VerifyOtpScreen onBackToLogin={() => {}} onVerificationSuccess={() => {}} />;
      }
      if (urlParams.screen === 'onboarding') {
        return <OnboardingScreen onComplete={() => {}} />;
      }
      return <LoginScreen onOtpRequested={() => {}} />;
    }

    // Default to Customer App with requested tab or modal
    const rawTab = urlParams.tab || urlParams.screen;
    const targetTab: TabId =
      rawTab === 'account' || rawTab === 'profile'
        ? 'profile'
        : rawTab === 'tracking' || rawTab === 'activity'
        ? 'activity'
        : rawTab === 'bookings'
        ? 'bookings'
        : 'discovery';
    return <AppTabs initialTab={targetTab} initialModal={urlParams.modal || undefined} />;
  };

  // Authoritative Server-Driven Role Navigation
  const verifiedRole = profile?.role || 'customer';

  const renderContent = () => {
    if (isExplicitRoute) {
      return renderExplicitRoute();
    }

    // 1. Auth Flow
    if (!session) {
      if (authStep === 'verify') {
        return (
          <VerifyOtpScreen
            onBackToLogin={() => setAuthStep('login')}
            onVerificationSuccess={(isOnboarded) => {
              if (isOnboarded) {
                setAuthStep('main');
              } else {
                setAuthStep('onboarding');
              }
            }}
          />
        );
      }
      return <LoginScreen onOtpRequested={() => setAuthStep('verify')} />;
    }

    // 2. Onboarding Flow
    if (authStep === 'onboarding') {
      return <OnboardingScreen onComplete={() => setAuthStep('main')} />;
    }

    // 3. Role-Based Dashboards
    if (verifiedRole === 'admin') {
      return <AdminDashboardScreen />;
    }

    if (verifiedRole === 'supplier') {
      return <SupplierDashboardScreen />;
    }

    if (verifiedRole === 'driver') {
      return <DriverDashboardScreen />;
    }

    // 4. Consumer Customer Experience
    return <AppTabs />;
  };

  // Allow wide viewport for Admin, Supplier, Showcase, or Wide screen modes
  const isWideTarget =
    (isExplicitRoute && (urlParams?.app === 'admin' || urlParams?.app === 'supplier' || urlParams?.app === 'showcase')) ||
    (session && (verifiedRole === 'admin' || verifiedRole === 'supplier'));

  if (isWideTarget) {
    return renderContent();
  }

  // On wide screens (desktop web / tablet), frame consumer experience in a sleek mobile frame
  if (isDesktop) {
    return (
      <View style={styles.desktopOuter}>
        <View style={styles.desktopDevice}>
          {renderContent()}
        </View>
      </View>
    );
  }

  return renderContent();
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopOuter: {
    flex: 1,
    backgroundColor: '#0B1120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopDevice: {
    width: '100%',
    maxWidth: 440,
    height: '100%',
    backgroundColor: colors.background,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
});
