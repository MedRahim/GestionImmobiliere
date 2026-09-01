import React, {useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, View} from 'react-native';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuth} from '../context/AuthContext';
import {LoginScreen} from '../screens/LoginScreen';
import {RegisterScreen} from '../screens/RegisterScreen';
import {ForgotPasswordScreen} from '../screens/ForgotPasswordScreen';
import {ChangePasswordScreen} from '../screens/ChangePasswordScreen';
import {WelcomeLandingScreen} from '../screens/WelcomeLandingScreen';
import {MainShell} from '../components/MainShell';
import {LoadingView} from '../components/LoadingView';
import {AppText} from '../components/ui/AppText';
import {
  AddPropertyScreenLazy,
  BookingsScreenLazy,
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
import {storage} from '../utils/storage';
import {colors} from '../theme';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function AuthNavigator({asOverlay = false}: {asOverlay?: boolean}) {
  const {authIntent, clearAuthIntent, dismissAuthOverlay} = useAuth();
  const insets = useSafeAreaInsets();
  const [bootReady, setBootReady] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(false);

  useEffect(() => {
    return () => clearAuthIntent();
  }, [clearAuthIntent]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const seen = await storage.getOnboardingSeen();
      if (alive) {
        setOnboardingSeen(seen);
        setBootReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!bootReady) {
    return <LoadingView />;
  }

  const initialRoute =
    authIntent === 'login'
      ? 'Login'
      : authIntent === 'register'
        ? 'Register'
        : onboardingSeen || asOverlay
          ? 'Login'
          : 'Welcome';

  return (
    <View style={styles.authRoot}>
      {asOverlay ? (
        <Pressable
          onPress={dismissAuthOverlay}
          style={[styles.closeBar, {paddingTop: insets.top + 8}]}
          hitSlop={8}>
          <AppText variant="body" weight="bold" color={colors.primary}>
            Fermer
          </AppText>
        </Pressable>
      ) : null}
      <AuthStack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{headerShown: false}}>
        {!asOverlay ? (
          <AuthStack.Screen
            name="Welcome"
            component={WelcomeLandingScreen}
            options={{
              statusBarStyle: 'dark',
              statusBarTranslucent: true,
            }}
          />
        ) : null}
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
        <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </AuthStack.Navigator>
    </View>
  );
}

function MainNavigator() {
  return (
    <MainShell>
      <MainStack.Navigator
        initialRouteName="Home"
        screenOptions={{headerShown: false, detachInactiveScreens: true}}>
        <MainStack.Screen name="Home" component={HomeScreenLazy} />
        <MainStack.Screen name="Favorites" component={FavoritesScreenLazy} />
        <MainStack.Screen name="Search" component={SearchScreenLazy} />
        <MainStack.Screen name="Messages" component={MessagesScreenLazy} />
        <MainStack.Screen name="Listings" component={SellerListingsScreenLazy} />
        <MainStack.Screen name="Inquiries" component={SellerInquiriesScreenLazy} />
        <MainStack.Screen name="Bookings" component={BookingsScreenLazy} />
        <MainStack.Screen
          name="PropertyDetail"
          component={PropertyDetailScreenLazy}
        />
        <MainStack.Screen name="AddProperty" component={AddPropertyScreenLazy} />
        <MainStack.Screen name="Chat" component={ChatScreenLazy} />
        <MainStack.Screen name="Profile" component={ProfileScreenLazy} />
        <MainStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
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
  const {hasAppAccess, authOverlay, dismissAuthOverlay} = useAuth();

  return (
    <>
      {hasAppAccess ? <MainNavigator /> : <AuthNavigator />}
      {hasAppAccess && authOverlay ? (
        <Modal
          visible
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={dismissAuthOverlay}>
          <NavigationContainer independent theme={DefaultTheme}>
            <AuthNavigator asOverlay />
          </NavigationContainer>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  authRoot: {flex: 1, backgroundColor: colors.background},
  closeBar: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
});
