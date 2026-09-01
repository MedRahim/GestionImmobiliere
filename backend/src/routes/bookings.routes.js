const express = require('express');
const bookingsController = require('../controllers/bookingsController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/stripe-status', bookingsController.stripeStatus);
router.get('/stripe-success', bookingsController.stripeSuccessPage);
router.get('/stripe-cancel', bookingsController.stripeCancelPage);

router.post('/', verifyToken, bookingsController.createBooking);
router.post('/confirm-stripe', verifyToken, bookingsController.confirmStripePayment);
router.get('/mine', verifyToken, bookingsController.getMyBookings);
router.get('/property/:propertyId', verifyToken, bookingsController.getPropertyBookings);

module.exports = router;
