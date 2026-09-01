export interface User {
  id: number;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profileImage?: string;
  bio?: string;
  authProvider?: 'local' | 'google';
  googleId?: string | null;
  hasAppPassword?: boolean;
  isVerified?: boolean;
  createdAt?: string;
}

export interface Property {
  id: number;
  propertyId: number;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  propertyType: string;
  listingType?: 'sale' | 'rent';
  condition?: string;
  rentPeriod?: string;
  depositAmount?: number | null;
  minLeaseMonths?: number | null;
  city?: string;
  state?: string;
  address?: string;
  location?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;
  latitude?: number;
  longitude?: number;
  featuredImage?: string;
  images?: string[];
  videoUrl?: string | null;
  amenities?: string[];
  status?: string;
  viewCount?: number;
  favoriteCount?: number;
  inquiryCount?: number;
  averageRating?: number | null;
  reviewCount?: number;
  isAvailable?: boolean;
  availableFrom?: string | null;
  owner?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface PropertyFilters {
  q?: string;
  location?: string;
  state?: string;
  propertyType?: string;
  listingType?: 'sale' | 'rent';
  minPrice?: string;
  maxPrice?: string;
  minArea?: string;
  maxArea?: string;
  minLotSize?: string;
  maxLotSize?: string;
  bedrooms?: string;
  bathrooms?: string;
  amenity?: string;
  page?: number;
  limit?: number;
}

export interface NearbyPlace {
  id: string;
  type: string;
  name: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
}

export interface AvailabilityRange {
  id?: number;
  startDate: string;
  endDate: string;
  status: 'available' | 'blocked' | 'booked';
  note?: string;
}

export interface PropertyReview {
  id: number;
  propertyId: number;
  userId: number;
  rating: number;
  comment?: string;
  createdAt: string;
  authorName: string;
}

export interface Inquiry {
  id: number;
  inquiryId: number;
  propertyId: number;
  propertyTitle?: string;
  clientId: number;
  agentId: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  subject?: string;
  message: string;
  status: string;
  createdAt: string;
  propertyDeleted?: boolean;
}

export interface Conversation {
  userId: number;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: number;
  messageId: number;
  senderId: number;
  receiverId: number;
  content: string;
  read: boolean;
  createdAt: string;
  senderName?: string;
}

export const PROPERTY_TYPES = [
  {value: 'apartment', label: 'Appartement'},
  {value: 'house', label: 'Maison'},
  {value: 'villa', label: 'Villa'},
  {value: 'land', label: 'Terrain'},
  {value: 'office', label: 'Bureau'},
  {value: 'commercial', label: 'Commercial'},
];

export const PROPERTY_CONDITIONS = [
  {value: 'new', label: 'Neuf'},
  {value: 'good', label: 'Bon état'},
  {value: 'renovate', label: 'À rénover'},
];

export const AMENITY_OPTIONS = [
  'Piscine',
  'Jardin',
  'Garage',
  'Ascenseur',
  'Climatisation',
  'Chauffage',
  'Meublé',
  'Sécurité',
  'Terrasse',
  'Cave',
];
