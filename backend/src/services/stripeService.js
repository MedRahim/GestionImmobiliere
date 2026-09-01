const Stripe = require('stripe');

let stripeClient = null;

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: '2024-06-20' });
  }
  return stripeClient;
};

const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * Convert TND amount to Stripe minor units.
 * Stripe does not support TND for Checkout in all accounts — default currency via STRIPE_CURRENCY (eur).
 * If currency is eur/usd, convert roughly from TND (configurable rate).
 */
const toStripeAmount = (tndAmount) => {
  const currency = (process.env.STRIPE_CURRENCY || 'eur').toLowerCase();
  const rate = Number(process.env.STRIPE_TND_TO_EUR || 0.3); // ~0.3 EUR per TND for demo
  let major = Number(tndAmount) || 0;
  if (currency === 'eur' || currency === 'usd') {
    major = Math.round(major * rate * 100) / 100;
  }
  // zero-decimal currencies rare; use cents
  const minor = Math.max(50, Math.round(major * 100)); // Stripe min ~0.50
  return { amount: minor, currency };
};

const createCheckoutSession = async ({
  bookingId,
  propertyId,
  propertyTitle,
  rentTotalTnd,
  customerEmail,
  successUrl,
  cancelUrl,
}) => {
  const stripe = getStripe();
  if (!stripe) {
    const err = new Error('Stripe n’est pas configuré (STRIPE_SECRET_KEY)');
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }

  const { amount, currency } = toStripeAmount(rentTotalTnd);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customerEmail || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: `Location — ${propertyTitle || 'Bien'}`,
            description: `Réservation #${bookingId} · ${rentTotalTnd} TND`,
          },
        },
      },
    ],
    metadata: {
      bookingId: String(bookingId),
      propertyId: String(propertyId),
      rentTotalTnd: String(rentTotalTnd),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
};

const retrieveCheckoutSession = async (sessionId) => {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');
  return stripe.checkout.sessions.retrieve(sessionId);
};

module.exports = {
  getStripe,
  isStripeConfigured,
  createCheckoutSession,
  retrieveCheckoutSession,
  toStripeAmount,
};
