import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { VerifyOtpScreen } from '../features/auth/screens/VerifyOtpScreen';
import { OnboardingScreen } from '../features/onboarding/screens/OnboardingScreen';
import { SupplierDashboardScreen } from '../features/supply/screens/SupplierDashboardScreen';
import { DriverDashboardScreen } from '../features/supply/screens/DriverDashboardScreen';
import { AppTabs } from './AppTabs';
import { useAuthStore } from '../stores/authStore';
import { useSupplyStore } from '../stores/supplyStore';
import { colors } from '../theme';

type AuthStep = 'login' | 'verify' | 'onboarding' | 'main';

export const RootNavigator: React.FC = () => {
  const { session, profile, isInitialized, initialize } = useAuthStore();
  const { activeRole } = useSupplyStore();
  const [authStep, setAuthStep] = useState<AuthStep>('login');

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

  // Active Flow switch
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

  if (authStep === 'onboarding') {
    return <OnboardingScreen onComplete={() => setAuthStep('main')} />;
  }

  // Supply-side role routing
  if (activeRole === 'supplier') {
    return <SupplierDashboardScreen />;
  }

  if (activeRole === 'driver') {
    return <DriverDashboardScreen />;
  }

  // Authenticated Home & Discovery Experience
  return <AppTabs />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

