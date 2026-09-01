import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {LanguageProvider} from './src/context/LanguageContext';
import {ThemeProvider} from './src/context/ThemeContext';
import {AppNavigator} from './src/navigation/AppNavigator';
import {navigationRef} from './src/navigation/navigationRef';
import {handleNotificationOpenIfNeeded} from './src/services/localPush';

function App(): JSX.Element {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <NavigationContainer
              ref={navigationRef}
              onReady={() => {
                setTimeout(() => handleNotificationOpenIfNeeded(), 400);
              }}>
              <AppNavigator />
            </NavigationContainer>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
