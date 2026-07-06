const express = require('express');
const messagesController = require('../controllers/messagesController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/conversations', verifyToken, messagesController.getConversations);
router.get('/thread/:userId', verifyToken, messagesController.getThread);
router.post('/', verifyToken, messagesController.sendMessage);

module.exports = router;
