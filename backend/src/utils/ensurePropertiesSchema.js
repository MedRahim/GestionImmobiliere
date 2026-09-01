const { query } = require('../models/database');

let ready = false;

const addColumnIfMissing = async (column, definition) => {
  await query(`
    IF COL_LENGTH('dbo.Properties', '${column}') IS NULL
    BEGIN
      ALTER TABLE [dbo].[Properties] ADD ${definition};
    END
  `);
};

const ensurePropertiesSchema = async () => {
  if (ready) return;

  await addColumnIfMissing('ListingType', `[ListingType] NVARCHAR(10) NOT NULL CONSTRAINT DF_Properties_ListingType DEFAULT 'sale'`);
  await addColumnIfMissing('Condition', `[Condition] NVARCHAR(20) NULL`);
  await addColumnIfMissing('RentPeriod', `[RentPeriod] NVARCHAR(10) NULL`);
  await addColumnIfMissing('DepositAmount', `[DepositAmount] DECIMAL(15,2) NULL`);
  await addColumnIfMissing('MinLeaseMonths', `[MinLeaseMonths] INT NULL`);
  await addColumnIfMissing('AverageRating', `[AverageRating] DECIMAL(3,2) NULL`);
  await addColumnIfMissing('ReviewCount', `[ReviewCount] INT NOT NULL CONSTRAINT DF_Properties_ReviewCount DEFAULT 0`);
  await addColumnIfMissing('IsAvailable', `[IsAvailable] BIT NOT NULL CONSTRAINT DF_Properties_IsAvailable DEFAULT 1`);
  await addColumnIfMissing('AvailableFrom', `[AvailableFrom] DATETIME NULL`);
  await addColumnIfMissing('VideoUrl', `[VideoUrl] NVARCHAR(MAX) NULL`);

  // Fix Status misuse: physical condition values stored in Status
  await query(`
    UPDATE [dbo].[Properties]
    SET [Condition] = [Status], [Status] = 'active'
    WHERE [Status] IN ('new', 'good', 'renovate')
      AND ([Condition] IS NULL OR [Condition] = '')
  `);

  await query(`
    IF OBJECT_ID('dbo.PropertyAvailability', 'U') IS NULL
    BEGIN
      CREATE TABLE [dbo].[PropertyAvailability] (
        [AvailabilityId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        [PropertyId] INT NOT NULL,
        [StartDate] DATE NOT NULL,
        [EndDate] DATE NOT NULL,
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'available',
        [Note] NVARCHAR(255) NULL,
        [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
        CONSTRAINT [CK_PropertyAvailability_Dates] CHECK ([EndDate] >= [StartDate]),
        CONSTRAINT [CK_PropertyAvailability_Status] CHECK ([Status] IN ('available', 'blocked', 'booked')),
        FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties]([PropertyId]) ON DELETE CASCADE
      );
      CREATE INDEX [idx_availability_property_dates]
        ON [dbo].[PropertyAvailability]([PropertyId], [StartDate], [EndDate]);
    END
  `);

  await query(`
    IF OBJECT_ID('dbo.PropertyReviews', 'U') IS NULL
    BEGIN
      CREATE TABLE [dbo].[PropertyReviews] (
        [ReviewId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        [PropertyId] INT NOT NULL,
        [UserId] INT NOT NULL,
        [Rating] TINYINT NOT NULL,
        [Comment] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME DEFAULT GETUTCDATE(),
        CONSTRAINT [CK_PropertyReviews_Rating] CHECK ([Rating] BETWEEN 1 AND 5),
        CONSTRAINT [UQ_PropertyReviews_User_Property] UNIQUE ([PropertyId], [UserId]),
        FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties]([PropertyId]) ON DELETE CASCADE,
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId])
      );
      CREATE INDEX [idx_reviews_property] ON [dbo].[PropertyReviews]([PropertyId]);
    END
  `);

  ready = true;
  console.log('[DB] Properties extensions (ListingType, Availability, Reviews) ready');
};

module.exports = { ensurePropertiesSchema };
