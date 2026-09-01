const { query } = require('../models/database');

let ready = false;

const ensureBookingsSchema = async () => {
  if (ready) return;

  await query(`
    IF OBJECT_ID('dbo.PropertyBookings', 'U') IS NULL
    BEGIN
      CREATE TABLE [dbo].[PropertyBookings] (
        [BookingId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        [PropertyId] INT NOT NULL,
        [RenterId] INT NOT NULL,
        [StartDate] DATE NOT NULL,
        [EndDate] DATE NOT NULL,
        [DaysCount] INT NOT NULL,
        [MonthsCount] INT NOT NULL CONSTRAINT DF_Bookings_Months DEFAULT 0,
        [SelectedDays] NVARCHAR(MAX) NULL,
        [RentTotal] DECIMAL(15,2) NOT NULL,
        [DepositAmount] DECIMAL(15,2) NULL,
        [PaymentMethod] NVARCHAR(20) NOT NULL,
        [PaymentStatus] NVARCHAR(20) NOT NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'confirmed',
        [StripeSessionId] NVARCHAR(255) NULL,
        [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
        CONSTRAINT [CK_PropertyBookings_Dates] CHECK ([EndDate] >= [StartDate]),
        CONSTRAINT [CK_PropertyBookings_PaymentMethod] CHECK ([PaymentMethod] IN ('card', 'on_arrival', 'stripe')),
        CONSTRAINT [CK_PropertyBookings_PaymentStatus] CHECK ([PaymentStatus] IN ('pending', 'paid', 'on_arrival')),
        CONSTRAINT [CK_PropertyBookings_Status] CHECK ([Status] IN ('confirmed', 'cancelled', 'pending')),
        FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties]([PropertyId]) ON DELETE CASCADE,
        FOREIGN KEY ([RenterId]) REFERENCES [dbo].[Users]([UserId])
      );
      CREATE INDEX [idx_bookings_property_dates]
        ON [dbo].[PropertyBookings]([PropertyId], [StartDate], [EndDate]);
      CREATE INDEX [idx_bookings_renter]
        ON [dbo].[PropertyBookings]([RenterId]);
    END
  `);

  // Incremental columns for existing table
  await query(`
    IF COL_LENGTH('dbo.PropertyBookings', 'SelectedDays') IS NULL
      ALTER TABLE [dbo].[PropertyBookings] ADD [SelectedDays] NVARCHAR(MAX) NULL;
  `);
  await query(`
    IF COL_LENGTH('dbo.PropertyBookings', 'StripeSessionId') IS NULL
      ALTER TABLE [dbo].[PropertyBookings] ADD [StripeSessionId] NVARCHAR(255) NULL;
  `);

  // Relax status / payment method checks if old constraints block pending/stripe
  try {
    await query(`
      IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PropertyBookings_Status')
      BEGIN
        ALTER TABLE [dbo].[PropertyBookings] DROP CONSTRAINT [CK_PropertyBookings_Status];
        ALTER TABLE [dbo].[PropertyBookings] ADD CONSTRAINT [CK_PropertyBookings_Status]
          CHECK ([Status] IN ('confirmed', 'cancelled', 'pending'));
      END
    `);
  } catch (_) {
    /* ignore */
  }
  try {
    await query(`
      IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PropertyBookings_PaymentMethod')
      BEGIN
        ALTER TABLE [dbo].[PropertyBookings] DROP CONSTRAINT [CK_PropertyBookings_PaymentMethod];
        ALTER TABLE [dbo].[PropertyBookings] ADD CONSTRAINT [CK_PropertyBookings_PaymentMethod]
          CHECK ([PaymentMethod] IN ('card', 'on_arrival', 'stripe'));
      END
    `);
  } catch (_) {
    /* ignore */
  }

  ready = true;
  console.log('[DB] PropertyBookings ready');
};

module.exports = { ensureBookingsSchema };
