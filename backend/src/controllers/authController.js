// =====================================================
// Authentication Controller
// =====================================================

const bcryptjs = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { query } = require('../models/database');
const { generateTokens, verifyRefreshToken, generateAccessToken } = require('../utils/jwt');
const { ValidationError, AuthenticationError, NotFoundError } = require('../utils/errorHandler');
const { ensureGoogleAuthSchema } = require('../utils/ensureGoogleAuthSchema');

const tokenBlacklist = new Set();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeUser = (user) => ({
  id: user.UserId,
  userId: user.UserId,
  email: user.Email,
  firstName: user.FirstName,
  lastName: user.LastName,
  phone: user.PhoneNumber,
  profileImage: user.ProfileImage,
  bio: user.Bio,
  isActive: user.IsActive,
  isVerified: user.IsVerified,
  lastLogin: user.LastLogin,
  createdAt: user.CreatedAt,
  authProvider: user.AuthProvider || 'local',
  googleId: user.GoogleId || null,
});

const validateAuthInput = ({ email, password, firstName, lastName }, isRegister = false) => {
  const details = {};

  if (!email) {
    details.email = 'Email is required';
  } else if (!emailRegex.test(email)) {
    details.email = 'Enter a valid email address';
  }

  if (!password) {
    details.password = 'Password is required';
  } else if (password.length < 8) {
    details.password = 'Password must be at least 8 characters';
  }

  if (isRegister) {
    if (!firstName) details.firstName = 'First name is required';
    if (!lastName) details.lastName = 'Last name is required';
  }

  if (Object.keys(details).length > 0) {
    throw new ValidationError('Validation failed', details);
  }
};

const getBearerToken = (req) => {
  const authorization = req.headers.authorization;
  return authorization?.startsWith('Bearer ') ? authorization.substring(7) : null;
};

const ensureRefreshTokenColumns = async () => {
  await query(`
    IF COL_LENGTH('dbo.Users', 'RefreshToken') IS NULL
    BEGIN
      ALTER TABLE [dbo].[Users] ADD [RefreshToken] NVARCHAR(MAX) NULL;
    END;

    IF COL_LENGTH('dbo.Users', 'RefreshTokenExpiresAt') IS NULL
    BEGIN
      ALTER TABLE [dbo].[Users] ADD [RefreshTokenExpiresAt] DATETIME NULL;
    END;
  `);
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, profileImage } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    console.log('[Auth:Register] Request received', { email: normalizedEmail });
    validateAuthInput({ email: normalizedEmail, password, firstName, lastName }, true);

    const existingUser = await query(
      'SELECT UserId FROM [dbo].[Users] WHERE Email = @email AND DeletedAt IS NULL',
      { email: normalizedEmail }
    );

    if (existingUser.recordset.length > 0) {
      throw new ValidationError('Validation failed', { email: 'Email already registered' });
    }

    const passwordHash = await bcryptjs.hash(password, 10);
    const insertResult = await query(
      `INSERT INTO [dbo].[Users]
       (FirstName, LastName, Email, PasswordHash, PhoneNumber, ProfileImage, IsActive, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.UserId, INSERTED.Email, INSERTED.FirstName, INSERTED.LastName,
              INSERTED.PhoneNumber, INSERTED.ProfileImage, INSERTED.CreatedAt
       VALUES (@firstName, @lastName, @email, @passwordHash, @phone, @profileImage, 1, GETUTCDATE(), GETUTCDATE())`,
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone || null,
        profileImage: profileImage || null,
      }
    );

    const user = insertResult.recordset[0];
    const tokens = generateTokens({ userId: user.UserId, id: user.UserId, email: user.Email });

    await ensureRefreshTokenColumns();
    await query(
      `UPDATE [dbo].[Users]
       SET RefreshToken = @refreshToken, RefreshTokenExpiresAt = DATEADD(day, 7, GETUTCDATE())
       WHERE UserId = @userId`,
      { refreshToken: tokens.refreshToken, userId: user.UserId }
    );

    console.log('[Auth:Register] Account created', { userId: user.UserId });
    res.status(200).json({
      success: true,
      message: 'Account created successfully',
      userId: user.UserId,
      email: user.Email,
      user: normalizeUser(user),
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('[Auth:Register] Error', error);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    console.log('[Auth:Login] Request received', { email: normalizedEmail });
    validateAuthInput({ email: normalizedEmail, password });

    const userResult = await query(
      `SELECT UserId, Email, PasswordHash, FirstName, LastName, PhoneNumber,
              ProfileImage, Bio, IsActive, IsVerified, LastLogin, CreatedAt
       FROM [dbo].[Users]
       WHERE Email = @email AND DeletedAt IS NULL`,
      { email: normalizedEmail }
    );

    if (userResult.recordset.length === 0) {
      throw new AuthenticationError('Invalid credentials');
    }

    const user = userResult.recordset[0];
    if (!user.IsActive) {
      throw new AuthenticationError('Invalid credentials');
    }

    const passwordMatches = await bcryptjs.compare(password, user.PasswordHash);
    if (!passwordMatches) {
      throw new AuthenticationError('Invalid credentials');
    }

    const tokens = generateTokens({ userId: user.UserId, id: user.UserId, email: user.Email });
    await ensureRefreshTokenColumns();
    await query(
      `UPDATE [dbo].[Users]
       SET RefreshToken = @refreshToken,
           RefreshTokenExpiresAt = DATEADD(day, 7, GETUTCDATE()),
           LastLogin = GETUTCDATE()
       WHERE UserId = @userId`,
      { refreshToken: tokens.refreshToken, userId: user.UserId }
    );

    console.log('[Auth:Login] Login successful', { userId: user.UserId });
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: normalizeUser(user),
    });
  } catch (error) {
    console.error('[Auth:Login] Error', error);
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    console.log('[Auth:RefreshToken] Request received');
    if (!refreshToken) {
      throw new ValidationError('Validation failed', { refreshToken: 'Refresh token is required' });
    }

    if (tokenBlacklist.has(refreshToken)) {
      throw new AuthenticationError('Token expired');
    }

    const decoded = verifyRefreshToken(refreshToken);
    await ensureRefreshTokenColumns();

    const storedToken = await query(
      `SELECT UserId, Email
       FROM [dbo].[Users]
       WHERE UserId = @userId
         AND RefreshToken = @refreshToken
         AND RefreshTokenExpiresAt > GETUTCDATE()
         AND IsActive = 1
         AND DeletedAt IS NULL`,
      { userId: decoded.userId || decoded.id, refreshToken }
    );

    if (storedToken.recordset.length === 0) {
      throw new AuthenticationError('Token expired');
    }

    const user = storedToken.recordset[0];
    const token = generateAccessToken({ userId: user.UserId, id: user.UserId, email: user.Email });

    console.log('[Auth:RefreshToken] Token refreshed', { userId: user.UserId });
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token,
      accessToken: token,
    });
  } catch (error) {
    console.error('[Auth:RefreshToken] Error', error);
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const token = getBearerToken(req);
    const { refreshToken } = req.body || {};

    console.log('[Auth:Logout] Request received', { userId });
    if (token) tokenBlacklist.add(token);
    if (refreshToken) tokenBlacklist.add(refreshToken);

    await ensureRefreshTokenColumns();
    await query(
      `UPDATE [dbo].[Users]
       SET RefreshToken = NULL, RefreshTokenExpiresAt = NULL
       WHERE UserId = @userId`,
      { userId }
    );

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('[Auth:Logout] Error', error);
    next(error);
  }
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    console.log('[Auth:GetCurrentUser] Request received', { userId });
    const userResult = await query(
      `SELECT UserId, Email, FirstName, LastName, PhoneNumber, ProfileImage,
              Bio, IsActive, IsVerified, LastLogin, CreatedAt, UpdatedAt, AuthProvider, GoogleId
       FROM [dbo].[Users]
       WHERE UserId = @userId AND DeletedAt IS NULL`,
      { userId }
    );

    if (userResult.recordset.length === 0) {
      throw new NotFoundError('User');
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      user: normalizeUser(userResult.recordset[0]),
    });
  } catch (error) {
    console.error('[Auth:GetCurrentUser] Error', error);
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { firstName, lastName, phone, bio, profileImage } = req.body;

    const updates = [];
    const params = { userId };

    if (firstName !== undefined) {
      updates.push('FirstName = @firstName');
      params.firstName = firstName.trim();
    }
    if (lastName !== undefined) {
      updates.push('LastName = @lastName');
      params.lastName = lastName.trim();
    }
    if (phone !== undefined) {
      updates.push('PhoneNumber = @phone');
      params.phone = phone || null;
    }
    if (bio !== undefined) {
      updates.push('Bio = @bio');
      params.bio = bio || null;
    }
    if (profileImage !== undefined) {
      updates.push('ProfileImage = @profileImage');
      params.profileImage = profileImage || null;
    }

    if (updates.length === 0) {
      throw new ValidationError('Validation failed', { fields: 'No valid fields to update' });
    }

    await query(
      `UPDATE [dbo].[Users] SET ${updates.join(', ')}, UpdatedAt = GETUTCDATE()
       WHERE UserId = @userId AND DeletedAt IS NULL`,
      params
    );

    const userResult = await query(
      `SELECT UserId, Email, FirstName, LastName, PhoneNumber, ProfileImage,
              Bio, IsActive, IsVerified, LastLogin, CreatedAt, UpdatedAt, AuthProvider, GoogleId
       FROM [dbo].[Users] WHERE UserId = @userId`,
      { userId }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: normalizeUser(userResult.recordset[0]),
    });
  } catch (error) {
    console.error('[Auth:UpdateProfile] Error', error);
    next(error);
  }
};

const issueAuthResponse = async (res, user) => {
  const tokens = generateTokens({
    userId: user.UserId,
    id: user.UserId,
    email: user.Email,
  });
  await ensureRefreshTokenColumns();
  await query(
    `UPDATE [dbo].[Users]
     SET RefreshToken = @refreshToken,
         RefreshTokenExpiresAt = DATEADD(day, 7, GETUTCDATE()),
         LastLogin = GETUTCDATE()
     WHERE UserId = @userId`,
    { refreshToken: tokens.refreshToken, userId: user.UserId }
  );
  res.status(200).json({
    success: true,
    message: 'Login successful',
    token: tokens.accessToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: normalizeUser(user),
  });
};

exports.googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      throw new ValidationError('Validation failed', {
        google: 'Google Sign-In is not configured on the server',
      });
    }
    if (!idToken) {
      throw new ValidationError('Validation failed', { idToken: 'Google ID token is required' });
    }

    await ensureGoogleAuthSchema();

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub) {
      throw new AuthenticationError('Invalid Google token');
    }

    const email = payload.email.trim().toLowerCase();
    const googleId = payload.sub;
    const firstName = payload.given_name || payload.name?.split(' ')[0] || 'Utilisateur';
    const lastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || 'Google';
    const profileImage = payload.picture || null;

    let userResult = await query(
      `SELECT UserId, Email, PasswordHash, FirstName, LastName, PhoneNumber,
              ProfileImage, Bio, IsActive, IsVerified, LastLogin, CreatedAt, AuthProvider, GoogleId
       FROM [dbo].[Users]
       WHERE GoogleId = @googleId AND DeletedAt IS NULL`,
      { googleId }
    );

    if (userResult.recordset.length === 0) {
      userResult = await query(
        `SELECT UserId, Email, PasswordHash, FirstName, LastName, PhoneNumber,
                ProfileImage, Bio, IsActive, IsVerified, LastLogin, CreatedAt, AuthProvider, GoogleId
         FROM [dbo].[Users]
         WHERE Email = @email AND DeletedAt IS NULL`,
        { email }
      );
    }

    let user;
    if (userResult.recordset.length > 0) {
      user = userResult.recordset[0];
      if (!user.IsActive) {
        throw new AuthenticationError('Invalid credentials');
      }
      await query(
        `UPDATE [dbo].[Users]
         SET GoogleId = @googleId,
             AuthProvider = 'google',
             ProfileImage = @profileImage,
             UpdatedAt = GETUTCDATE()
         WHERE UserId = @userId`,
        { googleId, profileImage, userId: user.UserId }
      );
      user.GoogleId = googleId;
      user.AuthProvider = 'google';
      user.ProfileImage = profileImage || user.ProfileImage;
    } else {
      const passwordHash = await bcryptjs.hash(`google:${googleId}:${Date.now()}`, 10);
      const insertResult = await query(
        `INSERT INTO [dbo].[Users]
         (FirstName, LastName, Email, PasswordHash, PhoneNumber, ProfileImage,
          AuthProvider, GoogleId, IsActive, IsVerified, CreatedAt, UpdatedAt)
         OUTPUT INSERTED.UserId, INSERTED.Email, INSERTED.FirstName, INSERTED.LastName,
                INSERTED.PhoneNumber, INSERTED.ProfileImage, INSERTED.Bio,
                INSERTED.IsActive, INSERTED.IsVerified, INSERTED.LastLogin, INSERTED.CreatedAt,
                INSERTED.AuthProvider, INSERTED.GoogleId
         VALUES (@firstName, @lastName, @email, @passwordHash, NULL, @profileImage,
                 'google', @googleId, 1, 1, GETUTCDATE(), GETUTCDATE())`,
        { firstName, lastName, email, passwordHash, profileImage, googleId }
      );
      user = insertResult.recordset[0];
    }

    console.log('[Auth:Google] Login successful', { userId: user.UserId, email });
    await issueAuthResponse(res, user);
  } catch (error) {
    console.error('[Auth:Google] Error', error);
    next(error);
  }
};

exports.tokenBlacklist = tokenBlacklist;
