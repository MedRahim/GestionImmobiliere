const { query } = require('../models/database');
const { ValidationError, AuthorizationError, NotFoundError } = require('../utils/errorHandler');
const { ensurePropertiesSchema } = require('../utils/ensurePropertiesSchema');
const { fetchNearbyPlaces } = require('../services/geoPlaces');

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getUserId = (req) => req.user?.userId || req.user?.id;

const assertOwned = async (propertyId, agentId) => {
  const result = await query(
    `SELECT PropertyId, AgentId, Latitude, Longitude, City, Address, State
     FROM [dbo].[Properties]
     WHERE PropertyId = @propertyId AND DeletedAt IS NULL`,
    { propertyId },
  );
  if (!result.recordset.length) throw new NotFoundError('Property');
  const row = result.recordset[0];
  if (Number(row.AgentId) !== Number(agentId)) {
    throw new AuthorizationError("You don't have permission");
  }
  return row;
};

const refreshReviewAggregates = async (propertyId) => {
  await query(
    `UPDATE [dbo].[Properties]
     SET AverageRating = (
           SELECT AVG(CAST(Rating AS FLOAT)) FROM [dbo].[PropertyReviews] WHERE PropertyId = @propertyId
         ),
         ReviewCount = (
           SELECT COUNT(*) FROM [dbo].[PropertyReviews] WHERE PropertyId = @propertyId
         ),
         UpdatedAt = GETUTCDATE()
     WHERE PropertyId = @propertyId`,
    { propertyId },
  );
};

exports.getNearby = async (req, res, next) => {
  try {
    await ensurePropertiesSchema();
    const propertyId = parsePositiveInt(req.params.propertyId, null);
    if (!propertyId) throw new ValidationError('Validation failed', { propertyId: 'Required' });

    const prop = await query(
      `SELECT PropertyId, Latitude, Longitude, City, Address
       FROM [dbo].[Properties]
       WHERE PropertyId = @propertyId AND DeletedAt IS NULL AND IsActive = 1`,
      { propertyId },
    );
    if (!prop.recordset.length) throw new NotFoundError('Property');
    const row = prop.recordset[0];
    let lat = row.Latitude != null ? Number(row.Latitude) : null;
    let lng = row.Longitude != null ? Number(row.Longitude) : null;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.json({
        success: true,
        places: [],
        message: 'Aucune coordonnée précise pour ce bien',
      });
    }

    const places = await fetchNearbyPlaces(lat, lng);
    res.json({ success: true, latitude: lat, longitude: lng, places });
  } catch (error) {
    next(error);
  }
};

exports.getAvailability = async (req, res, next) => {
  try {
    await ensurePropertiesSchema();
    const propertyId = parsePositiveInt(req.params.propertyId, null);
    if (!propertyId) throw new ValidationError('Validation failed', { propertyId: 'Required' });

    const result = await query(
      `SELECT AvailabilityId, PropertyId, StartDate, EndDate, Status, Note
       FROM [dbo].[PropertyAvailability]
       WHERE PropertyId = @propertyId
       ORDER BY StartDate ASC`,
      { propertyId },
    );

    const ranges = result.recordset.map((r) => ({
      id: r.AvailabilityId,
      propertyId: r.PropertyId,
      startDate:
        r.StartDate instanceof Date
          ? r.StartDate.toISOString().slice(0, 10)
          : String(r.StartDate).slice(0, 10),
      endDate:
        r.EndDate instanceof Date
          ? r.EndDate.toISOString().slice(0, 10)
          : String(r.EndDate).slice(0, 10),
      status: r.Status,
      note: r.Note,
    }));

    res.json({ success: true, ranges });
  } catch (error) {
    next(error);
  }
};

exports.setAvailability = async (req, res, next) => {
  try {
    await ensurePropertiesSchema();
    const propertyId = parsePositiveInt(req.params.propertyId, null);
    const agentId = getUserId(req);
    if (!propertyId) throw new ValidationError('Validation failed', { propertyId: 'Required' });
    await assertOwned(propertyId, agentId);

    const ranges = Array.isArray(req.body?.ranges) ? req.body.ranges : [];
    await query(`DELETE FROM [dbo].[PropertyAvailability] WHERE PropertyId = @propertyId`, {
      propertyId,
    });

    for (const range of ranges) {
      const startDate = range.startDate || range.start;
      const endDate = range.endDate || range.end;
      if (!startDate || !endDate) continue;
      await query(
        `INSERT INTO [dbo].[PropertyAvailability]
         (PropertyId, StartDate, EndDate, Status, Note)
         VALUES (@propertyId, @startDate, @endDate, @status, @note)`,
        {
          propertyId,
          startDate,
          endDate,
          status: ['available', 'blocked', 'booked'].includes(range.status)
            ? range.status
            : 'available',
          note: range.note || null,
        },
      );
    }

    const result = await query(
      `SELECT AvailabilityId, PropertyId, StartDate, EndDate, Status, Note
       FROM [dbo].[PropertyAvailability]
       WHERE PropertyId = @propertyId
       ORDER BY StartDate ASC`,
      { propertyId },
    );

    res.json({
      success: true,
      ranges: result.recordset.map((r) => ({
        id: r.AvailabilityId,
        propertyId: r.PropertyId,
        startDate: r.StartDate,
        endDate: r.EndDate,
        status: r.Status,
        note: r.Note,
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.getReviews = async (req, res, next) => {
  try {
    await ensurePropertiesSchema();
    const propertyId = parsePositiveInt(req.params.propertyId, null);
    if (!propertyId) throw new ValidationError('Validation failed', { propertyId: 'Required' });

    const agg = await query(
      `SELECT AverageRating, ReviewCount FROM [dbo].[Properties] WHERE PropertyId = @propertyId`,
      { propertyId },
    );
    if (!agg.recordset.length) throw new NotFoundError('Property');

    const list = await query(
      `SELECT TOP 50 r.ReviewId, r.PropertyId, r.UserId, r.Rating, r.Comment, r.CreatedAt,
              u.FirstName, u.LastName
       FROM [dbo].[PropertyReviews] r
       INNER JOIN [dbo].[Users] u ON u.UserId = r.UserId
       WHERE r.PropertyId = @propertyId
       ORDER BY r.CreatedAt DESC`,
      { propertyId },
    );

    const userId = getUserId(req);
    const mine = userId
      ? list.recordset.find((r) => Number(r.UserId) === Number(userId))
      : null;

    res.json({
      success: true,
      averageRating: agg.recordset[0].AverageRating
        ? Number(agg.recordset[0].AverageRating)
        : null,
      reviewCount: agg.recordset[0].ReviewCount || 0,
      myReview: mine
        ? {
            id: mine.ReviewId,
            rating: mine.Rating,
            comment: mine.Comment,
            createdAt: mine.CreatedAt,
          }
        : null,
      reviews: list.recordset.map((r) => ({
        id: r.ReviewId,
        propertyId: r.PropertyId,
        userId: r.UserId,
        rating: r.Rating,
        comment: r.Comment,
        createdAt: r.CreatedAt,
        authorName: `${r.FirstName || ''} ${r.LastName || ''}`.trim() || 'Utilisateur',
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.upsertReview = async (req, res, next) => {
  try {
    await ensurePropertiesSchema();
    const propertyId = parsePositiveInt(req.params.propertyId, null);
    const userId = getUserId(req);
    if (!userId) throw new AuthorizationError('Authentication required');
    if (!propertyId) throw new ValidationError('Validation failed', { propertyId: 'Required' });

    const rating = parsePositiveInt(req.body?.rating, null);
    if (!rating || rating < 1 || rating > 5) {
      throw new ValidationError('Validation failed', { rating: 'Rating 1-5 required' });
    }
    const comment = (req.body?.comment || '').trim() || null;

    const exists = await query(
      `SELECT PropertyId FROM [dbo].[Properties]
       WHERE PropertyId = @propertyId AND DeletedAt IS NULL AND IsActive = 1`,
      { propertyId },
    );
    if (!exists.recordset.length) throw new NotFoundError('Property');

    await query(
      `IF EXISTS (SELECT 1 FROM [dbo].[PropertyReviews] WHERE PropertyId = @propertyId AND UserId = @userId)
         UPDATE [dbo].[PropertyReviews]
         SET Rating = @rating, Comment = @comment, UpdatedAt = GETUTCDATE()
         WHERE PropertyId = @propertyId AND UserId = @userId
       ELSE
         INSERT INTO [dbo].[PropertyReviews] (PropertyId, UserId, Rating, Comment)
         VALUES (@propertyId, @userId, @rating, @comment)`,
      { propertyId, userId, rating, comment },
    );

    await refreshReviewAggregates(propertyId);
    return exports.getReviews(req, res, next);
  } catch (error) {
    next(error);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    await ensurePropertiesSchema();
    const propertyId = parsePositiveInt(req.params.propertyId, null);
    const userId = getUserId(req);
    if (!userId) throw new AuthorizationError('Authentication required');
    if (!propertyId) throw new ValidationError('Validation failed', { propertyId: 'Required' });

    await query(
      `DELETE FROM [dbo].[PropertyReviews]
       WHERE PropertyId = @propertyId AND UserId = @userId`,
      { propertyId, userId },
    );
    await refreshReviewAggregates(propertyId);
    return exports.getReviews(req, res, next);
  } catch (error) {
    next(error);
  }
};
