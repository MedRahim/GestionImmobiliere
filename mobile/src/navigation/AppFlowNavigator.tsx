import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import {LoginScreen} from '../screens/LoginScreen';
import {RegisterScreen} from '../screens/RegisterScreen';
import {WelcomeLandingScreen} from '../screens/WelcomeLandingScreen';
import {MainShell} from '../components/MainShell';
import {
  AddPropertyScreenLazy,
  ChatScreenLazy,
  FavoritesScreenLazy,
  HomeScreenLazy,
  MessagesScreenLazy,
  NotificationsScreenLazy,
  ProfileScreenLazy,
  PropertyDetailScreenLazy,
  SearchScreenLazy,
  SellerInquiriesScreenLazy,
  SellerListingsScreenLazy,
  AIAssistantScreenLazy,
} from './lazyScreens';
import {
  AuthStackParamList,
  MainStackParamList,
} from './types';
import {LanguageScreen} from '../screens/LanguageScreen';
import {colors} from '../theme';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function AuthNavigator() {
  const {authIntent, clearAuthIntent} = useAuth();

  React.useEffect(() => {
    return () => clearAuthIntent();
  }, [clearAuthIntent]);

  const initialRoute =
    authIntent === 'login'
      ? 'Login'
      : authIntent === 'register'
        ? 'Register'
        : 'Welcome';

  return (
    <AuthStack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{headerShown: false}}>
      <AuthStack.Screen
        name="Welcome"
        component={WelcomeLandingScreen}
        options={{
          statusBarStyle: 'dark',
          statusBarTranslucent: true,
        }}
      />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: true,
          title: 'Inscription',
          headerTintColor: colors.white,
          headerStyle: {backgroundColor: colors.primary},
        }}
      />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainShell>
      <MainStack.Navigator
        initialRouteName="Home"
        screenOptions={{headerShown: false}}>
        <MainStack.Screen name="Home" component={HomeScreenLazy} />
        <MainStack.Screen name="Favorites" component={FavoritesScreenLazy} />
        <MainStack.Screen name="Search" component={SearchScreenLazy} />
        <MainStack.Screen name="Messages" component={MessagesScreenLazy} />
        <MainStack.Screen name="Listings" component={SellerListingsScreenLazy} />
        <MainStack.Screen name="Inquiries" component={SellerInquiriesScreenLazy} />
        <MainStack.Screen
          name="PropertyDetail"
          component={PropertyDetailScreenLazy}
        />
        <MainStack.Screen name="AddProperty" component={AddPropertyScreenLazy} />
        <MainStack.Screen name="Chat" component={ChatScreenLazy} />
        <MainStack.Screen name="Profile" component={ProfileScreenLazy} />
        <MainStack.Screen
          name="Notifications"
          component={NotificationsScreenLazy}
        />
        <MainStack.Screen name="Language" component={LanguageScreen} />
        <MainStack.Screen name="AIAssistant" component={AIAssistantScreenLazy} />
      </MainStack.Navigator>
    </MainShell>
  );
}

export function AppFlowNavigator() {
  const {hasAppAccess} = useAuth();
  return hasAppAccess ? <MainNavigator /> : <AuthNavigator />;
}
