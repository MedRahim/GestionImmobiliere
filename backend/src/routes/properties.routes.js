const express = require('express');
const propertyController = require('../controllers/propertyController');
const { verifyToken, verifyTokenOptional } = require('../middleware/auth');

const router = express.Router();

router.get('/mine', verifyToken, propertyController.getMyProperties);
router.get('/', propertyController.getAllProperties);
router.post('/', verifyToken, propertyController.createProperty);
router.get('/:propertyId', verifyTokenOptional, propertyController.getPropertyById);
router.put('/:propertyId', verifyToken, propertyController.updateProperty);
router.delete('/:propertyId', verifyToken, propertyController.deleteProperty);

module.exports = router;
