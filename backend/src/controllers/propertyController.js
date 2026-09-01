
const { query } = require('../models/database');
const { ValidationError, AuthorizationError, NotFoundError } = require('../utils/errorHandler');
const { ensurePropertiesSchema } = require('../utils/ensurePropertiesSchema');
const { geocodeTunisia } = require('../services/geoPlaces');

const allowedPropertyTypes = ['apartment', 'house', 'villa', 'land', 'office', 'commercial'];
const allowedListingTypes = ['sale', 'rent'];
const allowedConditions = ['new', 'good', 'renovate'];
const listingStatuses = ['active', 'sold', 'pending', 'rented'];

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatImageUrl = (url, req) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const cleanPath = String(url).replace(/^\/+/, '');
  return `${req.protocol}://${req.get('host')}/${cleanPath}`;
};

const normalizeProperty = (property, req) => {
  const images = parseJsonArray(property.Images).map((image) => formatImageUrl(image, req));

  return {
    id: property.PropertyId,
    propertyId: property.PropertyId,
    agentId: property.AgentId,
    ownerId: property.AgentId,
    propertyType: property.PropertyType,
    listingType: property.ListingType || 'sale',
    condition: property.Condition || null,
    title: property.Title,
    description: property.Description,
    price: property.Price !== null && property.Price !== undefined ? Number(property.Price) : null,
    currency: property.Currency || 'TND',
    rentPeriod: property.RentPeriod || (property.ListingType === 'rent' ? 'month' : null),
    depositAmount:
      property.DepositAmount !== null && property.DepositAmount !== undefined
        ? Number(property.DepositAmount)
        : null,
    minLeaseMonths: property.MinLeaseMonths || null,
    location: property.City || property.Address,
    address: property.Address,
    city: property.City,
    state: property.State,
    country: property.Country,
    bedrooms: property.Bedrooms,
    bathrooms: property.Bathrooms,
    squareFeet: property.SquareFeet !== null && property.SquareFeet !== undefined ? Number(property.SquareFeet) : null,
    lotSize: property.LotSize !== null && property.LotSize !== undefined ? Number(property.LotSize) : null,
    yearBuilt: property.YearBuilt,
    latitude: property.Latitude !== null && property.Latitude !== undefined ? Number(property.Latitude) : null,
    longitude: property.Longitude !== null && property.Longitude !== undefined ? Number(property.Longitude) : null,
    amenities: parseJsonArray(property.Amenities),
    images,
    featuredImage: formatImageUrl(property.FeaturedImage, req) || images[0] || null,
    videoUrl: formatImageUrl(property.VideoUrl, req) || property.VideoUrl || null,
    viewCount: property.ViewCount || 0,
    favoriteCount: property.FavoriteCount || 0,
    inquiryCount: property.InquiryCount || 0,
    averageRating:
      property.AverageRating !== null && property.AverageRating !== undefined
        ? Number(property.AverageRating)
        : null,
    reviewCount: property.ReviewCount || 0,
    isAvailable: property.IsAvailable === undefined || property.IsAvailable === null ? true : !!property.IsAvailable,
    availableFrom: property.AvailableFrom || null,
    status: property.Status,
    createdAt: property.CreatedAt,
    owner: {
      id: property.AgentId,
      firstName: property.AgentFirstName,
      lastName: property.AgentLastName,
      name: `${property.AgentFirstName || ''} ${property.AgentLastName || ''}`.trim(),
      email: property.AgentEmail,
      phone: property.AgentPhone,
    },
    relevanceScore: property.RelevanceScore,
  };
};

const buildPropertyFilters = (params) => {
  const where = ['p.DeletedAt IS NULL', 'p.IsActive = 1'];
  const queryParams = {};

  if (params.agentId) {
    where.push('p.AgentId = @agentId');
    queryParams.agentId = parsePositiveInt(params.agentId, null);
  }

  if (params.minPrice) {
    where.push('p.Price >= @minPrice');
    queryParams.minPrice = parseNumber(params.minPrice);
  }

  if (params.maxPrice) {
    where.push('p.Price <= @maxPrice');
    queryParams.maxPrice = parseNumber(params.maxPrice);
  }

  if (params.location) {
    where.push('(p.City LIKE @location OR p.Address LIKE @location OR p.State LIKE @location OR p.Country LIKE @location)');
    queryParams.location = `%${params.location}%`;
  }

  if (params.state) {
    where.push('p.State LIKE @state');
    queryParams.state = `%${params.state}%`;
  }

  if (params.minArea) {
    where.push('p.SquareFeet >= @minArea');
    queryParams.minArea = parseNumber(params.minArea);
  }

  if (params.maxArea) {
    where.push('p.SquareFeet <= @maxArea');
    queryParams.maxArea = parseNumber(params.maxArea);
  }

  if (params.minLotSize) {
    where.push('p.LotSize >= @minLotSize');
    queryParams.minLotSize = parseNumber(params.minLotSize);
  }

  if (params.maxLotSize) {
    where.push('p.LotSize <= @maxLotSize');
    queryParams.maxLotSize = parseNumber(params.maxLotSize);
  }

  if (params.amenity) {
    where.push('p.Amenities LIKE @amenity');
    queryParams.amenity = `%${params.amenity}%`;
  }

  if (params.bedrooms) {
    where.push('p.Bedrooms >= @bedrooms');
    queryParams.bedrooms = parsePositiveInt(params.bedrooms, null);
  }

  if (params.bathrooms) {
    where.push('p.Bathrooms >= @bathrooms');
    queryParams.bathrooms = parsePositiveInt(params.bathrooms, null);
  }

  if (params.propertyType) {
    where.push('p.PropertyType = @propertyType');
    queryParams.propertyType = params.propertyType;
  }

  if (params.listingType && allowedListingTypes.includes(params.listingType)) {
    where.push('p.ListingType = @listingType');
    queryParams.listingType = params.listingType;
  }

  if (params.q) {
    where.push(`(
      p.Title LIKE @searchTerm OR p.Description LIKE @searchTerm OR
      p.City LIKE @searchTerm OR p.Address LIKE @searchTerm OR
      p.State LIKE @searchTerm OR p.Amenities LIKE @searchTerm
    )`);
    queryParams.searchTerm = `%${params.q}%`;
  }

  return { where: where.join(' AND '), queryParams };
};

const baseSelect = `
  SELECT p.PropertyId, p.AgentId, p.PropertyType, p.ListingType, p.Condition, p.Title, p.Description, p.Price,
         p.Currency, p.RentPeriod, p.DepositAmount, p.MinLeaseMonths,
         p.Address, p.City, p.State, p.Country, p.Bedrooms, p.Bathrooms,
         p.SquareFeet, p.LotSize, p.YearBuilt, p.Latitude, p.Longitude,
         p.Amenities, p.FeaturedImage, p.Images, p.VideoUrl, p.ViewCount, p.FavoriteCount,
         p.InquiryCount, p.AverageRating, p.ReviewCount, p.IsAvailable, p.AvailableFrom,
         p.Status, p.CreatedAt,
         u.FirstName AS AgentFirstName, u.LastName AS AgentLastName,
         u.Email AS AgentEmail, u.PhoneNumber AS AgentPhone
  FROM [dbo].[Properties] p
  INNER JOIN [dbo].[Users] u ON u.UserId = p.AgentId
`;

exports.getMyProperties = async (req, res, next) => {
  try {
    await ensurePropertiesSchema();
    assertAuthenticated(req);
    req.query.agentId = String(getUserId(req));
    return exports.getAllProperties(req, res, next);
  } catch (error) {
    next(error);
  }
};

exports.getAllProperties = async (req, res, next) => {
  try {
    await ensurePropertiesSchema();
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 100);
    const offset = (page - 1) * limit;
    const { where, queryParams } = buildPropertyFilters(req.query);

    console.log('[Properties:GetAll] Request received', { page, limit, filters: req.query });

    const countResult = await query(
      `SELECT COUNT(*) AS Total FROM [dbo].[Properties] p WHERE ${where}`,
      queryParams
    );

    const result = await query(
      `${baseSelect}
       WHERE ${where}
       ORDER BY p.CreatedAt DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...queryParams, offset, limit }
    );

    const total = countResult.recordset[0]?.Total || 0;
    res.status(200).json({
      success: true,
      data: result.recordset.map((property) => normalizeProperty(property, req)),
      properties: result.recordset.map((property) => normalizeProperty(property, req)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error('[Properties:GetAll] Error', error);
    next(error);
  }
};

exports.getPropertyById = async (req, res, next) => {
  try {
    await ensurePropertiesSchema();
    const rawId = req.params.propertyId || req.params.id;
    if (rawId === 'search') {
      return exports.searchProperties(req, res, next);
    }

    const propertyId = parsePositiveInt(rawId, null);
    if (!propertyId) throw new ValidationError('Validation failed', { propertyId: 'Valid propertyId is required' });

    console.log('[Properties:GetById] Request received', { propertyId });
    try {
      await query(
        `INSERT INTO [dbo].[PropertyViews] (PropertyId, UserId, Source)
         VALUES (@propertyId, @userId, @source)`,
        { propertyId, userId: req.user?.userId || req.user?.id || null, source: 'details' }
      );
    } catch (viewError) {
      console.warn('[Properties:GetById] PropertyViews insert skipped', viewError.message);
    }

    const result = await query(
      `${baseSelect}
       WHERE p.PropertyId = @propertyId AND p.DeletedAt IS NULL AND p.IsActive = 1`,
      { propertyId }
    );

    if (result.recordset.length === 0) throw new NotFoundError('Resource');

    res.status(200).json({
      success: true,
      property: normalizeProperty(result.recordset[0], req),
    });
  } catch (error) {
    console.error('[Properties:GetById] Error', error);
    next(error);
  }
};

const validatePropertyPayload = (body, isCreate = true) => {
  const details = {};
  const requiredFields = ['title', 'price', 'location'];

  if (isCreate) {
    requiredFields.forEach((field) => {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        details[field] = `${field} is required`;
      }
    });
  }

  if (body.price !== undefined && parseNumber(body.price) <= 0) {
    details.price = 'Price must be greater than 0';
  }

  if (body.propertyType && !allowedPropertyTypes.includes(body.propertyType)) {
    details.propertyType = 'Invalid property type';
  }

  if (Object.keys(details).length > 0) throw new ValidationError('Validation failed', details);
};

const assertAuthenticated = (req) => {
  if (!req.user?.userId && !req.user?.id) {
    throw new AuthorizationError("You don't have permission");
  }
};

const getUserId = (req) => req.user.userId || req.user.id;

const getOwnedProperty = async (propertyId, agentId) => {
  const result = await query(
    'SELECT PropertyId, AgentId FROM [dbo].[Properties] WHERE PropertyId = @propertyId AND DeletedAt IS NULL',
    { propertyId }
  );

  if (result.recordset.length === 0) throw new NotFoundError('Resource');
  if (Number(result.recordset[0].AgentId) !== Number(agentId)) {
    throw new AuthorizationError("You don't have permission");
  }
};

exports.createProperty = async (req, res, next) => {
  try {
    await ensurePropertiesSchema();
    assertAuthenticated(req);
    validatePropertyPayload(req.body, true);

    const agentId = getUserId(req);
    const images = JSON.stringify(req.body.images || []);
    const amenities = JSON.stringify(req.body.amenities || []);
    const city = req.body.city || req.body.location;
    const address = req.body.address || req.body.location;
    const listingType = allowedListingTypes.includes(req.body.listingType)
      ? req.body.listingType
      : 'sale';
    const condition = allowedConditions.includes(req.body.condition)
      ? req.body.condition
      : null;
    // Status must stay lifecycle values only
    let status = req.body.status;
    if (!listingStatuses.includes(status)) status = 'active';

    let latitude = parseNumber(req.body.latitude);
    let longitude = parseNumber(req.body.longitude);
    if (latitude == null || longitude == null) {
      const geo = await geocodeTunisia({
        address,
        city,
        state: req.body.state || req.body.governorate,
      });
      if (geo) {
        latitude = geo.latitude;
        longitude = geo.longitude;
      }
    }

    console.log('[Properties:Create] Request received', { agentId, title: req.body.title, listingType });
    const result = await query(
      `INSERT INTO [dbo].[Properties]
       (AgentId, PropertyType, ListingType, Condition, Title, Description, Price, Currency,
        RentPeriod, DepositAmount, MinLeaseMonths,
        Address, City, State,
        Bedrooms, Bathrooms, SquareFeet, LotSize, YearBuilt, Latitude, Longitude,
        Amenities, Images, FeaturedImage, VideoUrl, Status, IsActive, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.*
       VALUES (@agentId, @propertyType, @listingType, @condition, @title, @description, @price, @currency,
               @rentPeriod, @depositAmount, @minLeaseMonths,
               @address, @city, @state,
               @bedrooms, @bathrooms, @squareFeet, @lotSize, @yearBuilt, @latitude, @longitude,
               @amenities, @images, @featuredImage, @videoUrl, @status, 1, GETUTCDATE(), GETUTCDATE())`,
      {
        agentId,
        propertyType: req.body.propertyType || 'apartment',
        listingType,
        condition,
        title: req.body.title,
        description: req.body.description || null,
        price: parseNumber(req.body.price),
        currency: req.body.currency || 'TND',
        rentPeriod: listingType === 'rent' ? (req.body.rentPeriod || 'day') : null,
        depositAmount: listingType === 'rent' ? parseNumber(req.body.depositAmount) : null,
        minLeaseMonths: listingType === 'rent' ? parsePositiveInt(req.body.minLeaseMonths, null) : null,
        address,
        city,
        state: req.body.state || req.body.governorate || null,
        bedrooms: req.body.bedrooms || null,
        bathrooms: req.body.bathrooms || null,
        squareFeet: parseNumber(req.body.squareFeet ?? req.body.area),
        lotSize: parseNumber(req.body.lotSize),
        yearBuilt: parsePositiveInt(req.body.yearBuilt, null),
        latitude,
        longitude,
        amenities,
        images,
        featuredImage: req.body.featuredImage || req.body.images?.[0] || null,
        videoUrl: req.body.videoUrl || null,
        status,
      }
    );

    const propertyId = result.recordset[0].PropertyId;

    // Optional availability ranges for rent
    if (listingType === 'rent' && Array.isArray(req.body.availabilityRanges)) {
      for (const range of req.body.availabilityRanges) {
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
    }

    const created = await query(`${baseSelect} WHERE p.PropertyId = @propertyId`, {
      propertyId,
    });

    res.status(200).json({ success: true, property: normalizeProperty(created.recordset[0], req) });
  } catch (error) {
    console.error('[Properties:Create] Error', error);
    next(error);
  }
};

exports.updateProperty = async (req, res, next) => {
  try {
    await ensurePropertiesSchema();
    assertAuthenticated(req);
    validatePropertyPayload(req.body, false);

    const propertyId = parsePositiveInt(req.params.propertyId || req.params.id, null);
    const agentId = getUserId(req);
    if (!propertyId) throw new ValidationError('Validation failed', { propertyId: 'Valid propertyId is required' });
    await getOwnedProperty(propertyId, agentId);

    const fieldMap = {
      title: 'Title',
      description: 'Description',
      price: 'Price',
      propertyType: 'PropertyType',
      listingType: 'ListingType',
      condition: 'Condition',
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      squareFeet: 'SquareFeet',
      lotSize: 'LotSize',
      yearBuilt: 'YearBuilt',
      latitude: 'Latitude',
      longitude: 'Longitude',
      rentPeriod: 'RentPeriod',
      depositAmount: 'DepositAmount',
      minLeaseMonths: 'MinLeaseMonths',
      currency: 'Currency',
    };
    const updates = [];
    const params = { propertyId };

    Object.entries(fieldMap).forEach(([inputField, dbField]) => {
      if (req.body[inputField] !== undefined) {
        updates.push(`${dbField} = @${inputField}`);
        const numericFields = [
          'price',
          'squareFeet',
          'lotSize',
          'latitude',
          'longitude',
          'depositAmount',
          'minLeaseMonths',
        ];
        let value = req.body[inputField];
        if (inputField === 'listingType' && !allowedListingTypes.includes(value)) value = 'sale';
        if (inputField === 'condition' && value && !allowedConditions.includes(value)) value = null;
        if (inputField === 'status' && !listingStatuses.includes(value)) value = 'active';
        params[inputField] = numericFields.includes(inputField) ? parseNumber(value) : value;
      }
    });

    // Explicit status only if valid lifecycle status
    if (req.body.status !== undefined && listingStatuses.includes(req.body.status)) {
      updates.push('Status = @status');
      params.status = req.body.status;
    }

    if (req.body.area !== undefined) {
      updates.push('SquareFeet = @squareFeet');
      params.squareFeet = parseNumber(req.body.area);
    }
    if (req.body.state !== undefined || req.body.governorate !== undefined) {
      updates.push('State = @state');
      params.state = req.body.state || req.body.governorate;
    }

    if (req.body.location !== undefined || req.body.address !== undefined) {
      updates.push('Address = @address');
      params.address = req.body.address || req.body.location;
    }
    if (req.body.location !== undefined || req.body.city !== undefined) {
      updates.push('City = @city');
      params.city = req.body.city || req.body.location;
    }
    if (req.body.amenities !== undefined) {
      updates.push('Amenities = @amenities');
      params.amenities = JSON.stringify(req.body.amenities || []);
    }
    if (req.body.images !== undefined) {
      updates.push('Images = @images');
      params.images = JSON.stringify(req.body.images || []);
    }
    if (req.body.featuredImage !== undefined) {
      updates.push('FeaturedImage = @featuredImage');
      params.featuredImage = req.body.featuredImage;
    }
    if (req.body.videoUrl !== undefined) {
      updates.push('VideoUrl = @videoUrl');
      params.videoUrl = req.body.videoUrl || null;
    }

    // Geocode if still missing coords and address changed
    if (
      (req.body.city !== undefined || req.body.address !== undefined || req.body.location !== undefined) &&
      req.body.latitude === undefined &&
      req.body.longitude === undefined
    ) {
      const geo = await geocodeTunisia({
        address: params.address || req.body.address,
        city: params.city || req.body.city,
        state: params.state || req.body.state,
      });
      if (geo) {
        updates.push('Latitude = @latitude', 'Longitude = @longitude');
        params.latitude = geo.latitude;
        params.longitude = geo.longitude;
      }
    }

    if (updates.length === 0 && !Array.isArray(req.body.availabilityRanges)) {
      throw new ValidationError('Validation failed', { fields: 'No valid fields to update' });
    }

    console.log('[Properties:Update] Request received', { propertyId, agentId });
    if (updates.length > 0) {
      await query(
        `UPDATE [dbo].[Properties] SET ${updates.join(', ')}, UpdatedAt = GETUTCDATE()
         WHERE PropertyId = @propertyId`,
        params
      );
    }

    if (Array.isArray(req.body.availabilityRanges)) {
      await query(`DELETE FROM [dbo].[PropertyAvailability] WHERE PropertyId = @propertyId`, {
        propertyId,
      });
      for (const range of req.body.availabilityRanges) {
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
    }

    const updated = await query(`${baseSelect} WHERE p.PropertyId = @propertyId`, { propertyId });
    res.status(200).json({ success: true, property: normalizeProperty(updated.recordset[0], req) });
  } catch (error) {
    console.error('[Properties:Update] Error', error);
    next(error);
  }
};

exports.deleteProperty = async (req, res, next) => {
  try {
    assertAuthenticated(req);
    const propertyId = parsePositiveInt(req.params.propertyId || req.params.id, null);
    const agentId = getUserId(req);
    if (!propertyId) throw new ValidationError('Validation failed', { propertyId: 'Valid propertyId is required' });
    await getOwnedProperty(propertyId, agentId);

    console.log('[Properties:Delete] Request received', { propertyId, agentId });
    // Soft-delete so Favorites/Inquiries FKs never block removal.
    await query(
      `UPDATE [dbo].[Properties]
       SET DeletedAt = GETUTCDATE(), IsActive = 0, UpdatedAt = GETUTCDATE()
       WHERE PropertyId = @propertyId AND DeletedAt IS NULL`,
      { propertyId }
    );

    res.status(200).json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('[Properties:Delete] Error', error);
    next(error);
  }
};

exports.searchProperties = async (req, res, next) => {
  try {
    req.query.q = req.query.q || req.query.search || '';
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 100);
    const offset = (page - 1) * limit;
    const { where, queryParams } = buildPropertyFilters(req.query);

    console.log('[Properties:Search] Request received', req.query);
    const result = await query(
      `${baseSelect.replace(
        'FROM [dbo].[Properties] p',
        `,(
              CASE
                WHEN @searchTerm IS NULL THEN 0
                WHEN p.Title LIKE @searchTerm THEN 2
                WHEN p.Description LIKE @searchTerm THEN 1
                ELSE 0
              END
            ) AS RelevanceScore
       FROM [dbo].[Properties] p`,
      )}
       WHERE ${where}
       ORDER BY RelevanceScore DESC, p.CreatedAt DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...queryParams, searchTerm: queryParams.searchTerm || null, offset, limit }
    );

    res.status(200).json({
      success: true,
      data: result.recordset.map((property) => normalizeProperty(property, req)),
      properties: result.recordset.map((property) => normalizeProperty(property, req)),
    });
  } catch (error) {
    console.error('[Properties:Search] Error', error);
    next(error);
  }
};

exports.normalizePropertyRow = normalizeProperty;
