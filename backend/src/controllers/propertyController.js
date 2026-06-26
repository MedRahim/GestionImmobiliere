// =====================================================
// Property Controller
// =====================================================

const { query } = require('../models/database');
const { ValidationError, AuthorizationError, NotFoundError } = require('../utils/errorHandler');

const allowedPropertyTypes = ['apartment', 'house', 'villa', 'land', 'office', 'commercial'];

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
    title: property.Title,
    description: property.Description,
    price: property.Price !== null && property.Price !== undefined ? Number(property.Price) : null,
    currency: property.Currency,
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
    viewCount: property.ViewCount || 0,
    favoriteCount: property.FavoriteCount || 0,
    inquiryCount: property.InquiryCount || 0,
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
  SELECT p.PropertyId, p.AgentId, p.PropertyType, p.Title, p.Description, p.Price,
         p.Currency, p.Address, p.City, p.State, p.Country, p.Bedrooms, p.Bathrooms,
         p.SquareFeet, p.LotSize, p.YearBuilt, p.Latitude, p.Longitude,
         p.Amenities, p.FeaturedImage, p.Images, p.ViewCount, p.FavoriteCount,
         p.InquiryCount, p.Status, p.CreatedAt,
         u.FirstName AS AgentFirstName, u.LastName AS AgentLastName,
         u.Email AS AgentEmail, u.PhoneNumber AS AgentPhone
  FROM [dbo].[Properties] p
  INNER JOIN [dbo].[Users] u ON u.UserId = p.AgentId
`;

exports.getMyProperties = async (req, res, next) => {
  try {
    assertAuthenticated(req);
    req.query.agentId = String(getUserId(req));
    return exports.getAllProperties(req, res, next);
  } catch (error) {
    next(error);
  }
};

exports.getAllProperties = async (req, res, next) => {
  try {
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
  if (result.recordset[0].AgentId !== agentId) throw new AuthorizationError("You don't have permission");
};

exports.createProperty = async (req, res, next) => {
  try {
    assertAuthenticated(req);
    validatePropertyPayload(req.body, true);

    const agentId = getUserId(req);
    const images = JSON.stringify(req.body.images || []);
    const amenities = JSON.stringify(req.body.amenities || []);
    const city = req.body.city || req.body.location;
    const address = req.body.address || req.body.location;

    console.log('[Properties:Create] Request received', { agentId, title: req.body.title });
    const result = await query(
      `INSERT INTO [dbo].[Properties]
       (AgentId, PropertyType, Title, Description, Price, Address, City, State,
        Bedrooms, Bathrooms, SquareFeet, LotSize, YearBuilt, Latitude, Longitude,
        Amenities, Images, FeaturedImage, Status, IsActive, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.*
       VALUES (@agentId, @propertyType, @title, @description, @price, @address, @city, @state,
               @bedrooms, @bathrooms, @squareFeet, @lotSize, @yearBuilt, @latitude, @longitude,
               @amenities, @images, @featuredImage, @status, 1, GETUTCDATE(), GETUTCDATE())`,
      {
        agentId,
        propertyType: req.body.propertyType || 'apartment',
        title: req.body.title,
        description: req.body.description || null,
        price: parseNumber(req.body.price),
        address,
        city,
        state: req.body.state || req.body.governorate || null,
        bedrooms: req.body.bedrooms || null,
        bathrooms: req.body.bathrooms || null,
        squareFeet: parseNumber(req.body.squareFeet ?? req.body.area),
        lotSize: parseNumber(req.body.lotSize),
        yearBuilt: parsePositiveInt(req.body.yearBuilt, null),
        latitude: parseNumber(req.body.latitude),
        longitude: parseNumber(req.body.longitude),
        amenities,
        images,
        featuredImage: req.body.featuredImage || req.body.images?.[0] || null,
        status: req.body.status || req.body.condition || 'active',
      }
    );

    const created = await query(`${baseSelect} WHERE p.PropertyId = @propertyId`, {
      propertyId: result.recordset[0].PropertyId,
    });

    res.status(200).json({ success: true, property: normalizeProperty(created.recordset[0], req) });
  } catch (error) {
    console.error('[Properties:Create] Error', error);
    next(error);
  }
};

exports.updateProperty = async (req, res, next) => {
  try {
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
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      status: 'Status',
      squareFeet: 'SquareFeet',
      lotSize: 'LotSize',
      yearBuilt: 'YearBuilt',
      latitude: 'Latitude',
      longitude: 'Longitude',
    };
    const updates = [];
    const params = { propertyId };

    Object.entries(fieldMap).forEach(([inputField, dbField]) => {
      if (req.body[inputField] !== undefined) {
        updates.push(`${dbField} = @${inputField}`);
        const numericFields = ['price', 'squareFeet', 'lotSize', 'latitude', 'longitude'];
        params[inputField] = numericFields.includes(inputField)
          ? parseNumber(req.body[inputField])
          : req.body[inputField];
      }
    });

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

    if (updates.length === 0) throw new ValidationError('Validation failed', { fields: 'No valid fields to update' });

    console.log('[Properties:Update] Request received', { propertyId, agentId });
    await query(
      `UPDATE [dbo].[Properties] SET ${updates.join(', ')}, UpdatedAt = GETUTCDATE()
       WHERE PropertyId = @propertyId`,
      params
    );

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
    await query('DELETE FROM [dbo].[Properties] WHERE PropertyId = @propertyId', { propertyId });

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
      `SELECT p.PropertyId, p.AgentId, p.PropertyType, p.Title, p.Description, p.Price,
              p.Currency, p.Address, p.City, p.State, p.Country, p.Bedrooms, p.Bathrooms,
              p.Amenities, p.FeaturedImage, p.Images, p.ViewCount, p.FavoriteCount,
              p.InquiryCount, p.Status, p.CreatedAt,
              u.FirstName AS AgentFirstName, u.LastName AS AgentLastName,
              u.Email AS AgentEmail, u.PhoneNumber AS AgentPhone,
              CASE
                WHEN @searchTerm IS NULL THEN 0
                WHEN p.Title LIKE @searchTerm THEN 2
                WHEN p.Description LIKE @searchTerm THEN 1
                ELSE 0
              END AS RelevanceScore
       FROM [dbo].[Properties] p
       INNER JOIN [dbo].[Users] u ON u.UserId = p.AgentId
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
