const express = require('express');
const rateLimit = require('express-rate-limit');
const aiController = require('../controllers/aiController');
const { verifyToken, verifyTokenOptional } = require('../middleware/auth');

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: 'Trop de requêtes IA, réessayez plus tard.',
});

router.use(aiLimiter);

router.get('/status', aiController.status);
router.post('/generate-listing', verifyToken, aiController.generateListing);
router.post('/estimate-price', verifyTokenOptional, aiController.estimatePrice);
router.post('/analyze-images', verifyToken, aiController.analyzeImages);
router.post('/chat', verifyTokenOptional, aiController.chat);
router.post('/contact-message', verifyToken, aiController.suggestContactMessage);
router.post('/summarize-notification', verifyToken, aiController.summarizeNotification);

module.exports = router;
