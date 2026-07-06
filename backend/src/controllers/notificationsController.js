const { query } = require('../models/database');
const { createNotification } = require('../services/notificationService');

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeNotification = (row) => ({
  id: row.NotificationId,
  notificationId: row.NotificationId,
  userId: row.UserId,
  type: row.Type,
  title: row.Title,
  message: row.Message,
  relatedPropertyId: row.RelatedPropertyId,
  relatedInquiryId: row.RelatedInquiryId,
  read: !!row.IsRead,
  createdAt: row.CreatedAt,
});

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const limit = Math.min(parsePositiveInt(req.query.limit, 30), 100);

    const result = await query(
      `SELECT TOP (@limit) NotificationId, UserId, Type, Title, Message,
              RelatedPropertyId, RelatedInquiryId, IsRead, CreatedAt
       FROM [dbo].[Notifications]
       WHERE UserId = @userId
       ORDER BY CreatedAt DESC`,
      { userId, limit }
    );

    res.status(200).json({
      success: true,
      notifications: result.recordset.map(normalizeNotification),
    });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const result = await query(
      `SELECT COUNT(*) AS Total FROM [dbo].[Notifications]
       WHERE UserId = @userId AND IsRead = 0`,
      { userId }
    );
    res.status(200).json({
      success: true,
      unreadCount: result.recordset[0]?.Total || 0,
    });
  } catch (error) {
    res.status(200).json({ success: true, unreadCount: 0 });
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const notificationId = parsePositiveInt(req.params.id, null);
    if (!notificationId) {
      return res.status(400).json({ success: false, message: 'Invalid notification id' });
    }

    await query(
      `UPDATE [dbo].[Notifications] SET IsRead = 1
       WHERE NotificationId = @notificationId AND UserId = @userId`,
      { notificationId, userId }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    await query(
      `UPDATE [dbo].[Notifications] SET IsRead = 1
       WHERE UserId = @userId AND IsRead = 0`,
      { userId }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const notificationId = parsePositiveInt(req.params.id, null);
    if (!notificationId) {
      return res.status(400).json({ success: false, message: 'Invalid notification id' });
    }

    await query(
      `DELETE FROM [dbo].[Notifications]
       WHERE NotificationId = @notificationId AND UserId = @userId`,
      { notificationId, userId }
    );

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

exports.createNotification = createNotification;
