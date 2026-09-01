const { query } = require('../models/database');

let ensured = false;

async function ensureGoogleAuthSchema() {
  if (ensured) return;

  await query(`
    IF COL_LENGTH('dbo.Users', 'GoogleId') IS NULL
    BEGIN
      ALTER TABLE [dbo].[Users] ADD [GoogleId] NVARCHAR(255) NULL;
    END;
  `);

  await query(`
    IF COL_LENGTH('dbo.Users', 'AuthProvider') IS NULL
    BEGIN
      ALTER TABLE [dbo].[Users] ADD [AuthProvider] NVARCHAR(20) NULL;
    END;
  `);

  await query(`
    UPDATE [dbo].[Users]
    SET [AuthProvider] = 'local'
    WHERE [AuthProvider] IS NULL;
  `);

  await query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = 'UX_Users_GoogleId' AND object_id = OBJECT_ID('dbo.Users')
    )
    BEGIN
      CREATE UNIQUE INDEX UX_Users_GoogleId ON [dbo].[Users]([GoogleId])
      WHERE [GoogleId] IS NOT NULL AND [DeletedAt] IS NULL;
    END;
  `);

  ensured = true;
  console.log('[DB] Google auth schema ready');
}

module.exports = { ensureGoogleAuthSchema };
