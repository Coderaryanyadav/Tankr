import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { DevAppSwitcher } from './src/components/common/Navigation/DevAppSwitcher';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
      {__DEV__ && <DevAppSwitcher />}
    </SafeAreaProvider>
  );
}
