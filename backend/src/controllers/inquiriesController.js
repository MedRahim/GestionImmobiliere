// =====================================================
// Inquiries Controller
// =====================================================

const { query } = require('../models/database');
const { ValidationError, NotFoundError, AuthorizationError } = require('../utils/errorHandler');
const { createNotification } = require('../services/notificationService');

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeInquiry = (row) => ({
  id: row.InquiryId,
  inquiryId: row.InquiryId,
  propertyId: row.PropertyId,
  propertyTitle: row.PropertyTitle,
  clientId: row.ClientId,
  agentId: row.AgentId,
  clientName: `${row.ClientFirstName || ''} ${row.ClientLastName || ''}`.trim(),
  clientEmail: row.ClientEmail,
  clientPhone: row.ClientPhone,
  subject: row.Subject,
  message: row.Message,
  status: row.Status,
  createdAt: row.CreatedAt,
});

exports.getAllInquiries = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const offset = (page - 1) * limit;

    const where = ['(i.ClientId = @userId OR i.AgentId = @userId)'];
    const params = { offset, limit, userId };
    if (req.query.status) {
      where.push('i.Status = @status');
      params.status = req.query.status;
    }

    const countResult = await query(
      `SELECT COUNT(*) AS Total FROM [dbo].[Inquiries] i WHERE ${where.join(' AND ')}`,
      params
    );

    const result = await query(
      `SELECT i.InquiryId, i.PropertyId, i.ClientId, i.AgentId, i.Subject, i.Message,
              i.Status, i.CreatedAt,
              p.Title AS PropertyTitle,
              c.FirstName AS ClientFirstName, c.LastName AS ClientLastName,
              c.Email AS ClientEmail, c.PhoneNumber AS ClientPhone
       FROM [dbo].[Inquiries] i
       INNER JOIN [dbo].[Properties] p ON p.PropertyId = i.PropertyId
       INNER JOIN [dbo].[Users] c ON c.UserId = i.ClientId
       WHERE ${where.join(' AND ')}
       ORDER BY i.CreatedAt DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params
    );

    const total = countResult.recordset[0]?.Total || 0;
    const inquiries = result.recordset.map(normalizeInquiry);

    res.status(200).json({
      success: true,
      data: inquiries,
      inquiries,
      total,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.createInquiry = async (req, res, next) => {
  try {
    const { propertyId, message, subject } = req.body;
    const clientId = req.user.userId || req.user.id;

    if (!clientId) {
      throw new AuthorizationError('Authentication required');
    }

    if (!propertyId || !message?.trim()) {
      throw new ValidationError('Validation failed', {
        propertyId: !propertyId ? 'Property is required' : undefined,
        message: !message?.trim() ? 'Message is required' : undefined,
      });
    }

    const propertyResult = await query(
      `SELECT PropertyId, AgentId, Title FROM [dbo].[Properties]
       WHERE PropertyId = @propertyId AND DeletedAt IS NULL AND IsActive = 1`,
      { propertyId: parsePositiveInt(propertyId, null) }
    );

    if (propertyResult.recordset.length === 0) {
      throw new NotFoundError('Property');
    }

    const property = propertyResult.recordset[0];
    if (property.AgentId === clientId) {
      throw new ValidationError('Validation failed', {
        propertyId: 'You cannot contact yourself about your own listing',
      });
    }
    const insertResult = await query(
      `INSERT INTO [dbo].[Inquiries]
       (PropertyId, ClientId, AgentId, Subject, Message, Status, CreatedAt)
       OUTPUT INSERTED.*
       VALUES (@propertyId, @clientId, @agentId, @subject, @message, 'new', GETUTCDATE())`,
      {
        propertyId: property.PropertyId,
        clientId,
        agentId: property.AgentId,
        subject: subject || `Intérêt pour: ${property.Title}`,
        message: message.trim(),
      }
    );

    const row = insertResult.recordset[0];

    const clientName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Un acheteur';
    await createNotification({
      userId: property.AgentId,
      type: 'inquiry',
      title: 'Nouvelle demande d\'achat',
      message: `${clientName} est intéressé par "${property.Title}"`,
      relatedPropertyId: property.PropertyId,
      relatedInquiryId: row.InquiryId,
    });

    res.status(201).json({
      success: true,
      message: 'Inquiry sent successfully',
      inquiry: normalizeInquiry({
        ...row,
        PropertyTitle: property.Title,
        ClientFirstName: req.user.firstName,
        ClientLastName: req.user.lastName,
        ClientEmail: req.user.email,
        ClientPhone: null,
      }),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateInquiryStatus = async (req, res, next) => {
  try {
    const inquiryId = parsePositiveInt(req.params.inquiryId, null);
    const { status } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!['new', 'responded', 'scheduled', 'closed'].includes(status)) {
      throw new ValidationError('Validation failed', { status: 'Invalid status' });
    }

    await query(
      `UPDATE [dbo].[Inquiries] SET Status = @status
       WHERE InquiryId = @inquiryId AND AgentId = @userId`,
      { inquiryId, userId, status }
    );

    res.status(200).json({ success: true, message: 'Inquiry updated' });
  } catch (error) {
    next(error);
  }
};
