import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { VerifyOtpScreen } from '../features/auth/screens/VerifyOtpScreen';
import { OnboardingScreen } from '../features/onboarding/screens/OnboardingScreen';
import { SupplierDashboardScreen } from '../features/supply/screens/SupplierDashboardScreen';
import { DriverDashboardScreen } from '../features/supply/screens/DriverDashboardScreen';
import { AdminDashboardScreen } from '../features/admin/screens/AdminDashboardScreen';
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

  // Authoritative Server-Driven Role Navigation
  const verifiedRole = profile?.role || 'customer';

  const renderContent = () => {
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

  // For Admin and Supplier on desktop, allow full wide viewport
  if (session && (verifiedRole === 'admin' || verifiedRole === 'supplier')) {
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

