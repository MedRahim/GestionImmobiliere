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
        [IsRead] BIT DEFAULT 0,
        [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE
      );
    END
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
}) => {
  try {
    await ensureNotificationsTable();
    await query(
      `INSERT INTO [dbo].[Notifications]
       (UserId, Type, Title, Message, RelatedPropertyId, RelatedInquiryId, IsRead, CreatedAt)
       VALUES (@userId, @type, @title, @message, @relatedPropertyId, @relatedInquiryId, 0, GETUTCDATE())`,
      {
        userId,
        type,
        title,
        message: message || null,
        relatedPropertyId,
        relatedInquiryId,
      }
    );
  } catch (err) {
    console.warn('[Notifications] Could not create notification:', err.message);
  }
};
