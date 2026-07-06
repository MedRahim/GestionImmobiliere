import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SplashScreen} from '../screens/SplashScreen';
import {LanguageScreen} from '../screens/LanguageScreen';
import {AppProviders} from './AppProviders';
import {RootStackParamList} from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <RootStack.Navigator
      initialRouteName="Splash"
      screenOptions={{headerShown: false, animation: 'fade'}}>
      <RootStack.Screen name="Splash" component={SplashScreen} />
      <RootStack.Screen name="Language" component={LanguageScreen} />
      <RootStack.Screen name="App" component={AppProviders} />
    </RootStack.Navigator>
  );
}
