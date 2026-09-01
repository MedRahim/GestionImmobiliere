
const { query } = require('../models/database');
const { ValidationError } = require('../utils/errorHandler');
const { createNotification } = require('../services/notificationService');

let messagesSchemaReady = false;

const ensureMessagesSchema = async () => {
  if (messagesSchemaReady) return;
  await query(`
    IF COL_LENGTH('dbo.Messages', 'PropertyId') IS NULL
      ALTER TABLE [dbo].[Messages] ADD [PropertyId] INT NULL;
  `);
  messagesSchemaReady = true;
};

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeMessage = (row) => ({
  id: row.MessageId,
  messageId: row.MessageId,
  senderId: row.SenderId,
  receiverId: row.ReceiverId,
  content: row.MessageText,
  read: !!row.IsRead,
  createdAt: row.CreatedAt,
  senderName: `${row.SenderFirstName || ''} ${row.SenderLastName || ''}`.trim(),
  receiverName: `${row.ReceiverFirstName || ''} ${row.ReceiverLastName || ''}`.trim(),
  propertyId: row.PropertyId ?? null,
  propertyTitle: row.PropertyTitle || null,
});

exports.getConversations = async (req, res, next) => {
  try {
    await ensureMessagesSchema();
    const userId = req.user.userId || req.user.id;

    const result = await query(
      `WITH threads AS (
         SELECT
           CASE WHEN m.SenderId = @userId THEN m.ReceiverId ELSE m.SenderId END AS otherUserId,
           MAX(m.CreatedAt) AS lastMessageAt,
           SUM(CASE WHEN m.ReceiverId = @userId AND m.IsRead = 0 THEN 1 ELSE 0 END) AS unreadCount
         FROM [dbo].[Messages] m
         WHERE m.SenderId = @userId OR m.ReceiverId = @userId
         GROUP BY CASE WHEN m.SenderId = @userId THEN m.ReceiverId ELSE m.SenderId END
       )
       SELECT t.otherUserId, t.lastMessageAt, t.unreadCount,
              u.FirstName, u.LastName, u.Email, u.ProfileImage,
              (SELECT TOP 1 m2.MessageText FROM [dbo].[Messages] m2
               WHERE (m2.SenderId = @userId AND m2.ReceiverId = t.otherUserId)
                  OR (m2.ReceiverId = @userId AND m2.SenderId = t.otherUserId)
               ORDER BY m2.CreatedAt DESC) AS lastMessage
       FROM threads t
       INNER JOIN [dbo].[Users] u ON u.UserId = t.otherUserId
       ORDER BY t.lastMessageAt DESC`,
      { userId }
    );

    const conversations = result.recordset.map((row) => ({
      userId: row.otherUserId,
      name: `${row.FirstName || ''} ${row.LastName || ''}`.trim(),
      firstName: row.FirstName || '',
      lastName: row.LastName || '',
      email: row.Email,
      profileImage: row.ProfileImage || null,
      lastMessage: row.lastMessage,
      lastMessageAt: row.lastMessageAt,
      unreadCount: row.unreadCount || 0,
    }));

    res.status(200).json({ success: true, conversations });
  } catch (error) {
    next(error);
  }
};

exports.getThread = async (req, res, next) => {
  try {
    await ensureMessagesSchema();
    const userId = req.user.userId || req.user.id;
    const otherUserId = parsePositiveInt(req.params.userId, null);
    if (!otherUserId) throw new ValidationError('Validation failed', { userId: 'Invalid user' });

    const result = await query(
      `SELECT m.MessageId, m.SenderId, m.ReceiverId, m.MessageText, m.IsRead, m.CreatedAt,
              m.PropertyId,
              s.FirstName AS SenderFirstName, s.LastName AS SenderLastName,
              r.FirstName AS ReceiverFirstName, r.LastName AS ReceiverLastName,
              p.Title AS PropertyTitle
       FROM [dbo].[Messages] m
       INNER JOIN [dbo].[Users] s ON s.UserId = m.SenderId
       INNER JOIN [dbo].[Users] r ON r.UserId = m.ReceiverId
       LEFT JOIN [dbo].[Properties] p ON p.PropertyId = m.PropertyId
       WHERE (m.SenderId = @userId AND m.ReceiverId = @otherUserId)
          OR (m.SenderId = @otherUserId AND m.ReceiverId = @userId)
       ORDER BY m.CreatedAt ASC`,
      { userId, otherUserId }
    );

    await query(
      `UPDATE [dbo].[Messages] SET IsRead = 1
       WHERE ReceiverId = @userId AND SenderId = @otherUserId AND IsRead = 0`,
      { userId, otherUserId }
    );

    res.status(200).json({
      success: true,
      messages: result.recordset.map(normalizeMessage),
    });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    await ensureMessagesSchema();
    const senderId = req.user.userId || req.user.id;
    const { receiverId, message, content, propertyId } = req.body;
    const text = (message || content || '').trim();
    const targetId = parsePositiveInt(receiverId, null);
    const propId = parsePositiveInt(propertyId, null);

    if (!targetId || !text) {
      throw new ValidationError('Validation failed', {
        receiverId: !targetId ? 'Receiver is required' : undefined,
        message: !text ? 'Message is required' : undefined,
      });
    }

    if (targetId === senderId) {
      throw new ValidationError('Validation failed', { receiverId: 'Cannot message yourself' });
    }

    const insertResult = await query(
      `INSERT INTO [dbo].[Messages] (SenderId, ReceiverId, MessageText, IsRead, CreatedAt, PropertyId)
       OUTPUT INSERTED.*
       VALUES (@senderId, @receiverId, @text, 0, GETUTCDATE(), @propertyId)`,
      { senderId, receiverId: targetId, text, propertyId: propId }
    );

    const row = insertResult.recordset[0];

    let propertyTitle = null;
    if (propId) {
      const prop = await query(
        `SELECT Title FROM [dbo].[Properties] WHERE PropertyId = @propertyId`,
        { propertyId: propId },
      );
      propertyTitle = prop.recordset[0]?.Title || null;
    }

    const senderFirst = (req.user.firstName || '').trim() || 'Quelqu’un';
    const senderName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || senderFirst;
    await createNotification({
      userId: targetId,
      type: 'message',
      title: senderName,
      message: text.length > 140 ? `${text.substring(0, 137)}…` : text,
      relatedUserId: senderId,
      relatedPropertyId: propId,
    });

    res.status(201).json({
      success: true,
      message: normalizeMessage({
        ...row,
        SenderFirstName: req.user.firstName,
        SenderLastName: req.user.lastName,
        ReceiverFirstName: '',
        ReceiverLastName: '',
        PropertyId: propId,
        PropertyTitle: propertyTitle,
      }),
    });
  } catch (error) {
    next(error);
  }
};
