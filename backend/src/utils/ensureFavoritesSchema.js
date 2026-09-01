const { query } = require('../models/database');

let favoritesReady = false;

const ensureFavoritesSchema = async () => {
  if (favoritesReady) return;

  await query(`
    IF OBJECT_ID('dbo.Favorites', 'U') IS NULL
    BEGIN
      CREATE TABLE [dbo].[Favorites] (
        [FavoriteId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        [UserId] INT NOT NULL,
        [PropertyId] INT NOT NULL,
        [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
        CONSTRAINT [UQ_Favorites_User_Property] UNIQUE ([UserId], [PropertyId]),
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE,
        FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties]([PropertyId])
      );
    END
  `);

  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_favorites_user_id' AND object_id = OBJECT_ID('dbo.Favorites'))
      CREATE INDEX [idx_favorites_user_id] ON [dbo].[Favorites]([UserId]);
  `);

  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_favorites_property_id' AND object_id = OBJECT_ID('dbo.Favorites'))
      CREATE INDEX [idx_favorites_property_id] ON [dbo].[Favorites]([PropertyId]);
  `);

  favoritesReady = true;
  console.log('[DB] Favorites table ready');
};

module.exports = { ensureFavoritesSchema };
