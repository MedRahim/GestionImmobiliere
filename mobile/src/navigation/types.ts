export type RootStackParamList = {
  Splash: undefined;
  Language: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  Search: {location?: string; propertyType?: string} | undefined;
  Favorites: undefined;
  Messages: undefined;
  Listings: undefined;
  Inquiries: undefined;
  PropertyDetail: {propertyId: number; property?: import('../types').Property};
  AddProperty: {property?: import('../types').Property; editMode?: boolean} | undefined;
  Chat: {userId: number; userName: string};
  Profile: undefined;
  Notifications: undefined;
  Language: undefined;
  AIAssistant: {propertyId?: number; propertyTitle?: string} | undefined;
};
