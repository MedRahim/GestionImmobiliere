const express = require('express');
const inquiriesController = require('../controllers/inquiriesController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, inquiriesController.getAllInquiries);
router.post('/', verifyToken, inquiriesController.createInquiry);
router.patch('/:inquiryId/status', verifyToken, inquiriesController.updateInquiryStatus);

module.exports = router;
