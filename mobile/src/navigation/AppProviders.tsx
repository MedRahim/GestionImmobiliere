import React from 'react';
import {AuthProvider} from '../context/AuthContext';
import {AlertProvider} from '../context/AlertContext';
import {FavoritesProvider} from '../context/FavoritesContext';
import {AppShellProvider} from '../context/AppShellContext';
import {AppFlowNavigator} from './AppFlowNavigator';

export function AppProviders() {
  return (
    <AuthProvider>
      <AlertProvider>
        <FavoritesProvider>
          <AppShellProvider>
            <AppFlowNavigator />
          </AppShellProvider>
        </FavoritesProvider>
      </AlertProvider>
    </AuthProvider>
  );
}
