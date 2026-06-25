const bcryptjs = require('bcryptjs');
const { query } = require('../models/database');
const { generateTokens, verifyRefreshToken, generateAccessToken } = require('../utils/jwt');
const { ValidationError, AuthenticationError, NotFoundError } = require('../utils/errorHandler');

const tokenBlacklist = new Set();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeUser = (user) => ({
  id: user.UserId,
  userId: user.UserId,
  email: user.Email,
  firstName: user.FirstName,
  lastName: user.LastName,
  role: user.Role,
  phone: user.PhoneNumber,
  profileImage: user.ProfileImage,
  bio: user.Bio,
  isActive: user.IsActive,
  isVerified: user.IsVerified,
  lastLogin: user.LastLogin,
  createdAt: user.CreatedAt,
});

const validateAuthInput = ({ email, password, firstName, lastName }, isRegister = false) => {
  const details = {};
  if (!email) details.email = 'Email is required';
  else if (!emailRegex.test(email)) details.email = 'Enter a valid email address';
  if (!password) details.password = 'Password is required';
  else if (password.length < 8) details.password = 'Password must be at least 8 characters';
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
      ALTER TABLE [dbo].[Users] ADD [RefreshToken] NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.Users', 'RefreshTokenExpiresAt') IS NULL
      ALTER TABLE [dbo].[Users] ADD [RefreshTokenExpiresAt] DATETIME NULL;
  `);
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
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
       (FirstName, LastName, Email, PasswordHash, Role, PhoneNumber, IsActive, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.UserId, INSERTED.Email, INSERTED.FirstName, INSERTED.LastName,
              INSERTED.Role, INSERTED.PhoneNumber, INSERTED.CreatedAt
       VALUES (@firstName, @lastName, @email, @passwordHash, 'client', @phone, 1, GETUTCDATE(), GETUTCDATE())`,
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone || null,
      }
    );

    const user = insertResult.recordset[0];
    const tokens = generateTokens({ userId: user.UserId, id: user.UserId, email: user.Email, role: user.Role });
    await ensureRefreshTokenColumns();
    await query(
      `UPDATE [dbo].[Users] SET RefreshToken = @refreshToken, RefreshTokenExpiresAt = DATEADD(day, 7, GETUTCDATE())
       WHERE UserId = @userId`,
      { refreshToken: tokens.refreshToken, userId: user.UserId }
    );

    res.status(200).json({
      success: true,
      message: 'Account created successfully',
      user: normalizeUser(user),
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    validateAuthInput({ email: normalizedEmail, password });

    const userResult = await query(
      `SELECT UserId, Email, PasswordHash, FirstName, LastName, Role, PhoneNumber,
              ProfileImage, Bio, IsActive, IsVerified, LastLogin, CreatedAt
       FROM [dbo].[Users] WHERE Email = @email AND DeletedAt IS NULL`,
      { email: normalizedEmail }
    );
    if (userResult.recordset.length === 0) {
      throw new AuthenticationError('Invalid credentials');
    }

    const user = userResult.recordset[0];
    if (!user.IsActive) throw new AuthenticationError('Invalid credentials');

    const passwordMatches = await bcryptjs.compare(password, user.PasswordHash);
    if (!passwordMatches) throw new AuthenticationError('Invalid credentials');

    const tokens = generateTokens({ userId: user.UserId, id: user.UserId, email: user.Email, role: user.Role });
    await ensureRefreshTokenColumns();
    await query(
      `UPDATE [dbo].[Users] SET RefreshToken = @refreshToken, RefreshTokenExpiresAt = DATEADD(day, 7, GETUTCDATE()),
       LastLogin = GETUTCDATE() WHERE UserId = @userId`,
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
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new ValidationError('Validation failed', { refreshToken: 'Refresh token is required' });
    }
    if (tokenBlacklist.has(refreshToken)) {
      throw new AuthenticationError('Token expired');
    }

    const decoded = verifyRefreshToken(refreshToken);
    await ensureRefreshTokenColumns();
    const storedToken = await query(
      `SELECT UserId, Email, Role FROM [dbo].[Users]
       WHERE UserId = @userId AND RefreshToken = @refreshToken
         AND RefreshTokenExpiresAt > GETUTCDATE() AND IsActive = 1 AND DeletedAt IS NULL`,
      { userId: decoded.userId || decoded.id, refreshToken }
    );
    if (storedToken.recordset.length === 0) {
      throw new AuthenticationError('Token expired');
    }

    const user = storedToken.recordset[0];
    const token = generateAccessToken({ userId: user.UserId, id: user.UserId, email: user.Email, role: user.Role });
    res.status(200).json({ success: true, token, accessToken: token });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const token = getBearerToken(req);
    const { refreshToken } = req.body || {};
    if (token) tokenBlacklist.add(token);
    if (refreshToken) tokenBlacklist.add(refreshToken);
    await ensureRefreshTokenColumns();
    await query(
      `UPDATE [dbo].[Users] SET RefreshToken = NULL, RefreshTokenExpiresAt = NULL WHERE UserId = @userId`,
      { userId }
    );
    res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userResult = await query(
      `SELECT UserId, Email, FirstName, LastName, Role, PhoneNumber, ProfileImage,
              Bio, IsActive, IsVerified, LastLogin, CreatedAt, UpdatedAt
       FROM [dbo].[Users] WHERE UserId = @userId AND DeletedAt IS NULL`,
      { userId }
    );
    if (userResult.recordset.length === 0) throw new NotFoundError('User');
    res.status(200).json({ success: true, user: normalizeUser(userResult.recordset[0]) });
  } catch (error) {
    next(error);
  }
};

exports.tokenBlacklist = tokenBlacklist;
