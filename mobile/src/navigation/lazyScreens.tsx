import React from 'react';

type ScreenModule = Record<string, React.ComponentType<any> | undefined>;

/**
 * Defers screen module loading to avoid circular-import undefined exports at startup.
 */
export function lazyScreen(
  loader: () => ScreenModule,
  exportName: string,
): React.ComponentType<any> {
  function LazyScreen(props: any) {
    const mod = loader();
    const Comp = mod[exportName];
    if (!Comp) {
      throw new Error(`Screen "${exportName}" failed to load`);
    }
    return <Comp {...props} />;
  }
  LazyScreen.displayName = exportName;
  return LazyScreen;
}

export const FavoritesScreenLazy = lazyScreen(
  () => require('../screens/FavoritesScreen'),
  'FavoritesScreen',
);

export const HomeScreenLazy = lazyScreen(
  () => require('../screens/HomeScreen'),
  'HomeScreen',
);

export const SearchScreenLazy = lazyScreen(
  () => require('../screens/SearchScreen'),
  'SearchScreen',
);

export const ProfileScreenLazy = lazyScreen(
  () => require('../screens/ProfileScreen'),
  'ProfileScreen',
);

export const PropertyDetailScreenLazy = lazyScreen(
  () => require('../screens/PropertyDetailScreen'),
  'PropertyDetailScreen',
);

export const SellerListingsScreenLazy = lazyScreen(
  () => require('../screens/seller/SellerListingsScreen'),
  'SellerListingsScreen',
);

export const SellerInquiriesScreenLazy = lazyScreen(
  () => require('../screens/seller/SellerInquiriesScreen'),
  'SellerInquiriesScreen',
);

export const AddPropertyScreenLazy = lazyScreen(
  () => require('../screens/seller/AddPropertyScreen'),
  'AddPropertyScreen',
);

export const MessagesScreenLazy = lazyScreen(
  () => require('../screens/shared/MessagesScreen'),
  'MessagesScreen',
);

export const ChatScreenLazy = lazyScreen(
  () => require('../screens/shared/ChatScreen'),
  'ChatScreen',
);

export const NotificationsScreenLazy = lazyScreen(
  () => require('../screens/shared/NotificationsScreen'),
  'NotificationsScreen',
);

export const AIAssistantScreenLazy = lazyScreen(
  () => require('../screens/AIAssistantScreen'),
  'AIAssistantScreen',
);
