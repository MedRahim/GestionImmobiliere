const express = require('express');
const favoritesController = require('../controllers/favoritesController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/ids', verifyToken, favoritesController.getFavoriteIds);
router.get('/', verifyToken, favoritesController.getMyFavorites);
router.post('/:propertyId', verifyToken, favoritesController.addFavorite);
router.delete('/:propertyId', verifyToken, favoritesController.removeFavorite);

module.exports = router;
