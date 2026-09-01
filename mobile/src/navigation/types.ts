export type RootStackParamList = {
  Splash: undefined;
  Language: undefined;
  App:
    | undefined
    | {
        screen?: keyof MainStackParamList;
        params?: object;
      };
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainStackParamList = {
  Home:
    | undefined
    | {
        focusLatitude?: number;
        focusLongitude?: number;
        focusZoom?: number;
        focusPropertyId?: number;
      };
  Search: {location?: string; propertyType?: string; listingType?: string} | undefined;
  Favorites: undefined;
  Messages: undefined;
  Listings: undefined;
  Inquiries: undefined;
  Bookings: undefined;
  PropertyDetail: {propertyId: number; property?: import('../types').Property};
  AddProperty: {property?: import('../types').Property; editMode?: boolean} | undefined;
  Chat: {
    userId: number;
    userName: string;
    profileImage?: string;
    draftMessage?: string;
    propertyId?: number;
  };
  Profile: undefined;
  ChangePassword: undefined;
  Notifications: undefined;
  Language: undefined;
  AIAssistant: {propertyId?: number; propertyTitle?: string} | undefined;
};
