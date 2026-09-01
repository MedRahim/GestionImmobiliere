import api from './client';

export interface Booking {
  id: number;
  bookingId: number;
  propertyId: number;
  renterId: number;
  startDate: string;
  endDate: string;
  daysCount: number;
  monthsCount: number;
  selectedDays?: string[] | null;
  rentTotal: number;
  depositAmount?: number | null;
  paymentMethod: 'card' | 'on_arrival' | 'stripe';
  paymentStatus: string;
  status: string;
  stripeSessionId?: string | null;
  createdAt?: string;
  propertyTitle?: string;
  propertyCity?: string;
  renterName?: string;
  role?: 'renter' | 'owner';
}

export const bookingsApi = {
  create: (payload: {
    propertyId: number;
    days: string[];
    paymentMethod: 'stripe' | 'card' | 'on_arrival';
  }) =>
    api
      .post<{
        success: boolean;
        booking: Booking;
        requiresPayment?: boolean;
        checkoutUrl?: string;
        sessionId?: string;
      }>('/bookings', payload)
      .then(r => r.data),

  confirmStripe: (sessionId: string) =>
    api
      .post<{success: boolean; booking: Booking}>('/bookings/confirm-stripe', {sessionId})
      .then(r => r.data),

  stripeStatus: () =>
    api
      .get<{success: boolean; configured: boolean}>('/bookings/stripe-status')
      .then(r => r.data),

  mine: () =>
    api
      .get<{success: boolean; bookings: Booking[]}>('/bookings/mine')
      .then(r => r.data),

  /** Unlocks dates when Stripe WebView is closed / cancelled */
  cancelPending: (bookingId: number) =>
    api
      .get(`/bookings/stripe-cancel`, {params: {booking_id: bookingId}})
      .then(r => r.data)
      .catch(() => ({success: false})),
};
