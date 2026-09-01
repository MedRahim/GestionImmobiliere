const { query } = require('../models/database');

let tableReady = false;

const ensureNotificationsTable = async () => {
  if (tableReady) return;
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Notifications')
    BEGIN
      CREATE TABLE [dbo].[Notifications] (
        [NotificationId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        [UserId] INT NOT NULL,
        [Type] NVARCHAR(50) NOT NULL,
        [Title] NVARCHAR(255) NOT NULL,
        [Message] NVARCHAR(MAX),
        [RelatedPropertyId] INT NULL,
        [RelatedInquiryId] INT NULL,
        [RelatedUserId] INT NULL,
        [IsRead] BIT DEFAULT 0,
        [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE
      );
    END
  `);
  await query(`
    IF COL_LENGTH('dbo.Notifications', 'RelatedUserId') IS NULL
      ALTER TABLE [dbo].[Notifications] ADD [RelatedUserId] INT NULL;
  `);
  // Drop legacy Type CHECK so 'booking' (and future types) are accepted
  await query(`
    DECLARE @constraint NVARCHAR(256);
    SELECT TOP 1 @constraint = cc.name
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id = OBJECT_ID('dbo.Notifications')
      AND cc.definition LIKE '%Type%';
    IF @constraint IS NOT NULL
      EXEC('ALTER TABLE [dbo].[Notifications] DROP CONSTRAINT [' + @constraint + ']');
  `);
  tableReady = true;
};

exports.createNotification = async ({
  userId,
  type,
  title,
  message,
  relatedPropertyId = null,
  relatedInquiryId = null,
  relatedUserId = null,
}) => {
  try {
    await ensureNotificationsTable();
    await query(
      `INSERT INTO [dbo].[Notifications]
       (UserId, Type, Title, Message, RelatedPropertyId, RelatedInquiryId, RelatedUserId, IsRead, CreatedAt)
       VALUES (@userId, @type, @title, @message, @relatedPropertyId, @relatedInquiryId, @relatedUserId, 0, GETUTCDATE())`,
      {
        userId,
        type,
        title,
        message: message || null,
        relatedPropertyId,
        relatedInquiryId,
        relatedUserId,
      }
    );
  } catch (err) {
    console.warn('[Notifications] Could not create notification:', err.message);
  }
};
