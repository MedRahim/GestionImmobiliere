const { query } = require('../models/database');
const { ValidationError, AuthorizationError, NotFoundError } = require('../utils/errorHandler');
const { ensurePropertiesSchema } = require('../utils/ensurePropertiesSchema');
const { ensureBookingsSchema } = require('../utils/ensureBookingsSchema');
const { createNotification } = require('../services/notificationService');
const {
  isStripeConfigured,
  createCheckoutSession,
  retrieveCheckoutSession,
} = require('../services/stripeService');

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getUserId = (req) => req.user?.userId || req.user?.id;

const toDateOnly = (value) => {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // SQL DATE comes as UTC midnight — use ISO date part
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
};

const fmtLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const nextDayKey = (key) => {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return fmtLocal(d);
};

const eachDayKeys = (start, end) => {
  const keys = [];
  const cur = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cur <= last) {
    keys.push(fmtLocal(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
};

const mergeContiguous = (days) => {
  if (!days.length) return [];
  const sorted = [...days].sort();
  const ranges = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === nextDayKey(prev)) {
      prev = sorted[i];
      continue;
    }
    ranges.push({ startDate: start, endDate: prev });
    start = prev = sorted[i];
  }
  ranges.push({ startDate: start, endDate: prev });
  return ranges;
};

const dayInRange = (dayKey, start, end) => dayKey >= start && dayKey <= end;

const assertDaysBookable = (days, ranges) => {
  for (const day of days) {
    let available = false;
    let blocked = false;
    for (const r of ranges) {
      const s = toDateOnly(r.StartDate);
      const e = toDateOnly(r.EndDate);
      if (!s || !e || !dayInRange(day, s, e)) continue;
      const st = String(r.Status || '').toLowerCase();
      if (st === 'blocked' || st === 'booked') blocked = true;
      if (st === 'available') available = true;
    }
    if (blocked || !available) {
      throw new ValidationError('Ces dates ne sont plus disponibles', {
        dates: `${day} indisponible`,
      });
    }
  }
};

const normalizeBooking = (row) => ({
  id: row.BookingId,
  bookingId: row.BookingId,
  propertyId: row.PropertyId,
  renterId: row.RenterId,
  startDate: row.StartDate,
  endDate: row.EndDate,
  daysCount: row.DaysCount,
  monthsCount: row.MonthsCount,
  selectedDays: row.SelectedDays
    ? (() => {
        try {
          return JSON.parse(row.SelectedDays);
        } catch {
          return [];
        }
      })()
    : null,
  rentTotal: row.RentTotal != null ? Number(row.RentTotal) : 0,
  depositAmount: row.DepositAmount != null ? Number(row.DepositAmount) : null,
  paymentMethod: row.PaymentMethod,
  paymentStatus: row.PaymentStatus,
  status: row.Status,
  stripeSessionId: row.StripeSessionId || null,
  createdAt: row.CreatedAt,
  propertyTitle: row.Title || null,
  propertyCity: row.City || null,
  renterName: row.RenterName || null,
  role: row.Role || null,
});

const parseRequestedDays = (body) => {
  if (Array.isArray(body.days) && body.days.length) {
    return [...new Set(body.days.map(toDateOnly).filter(Boolean))].sort();
  }
  const startDate = toDateOnly(body.startDate);
  const endDate = toDateOnly(body.endDate);
  if (startDate && endDate && endDate >= startDate) {
    return eachDayKeys(startDate, endDate);
  }
  return [];
};

const publicApiBase = () =>
  (process.env.API_PUBLIC_URL || process.env.PUBLIC_API_URL || 'http://74.248.16.228:5000').replace(
    /\/$/,
    '',
  );

const lockDaysAndNotify = async ({
  booking,
  property,
  days,
  renterId,
  rentTotal,
  payLabel,
}) => {
  const ranges = mergeContiguous(days);
  for (const range of ranges) {
    await query(
      `INSERT INTO [dbo].[PropertyAvailability]
       (PropertyId, StartDate, EndDate, Status, Note)
       VALUES (@propertyId, @startDate, @endDate, 'booked', @note)`,
      {
        propertyId: property.PropertyId,
        startDate: range.startDate,
        endDate: range.endDate,
        note: `Réservation #${booking.BookingId}`,
      },
    );
  }

  const renter = await query(
    `SELECT FirstName, LastName FROM [dbo].[Users] WHERE UserId = @renterId`,
    { renterId },
  );
  const renterName = renter.recordset[0]
    ? `${renter.recordset[0].FirstName || ''} ${renter.recordset[0].LastName || ''}`.trim()
    : 'Un locataire';

  const daysLabel = days.length <= 3 ? days.join(', ') : `${days[0]} … ${days[days.length - 1]} (${days.length} j)`;

  await createNotification({
    userId: property.AgentId,
    type: 'booking',
    title: 'Nouvelle réservation — Loué',
    message: `${renterName} a réservé « ${property.Title} » (${daysLabel}). ${payLabel}. Total : ${rentTotal} TND.`,
    relatedPropertyId: property.PropertyId,
    relatedUserId: renterId,
  });

  await createNotification({
    userId: renterId,
    type: 'booking',
    title: 'Réservation confirmée',
    message: `Votre location « ${property.Title} » est confirmée (${days.length} jour${days.length > 1 ? 's' : ''}). ${payLabel}.`,
    relatedPropertyId: property.PropertyId,
    relatedUserId: property.AgentId,
  });

  return renterName;
};

const unlockBookingAvailability = async (bookingId, propertyId) => {
  await query(
    `DELETE FROM [dbo].[PropertyAvailability]
     WHERE PropertyId = @propertyId AND Note = @note AND Status = 'booked'`,
    { propertyId, note: `Réservation #${bookingId}` },
  );
};

exports.createBooking = async (req, res, next) => {
  try {
    await ensurePropertiesSchema();
    await ensureBookingsSchema();

    const renterId = getUserId(req);
    if (!renterId) throw new AuthorizationError('Authentication required');

    const propertyId = parsePositiveInt(req.body.propertyId, null);
    const days = parseRequestedDays(req.body);
    const paymentMethodRaw = req.body.paymentMethod;
    const paymentMethod =
      paymentMethodRaw === 'card' || paymentMethodRaw === 'stripe'
        ? 'stripe'
        : 'on_arrival';

    if (!propertyId || !days.length) {
      throw new ValidationError('Validation failed', {
        propertyId: !propertyId ? 'Required' : undefined,
        days: !days.length ? 'Sélectionnez au moins un jour' : undefined,
      });
    }

    const todayKey = fmtLocal(new Date());
    if (days.some((d) => d < todayKey)) {
      throw new ValidationError('Impossible de réserver des dates passées');
    }

    const prop = await query(
      `SELECT p.PropertyId, p.AgentId, p.ListingType, p.Price, p.DepositAmount, p.Title, p.City,
              p.Status, p.IsActive, p.DeletedAt, p.RentPeriod
       FROM [dbo].[Properties] p
       WHERE p.PropertyId = @propertyId`,
      { propertyId },
    );
    if (!prop.recordset.length || prop.recordset[0].DeletedAt) {
      throw new NotFoundError('Property');
    }
    const property = prop.recordset[0];
    if (property.IsActive === false || property.IsActive === 0) {
      throw new ValidationError('Ce bien n’est plus disponible');
    }
    if ((property.ListingType || 'sale') !== 'rent') {
      throw new ValidationError('Seules les locations peuvent être réservées');
    }
    if (Number(property.AgentId) === Number(renterId)) {
      throw new ValidationError('Vous ne pouvez pas réserver votre propre bien');
    }

    const avail = await query(
      `SELECT StartDate, EndDate, Status FROM [dbo].[PropertyAvailability]
       WHERE PropertyId = @propertyId`,
      { propertyId },
    );
    if (!avail.recordset.length) {
      throw new ValidationError('Aucune période de disponibilité définie pour ce bien');
    }

    assertDaysBookable(days, avail.recordset);

    const startDate = days[0];
    const endDate = days[days.length - 1];

    const overlap = await query(
      `SELECT TOP 1 BookingId FROM [dbo].[PropertyBookings]
       WHERE PropertyId = @propertyId AND Status IN ('confirmed', 'pending')
         AND StartDate <= @endDate AND EndDate >= @startDate`,
      { propertyId, startDate, endDate },
    );
    // Soft overlap check — also verify day-level via availability already
    if (overlap.recordset.length) {
      // re-check through availability is enough for non-contiguous; keep soft
    }

    const daysCount = days.length;
    const dailyPrice = Number(property.Price) || 0;
    const rentTotal = Math.round(dailyPrice * daysCount * 100) / 100;
    const depositAmount =
      property.DepositAmount != null ? Number(property.DepositAmount) : null;

    // ---- Pay on arrival: confirm + lock immediately ----
    if (paymentMethod === 'on_arrival') {
      const inserted = await query(
        `INSERT INTO [dbo].[PropertyBookings]
         (PropertyId, RenterId, StartDate, EndDate, DaysCount, MonthsCount, SelectedDays,
          RentTotal, DepositAmount, PaymentMethod, PaymentStatus, Status, CreatedAt)
         OUTPUT INSERTED.*
         VALUES
         (@propertyId, @renterId, @startDate, @endDate, @daysCount, 0, @selectedDays,
          @rentTotal, @depositAmount, 'on_arrival', 'on_arrival', 'confirmed', GETUTCDATE())`,
        {
          propertyId,
          renterId,
          startDate,
          endDate,
          daysCount,
          selectedDays: JSON.stringify(days),
          rentTotal,
          depositAmount,
        },
      );
      const booking = inserted.recordset[0];
      const renterName = await lockDaysAndNotify({
        booking,
        property,
        days,
        renterId,
        rentTotal,
        payLabel: 'Paiement à l’arrivée',
      });

      return res.status(201).json({
        success: true,
        booking: normalizeBooking({ ...booking, Title: property.Title, City: property.City, RenterName: renterName }),
      });
    }

    // ---- Stripe card ----
    if (!isStripeConfigured()) {
      throw new ValidationError(
        'Paiement Stripe non configuré sur le serveur. Utilisez « Payer à l’arrivée » ou ajoutez STRIPE_SECRET_KEY.',
      );
    }

    const inserted = await query(
      `INSERT INTO [dbo].[PropertyBookings]
       (PropertyId, RenterId, StartDate, EndDate, DaysCount, MonthsCount, SelectedDays,
        RentTotal, DepositAmount, PaymentMethod, PaymentStatus, Status, CreatedAt)
       OUTPUT INSERTED.*
       VALUES
       (@propertyId, @renterId, @startDate, @endDate, @daysCount, 0, @selectedDays,
        @rentTotal, @depositAmount, 'stripe', 'pending', 'pending', GETUTCDATE())`,
      {
        propertyId,
        renterId,
        startDate,
        endDate,
        daysCount,
        selectedDays: JSON.stringify(days),
        rentTotal,
        depositAmount,
      },
    );
    const booking = inserted.recordset[0];

    // Hold dates while paying
    const holdRanges = mergeContiguous(days);
    for (const range of holdRanges) {
      await query(
        `INSERT INTO [dbo].[PropertyAvailability]
         (PropertyId, StartDate, EndDate, Status, Note)
         VALUES (@propertyId, @startDate, @endDate, 'booked', @note)`,
        {
          propertyId,
          startDate: range.startDate,
          endDate: range.endDate,
          note: `Réservation #${booking.BookingId}`,
        },
      );
    }

    const userRow = await query(`SELECT Email FROM [dbo].[Users] WHERE UserId = @renterId`, {
      renterId,
    });
    const apiBase = publicApiBase();
    const session = await createCheckoutSession({
      bookingId: booking.BookingId,
      propertyId,
      propertyTitle: property.Title,
      rentTotalTnd: rentTotal,
      customerEmail: userRow.recordset[0]?.Email,
      successUrl: `${apiBase}/api/bookings/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${apiBase}/api/bookings/stripe-cancel?booking_id=${booking.BookingId}`,
    });

    await query(
      `UPDATE [dbo].[PropertyBookings] SET StripeSessionId = @sid WHERE BookingId = @id`,
      { sid: session.id, id: booking.BookingId },
    );

    res.status(201).json({
      success: true,
      requiresPayment: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      booking: normalizeBooking({
        ...booking,
        StripeSessionId: session.id,
        Title: property.Title,
        City: property.City,
      }),
    });
  } catch (error) {
    next(error);
  }
};

exports.confirmStripePayment = async (req, res, next) => {
  try {
    await ensureBookingsSchema();
    const renterId = getUserId(req);
    const sessionId = req.body.sessionId || req.query.session_id;
    if (!sessionId) throw new ValidationError('sessionId required');

    const session = await retrieveCheckoutSession(sessionId);
    if (session.payment_status !== 'paid') {
      throw new ValidationError('Paiement non finalisé');
    }

    const bookingId = parsePositiveInt(session.metadata?.bookingId, null);
    if (!bookingId) throw new ValidationError('Booking metadata missing');

    const row = await query(
      `SELECT b.*, p.Title, p.City, p.AgentId
       FROM [dbo].[PropertyBookings] b
       INNER JOIN [dbo].[Properties] p ON p.PropertyId = b.PropertyId
       WHERE b.BookingId = @bookingId`,
      { bookingId },
    );
    if (!row.recordset.length) throw new NotFoundError('Booking');
    const booking = row.recordset[0];
    if (renterId && Number(booking.RenterId) !== Number(renterId)) {
      throw new AuthorizationError('Not your booking');
    }

    if (booking.Status === 'confirmed' && booking.PaymentStatus === 'paid') {
      return res.json({ success: true, booking: normalizeBooking(booking), alreadyConfirmed: true });
    }

    await query(
      `UPDATE [dbo].[PropertyBookings]
       SET Status = 'confirmed', PaymentStatus = 'paid', PaymentMethod = 'stripe'
       WHERE BookingId = @bookingId`,
      { bookingId },
    );

    const days = booking.SelectedDays ? JSON.parse(booking.SelectedDays) : [];
    await createNotification({
      userId: booking.AgentId,
      type: 'booking',
      title: 'Paiement Stripe reçu — Loué',
      message: `Réservation #${bookingId} payée par carte (${booking.RentTotal} TND). « ${booking.Title} » est loué.`,
      relatedPropertyId: booking.PropertyId,
      relatedUserId: booking.RenterId,
    });
    await createNotification({
      userId: booking.RenterId,
      type: 'booking',
      title: 'Paiement confirmé',
      message: `Votre paiement Stripe pour « ${booking.Title} » est confirmé (${days.length || booking.DaysCount} jour(s)).`,
      relatedPropertyId: booking.PropertyId,
      relatedUserId: booking.AgentId,
    });

    const refreshed = await query(`SELECT * FROM [dbo].[PropertyBookings] WHERE BookingId = @bookingId`, {
      bookingId,
    });
    res.json({
      success: true,
      booking: normalizeBooking({ ...refreshed.recordset[0], Title: booking.Title, City: booking.City }),
    });
  } catch (error) {
    next(error);
  }
};

/** Browser/WebView landing after Stripe Checkout */
exports.stripeSuccessPage = async (req, res) => {
  try {
    await ensureBookingsSchema();
    const sessionId = req.query.session_id;
    if (!sessionId) {
      return res.status(400).send('<html><body><h2>Session manquante</h2></body></html>');
    }
    const session = await retrieveCheckoutSession(sessionId);
    const bookingId = parsePositiveInt(session.metadata?.bookingId, null);

    if (session.payment_status === 'paid' && bookingId) {
      await query(
        `UPDATE [dbo].[PropertyBookings]
         SET Status = 'confirmed', PaymentStatus = 'paid', PaymentMethod = 'stripe',
             StripeSessionId = @sid
         WHERE BookingId = @bookingId AND Status IN ('pending', 'confirmed')`,
        { bookingId, sid: sessionId },
      );

      const row = await query(
        `SELECT b.RenterId, b.PropertyId, b.RentTotal, p.AgentId, p.Title
         FROM [dbo].[PropertyBookings] b
         INNER JOIN [dbo].[Properties] p ON p.PropertyId = b.PropertyId
         WHERE b.BookingId = @bookingId`,
        { bookingId },
      );
      if (row.recordset[0]) {
        const b = row.recordset[0];
        await createNotification({
          userId: b.AgentId,
          type: 'booking',
          title: 'Paiement Stripe reçu — Loué',
          message: `Réservation #${bookingId} payée. « ${b.Title} » est loué (${b.RentTotal} TND).`,
          relatedPropertyId: b.PropertyId,
          relatedUserId: b.RenterId,
        });
        await createNotification({
          userId: b.RenterId,
          type: 'booking',
          title: 'Paiement confirmé',
          message: `Votre paiement Stripe pour « ${b.Title} » est confirmé (${b.RentTotal} TND).`,
          relatedPropertyId: b.PropertyId,
          relatedUserId: b.AgentId,
        });
      }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Paiement réussi</title>
      <style>body{font-family:system-ui;background:#F3F7F8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .card{background:#fff;padding:28px;border-radius:16px;text-align:center;max-width:360px;box-shadow:0 8px 30px rgba(14,36,56,.08)}
      h1{color:#0E2438;font-size:22px}p{color:#4A5D6A}</style></head>
      <body><div class="card"><h1>Paiement réussi</h1>
      <p>Votre location est confirmée. Vous pouvez fermer cette fenêtre.</p>
      <p id="ok">immobiliere-booking-success</p></div>
      <script>document.title='immobiliere-booking-success';</script>
      </body></html>`);
  } catch (err) {
    res.status(500).send(`<html><body><h2>Erreur paiement</h2><p>${err.message}</p></body></html>`);
  }
};

exports.stripeCancelPage = async (req, res) => {
  try {
    await ensureBookingsSchema();
    const bookingId = parsePositiveInt(req.query.booking_id, null);
    if (bookingId) {
      const row = await query(
        `SELECT BookingId, PropertyId, Status FROM [dbo].[PropertyBookings] WHERE BookingId = @bookingId`,
        { bookingId },
      );
      if (row.recordset[0] && row.recordset[0].Status === 'pending') {
        await unlockBookingAvailability(bookingId, row.recordset[0].PropertyId);
        await query(
          `UPDATE [dbo].[PropertyBookings] SET Status = 'cancelled' WHERE BookingId = @bookingId`,
          { bookingId },
        );
      }
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Paiement annulé</title></head>
      <body style="font-family:system-ui;text-align:center;padding:40px">
      <h1>Paiement annulé</h1><p>Les dates ont été libérées. fermez cette fenêtre.</p>
      <p>immobiliere-booking-cancel</p>
      <script>document.title='immobiliere-booking-cancel';</script>
      </body></html>`);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.getMyBookings = async (req, res, next) => {
  try {
    await ensureBookingsSchema();
    const userId = getUserId(req);
    if (!userId) throw new AuthorizationError('Authentication required');

    const result = await query(
      `SELECT b.*, p.Title, p.City,
              CASE WHEN b.RenterId = @userId THEN 'renter' ELSE 'owner' END AS Role,
              (u.FirstName + ' ' + u.LastName) AS RenterName
       FROM [dbo].[PropertyBookings] b
       INNER JOIN [dbo].[Properties] p ON p.PropertyId = b.PropertyId
       INNER JOIN [dbo].[Users] u ON u.UserId = b.RenterId
       WHERE b.RenterId = @userId OR p.AgentId = @userId
       ORDER BY b.CreatedAt DESC`,
      { userId },
    );

    res.json({
      success: true,
      bookings: result.recordset.map(normalizeBooking),
      stripeConfigured: isStripeConfigured(),
    });
  } catch (error) {
    next(error);
  }
};

exports.getPropertyBookings = async (req, res, next) => {
  try {
    await ensureBookingsSchema();
    await ensurePropertiesSchema();
    const userId = getUserId(req);
    const propertyId = parsePositiveInt(req.params.propertyId, null);
    if (!propertyId) throw new ValidationError('Validation failed', { propertyId: 'Required' });

    const owned = await query(
      `SELECT PropertyId FROM [dbo].[Properties]
       WHERE PropertyId = @propertyId AND AgentId = @userId AND DeletedAt IS NULL`,
      { propertyId, userId },
    );
    if (!owned.recordset.length) throw new AuthorizationError("You don't have permission");

    const result = await query(
      `SELECT b.*, p.Title, p.City,
              'owner' AS Role,
              (u.FirstName + ' ' + u.LastName) AS RenterName
       FROM [dbo].[PropertyBookings] b
       INNER JOIN [dbo].[Properties] p ON p.PropertyId = b.PropertyId
       INNER JOIN [dbo].[Users] u ON u.UserId = b.RenterId
       WHERE b.PropertyId = @propertyId
       ORDER BY b.StartDate DESC`,
      { propertyId },
    );

    res.json({
      success: true,
      bookings: result.recordset.map(normalizeBooking),
    });
  } catch (error) {
    next(error);
  }
};

exports.stripeStatus = async (_req, res) => {
  res.json({ success: true, configured: isStripeConfigured() });
};
