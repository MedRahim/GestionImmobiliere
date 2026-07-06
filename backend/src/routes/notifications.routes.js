const express = require('express');
const notificationsController = require('../controllers/notificationsController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, notificationsController.getNotifications);
router.get('/unread-count', verifyToken, notificationsController.getUnreadCount);
router.patch('/read-all', verifyToken, notificationsController.markAllAsRead);
router.patch('/:id/read', verifyToken, notificationsController.markAsRead);
router.delete('/:id', verifyToken, notificationsController.deleteNotification);

module.exports = router;
