const { query } = require('../models/database');
const { ValidationError, NotFoundError } = require('../utils/errorHandler');
const propertyController = require('./propertyController');
const { ensureFavoritesSchema } = require('../utils/ensureFavoritesSchema');

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getUserId = (req) => req.user?.userId || req.user?.id;

const propertySelect = `
  SELECT p.PropertyId, p.AgentId, p.PropertyType, p.ListingType, p.Condition, p.Title, p.Description, p.Price,
         p.Currency, p.RentPeriod, p.DepositAmount, p.MinLeaseMonths,
         p.Address, p.City, p.State, p.Country, p.Bedrooms, p.Bathrooms,
         p.SquareFeet, p.LotSize, p.YearBuilt, p.Latitude, p.Longitude,
         p.Amenities, p.FeaturedImage, p.Images, p.ViewCount, p.FavoriteCount,
         p.InquiryCount, p.AverageRating, p.ReviewCount, p.IsAvailable, p.AvailableFrom,
         p.Status, p.CreatedAt,
         u.FirstName AS AgentFirstName, u.LastName AS AgentLastName,
         u.Email AS AgentEmail, u.PhoneNumber AS AgentPhone
  FROM [dbo].[Favorites] f
  INNER JOIN [dbo].[Properties] p ON p.PropertyId = f.PropertyId
  INNER JOIN [dbo].[Users] u ON u.UserId = p.AgentId
`;

exports.getFavoriteIds = async (req, res, next) => {
  try {
    await ensureFavoritesSchema();
    const userId = getUserId(req);
    const result = await query(
      `SELECT f.PropertyId
       FROM [dbo].[Favorites] f
       INNER JOIN [dbo].[Properties] p ON p.PropertyId = f.PropertyId
       WHERE f.UserId = @userId AND p.DeletedAt IS NULL AND p.IsActive = 1`,
      { userId }
    );
    const ids = result.recordset.map((row) => row.PropertyId);
    res.status(200).json({ success: true, ids });
  } catch (error) {
    next(error);
  }
};

exports.getMyFavorites = async (req, res, next) => {
  try {
    await ensureFavoritesSchema();
    const userId = getUserId(req);
    const result = await query(
      `${propertySelect}
       WHERE f.UserId = @userId AND p.DeletedAt IS NULL AND p.IsActive = 1
       ORDER BY f.CreatedAt DESC`,
      { userId }
    );
    const properties = result.recordset.map((row) =>
      propertyController.normalizePropertyRow(row, req)
    );
    res.status(200).json({ success: true, properties });
  } catch (error) {
    next(error);
  }
};

exports.addFavorite = async (req, res, next) => {
  try {
    await ensureFavoritesSchema();
    const userId = getUserId(req);
    const propertyId = parsePositiveInt(req.params.propertyId, null);
    if (!propertyId) {
      throw new ValidationError('Validation failed', { propertyId: 'Invalid property id' });
    }

    const property = await query(
      `SELECT PropertyId FROM [dbo].[Properties]
       WHERE PropertyId = @propertyId AND DeletedAt IS NULL AND IsActive = 1`,
      { propertyId }
    );
    if (property.recordset.length === 0) {
      throw new NotFoundError('Property');
    }

    await query(
      `IF NOT EXISTS (SELECT 1 FROM [dbo].[Favorites] WHERE UserId = @userId AND PropertyId = @propertyId)
       INSERT INTO [dbo].[Favorites] (UserId, PropertyId) VALUES (@userId, @propertyId)`,
      { userId, propertyId }
    );

    res.status(201).json({ success: true, propertyId });
  } catch (error) {
    next(error);
  }
};

exports.removeFavorite = async (req, res, next) => {
  try {
    await ensureFavoritesSchema();
    const userId = getUserId(req);
    const propertyId = parsePositiveInt(req.params.propertyId, null);
    if (!propertyId) {
      throw new ValidationError('Validation failed', { propertyId: 'Invalid property id' });
    }

    await query(
      `DELETE FROM [dbo].[Favorites] WHERE UserId = @userId AND PropertyId = @propertyId`,
      { userId, propertyId }
    );

    res.status(200).json({ success: true, propertyId });
  } catch (error) {
    next(error);
  }
};
